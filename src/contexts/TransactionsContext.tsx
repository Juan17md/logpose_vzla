"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, deleteDoc, doc, Timestamp, addDoc, serverTimestamp, updateDoc, runTransaction } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createVenezuelaDate } from "@/lib/timezone";
import { convertirMontoParaCuenta } from "@/lib/bankAccounts";

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
                // Limitamos a 500 transacciones recientes para proteger la memoria
                // en dispositivos de bajos recursos. Los cálculos del dashboard
                // operan sobre el mes/trimestre actual, por lo que 500 es más que suficiente.
                const q = query(
                    collection(db, "transactions"),
                    where("userId", "==", user.uid),
                    orderBy("date", "desc"),
                    limit(500)
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
                const { accountId, amount, type, currency, exchangeRate, originalAmount } = transData;

                if (accountId) {
                    const cuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", accountId);
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        const currentSaldo = cuentaDoc.data().saldo || 0;
                        const cuentaMoneda = cuentaDoc.data().moneda || "USD";
                        const montoParaReversar = convertirMontoParaCuenta(amount, currency || 'USD', cuentaMoneda, exchangeRate, originalAmount);

                        let nuevoSaldo = currentSaldo;
                        if (type === 'ingreso') nuevoSaldo -= montoParaReversar;
                        else if (type === 'gasto') nuevoSaldo += montoParaReversar;
                        else if (type === 'transferencia') nuevoSaldo += montoParaReversar;
                        transaction.update(cuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                }

                if (type === 'transferencia' && transData.targetAccountId) {
                    const targetCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", transData.targetAccountId);
                    const targetCuentaDoc = await transaction.get(targetCuentaRef);
                    if (targetCuentaDoc.exists()) {
                        const currentSaldo = targetCuentaDoc.data().saldo || 0;
                        const targetCuentaMoneda = targetCuentaDoc.data().moneda || "USD";
                        const montoParaTargetReversar = convertirMontoParaCuenta(amount, currency || 'USD', targetCuentaMoneda, exchangeRate, originalAmount);
                        const nuevoSaldo = currentSaldo - montoParaTargetReversar;
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
    }, []);

    const duplicateTransaction = useCallback(async (id: string) => {
        const transactionToCopy = transactions.find(t => t.id === id);
        if (!transactionToCopy || !auth.currentUser) return false;

        try {
            await runTransaction(db, async (transaction) => {
                const { id: _, date, ...rest } = transactionToCopy;
                const cleanRest = Object.fromEntries(
                    Object.entries(rest).filter(([, v]) => v !== undefined)
                ) as Omit<Transaction, 'id' | 'date'>;
                const { accountId, amount, type } = cleanRest;

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

                if (type === 'transferencia' && cleanRest.targetAccountId) {
                    const targetCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", cleanRest.targetAccountId);
                    const targetCuentaDoc = await transaction.get(targetCuentaRef);
                    if (targetCuentaDoc.exists()) {
                        const currentSaldo = targetCuentaDoc.data().saldo || 0;
                        const nuevoSaldo = currentSaldo + amount;
                        transaction.update(targetCuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                }

                const newTransRef = doc(collection(db, "transactions"));
                transaction.set(newTransRef, {
                    ...cleanRest,
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
    }, [transactions]);

    const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id'>) => {
        if (!auth.currentUser) return null;

        try {
            const cleanTransactionData = Object.fromEntries(
                Object.entries(transactionData).filter(([, v]) => v !== undefined)
            ) as Omit<Transaction, 'id'>;

            let newId = "";
            await runTransaction(db, async (transaction) => {
                const { accountId, amount, type } = cleanTransactionData;

                if (accountId) {
                    const cuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", accountId);
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        const currentSaldo = cuentaDoc.data().saldo || 0;
                        const cuentaMoneda = cuentaDoc.data().moneda || "USD";
                        
                        // Determinar el monto en la moneda de la cuenta
                        const montoParaCuenta = convertirMontoParaCuenta(amount, cleanTransactionData.currency || 'USD', cuentaMoneda, cleanTransactionData.exchangeRate, cleanTransactionData.originalAmount);

                        let nuevoSaldo = currentSaldo;
                        if (type === 'ingreso') nuevoSaldo += montoParaCuenta;
                        else if (type === 'gasto') nuevoSaldo -= montoParaCuenta;
                        else if (type === 'transferencia') nuevoSaldo -= montoParaCuenta;
                        
                        transaction.update(cuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                }

                if (type === 'transferencia' && cleanTransactionData.targetAccountId) {
                    const targetCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", cleanTransactionData.targetAccountId);
                    const targetCuentaDoc = await transaction.get(targetCuentaRef);
                    if (targetCuentaDoc.exists()) {
                        const currentSaldo = targetCuentaDoc.data().saldo || 0;
                        const targetCuentaMoneda = targetCuentaDoc.data().moneda || "USD";
                        
                        const montoParaTargetCuenta = convertirMontoParaCuenta(amount, cleanTransactionData.currency || 'USD', targetCuentaMoneda, cleanTransactionData.exchangeRate, cleanTransactionData.originalAmount);

                        const nuevoSaldo = currentSaldo + montoParaTargetCuenta;
                        transaction.update(targetCuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                }

                const newTransRef = doc(collection(db, "transactions"));
                newId = newTransRef.id;
                transaction.set(newTransRef, {
                    ...cleanTransactionData,
                    userId: auth.currentUser!.uid,
                    createdAt: serverTimestamp()
                });
            });
            return newId;
        } catch (error) {
            console.error("Error adding transaction:", error);
            return null;
        }
    }, []);

    const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
        if (!auth.currentUser) return false;
        try {
            await runTransaction(db, async (transaction) => {
                const transRef = doc(db, "transactions", id);
                const transDoc = await transaction.get(transRef);
                if (!transDoc.exists()) throw "Transacción no encontrada";

                const oldData = transDoc.data() as Transaction;
                const cleanUpdates = Object.fromEntries(
                    Object.entries(updates).filter(([, v]) => v !== undefined)
                ) as Partial<Transaction>;
                
                const newData = { ...oldData, ...cleanUpdates };

                // Si ha cambiado la cuenta, el destino, el monto o el tipo, necesitamos recalcular saldos
                const needsBalanceUpdate = 
                    oldData.accountId !== cleanUpdates.accountId || 
                    oldData.targetAccountId !== cleanUpdates.targetAccountId ||
                    oldData.amount !== cleanUpdates.amount || 
                    oldData.type !== cleanUpdates.type ||
                    oldData.currency !== cleanUpdates.currency ||
                    oldData.exchangeRate !== cleanUpdates.exchangeRate ||
                    oldData.originalAmount !== cleanUpdates.originalAmount;

                if (needsBalanceUpdate) {
                    // 1. Revertir impacto anterior
                    if (oldData.accountId) {
                        const oldCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", oldData.accountId);
                        const oldCuentaDoc = await transaction.get(oldCuentaRef);
                        if (oldCuentaDoc.exists()) {
                            const currentSaldo = oldCuentaDoc.data().saldo || 0;
                            const oldCuentaMoneda = oldCuentaDoc.data().moneda || "USD";
                            const montoParaOldCuenta = convertirMontoParaCuenta(oldData.amount, oldData.currency || 'USD', oldCuentaMoneda, oldData.exchangeRate, oldData.originalAmount);

                            let revertedSaldo = currentSaldo;
                            if (oldData.type === 'ingreso') revertedSaldo -= montoParaOldCuenta;
                            else revertedSaldo += montoParaOldCuenta;
                            transaction.update(oldCuentaRef, { saldo: revertedSaldo, actualizadoEn: serverTimestamp() });
                        }
                    }
                    if (oldData.type === 'transferencia' && oldData.targetAccountId) {
                        const oldTargetRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", oldData.targetAccountId);
                        const oldTargetDoc = await transaction.get(oldTargetRef);
                        if (oldTargetDoc.exists()) {
                            const currentSaldo = oldTargetDoc.data().saldo || 0;
                            const oldTargetMoneda = oldTargetDoc.data().moneda || "USD";
                            const montoParaOldTarget = convertirMontoParaCuenta(oldData.amount, oldData.currency || 'USD', oldTargetMoneda, oldData.exchangeRate, oldData.originalAmount);

                            transaction.update(oldTargetRef, { saldo: currentSaldo - montoParaOldTarget, actualizadoEn: serverTimestamp() });
                        }
                    }

                    // 2. Aplicar nuevo impacto
                    if (newData.accountId) {
                        const newCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", newData.accountId);
                        const newCuentaDoc = await transaction.get(newCuentaRef);
                        if (newCuentaDoc.exists()) {
                            const currentSaldo = newCuentaDoc.data().saldo || 0;
                            const newCuentaMoneda = newCuentaDoc.data().moneda || "USD";
                            const montoParaNewCuenta = convertirMontoParaCuenta(newData.amount, newData.currency || 'USD', newCuentaMoneda, newData.exchangeRate, newData.originalAmount);

                            let appliedSaldo = currentSaldo;
                            if (newData.type === 'ingreso') appliedSaldo += montoParaNewCuenta;
                            else appliedSaldo -= montoParaNewCuenta;
                            transaction.update(newCuentaRef, { saldo: appliedSaldo, actualizadoEn: serverTimestamp() });
                        }
                    }
                    if (newData.type === 'transferencia' && newData.targetAccountId) {
                        const newTargetRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", newData.targetAccountId);
                        const newTargetDoc = await transaction.get(newTargetRef);
                        if (newTargetDoc.exists()) {
                            const currentSaldo = newTargetDoc.data().saldo || 0;
                            const newTargetMoneda = newTargetDoc.data().moneda || "USD";
                            const montoParaNewTarget = convertirMontoParaCuenta(newData.amount, newData.currency || 'USD', newTargetMoneda, newData.exchangeRate, newData.originalAmount);

                            transaction.update(newTargetRef, { saldo: currentSaldo + montoParaNewTarget, actualizadoEn: serverTimestamp() });
                        }
                    }
                }

                transaction.update(transRef, cleanUpdates);
            });
            return true;
        } catch (error) {
            console.error("Error updating transaction:", error);
            return false;
        }
    }, []);

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
