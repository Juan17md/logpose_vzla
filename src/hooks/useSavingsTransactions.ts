import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export interface SavingsTransaction {
    id: string;
    amount: number;
    type: "deposit" | "withdrawal";
    method: "physical" | "usdt" | "bs";
    description: string;
    date: Date;
}

export function useSavingsTransactions() {
    const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([]);
    const [loadingSavings, setLoadingSavings] = useState(true);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (user) {
                const q = query(
                    collection(db, "users", user.uid, "savings_transactions"),
                    orderBy("date", "desc")
                );

                unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map((doc) => {
                        const docData = doc.data();
                        return {
                            id: doc.id,
                            ...docData,
                            date: docData.date instanceof Timestamp ? docData.date.toDate() : new Date(docData.date || Date.now()),
                        } as SavingsTransaction;
                    });
                    setSavingsTransactions(data);
                    setLoadingSavings(false);
                }, (error) => {
                    console.error("Error fetching savings transactions:", error);
                    setLoadingSavings(false);
                });
            } else {
                setSavingsTransactions([]);
                setLoadingSavings(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, []);

    return { savingsTransactions, loadingSavings };
}
