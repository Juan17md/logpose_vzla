"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { Transaction } from '@/hooks/useTransactions'; // Ensure Transaction type checks out

interface EditTransactionContextType {
    transactionToEdit: Transaction | null;
    startEditing: (t: Transaction) => void;
    clearEditing: () => void;
}

const EditTransactionContext = createContext<EditTransactionContextType | undefined>(undefined);

export function EditTransactionProvider({ children }: { children: ReactNode }) {
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

    const startEditing = (t: Transaction) => {
        setTransactionToEdit(t);
    };

    const clearEditing = () => {
        setTransactionToEdit(null);
    };

    const value = useMemo(() => ({ transactionToEdit, startEditing, clearEditing }), [transactionToEdit]);

    return (
        <EditTransactionContext.Provider value={value}>
            {children}
        </EditTransactionContext.Provider>
    );
}

export function useEditTransaction() {
    const context = useContext(EditTransactionContext);
    if (context === undefined) {
        throw new Error("useEditTransaction must be used within an EditTransactionProvider");
    }
    return context;
}
