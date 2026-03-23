"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFixedExpenses } from "@/hooks/useFixedExpenses";
import FixedExpenseForm from "@/components/forms/FixedExpenseForm";
import { FiArrowLeft, FiActivity } from "react-icons/fi";
import Link from "next/link";
import { motion } from "framer-motion";

export default function NuevoGastoFijoPage() {
    const router = useRouter();
    const { addFixedExpense } = useFixedExpenses();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (data: any) => {
        setIsLoading(true);
        const success = await addFixedExpense(data);
        setIsLoading(false);
        if (success) {
            router.push("/dashboard/gastos-fijos");
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            {/* Header */}
            <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiActivity className="text-7xl md:text-9xl text-amber-400" />
                </div>
                
                <div className="relative z-10">
                    <Link
                        href="/dashboard/gastos-fijos"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm font-medium"
                    >
                        <FiArrowLeft /> Volver a Gastos Fijos
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Nuevo Gasto Fijo</h1>
                    <p className="text-slate-400 text-sm">Registra una nueva obligación mensual.</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <FixedExpenseForm onSubmit={handleSubmit} isLoading={isLoading} />
            </motion.div>
        </div>
    );
}
