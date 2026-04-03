"use client";

import { useState, useEffect } from "react";
import { FiSave, FiX, FiInfo, FiUser, FiFileText } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { Debt } from "@/hooks/useDebts";
import { getBCVRate } from "@/lib/currency";
import Select from "@/components/ui/forms/Select";
import DateSelect from "@/components/ui/forms/DateSelect";
import Input from "@/components/ui/forms/Input";
import CustomCurrencyInput from "@/components/ui/forms/CurrencyInput";
import { motion, AnimatePresence } from "framer-motion";

interface DebtFormProps {
    initialData?: Debt | null;
    defaultType?: "por_cobrar" | "por_pagar";
    onSubmit: (data: Omit<Debt, "id" | "createdAt" | "payments" | "isPaid">) => Promise<void>;
    onCancel?: () => void;
    isLoading: boolean;
}

export default function DebtForm({ initialData, defaultType = "por_cobrar", onSubmit, onCancel, isLoading }: DebtFormProps) {
    const router = useRouter();

    const [bcvRate, setBcvRate] = useState(0);
    const [personName, setPersonName] = useState(initialData?.personName || "");
    const [amountStr, setAmountStr] = useState(initialData?.amount?.toString() || "");
    const [currency, setCurrency] = useState<"USD" | "BS">("USD");
    const [dueDate, setDueDate] = useState<Date | null>(
        initialData?.dueDate ? new Date(initialData.dueDate) : null
    );
    const [description, setDescription] = useState(initialData?.description || "");
    const [type, setType] = useState<"por_cobrar" | "por_pagar">(initialData?.type || defaultType);

    useEffect(() => {
        getBCVRate().then(setBcvRate);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const amountVal = parseFloat(amountStr);
        let finalAmount = amountVal;
        
        if (currency === "BS" && bcvRate > 0) {
            finalAmount = amountVal / bcvRate;
        }

        await onSubmit({
            personName,
            amount: finalAmount,
            type,
            description,
            dueDate: dueDate ?? undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
                {/* Decorative background glow */}
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={type}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${
                            type === 'por_cobrar' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                    />
                </AnimatePresence>

                <div className="space-y-6">
                    {/* Selector de Tipo (sólo si es nuevo) */}
                    {!initialData && (
                        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/60 rounded-[1.25rem] border border-slate-800/80 text-sm shadow-inner relative z-10">
                            <button
                                type="button"
                                onClick={() => setType("por_cobrar")}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300 ${
                                    type === "por_cobrar"
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                                }`}
                                disabled={isLoading}
                            >
                                ME DEBEN
                            </button>
                            <button
                                type="button"
                                onClick={() => setType("por_pagar")}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300 ${
                                    type === "por_pagar"
                                        ? "bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                                }`}
                                disabled={isLoading}
                            >
                                YO DEBO
                            </button>
                        </div>
                    )}

                    <Input
                        label="Nombre del contacto"
                        placeholder="Ej: Juan Pérez"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        icon={<FiUser />}
                        required
                        disabled={isLoading}
                    />

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400/80 mb-2.5 ml-0.5">
                                    Moneda
                                </label>
                                <div className="flex p-1 bg-slate-950/60 rounded-[1.25rem] border border-slate-800/80 shadow-inner">
                                    {(["USD", "BS"] as const).map((curr) => (
                                        <button
                                            key={curr}
                                            type="button"
                                            onClick={() => setCurrency(curr)}
                                            disabled={isLoading || !!initialData}
                                            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 ${
                                                currency === curr
                                                    ? curr === "USD" 
                                                        ? "bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                                                        : "bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent"
                                            }`}
                                        >
                                            {curr === "BS" ? "Bs." : "USD ($)"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <CustomCurrencyInput
                                label={currency === "BS" ? "Monto en Bolívares" : "Monto en Dólares"}
                                placeholder="0.00"
                                prefix={currency === "BS" ? "Bs. " : "$ "}
                                decimalsLimit={2}
                                onValueChange={(value) => setAmountStr(value || "")}
                                value={amountStr}
                                required
                            />
                            
                            <AnimatePresence>
                                {currency === "BS" && amountStr && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-9 right-4 pointer-events-none"
                                    >
                                        <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                            ≈ ${(parseFloat(amountStr || "0") / (bcvRate || 1)).toLocaleString("es-ES", { maximumFractionDigits: 2 })}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <DateSelect
                        label="Fecha Límite"
                        value={dueDate}
                        onChange={setDueDate}
                        placeholder="Sin fecha límite"
                        disabled={isLoading}
                        clearable={true}
                    />

                    <div className="space-y-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400/80 mb-2.5 ml-0.5">
                            Descripción <span className="opacity-40">(Opcional)</span>
                        </label>
                        <div className="relative">
                            <div className="absolute top-4 left-4 pointer-events-none text-slate-500">
                                <FiFileText />
                            </div>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-[#0A0E1A]/80 border border-white/6 text-white text-sm font-medium rounded-xl py-3.5 pl-11 pr-4 outline-none transition-all duration-300 placeholder:text-slate-600 hover:border-white/12 hover:bg-[#0A0E1A] focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/40 focus:shadow-[0_0_20px_rgba(202,138,4,0.08)] resize-none h-28 custom-scrollbar"
                                placeholder="Detalles sobre por qué se generó la deuda..."
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-white/5">
                <button
                    type="button"
                    onClick={() => onCancel ? onCancel() : router.back()}
                    disabled={isLoading}
                    className="flex-1 py-4 px-4 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] border border-white/5 text-slate-500 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <FiX size={16} />
                    CANCELAR
                </button>
                <motion.button
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className={`flex-2 py-4 px-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-white/10 ${
                        type === 'por_cobrar' 
                        ? 'bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                        : 'bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-500/20'
                    }`}
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <FiSave size={16} />
                            {initialData ? "GUARDAR CAMBIOS" : "REGISTRAR DEUDA"}
                        </>
                    )}
                </motion.button>
            </div>
        </form>
    );
}
