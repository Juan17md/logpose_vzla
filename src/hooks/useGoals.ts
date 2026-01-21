import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, runTransaction, increment, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export interface Goal {
    id: string;
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: Timestamp | Date;
    color?: string;
    createdAt?: Timestamp | Date;
}

export const useGoals = () => {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (!user) {
                setGoals([]);
                setLoading(false);
                return;
            }

            const q = query(
                collection(db, "users", user.uid, "saving_goals"),
                orderBy("createdAt", "desc")
            );

            unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                const goalsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Goal[];
                setGoals(goalsData);
                setLoading(false);
            });
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, []);

    const addGoal = async (name: string, targetAmount: number, deadline?: string) => {
        if (!auth.currentUser) return;
        await addDoc(collection(db, "users", auth.currentUser.uid, "saving_goals"), {
            userId: auth.currentUser.uid,
            name,
            targetAmount,
            currentAmount: 0,
            deadline: deadline ? new Date(deadline) : null,
            color: "#10b981", // Default color
            createdAt: serverTimestamp()
        });
    };

    const deleteGoal = async (id: string) => {
        if (!auth.currentUser) return;
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "saving_goals", id));
    };

    const updateGoalProgress = async (id: string, newAmount: number) => {
        if (!auth.currentUser) return;
        await updateDoc(doc(db, "users", auth.currentUser.uid, "saving_goals", id), {
            currentAmount: newAmount
        });
    };

    const addContribution = async (goalId: string, goalName: string, amount: number, method: "physical" | "usdt") => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;

        try {
            await runTransaction(db, async (transaction) => {
                // Refs
                const userRef = doc(db, "users", uid);
                const goalRef = doc(db, "users", uid, "saving_goals", goalId);
                const newTransRef = doc(collection(db, "users", uid, "savings_transactions"));

                // Get Current Data
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw "User doc not found";

                // 1. Update Goal
                transaction.update(goalRef, {
                    currentAmount: increment(amount)
                });

                // 2. Update User Balance (Savings Wallet)
                const fieldToUpdate = method === "physical" ? "savingsPhysical" : "savingsUSDT";
                const currentBalance = userDoc.data()[fieldToUpdate] || 0;
                transaction.update(userRef, {
                    [fieldToUpdate]: currentBalance + amount
                });

                // 3. Create Transaction Record
                transaction.set(newTransRef, {
                    amount: amount,
                    type: "deposit",
                    method: method,
                    description: `Ahorro: ${goalName}`,
                    date: serverTimestamp()
                });
            });
        } catch (e) {
            console.error("Error in addContribution:", e);
            throw e;
        }
    };

    const updateGoal = async (id: string, updates: Partial<Goal>) => {
        if (!auth.currentUser) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _, createdAt, ...validUpdates } = updates;
            await updateDoc(doc(db, "users", auth.currentUser.uid, "saving_goals", id), validUpdates);
            return true;
        } catch (error) {
            console.error("Error updating goal:", error);
            return false;
        }
    };

    return { goals, loading, addGoal, deleteGoal, updateGoalProgress, addContribution, updateGoal };
};
