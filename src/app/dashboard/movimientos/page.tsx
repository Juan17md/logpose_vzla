"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TransactionForm from "@/components/forms/TransactionForm";
import RecentTransactions from "@/components/ui/RecentTransactions";
import { FiList, FiPlus, FiArrowLeft } from "react-icons/fi";
import { useEditTransaction } from "@/contexts/EditTransactionContext";
import { motion, AnimatePresence } from "framer-motion";

// Fallback de carga en esqueleto para evitar saltos visuales en PWA
function MovimientosFallback() {
    return (
        <div className="space-y-6 pb-20 md:pb-0 animate-pulse">
            {/* Esqueleto del header */}
            <div className="h-32 bg-slate-900/50 rounded-3xl border border-slate-700/50"></div>
            
            {/* Esqueleto del grid principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 h-[600px] bg-slate-900/50 rounded-3xl border border-slate-700/50"></div>
                <div className="lg:col-span-2 h-[600px] bg-slate-900/50 rounded-3xl border border-slate-700/50"></div>
            </div>
        </div>
    );
}

function MovimientosContent() {
    const { transactionToEdit, clearEditing } = useEditTransaction();
    const [mobileView, setMobileView] = useState<'list' | 'form'>('list');
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const viewParam = searchParams.get("view");

    // Sincroniza la vista móvil automáticamente al cambiar parámetros en la URL o editar transacción
    useEffect(() => {
        if (viewParam === "form" || transactionToEdit) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMobileView('form');
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMobileView('list');
        }
    }, [viewParam, transactionToEdit]);

    // Retorna a la vista de lista y limpia la URL de forma reactiva
    const handleBackToList = () => {
        clearEditing();
        setMobileView('list');
        router.replace('/dashboard/movimientos', { scroll: false });
    };

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            {/* Desktop Header */}
            <div className="hidden md:block bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiList className="text-7xl md:text-9xl text-violet-400" />
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-violet-500/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">Movimientos</h1>
                    <p className="text-slate-400 text-sm md:text-lg">Registra tus ingresos y gastos detalladamente.</p>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-3 px-1">
                <div>
                    <h1 className="text-xl font-black text-white tracking-tight">
                        {mobileView === 'list' ? 'Movimientos' : transactionToEdit ? 'Editar Movimiento' : 'Nuevo Movimiento'}
                    </h1>
                    <p className="text-slate-400 text-xs mt-0.5">
                        {mobileView === 'list' ? 'Registro de actividad' : 'Completa los datos del registro'}
                    </p>
                </div>
                {mobileView === 'form' && (
                    <button
                        onClick={handleBackToList}
                        className="p-2.5 bg-slate-800/80 backdrop-blur-md rounded-xl text-slate-300 hover:text-white border border-slate-700/50 hover:bg-slate-700 transition-all shadow-md active:scale-95"
                    >
                        <FiArrowLeft size={18} />
                    </button>
                )}
            </div>

            {/* Mobile View Switching */}
            <div className="md:hidden relative">
                <AnimatePresence mode="wait">
                    {mobileView === 'list' ? (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <RecentTransactions />

                            {/* FAB for Mobile: alineado con Nami en PWA */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setMobileView('form')}
                                aria-label="Nuevo movimiento"
                                className="fixed bottom-safe-fab-above right-4 md:right-8 w-14 h-14 bg-violet-500 rounded-2xl text-white shadow-xl shadow-violet-500/30 flex items-center justify-center z-50 border border-white/10"
                            >
                                <FiPlus size={28} />
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TransactionForm />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Desktop Layout Grid (Only visible on MD+) */}
            <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda: Formulario */}
                <div className="lg:col-span-1">
                    <TransactionForm />
                </div>

                {/* Columna Derecha: Listado */}
                <div className="lg:col-span-2">
                    <RecentTransactions />
                </div>
            </div>
        </div>
    );
}

export default function MovimientosPage() {
    return (
        <Suspense fallback={<MovimientosFallback />}>
            <MovimientosContent />
        </Suspense>
    );
}
