"use client";

import { useState, useEffect } from "react";
import { FiSave, FiX, FiInfo, FiUser, FiFileText } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { Debt } from "@/hooks/useDebts";
import { getBCVRate } from "@/lib/currency";
import { parseNumeroFlexible } from "@/lib/number";
import Select from "@/components/ui/forms/Select";
import DateSelect from "@/components/ui/forms/DateSelect";
import Input from "@/components/ui/forms/Input";
import Textarea from "@/components/ui/forms/Textarea";
import CustomCurrencyInput from "@/components/ui/forms/CurrencyInput";
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
    const [currency, setCurrency] = useState<"USD" | "VES">("USD");
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
        
        const amountVal = parseNumeroFlexible(amountStr);
        const finalAmount = amountVal;
        const originalAmount = amountVal;
        const exchangeRateValue = bcvRate > 0 ? bcvRate : 1;

        await onSubmit({
            personName,
            amount: finalAmount,
            type,
            description,
            dueDate: dueDate ?? undefined,
            currency,
            originalAmount: originalAmount,
            exchangeRate: exchangeRateValue,
        });
    };

    return (
        <div className="relative">
            {/* Decorative background glow */}
<div 
                    key={type}
                    className={`absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${
                        type === 'por_cobrar' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                />
<form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                <div className="space-y-4">
                    {/* Selector de Tipo (sólo si es nuevo) */}
                    {!initialData && (
                        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-sm shadow-inner relative z-10">
                            <div className="relative flex w-full col-span-2">
                                <div
                                    className={`absolute top-1 h-[calc(100%-8px)] rounded-xl border shadow-lg ${
                                        type === "por_cobrar"
                                            ? "left-[4px] w-[calc(50%-6px)] bg-emerald-500/15 border-emerald-500/30"
                                            : "left-[calc(50%+2px)] w-[calc(50%-6px)] bg-red-500/15 border-red-500/30"
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setType("por_cobrar")}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-colors duration-300 text-xs md:text-sm ${
                                        type === "por_cobrar"
                                            ? "text-emerald-300 font-extrabold"
                                            : "text-slate-500 hover:text-slate-300"
                                    }`}
                                    disabled={isLoading}
                                >
                                    ME DEBEN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType("por_pagar")}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-colors duration-300 text-xs md:text-sm ${
                                        type === "por_pagar"
                                            ? "text-red-300 font-extrabold"
                                            : "text-slate-500 hover:text-slate-300"
                                    }`}
                                    disabled={isLoading}
                                >
                                    YO DEBO
                                </button>
                            </div>
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
                                    {(["USD", "VES"] as const).map((curr) => (
                                        <button
                                            key={curr}
                                            type="button"
                                            onClick={() => setCurrency(curr)}
                                            disabled={isLoading || !!initialData}
                                            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-colors duration-300 ${
                                                currency === curr
                                                    ? curr === "USD" 
                                                        ? "bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-lg" 
                                                        : "bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-lg"
                                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent"
                                            }`}
                                        >
                                            {curr === "VES" ? "Bs." : "USD ($)"}
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
                            />
{currency === "VES" && amountStr && (
                                    <div
                                        className="absolute top-9 right-4 pointer-events-none"
                                    >
                                        <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                            ≈ ${(parseNumeroFlexible(amountStr || "0") / (bcvRate || 1)).toLocaleString("es-ES", { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
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
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            icon={<FiFileText />}
                            placeholder="Detalles sobre por qué se generó la deuda..."
                            disabled={isLoading}
                            className="h-28 custom-scrollbar"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={() => onCancel ? onCancel() : router.back()}
                        disabled={isLoading}
                        className="flex-1 py-4 px-4 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] border border-slate-800 text-slate-500 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <FiX size={16} />
                        CANCELAR
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`flex-[2] py-4 px-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 border border-slate-700/50 ${
                            type === 'por_cobrar' 
                            ? 'bg-linear-to-r from-emerald-600 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white '
                            : 'bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white '
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
                    </button>
                </div>
            </form>
        </div>
    );
}
