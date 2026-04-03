"use client";

import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { FiRefreshCw, FiInfo, FiChevronDown, FiAlertCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { MonedaSoportada } from "@/lib/bankAccounts";

export default function ExchangeRateWidget() {
    const { 
        apiRates, 
        tasasManuales, 
        loading, 
        refreshRates, 
        monedaBase, 
        actualizarMonedaBase 
    } = useBankAccounts();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshRates();
        setTimeout(() => setIsRefreshing(false), 1000); // Dar tiempo para la animación
    };

    const CURRENCIES: { value: MonedaSoportada; label: string; icon: string }[] = [
        { value: "USD", label: "USD", icon: "🇺🇸" },
        { value: "BS", label: "BS", icon: "🇻🇪" },
        { value: "USDT", label: "USDT", icon: "🟢" },
    ];


    const renderRateSlot = (label: string, value: number, manual: number | null, symbol: string) => {
        const effectiveValue = manual || value;
        const isManual = !!manual;

        return (
            <div className="flex flex-col px-4 md:px-6 first:pl-0 last:pr-0 border-r border-white/5 last:border-0 group/slot">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-widest">{label}</span>
                    {isManual && (
                        <div className="relative group/manual">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
                        </div>
                    )}
                </div>
                <div className="flex items-baseline gap-1 overflow-hidden">
                    <motion.span 
                        key={effectiveValue}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-base md:text-lg font-black text-white tracking-tighter"
                    >
                        {effectiveValue > 0 
                            ? effectiveValue.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : "---"
                        }
                    </motion.span>
                    <span className="text-[8px] md:text-[9px] text-slate-500 font-black uppercase tracking-tighter">{symbol}/BS</span>
                </div>
            </div>
        );
    };

    return (
        <div className="relative flex items-center h-12 md:h-14 group">
            <div className="relative z-10 flex items-center h-full">
                {/* Tasas de Cambio */}
                <div className="flex-1 flex items-center justify-around pl-4">
                    {renderRateSlot("Oficial USD", apiRates.usd, tasasManuales.USD, "USD")}
                    {renderRateSlot("Oficial EUR", apiRates.eur, tasasManuales.EUR, "EUR")}
                    {renderRateSlot("USDT / BS", apiRates.usdt, tasasManuales.USDT, "USDT")}
                </div>

                {/* Status & Refresh */}
                <div className="flex items-center gap-3 md:gap-4 pl-3 md:pl-4 pr-1 h-full">
                    <div className="hidden lg:flex flex-col items-end">
                        <div className="flex items-center gap-1.5 text-[7px] md:text-[8px] text-emerald-400 font-black uppercase tracking-widest bg-emerald-500/10 px-1.5 md:px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                            EN VIVO
                        </div>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={loading || isRefreshing}
                        className="p-2 text-slate-500 hover:text-white bg-white/0 hover:bg-white/5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                        title="Actualizar Tasas"
                    >
                        <FiRefreshCw 
                            className={cn(
                                (loading || isRefreshing) ? "animate-spin" : "hover:rotate-180 transition-transform duration-700",
                                "text-slate-400"
                            )} 
                            size={14} 
                        />
                    </button>
                </div>
            </div>

            {/* Progress Bar (Visible during refresh) */}
            <AnimatePresence>
                {(loading || isRefreshing) && (
                    <motion.div 
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-linear-to-r from-transparent via-amber-500 to-transparent origin-left z-20"
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
