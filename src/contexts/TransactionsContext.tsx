"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createVenezuelaDate } from "@/lib/timezone";
import {
  crearMovimiento,
  eliminarMovimiento,
  actualizarMovimiento,
  type MovimientoData,
} from "@/lib/movimientos";

export interface Transaction {
    id: string;
    amount: number;
    type: "ingreso" | "gasto" | "transferencia";
    category: string;
    subcategory?: string;
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

    // Todas las escrituras delegan en el servicio de dominio (src/lib/movimientos.ts),
    // única implementación del impacto de un movimiento sobre los saldos.

    const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>): Promise<string | null> => {
        if (!auth.currentUser) return null;

        const resultado = await crearMovimiento(
            db,
            auth.currentUser.uid,
            transaction as MovimientoData
        );

        if (!resultado.exito) {
            console.error("Error adding transaction:", resultado.error);
            return null;
        }
        return resultado.id;
    }, []);

    const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>): Promise<boolean> => {
        if (!auth.currentUser) return false;

        const resultado = await actualizarMovimiento(
            db,
            auth.currentUser.uid,
            id,
            updates as Partial<MovimientoData>
        );

        if (!resultado.exito) {
            console.error("Error updating transaction:", resultado.error);
            return false;
        }
        return true;
    }, []);

    const deleteTransaction = useCallback(async (id: string): Promise<boolean> => {
        if (!auth.currentUser) return false;

        const resultado = await eliminarMovimiento(db, auth.currentUser.uid, id);
        if (!resultado.exito) {
            console.error("Error deleting transaction:", resultado.error);
            return false;
        }
        return true;
    }, []);

    const duplicateTransaction = useCallback(async (id: string): Promise<boolean> => {
        const transactionToCopy = transactions.find(t => t.id === id);
        if (!transactionToCopy || !auth.currentUser) return false;

        const { id: _id, date: _fecha, ...rest } = transactionToCopy;
        void _id;
        void _fecha;
        const resultado = await crearMovimiento(
            db,
            auth.currentUser.uid,
            {
                ...rest,
                date: createVenezuelaDate(),
            } as MovimientoData
        );

        if (!resultado.exito) {
            console.error("Error duplicating transaction:", resultado.error);
            return false;
        }
        return true;
    }, [transactions]);

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