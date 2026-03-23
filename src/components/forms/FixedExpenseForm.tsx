"use client";

import { useState } from "react";
import { FiSave, FiX, FiInfo } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { FixedExpense } from "@/hooks/useFixedExpenses";

interface FixedExpenseFormProps {
    initialData?: FixedExpense | null;
    onSubmit: (data: Omit<FixedExpense, "id" | "createdAt" | "lastPaidDate">) => Promise<void>;
    isLoading: boolean;
}

export default function FixedExpenseForm({ initialData, onSubmit, isLoading }: FixedExpenseFormProps) {
    const router = useRouter();

    const [title, setTitle] = useState(initialData?.title || "");
    const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
    const [dueDay, setDueDay] = useState(initialData?.dueDay?.toString() || "");
    
    // Configurar categoría inicial: si no está en las por defecto, va a "Otros"
    const knownCategories = ["Servicios", "Hogar", "Suscripciones", "Deudas", "Educación"];
    const initialCategory = initialData?.category 
        ? (knownCategories.includes(initialData.category) ? initialData.category : "Otros") 
        : "Servicios";
    
    const [category, setCategory] = useState(initialCategory);
    const [customCategory, setCustomCategory] = useState(
        initialCategory === "Otros" ? (initialData?.category || "") : ""
    );
    const [description, setDescription] = useState(initialData?.description || "");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalCategory = category === "Otros" ? customCategory : category;
        
        await onSubmit({
            title,
            amount: parseFloat(amount),
            dueDay: parseInt(dueDay),
            category: finalCategory,
            description,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-slate-800/50 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-700/50 shadow-xl">
            <div className="space-y-4">
                <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1.5">Nombre del Gasto <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                        placeholder="Ej: Internet, Alquiler, Gimnasio"
                        disabled={isLoading}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate-400 text-sm font-medium mb-1.5">Monto (USD) <span className="text-red-400">*</span></label>
                        <input
                            type="number"
                            required
                            min="0.1"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            placeholder="Ej: 50.00"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-sm font-medium mb-1.5">Día de Pago (1-31) <span className="text-red-400">*</span></label>
                        <input
                            type="number"
                            required
                            min="1"
                            max="31"
                            value={dueDay}
                            onChange={(e) => setDueDay(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            placeholder="Ej: 15"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1.5">Categoría <span className="text-red-400">*</span></label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                        disabled={isLoading}
                    >
                        {knownCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="Otros">Otro (Especificar)</option>
                    </select>
                </div>

                {category === "Otros" && (
                    <div>
                        <label className="block text-slate-400 text-sm font-medium mb-1.5">Especificar Categoría <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            required
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            placeholder="P. ej. Mascotas"
                            disabled={isLoading}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1.5 flex items-center gap-2">
                        Descripción <span className="text-slate-500 text-xs font-normal">(Opcional)</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors resize-none h-24 custom-scrollbar"
                        placeholder="Detalles adicionales sobre este gasto fijo..."
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* Aviso */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-400/90 text-sm">
                <FiInfo className="shrink-0 mt-0.5" />
                <p>Este gasto aparecerá en tu calendario mensual según el día indicado.</p>
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
                    {isLoading ? "Guardando..." : "Guardar Gasto"}
                </button>
            </div>
        </form>
    );
}
