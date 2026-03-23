"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDebts } from "@/hooks/useDebts";
import DebtForm from "@/components/forms/DebtForm";
import { FiArrowLeft, FiFileText } from "react-icons/fi";
import Link from "next/link";
import { motion } from "framer-motion";

export default function NuevaDeudaPage() {
    const router = useRouter();
    const { addDebt } = useDebts();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (data: any) => {
        setIsLoading(true);
        const success = await addDebt(data);
        setIsLoading(false);
        if (success) {
            router.push("/dashboard/deudas");
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            {/* Header */}
            <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiFileText className="text-7xl md:text-9xl text-amber-400" />
                </div>
                
                <div className="relative z-10">
                    <Link
                        href="/dashboard/deudas"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm font-medium"
                    >
                        <FiArrowLeft /> Volver a Deudas
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Nueva Deuda</h1>
                    <p className="text-slate-400 text-sm">Registra dinero que te deben o que debes.</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <DebtForm onSubmit={handleSubmit} isLoading={isLoading} />
            </motion.div>
        </div>
    );
}
