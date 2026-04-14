"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, Timestamp, addDoc, serverTimestamp, updateDoc, runTransaction } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createVenezuelaDate } from "@/lib/timezone";

export interface Transaction {
    id: string;
    amount: number;
    type: "ingreso" | "gasto";
    category: string;
    description: string;
    date: Date;
    // Optional extended fields if you have them in database
    currency?: "USD" | "VES";
    originalAmount?: number;
    exchangeRate?: number;
    accountId?: string;
    // Campos de Ancla Monetaria (Bolívar como fuente de verdad)
    montoBs?: number;        // Monto en Bs (FUENTE DE VERDAD inmutable)
    tasaRegistro?: number;   // Tasa BCV congelada al momento del registro
    montoEnCuenta?: number;  // Monto en la moneda nativa de la cuenta
    monedaCuenta?: string;   // Moneda de la cuenta asociada (USD, BS, EUR, USDT)
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
                const { accountId, type } = transData;
                // Ancla Monetaria: usar montoEnCuenta si existe, fallback a amount para datos históricos
                const montoParaSaldo = transData.montoEnCuenta ?? transData.amount;

                if (accountId) {
                    const cuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", accountId);
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        const currentSaldo = cuentaDoc.data().saldo || 0;
                        const nuevoSaldo = type === 'ingreso' ? currentSaldo - montoParaSaldo : currentSaldo + montoParaSaldo;
                        transaction.update(cuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
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
                const { accountId, type } = rest;
                // Ancla Monetaria: usar montoEnCuenta si existe, fallback a amount
                const montoParaSaldo = rest.montoEnCuenta ?? rest.amount;

                if (accountId) {
                    const cuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", accountId);
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        const currentSaldo = cuentaDoc.data().saldo || 0;
                        const nuevoSaldo = type === 'ingreso' ? currentSaldo + montoParaSaldo : currentSaldo - montoParaSaldo;
                        transaction.update(cuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
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
                const { accountId, type } = transactionData;
                // Ancla Monetaria: usar montoEnCuenta si existe, fallback a amount
                const montoParaSaldo = transactionData.montoEnCuenta ?? transactionData.amount;

                if (accountId) {
                    const cuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", accountId);
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        const currentSaldo = cuentaDoc.data().saldo || 0;
                        const nuevoSaldo = type === 'ingreso' ? currentSaldo + montoParaSaldo : currentSaldo - montoParaSaldo;
                        transaction.update(cuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
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

                // Si ha cambiado la cuenta, el monto o el tipo, necesitamos recalcular saldos
                const needsBalanceUpdate = 
                    oldData.accountId !== updates.accountId || 
                    oldData.amount !== updates.amount || 
                    oldData.type !== updates.type;

                if (needsBalanceUpdate) {
                    // Ancla Monetaria: usar montoEnCuenta si existe, fallback a amount
                    const oldMontoParaSaldo = oldData.montoEnCuenta ?? oldData.amount;
                    const newMontoParaSaldo = newData.montoEnCuenta ?? newData.amount;

                    // 1. Revertir impacto en la cuenta anterior
                    if (oldData.accountId) {
                        const oldCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", oldData.accountId);
                        const oldCuentaDoc = await transaction.get(oldCuentaRef);
                        if (oldCuentaDoc.exists()) {
                            const currentSaldo = oldCuentaDoc.data().saldo || 0;
                            const restoredSaldo = oldData.type === 'ingreso' ? currentSaldo - oldMontoParaSaldo : currentSaldo + oldMontoParaSaldo;
                            transaction.update(oldCuentaRef, { saldo: restoredSaldo, actualizadoEn: serverTimestamp() });
                        }
                    }

                    // 2. Aplicar impacto en la cuenta nueva (o misma cuenta con nuevos datos)
                    if (newData.accountId) {
                        // Importante: Si es la misma cuenta, debemos obtener el saldo actualizado (ya revertido arriba)
                        const newCuentaRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", newData.accountId);
                        const newCuentaDoc = await transaction.get(newCuentaRef);
                        if (newCuentaDoc.exists()) {
                            const currentSaldo = newCuentaDoc.data().saldo || 0;
                            const appliedSaldo = newData.type === 'ingreso' ? currentSaldo + newMontoParaSaldo : currentSaldo - newMontoParaSaldo;
                            transaction.update(newCuentaRef, { saldo: appliedSaldo, actualizadoEn: serverTimestamp() });
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
