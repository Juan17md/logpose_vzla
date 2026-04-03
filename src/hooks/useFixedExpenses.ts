import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

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
        try {
            await addDoc(collection(db, "users", auth.currentUser.uid, "fixed_expenses"), {
                ...expense,
                createdAt: new Date(),
            });
            return true;
        } catch (error) {
            console.error("Error adding fixed expense:", error);
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
            return false;
        }
    };

    const updateFixedExpense = async (id: string, updates: Partial<FixedExpense>) => {
        if (!auth.currentUser) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _, createdAt, ...validUpdates } = updates; // Exclude non-updatable fields
            // Convert Date objects to Firestore Timestamps
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const processedUpdates: any = { ...validUpdates };
            if (validUpdates.lastPaidDate instanceof Date) {
                processedUpdates.lastPaidDate = Timestamp.fromDate(validUpdates.lastPaidDate);
            }

            await updateDoc(doc(db, "users", auth.currentUser.uid, "fixed_expenses", id), processedUpdates);
            return true;
        } catch (error) {
            console.error("Error updating fixed expense:", error);
            return false;
        }
    };

    return { fixedExpenses, loadingFixedExpenses, addFixedExpense, deleteFixedExpense, updateFixedExpense };
}
