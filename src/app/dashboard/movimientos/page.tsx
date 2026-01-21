"use client";

import { useState, useEffect } from "react";
import TransactionForm from "@/components/forms/TransactionForm";
import RecentTransactions from "@/components/ui/RecentTransactions";
import { FiList, FiPlus, FiArrowLeft } from "react-icons/fi";
import { useEditTransaction } from "@/contexts/EditTransactionContext";
import { motion, AnimatePresence } from "framer-motion";

export default function MovimientosPage() {
    const { transactionToEdit, clearEditing } = useEditTransaction();
    const [mobileView, setMobileView] = useState<'list' | 'form'>('list');

    // Automatically switch to form view when editing starts
    useEffect(() => {
        if (transactionToEdit) {
            setMobileView('form');
        }
    }, [transactionToEdit]);

    // Handler to go back to list
    const handleBackToList = () => {
        clearEditing();
        setMobileView('list');
    };

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            {/* Desktop Header */}
            <div className="hidden md:block bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiList className="text-7xl md:text-9xl text-emerald-400" />
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">Movimientos</h1>
                    <p className="text-slate-400 text-sm md:text-lg">Registra tus ingresos y gastos detalladamente.</p>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-white">Movimientos</h1>
                    <p className="text-slate-400 text-sm">Registro de actividad</p>
                </div>
                {mobileView === 'form' && (
                    <button
                        onClick={handleBackToList}
                        className="p-2 bg-slate-800 rounded-xl text-slate-300 hover:text-white border border-slate-700"
                    >
                        <FiArrowLeft size={20} />
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

                            {/* FAB for Mobile */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setMobileView('form')}
                                className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-500 rounded-full text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center z-50 border border-white/10"
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
