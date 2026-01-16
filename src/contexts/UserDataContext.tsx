"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export interface UserData {
    monthlyBudget: number;
    monthlySalary: number;
    savingsPhysical: number;
    savingsUSDT: number;
}

interface UserDataContextType {
    userData: UserData;
    loading: boolean;
    updateUserData: (updates: Partial<UserData>) => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: ReactNode }) {
    const [userData, setUserData] = useState<UserData>({
        monthlyBudget: 0,
        monthlySalary: 0,
        savingsPhysical: 0,
        savingsUSDT: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeDoc: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            // Limpiar listener anterior si existe (ej. cambio de usuario rápido)
            if (unsubscribeDoc) {
                unsubscribeDoc();
                unsubscribeDoc = null;
            }

            if (user) {
                unsubscribeDoc = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserData({
                            monthlyBudget: data.monthlyBudget || 0,
                            monthlySalary: data.monthlySalary || 0,
                            savingsPhysical: data.savingsPhysical || 0,
                            savingsUSDT: data.savingsUSDT || 0
                        });
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user data:", error);
                    setLoading(false);
                });
            } else {
                setUserData({
                    monthlyBudget: 0,
                    monthlySalary: 0,
                    savingsPhysical: 0,
                    savingsUSDT: 0
                });
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
    }, []);

    const updateUserData = async (updates: Partial<UserData>) => {
        if (!auth.currentUser) return;
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), updates);
        } catch (error) {
            console.error("Error updating user data:", error);
        }
    };

    const value = useMemo(() => ({ userData, loading, updateUserData }), [userData, loading]);

    return (
        <UserDataContext.Provider value={value}>
            {children}
        </UserDataContext.Provider>
    );
}

export function useUserData() {
    const context = useContext(UserDataContext);
    if (context === undefined) {
        throw new Error("useUserData must be used within a UserDataProvider");
    }
    return context;
}
