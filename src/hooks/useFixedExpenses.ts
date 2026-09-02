import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { gastoFijoSchema } from "@/lib/schemas";
import * as Sentry from "@sentry/nextjs";

export interface FixedExpense {
    id: string;
    title: string;
    amount: number;
    currency: "USD" | "BS";
    category: string;
    dueDay: number; // 1-31
    description?: string;
    lastPaidDate?: Date;
    createdAt: Date;
}

export function useFixedExpenses() {
    const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
    const [loadingFixedExpenses, setLoadingFixedExpenses] = useState(true);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (user) {
                const q = query(
                    collection(db, "users", user.uid, "fixed_expenses"),
                    orderBy("dueDay", "asc")
                );

                unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map((doc) => {
                        const docData = doc.data();
                        return {
                            id: doc.id,
                            ...docData,
                            createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate() : new Date(docData.createdAt || Date.now()),
                            lastPaidDate: docData.lastPaidDate instanceof Timestamp ? docData.lastPaidDate.toDate() : docData.lastPaidDate ? new Date(docData.lastPaidDate) : undefined,
                        } as FixedExpense;
                    });
                    setFixedExpenses(data);
                    setLoadingFixedExpenses(false);
                }, (error) => {
                    console.error("Error fetching fixed expenses:", error);
                    Sentry.captureException(error);
                    setLoadingFixedExpenses(false);
                });
            } else {
                setFixedExpenses([]);
                setLoadingFixedExpenses(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, []);

    const addFixedExpense = async (expense: Omit<FixedExpense, "id" | "createdAt">) => {
        if (!auth.currentUser) return;
        const parsed = gastoFijoSchema.safeParse(expense);
        if (!parsed.success) {
            console.error("Gasto fijo inválido:", parsed.error.flatten());
            return false;
        }
        try {
            await addDoc(collection(db, "users", auth.currentUser.uid, "fixed_expenses"), {
                ...parsed.data,
                createdAt: new Date(),
            });
            return true;
        } catch (error) {
            console.error("Error adding fixed expense:", error);
            Sentry.captureException(error);
            return false;
        }
    };

    const deleteFixedExpense = async (id: string) => {
        if (!auth.currentUser) return;
        try {
            await deleteDoc(doc(db, "users", auth.currentUser.uid, "fixed_expenses", id));
            return true;
        } catch (error) {
            console.error("Error deleting fixed expense:", error);
            Sentry.captureException(error);
            return false;
        }
    };

    const updateFixedExpense = async (id: string, updates: Partial<FixedExpense>) => {
        if (!auth.currentUser) return;
        const { id: _, createdAt, ...rest } = updates;
        const parsed = gastoFijoSchema.partial().safeParse(rest);
        if (!parsed.success) {
            console.error("Gasto fijo inválido:", parsed.error.flatten());
            return false;
        }
        try {
            const processedUpdates: Record<string, unknown> = { ...parsed.data };
            if (parsed.data.lastPaidDate instanceof Date) {
                processedUpdates.lastPaidDate = Timestamp.fromDate(parsed.data.lastPaidDate);
            }

            await updateDoc(doc(db, "users", auth.currentUser.uid, "fixed_expenses", id), processedUpdates);
            return true;
        } catch (error) {
            console.error("Error updating fixed expense:", error);
            Sentry.captureException(error);
            return false;
        }
    };

    return { fixedExpenses, loadingFixedExpenses, addFixedExpense, deleteFixedExpense, updateFixedExpense };
}
