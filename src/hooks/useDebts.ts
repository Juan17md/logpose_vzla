import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, runTransaction } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

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
}

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
        try {
            // Remove undefined fields to avoid Firestore errors
            const cleanDebt = Object.fromEntries(
                Object.entries(debt).filter(([, v]) => v !== undefined)
            );

            await addDoc(collection(db, "users", auth.currentUser.uid, "debts"), {
                ...cleanDebt,
                payments: [],
                isPaid: false,
                createdAt: new Date(),
            });
            return true;
        } catch (error) {
            console.error("Error adding debt:", error);
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
            return false;
        }
    };

    const updateDebt = async (id: string, updates: Partial<Debt>) => {
        if (!auth.currentUser) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _unused, createdAt, ...updatesToClean } = updates;
            const validUpdates = Object.fromEntries(
                Object.entries(updatesToClean).filter(([, v]) => v !== undefined)
            );
            await updateDoc(doc(db, "users", auth.currentUser.uid, "debts", id), validUpdates);
            return true;
        } catch (error) {
            console.error("Error updating debt:", error);
            return false;
        }
    };

    const addPayment = async (debtId: string, payment: Omit<Payment, "id">) => {
        if (!auth.currentUser) return;
        try {
            await runTransaction(db, async (transaction) => {
                const debtRef = doc(db, "users", auth.currentUser!.uid, "debts", debtId);
                const debtDoc = await transaction.get(debtRef);

                if (!debtDoc.exists()) {
                    throw "Debt document does not exist";
                }

                const currentData = debtDoc.data() as Debt;

                // Clean undefined
                const cleanPayment = Object.fromEntries(
                    Object.entries(payment).filter(([, v]) => v !== undefined)
                );

                const newPayment = { ...cleanPayment, id: crypto.randomUUID() } as Payment;

                // Use current data from transaction read
                const currentPayments = currentData.payments || [];
                const updatedPayments = [...currentPayments, newPayment];

                const totalPaid = updatedPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                const isPaid = totalPaid >= currentData.amount;

                transaction.update(debtRef, {
                    payments: updatedPayments,
                    isPaid: isPaid
                });
            });

            return true;
        } catch (error) {
            console.error("Error adding payment transaction:", error);
            return false;
        }
    };

    return { debts, loadingDebts, addDebt, deleteDebt, updateDebt, addPayment };
}
