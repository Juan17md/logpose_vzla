"use client";

import { useState, useEffect } from "react";
import { FiSave, FiX, FiInfo, FiFileText, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { Debt, Payment } from "@/hooks/useDebts";
import { getBCVRate } from "@/lib/currency";
import Select from "@/components/ui/forms/Select";
import DateSelect from "@/components/ui/forms/DateSelect";
import Input from "@/components/ui/forms/Input";
import CustomCurrencyInput from "@/components/ui/forms/CurrencyInput";
import { motion, AnimatePresence } from "framer-motion";

interface DebtPaymentFormProps {
    debt: Debt;
    onSubmit: (payment: Omit<Payment, "id">) => Promise<void>;
    onCancel?: () => void;
    isLoading: boolean;
}

export default function DebtPaymentForm({ debt, onSubmit, onCancel, isLoading }: DebtPaymentFormProps) {
    const router = useRouter();

    const [bcvRate, setBcvRate] = useState(0);
    const [amountStr, setAmountStr] = useState("");
    const [currency, setCurrency] = useState<"USD" | "VES">("USD");
    const [date, setDate] = useState<Date>(new Date());
    const [note, setNote] = useState("");

    // Calculate how much is left exactly
    const totalPaid = debt.payments?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;
    const remaining = Math.max(0, debt.amount - totalPaid);

    useEffect(() => {
        getBCVRate().then(setBcvRate);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const amountVal = parseFloat(amountStr);
        let finalAmount = amountVal;
        
        if (currency === "VES" && bcvRate > 0) {
            finalAmount = amountVal / bcvRate;
        }

        await onSubmit({
            amount: finalAmount,
            currency,
            originalAmount: amountVal,
            exchangeRate: bcvRate,
            date: date,
            note,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/40 backdrop-blur-md p-6 rounded-4xl border border-white/5 mb-6 flex flex-col items-center relative overflow-hidden group shadow-2xl"
            >
                <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl pointer-events-none -mr-10 -mt-10 ${
                    debt.type === 'por_cobrar' ? 'bg-emerald-500' : 'bg-red-500'
                }`} />
                
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-2 relative z-10">
                    {debt.type === "por_cobrar" ? "Saldo Pendiente" : "Monto a Pagar"}
                </p>
                <div className="flex items-baseline gap-1 relative z-10">
                    <span className="text-slate-400 text-xl font-medium">$</span>
                    <span className="text-4xl font-black text-white tracking-tight">
                        {remaining.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                    </span>
                </div>
                <div className={`mt-4 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest relative z-10 flex items-center gap-2 ${
                    debt.type === 'por_cobrar' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                    {debt.type === 'por_cobrar' ? <FiTrendingUp /> : <FiTrendingDown />}
                    {debt.personName}
                </div>
            </motion.div>

            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400/80 mb-2.5 ml-0.5">
                                Moneda del Pago
                            </label>
                            <div className="flex p-1 bg-slate-950/60 rounded-[1.25rem] border border-slate-800/80 shadow-inner">
                                {(["USD", "VES"] as const).map((curr) => (
                                    <button
                                        key={curr}
                                        type="button"
                                        onClick={() => {
                                            setCurrency(curr);
                                            setAmountStr("");
                                        }}
                                        disabled={isLoading}
                                        className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 ${
                                            currency === curr
                                                ? curr === "USD" 
                                                    ? "bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                                                    : "bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent"
                                        }`}
                                    >
                                        {curr === "VES" ? "Bs (VES)" : "USD ($)"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <CustomCurrencyInput
                            label={currency === "VES" ? "Monto en Bolívares" : "Monto en Dólares"}
                            placeholder="0.00"
                            prefix={currency === "VES" ? "Bs. " : "$ "}
                            decimalsLimit={2}
                            onValueChange={(value) => setAmountStr(value || "")}
                            value={amountStr}
                            required
                            max={currency === "USD" ? remaining : remaining * bcvRate}
                        />
                        
                        <AnimatePresence>
                            {currency === "VES" && amountStr && (
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

                {currency === "VES" && (
                    <div className="text-[11px] font-medium text-amber-400/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex items-center gap-2">
                        <FiInfo className="shrink-0" />
                        <span>Monto exacto para saldar: <span className="font-bold underline tracking-wider">Bs. {(remaining * bcvRate).toLocaleString("es-ES", { maximumFractionDigits: 2 })}</span> (Tasa: {bcvRate})</span>
                    </div>
                )}

                <DateSelect
                    label="Fecha del Pago"
                    value={date}
                    onChange={(d) => d && setDate(d)}
                    required
                    disabled={isLoading}
                    clearable={false}
                    maxDate={new Date()}
                />

                <Input
                    label="Nota o Referencia"
                    placeholder="Ej: Pago móvil, Transferencia #1234..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    icon={<FiFileText />}
                    disabled={isLoading}
                />
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
                    className="flex-2 py-4 px-6 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all border border-white/10"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <FiSave size={16} />
                            ABONAR PAGO
                        </>
                    )}
                </motion.button>
            </div>
        </form>
    );
}
