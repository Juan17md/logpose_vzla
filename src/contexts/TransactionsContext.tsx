"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, Timestamp, addDoc, serverTimestamp, updateDoc, runTransaction } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createVenezuelaDate } from "@/lib/timezone";

export interface Transaction {
    id: string;
    amount: number;
    type: "ingreso" | "gasto" | "transferencia";
    category: string;
    description: string;
    date: Date;
    // Optional extended fields if you have them in database
    currency?: "USD" | "VES";
    originalAmount?: number;
    exchangeRate?: number;
    accountId?: string;
    targetAccountId?: string;
}

interface TransactionsContextType {
    transactions: Transaction[];
    loading: boolean;
    deleteTransaction: (id: string) => Promise<boolean>;
    duplicateTransaction: (id: string) => Promise<boolean>;
    addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<string | null>;
    updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<boolean>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: ReactNode }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            // Clean up previous snapshot listener if exists
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (user) {
                const q = query(
                    collection(db, "transactions"),
                    where("userId", "==", user.uid),
                    orderBy("date", "desc")
                );

                unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map((doc) => {
                        const docData = doc.data();
                        return {
                            id: doc.id,
                            ...docData,
                            date: docData.date instanceof Timestamp ? docData.date.toDate() : new Date(docData.date),
                        } as Transaction;
                    });
                    setTransactions(data);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching transactions:", error);
                    setLoading(false);
                });
            } else {
                setTransactions([]);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, []);

    const deleteTransaction = useCallback(async (id: string) => {
        if (!auth.currentUser) return false;
        try {
            await runTransaction(db, async (transaction) => {
                const transRef = doc(db, "transactions", id);
                const transDoc = await transaction.get(transRef);
                
                if (!transDoc.exists()) throw "La transacción no existe";

                const transData = transDoc.data();
                const { accountId, amount, type } = transData;

                if (accountId) {
                    const cuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", accountId);
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        const currentSaldo = cuentaDoc.data().saldo || 0;
                        let nuevoSaldo = currentSaldo;
                        if (type === 'ingreso') nuevoSaldo -= amount;
                        else if (type === 'gasto') nuevoSaldo += amount;
                        else if (type === 'transferencia') nuevoSaldo += amount;
                        transaction.update(cuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                }

                if (type === 'transferencia' && transData.targetAccountId) {
                    const targetCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", transData.targetAccountId);
                    const targetCuentaDoc = await transaction.get(targetCuentaRef);
                    if (targetCuentaDoc.exists()) {
                        const currentSaldo = targetCuentaDoc.data().saldo || 0;
                        const nuevoSaldo = currentSaldo - amount;
                        transaction.update(targetCuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                }

                transaction.delete(transRef);
            });
            return true;
        } catch (error) {
            console.error("Error deleting transaction:", error);
            return false;
        }
    }, [db]);

    const duplicateTransaction = useCallback(async (id: string) => {
        const transactionToCopy = transactions.find(t => t.id === id);
        if (!transactionToCopy || !auth.currentUser) return false;

        try {
            await runTransaction(db, async (transaction) => {
                const { id: _, date, ...rest } = transactionToCopy;
                const { accountId, amount, type } = rest;

                if (accountId) {
                    const cuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", accountId);
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        const currentSaldo = cuentaDoc.data().saldo || 0;
                        let nuevoSaldo = currentSaldo;
                        if (type === 'ingreso') nuevoSaldo += amount;
                        else if (type === 'gasto') nuevoSaldo -= amount;
                        else if (type === 'transferencia') nuevoSaldo -= amount;
                        transaction.update(cuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                }

                if (type === 'transferencia' && rest.targetAccountId) {
                    const targetCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", rest.targetAccountId);
                    const targetCuentaDoc = await transaction.get(targetCuentaRef);
                    if (targetCuentaDoc.exists()) {
                        const currentSaldo = targetCuentaDoc.data().saldo || 0;
                        const nuevoSaldo = currentSaldo + amount;
                        transaction.update(targetCuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                }

                const newTransRef = doc(collection(db, "transactions"));
                transaction.set(newTransRef, {
                    ...rest,
                    userId: auth.currentUser!.uid,
                    date: createVenezuelaDate(),
                    createdAt: serverTimestamp()
                });
            });
            return true;
        } catch (error) {
            console.error("Error duplicating transaction:", error);
            return false;
        }
    }, [transactions, db]);

    const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id'>) => {
        if (!auth.currentUser) return null;

        try {
            let newId = "";
            await runTransaction(db, async (transaction) => {
                const { accountId, amount, type } = transactionData;

                if (accountId) {
                    const cuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", accountId);
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        const currentSaldo = cuentaDoc.data().saldo || 0;
                        let nuevoSaldo = currentSaldo;
                        if (type === 'ingreso') nuevoSaldo += amount;
                        else if (type === 'gasto') nuevoSaldo -= amount;
                        else if (type === 'transferencia') nuevoSaldo -= amount;
                        transaction.update(cuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                }

                if (type === 'transferencia' && transactionData.targetAccountId) {
                    const targetCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", transactionData.targetAccountId);
                    const targetCuentaDoc = await transaction.get(targetCuentaRef);
                    if (targetCuentaDoc.exists()) {
                        const currentSaldo = targetCuentaDoc.data().saldo || 0;
                        const nuevoSaldo = currentSaldo + amount;
                        transaction.update(targetCuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                }

                const newTransRef = doc(collection(db, "transactions"));
                newId = newTransRef.id;
                transaction.set(newTransRef, {
                    ...transactionData,
                    userId: auth.currentUser!.uid,
                    createdAt: serverTimestamp()
                });
            });
            return newId;
        } catch (error) {
            console.error("Error adding transaction:", error);
            return null;
        }
    }, [db]);

    const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
        if (!auth.currentUser) return false;
        try {
            await runTransaction(db, async (transaction) => {
                const transRef = doc(db, "transactions", id);
                const transDoc = await transaction.get(transRef);
                if (!transDoc.exists()) throw "Transacción no encontrada";

                const oldData = transDoc.data() as Transaction;
                const newData = { ...oldData, ...updates };

                // Si ha cambiado la cuenta, el destino, el monto o el tipo, necesitamos recalcular saldos
                const needsBalanceUpdate = 
                    oldData.accountId !== updates.accountId || 
                    oldData.targetAccountId !== updates.targetAccountId ||
                    oldData.amount !== updates.amount || 
                    oldData.type !== updates.type;

                if (needsBalanceUpdate) {
                    // 1. Revertir impacto anterior
                    if (oldData.accountId) {
                        const oldCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", oldData.accountId);
                        const oldCuentaDoc = await transaction.get(oldCuentaRef);
                        if (oldCuentaDoc.exists()) {
                            const currentSaldo = oldCuentaDoc.data().saldo || 0;
                            let restoredSaldo = currentSaldo;
                            if (oldData.type === 'ingreso') restoredSaldo -= oldData.amount;
                            else if (oldData.type === 'gasto') restoredSaldo += oldData.amount;
                            else if (oldData.type === 'transferencia') restoredSaldo += oldData.amount;
                            transaction.update(oldCuentaRef, { saldo: restoredSaldo, actualizadoEn: serverTimestamp() });
                        }
                    }
                    if (oldData.type === 'transferencia' && oldData.targetAccountId) {
                        const oldTargetRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", oldData.targetAccountId);
                        const oldTargetDoc = await transaction.get(oldTargetRef);
                        if (oldTargetDoc.exists()) {
                            const currentSaldo = oldTargetDoc.data().saldo || 0;
                            const restoredSaldo = currentSaldo - oldData.amount;
                            transaction.update(oldTargetRef, { saldo: restoredSaldo, actualizadoEn: serverTimestamp() });
                        }
                    }

                    // 2. Aplicar impacto nuevo
                    if (newData.accountId) {
                        const newCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", newData.accountId);
                        const newCuentaDoc = await transaction.get(newCuentaRef);
                        if (newCuentaDoc.exists()) {
                            const currentSaldo = newCuentaDoc.data().saldo || 0;
                            let appliedSaldo = currentSaldo;
                            if (newData.type === 'ingreso') appliedSaldo += newData.amount;
                            else if (newData.type === 'gasto') appliedSaldo -= newData.amount;
                            else if (newData.type === 'transferencia') appliedSaldo -= newData.amount;
                            transaction.update(newCuentaRef, { saldo: appliedSaldo, actualizadoEn: serverTimestamp() });
                        }
                    }
                    if (newData.type === 'transferencia' && newData.targetAccountId) {
                        const newTargetRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", newData.targetAccountId);
                        const newTargetDoc = await transaction.get(newTargetRef);
                        if (newTargetDoc.exists()) {
                            const currentSaldo = newTargetDoc.data().saldo || 0;
                            const appliedSaldo = currentSaldo + newData.amount;
                            transaction.update(newTargetRef, { saldo: appliedSaldo, actualizadoEn: serverTimestamp() });
                        }
                    }
                }

                transaction.update(transRef, updates);
            });
            return true;
        } catch (error) {
            console.error("Error updating transaction:", error);
            return false;
        }
    }, [db]);

    const value = useMemo(() => ({
        transactions,
        loading,
        deleteTransaction,
        duplicateTransaction,
        addTransaction,
        updateTransaction
    }), [transactions, loading, deleteTransaction, duplicateTransaction, addTransaction, updateTransaction]);

    return (
        <TransactionsContext.Provider value={value}>
            {children}
        </TransactionsContext.Provider>
    );
}

export function useTransactions() {
    const context = useContext(TransactionsContext);
    if (context === undefined) {
        throw new Error("useTransactions must be used within a TransactionsProvider");
    }
    return context;
}
