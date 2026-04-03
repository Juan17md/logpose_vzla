"use client";

import { useState, useEffect } from "react";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertCircle, FiCreditCard, FiPlus, FiX } from "react-icons/fi";
import { useRouter } from "next/navigation";

export default function AvisoCuentasFaltantes() {
    const { cuentas, loading } = useBankAccounts();
    const [isVisible, setIsVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Mostrar con retardo si no hay cuentas y no ha sido descartado
        if (!loading && cuentas.length === 0 && !dismissed) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [cuentas.length, loading, dismissed]);

    // Cerrar inmediatamente si aparecen cuentas
    useEffect(() => {
        if (cuentas.length > 0) {
            setIsVisible(false);
        }
    }, [cuentas.length]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed bottom-0 right-0 z-100 p-4 md:p-8 pointer-events-none w-full md:w-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 100, x: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                        className="w-full md:w-[400px] bg-slate-950/80 backdrop-blur-2xl border border-amber-500/30 rounded-4xl shadow-[0_30px_70px_rgba(0,0,0,0.6),0_0_40px_rgba(245,158,11,0.1)] overflow-hidden pointer-events-auto"
                    >
                        {/* Decorative background glow */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="p-7 relative z-10">
                            {/* Close Button */}
                            <button 
                                onClick={() => { setIsVisible(false); setDismissed(true); }}
                                className="absolute top-5 right-5 p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                <FiX size={18} />
                            </button>

                            <div className="flex gap-6 items-start">
                                <div className="shrink-0 w-14 h-14 bg-linear-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 border border-white/10 group">
                                    <FiCreditCard className="text-2xl text-slate-950 group-hover:scale-110 transition-transform duration-300" />
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-lg font-black text-white mb-1 uppercase tracking-wider">
                                        ¡Atención Requerida!
                                    </h3>
                                    <p className="text-slate-400 text-xs leading-relaxed mb-6">
                                        Tu billetera está vacía. Para comenzar a registrar movimientos, debes <span className="text-amber-400 font-black">configurar tu primera cuenta</span> bancaria o de efectivo.
                                    </p>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                router.push("/dashboard/cuentas");
                                                setIsVisible(false);
                                            }}
                                            className="flex-1 py-3 bg-white text-slate-950 font-black rounded-xl transition-all hover:bg-amber-400 shadow-lg shadow-white/5 flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest"
                                        >
                                            <FiPlus size={14} />
                                            Configurar
                                        </button>
                                        
                                        <button
                                            onClick={() => { setIsVisible(false); setDismissed(true); }}
                                            className="px-4 py-3 text-slate-500 hover:text-slate-300 text-[10px] font-black transition-all uppercase tracking-widest"
                                        >
                                            Después
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="h-1 w-full bg-slate-900">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                                className="h-full bg-linear-to-r from-amber-500 to-orange-500"
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
