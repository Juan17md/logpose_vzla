"use client";

import { useState, useEffect } from "react";
import { FiSave, FiX, FiInfo } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { Debt, Payment } from "@/hooks/useDebts";
import { getBCVRate } from "@/lib/currency";

interface DebtPaymentFormProps {
    debt: Debt;
    onSubmit: (payment: Omit<Payment, "id">) => Promise<void>;
    isLoading: boolean;
}

export default function DebtPaymentForm({ debt, onSubmit, isLoading }: DebtPaymentFormProps) {
    const router = useRouter();

    const [bcvRate, setBcvRate] = useState(0);
    const [amountStr, setAmountStr] = useState("");
    const [currency, setCurrency] = useState<"USD" | "VES">("USD");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
            date: new Date(`${date}T00:00:00`),
            note,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-slate-800/50 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-700/50 shadow-xl">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 mb-6 flex flex-col items-center">
                <p className="text-slate-400 text-sm mb-1">
                    {debt.type === "por_cobrar" ? "Monto restante por cobrar a" : "Monto restante por pagar a"} <span className="text-amber-400 font-medium">{debt.personName}</span>
                </p>
                <p className="text-3xl font-bold text-white">${remaining.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate-400 text-sm font-medium mb-1.5">Monto del Pago <span className="text-red-400">*</span></label>
                        <input
                            type="number"
                            required
                            min="0.1"
                            max={currency === "USD" ? remaining : remaining * bcvRate}
                            step="0.01"
                            value={amountStr}
                            onChange={(e) => setAmountStr(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            placeholder="Ej: 20.00"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-sm font-medium mb-1.5">Moneda del Pago</label>
                        <select
                            value={currency}
                            onChange={(e) => {
                                setCurrency(e.target.value as "USD" | "VES");
                                setAmountStr(""); // Reset input to avoid confusion on switch
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                            disabled={isLoading}
                        >
                            <option value="USD">USD ($)</option>
                            <option value="VES">VES (Bs.)</option>
                        </select>
                    </div>
                </div>

                {currency === "VES" && (
                    <div className="text-xs text-amber-400/80 bg-amber-500/10 p-2 rounded-lg flex items-center gap-2">
                        <FiInfo />
                        <span>Monto exacto para saldar: Bs.{(remaining * bcvRate).toLocaleString("es-ES", { maximumFractionDigits: 2 })} (Tasa: {bcvRate})</span>
                    </div>
                )}

                <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1.5">Fecha del Pago <span className="text-red-400">*</span></label>
                    <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors [color-scheme:dark]"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1.5">Nota o Referencia <span className="text-slate-500 text-xs font-normal">(Opcional)</span></label>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                        placeholder="Ej: Transferencia Mercantil #1234..."
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-xl font-bold border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <FiX />
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 py-3 px-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <FiSave />
                    {isLoading ? "Guardando..." : "Abonar Pago"}
                </button>
            </div>
        </form>
    );
}
