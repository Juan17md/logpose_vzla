import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, runTransaction, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { deudaSchema, pagoSchema } from "@/lib/schemas";
import * as Sentry from "@sentry/nextjs";

export interface Payment {
    id: string;
    amount: number;
    date: Date;
    note?: string;
    currency?: "USD" | "VES";
    originalAmount?: number;
    exchangeRate?: number;
}

interface FirestorePayment {
    id: string;
    amount: number;
    date: Timestamp | Date | string;
    note?: string;
    currency?: "USD" | "VES";
    originalAmount?: number;
    exchangeRate?: number;
}

export interface Debt {
    id: string;
    personName: string;
    type: "por_cobrar" | "por_pagar";
    amount: number;
    description?: string;
    dueDate?: Date;
    payments: Payment[];
    isPaid: boolean;
    createdAt: Date;
    currency?: "USD" | "VES" | "EUR" | "USDT";
    originalAmount?: number;
    exchangeRate?: number;
}

// Cada abono (~200 bytes) se guarda dentro del documento de la deuda, cuyo
// límite es 1 MiB. 100 pagos (~20 KB) dejan margen amplio sin arriesgar el doc.
const MAX_PAGOS_POR_DEUDA = 100;

export function useDebts() {
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loadingDebts, setLoadingDebts] = useState(true);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (user) {
                const q = query(
                    collection(db, "users", user.uid, "debts"),
                    orderBy("createdAt", "desc")
                );

                unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map((doc) => {
                        const docData = doc.data();
                        return {
                            id: doc.id,
                            ...docData,
                            createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate() : new Date(docData.createdAt || Date.now()),
                            dueDate: docData.dueDate instanceof Timestamp ? docData.dueDate.toDate() : (docData.dueDate ? new Date(docData.dueDate) : undefined),
                            payments: (docData.payments || []).map((p: FirestorePayment) => ({
                                ...p,
                                date: p.date instanceof Timestamp ? p.date.toDate() : new Date(p.date)
                            }))
                        } as Debt;
                    });
                    setDebts(data);
                    setLoadingDebts(false);
                }, (error) => {
                    console.error("Error fetching debts:", error);
                    Sentry.captureException(error);
                    setLoadingDebts(false);
                });
            } else {
                setDebts([]);
                setLoadingDebts(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, []);

    const addDebt = async (debt: Omit<Debt, "id" | "createdAt" | "payments" | "isPaid">) => {
        if (!auth.currentUser) return;
        const parsed = deudaSchema.safeParse(debt);
        if (!parsed.success) {
            console.error("Deuda inválida:", parsed.error.flatten());
            return false;
        }
        try {
            await addDoc(collection(db, "users", auth.currentUser.uid, "debts"), {
                ...parsed.data,
                payments: [],
                isPaid: false,
                createdAt: new Date(),
            });
            return true;
        } catch (error) {
            console.error("Error adding debt:", error);
            Sentry.captureException(error);
            return false;
        }
    };

    const deleteDebt = async (id: string) => {
        if (!auth.currentUser) return;
        try {
            await deleteDoc(doc(db, "users", auth.currentUser.uid, "debts", id));
            return true;
        } catch (error) {
            console.error("Error deleting debt:", error);
            Sentry.captureException(error);
            return false;
        }
    };

    const updateDebt = async (id: string, updates: Partial<Debt>) => {
        if (!auth.currentUser) return;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _unused, createdAt, ...rest } = updates;
        const parsed = deudaSchema.partial().safeParse(rest);
        if (!parsed.success) {
            console.error("Deuda inválida:", parsed.error.flatten());
            return false;
        }
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid, "debts", id), parsed.data);
            return true;
        } catch (error) {
            console.error("Error updating debt:", error);
            Sentry.captureException(error);
            return false;
        }
    };

    const addPayment = async (debtId: string, payment: Omit<Payment, "id">) => {
        if (!auth.currentUser) return;
        const parsed = pagoSchema.safeParse(payment);
        if (!parsed.success) {
            console.error("Pago inválido:", parsed.error.flatten());
            return false;
        }
        const userId = auth.currentUser.uid;

        try {
            await runTransaction(db, async (transaction) => {
                const debtRef = doc(db, "users", userId, "debts", debtId);
                const debtDoc = await transaction.get(debtRef);

                if (!debtDoc.exists()) {
                    throw new Error("Debt document does not exist");
                }

                const currentData = debtDoc.data() as Debt;
                const cleanPayment = { ...parsed.data };
                const newPayment = { ...cleanPayment, id: crypto.randomUUID() } as Payment;

                const currentPayments = currentData.payments || [];
                if (currentPayments.length >= MAX_PAGOS_POR_DEUDA) {
                    throw new Error("Se alcanzó el límite de abonos para esta deuda");
                }
                const updatedPayments = [...currentPayments, newPayment];

                const totalPaid = updatedPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                const isPaid = totalPaid >= currentData.amount;

                // T13: Crear movimiento contable en transactions (ingreso si por cobrar, gasto si por pagar)
                const transRef = doc(collection(db, "transactions"));
                const tipoMovimiento = currentData.type === "por_cobrar" ? "ingreso" : "gasto";
                const descripcionMovimiento = currentData.type === "por_cobrar"
                    ? `Cobro de deuda: ${currentData.personName}${cleanPayment.note ? ` (${cleanPayment.note})` : ""}`
                    : `Pago de deuda: ${currentData.personName}${cleanPayment.note ? ` (${cleanPayment.note})` : ""}`;

                transaction.set(transRef, {
                    userId,
                    amount: cleanPayment.amount,
                    type: tipoMovimiento,
                    category: "Deudas",
                    description: descripcionMovimiento,
                    date: cleanPayment.date ? new Date(cleanPayment.date) : new Date(),
                    currency: (cleanPayment.currency || currentData.currency || "USD") as "USD" | "VES",
                    originalAmount: cleanPayment.originalAmount,
                    exchangeRate: cleanPayment.exchangeRate,
                    period: "mensual",
                    createdAt: serverTimestamp(),
                });

                transaction.update(debtRef, {
                    payments: updatedPayments,
                    isPaid: isPaid
                });
            });

            return true;
        } catch (error) {
            console.error("Error adding payment transaction:", error);
            Sentry.captureException(error);
            return false;
        }
    };

    return { debts, loadingDebts, addDebt, deleteDebt, updateDebt, addPayment };
}
