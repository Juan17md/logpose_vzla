"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDebts, Debt } from "@/hooks/useDebts";
import DebtPaymentForm from "@/components/forms/DebtPaymentForm";
import { FiArrowLeft, FiDollarSign } from "react-icons/fi";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function PagarDeudaPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    
    const { debts, loadingDebts, addPayment } = useDebts();
    const [isLoading, setIsLoading] = useState(false);
    const [debt, setDebt] = useState<Debt | null>(null);

    useEffect(() => {
        if (!loadingDebts) {
            const found = debts.find((d) => d.id === id);
            if (found) {
                setDebt(found);
            } else {
                toast.error("No se encontró la deuda.");
                router.push("/dashboard/deudas");
            }
        }
    }, [debts, loadingDebts, id, router]);

    const handleSubmit = async (paymentData: any) => {
        setIsLoading(true);
        const success = await addPayment(id, paymentData);
        setIsLoading(false);
        if (success) {
            toast.success("Pago registrado correctamente");
            router.push("/dashboard/deudas");
        }
    };

    if (loadingDebts || !debt) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            {/* Header */}
            <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiDollarSign className="text-7xl md:text-9xl text-emerald-400" />
                </div>
                
                <div className="relative z-10">
                    <Link
                        href="/dashboard/deudas"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm font-medium"
                    >
                        <FiArrowLeft /> Volver a Deudas
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Registrar Pago</h1>
                    <p className="text-slate-400 text-sm">Abona a la deuda seleccionada.</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <DebtPaymentForm debt={debt} onSubmit={handleSubmit} isLoading={isLoading} />
            </motion.div>
        </div>
    );
}
