"use client";

import { useState } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { ShoppingList } from "@/hooks/useShoppingLists";

interface ShoppingListFormProps {
    initialData?: ShoppingList | null;
    onSubmit: (name: string) => Promise<void>;
    isLoading: boolean;
}

export default function ShoppingListForm({ initialData, onSubmit, isLoading }: ShoppingListFormProps) {
    const router = useRouter();
    const [name, setName] = useState(initialData?.name || "");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(name);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto bg-slate-800/50 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-700/50 shadow-xl">
            <div>
                <label className="block text-slate-400 text-sm font-medium mb-1.5 flex items-center gap-2">
                    Nombre de la Lista <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    required
                    maxLength={40}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                    placeholder="Ej: Mercado de la Semana, Cumpleaños..."
                    disabled={isLoading}
                />
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-xl font-bold border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <FiX /> Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 py-3 px-4 rounded-xl font-bold font-montserrat shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <FiSave /> {isLoading ? "Guardando..." : "Guardar Lista"}
                </button>
            </div>
        </form>
    );
}
