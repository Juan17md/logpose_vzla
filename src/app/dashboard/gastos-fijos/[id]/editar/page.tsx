"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useFixedExpenses, FixedExpense } from "@/hooks/useFixedExpenses";
import FixedExpenseForm from "@/components/forms/FixedExpenseForm";
import { FiArrowLeft, FiEdit3 } from "react-icons/fi";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function EditarGastoFijoPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    
    const { fixedExpenses, loadingFixedExpenses, updateFixedExpense } = useFixedExpenses();
    const [isLoading, setIsLoading] = useState(false);
    const [expense, setExpense] = useState<FixedExpense | null>(null);

    useEffect(() => {
        if (!loadingFixedExpenses) {
            const found = fixedExpenses.find((e) => e.id === id);
            if (found) {
                setExpense(found);
            } else {
                toast.error("No se encontró el gasto fijo.");
                router.push("/dashboard/gastos-fijos");
            }
        }
    }, [fixedExpenses, loadingFixedExpenses, id, router]);

    const handleSubmit = async (data: any) => {
        setIsLoading(true);
        const success = await updateFixedExpense(id, data);
        setIsLoading(false);
        if (success) {
            router.push("/dashboard/gastos-fijos");
            toast.success("Gasto editado correctamente");
        }
    };

    if (loadingFixedExpenses || !expense) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            {/* Header */}
            <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiEdit3 className="text-7xl md:text-9xl text-amber-400" />
                </div>
                
                <div className="relative z-10">
                    <Link
                        href="/dashboard/gastos-fijos"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm font-medium"
                    >
                        <FiArrowLeft /> Volver a Gastos Fijos
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Editar Gasto Fijo</h1>
                    <p className="text-slate-400 text-sm">Modifica los detalles de tu gasto recurrente.</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <FixedExpenseForm initialData={expense} onSubmit={handleSubmit} isLoading={isLoading} />
            </motion.div>
        </div>
    );
}
