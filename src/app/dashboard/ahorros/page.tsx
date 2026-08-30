"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import GoalsSection from "@/components/savings/GoalsSection";
import { FiTarget } from "react-icons/fi";

export default function AhorrosPage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-slate-400">Debes iniciar sesión para ver esta página.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-32 md:pb-10">
            {/* Header */}
            <div className="relative overflow-hidden bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] group min-h-[130px] flex items-center">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between w-full gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white leading-none mb-2 flex items-center gap-3">
                            <FiTarget className="text-violet-400" />
                            Metas de Ahorro
                        </h1>
                        <p className="text-sm text-slate-500">
                            Define y sigue tus objetivos financieros
                        </p>
                    </div>
                </div>
            </div>

            {/* Goals Section */}
            <GoalsSection userId={user.uid} />
        </div>
    );
}
