"use client";

import { useState, useEffect } from "react";
import { FiSave, FiX, FiInfo } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { Debt } from "@/hooks/useDebts";
import { getBCVRate } from "@/lib/currency";

interface DebtFormProps {
    initialData?: Debt | null;
    defaultType?: "por_cobrar" | "por_pagar";
    onSubmit: (data: Omit<Debt, "id" | "createdAt" | "payments" | "isPaid">) => Promise<void>;
    isLoading: boolean;
}

export default function DebtForm({ initialData, defaultType = "por_cobrar", onSubmit, isLoading }: DebtFormProps) {
    const router = useRouter();

    const [bcvRate, setBcvRate] = useState(0);
    const [personName, setPersonName] = useState(initialData?.personName || "");
    const [amountStr, setAmountStr] = useState(initialData?.amount?.toString() || "");
    const [currency, setCurrency] = useState<"USD" | "BS">("USD");
    const [dueDate, setDueDate] = useState(
        initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : ""
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
            dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-slate-800/50 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-700/50 shadow-xl">
            <div className="space-y-4">
                
                {/* Selector de Tipo (sólo si es nuevo) */}
                {!initialData && (
                    <div className="flex bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50">
                        <button
                            type="button"
                            onClick={() => setType("por_cobrar")}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                                type === "por_cobrar"
                                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                                    : "text-slate-400 hover:text-slate-300"
                            }`}
                            disabled={isLoading}
                        >
                            Me deben (Por cobrar)
                        </button>
                        <button
                            type="button"
                            onClick={() => setType("por_pagar")}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                                type === "por_pagar"
                                    ? "bg-red-500/20 text-red-400 shadow-sm"
                                    : "text-slate-400 hover:text-slate-300"
                            }`}
                            disabled={isLoading}
                        >
                            Yo debo (Por pagar)
                        </button>
                    </div>
                )}

                <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1.5">Nombre de la persona/entidad <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        required
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                        placeholder="Ej: Juan Pérez"
                        disabled={isLoading}
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="block text-slate-400 text-sm font-medium mb-1.5">Monto <span className="text-red-400">*</span></label>
                        <input
                            type="number"
                            required
                            min="0.1"
                            step="0.01"
                            value={amountStr}
                            onChange={(e) => setAmountStr(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            placeholder="Ej: 50.00"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-sm font-medium mb-1.5">Moneda</label>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value as "USD" | "BS")}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                            disabled={isLoading || !!initialData} // Prevenir cambio si ya existe
                        >
                            <option value="USD">USD ($)</option>
                            <option value="BS">VED (Bs.)</option>
                        </select>
                    </div>
                </div>

                {currency === "BS" && (
                    <div className="text-xs text-amber-400/80 bg-amber-500/10 p-2 rounded-lg flex items-center gap-2">
                        <FiInfo />
                        <span>Equivalente: ${(parseFloat(amountStr || "0") / (bcvRate || 1)).toLocaleString("es-ES", { maximumFractionDigits: 2 })} (Tasa BCV: {bcvRate})</span>
                    </div>
                )}

                <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1.5 flex items-center gap-2">
                        Fecha Límite <span className="text-slate-500 text-xs font-normal">(Opcional)</span>
                    </label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors [color-scheme:dark]"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1.5 flex items-center gap-2">
                        Descripción <span className="text-slate-500 text-xs font-normal">(Opcional)</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors resize-none h-24 custom-scrollbar"
                        placeholder="Detalles sobre por qué se generó la deuda..."
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-2">
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
                    className="flex-1 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 py-3 px-4 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <FiSave />
                    {isLoading ? "Guardando..." : "Guardar Deuda"}
                </button>
            </div>
        </form>
    );
}
