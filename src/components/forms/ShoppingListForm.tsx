"use client";

import { useState } from "react";
import { FiSave, FiX, FiTag } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { ShoppingList } from "@/hooks/useShoppingLists";
import Input from "@/components/ui/forms/Input";
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
        <div className="max-w-xl mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-4 md:p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden">
            {/* Decorative background glow */}
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[60px] pointer-events-none opacity-10 bg-amber-500" />

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                <Input
                    label="Nombre de la Lista"
                    placeholder="Ej: Mercado de la Semana, Cumpleaños..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    icon={<FiTag />}
                    required
                    maxLength={40}
                    disabled={isLoading}
                />

                <div className="flex gap-3 pt-6 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        disabled={isLoading}
                        className="flex-1 py-4 px-4 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] border border-slate-800 text-slate-500 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <FiX size={16} />
                        CANCELAR
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-4 px-4 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] border border-slate-800 text-slate-500 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <FiSave size={16} />
                                GUARDAR LISTA
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
