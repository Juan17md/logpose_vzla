"use client";

import { useState, useEffect } from "react";
import { FiSave, FiX, FiCheckCircle } from "react-icons/fi";
import { ShoppingItem } from "@/hooks/useShoppingLists";
import Input from "@/components/ui/forms/Input";

interface ShoppingItemFormProps {
    initialData?: ShoppingItem | null;
    onSubmit: (data: Omit<ShoppingItem, "id" | "completed" | "purchasedQuantity">) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
}

export default function ShoppingItemForm({ initialData, onSubmit, onCancel, isLoading }: ShoppingItemFormProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || "");
    // const [price, setPrice] = useState(initialData?.price?.toString() || "");

    useEffect(() => {
        if (!initialData) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName("");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setQuantity("");
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        await onSubmit({
            name,
            quantity: parseInt(quantity.replace(",", ".")) || 1,
            price: 0, // Using 0 for new items as they typically input price on purchase
        });

        if (!initialData) {
            setName("");
            setQuantity("");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-slate-900/50 backdrop-blur-xl p-3 rounded-2xl border border-slate-700/50 shadow-xl flex items-center gap-3 relative overflow-hidden">
            {/* Decorative subtle background glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[30px] pointer-events-none opacity-5 bg-amber-500" />

            <div className="flex-1 grid grid-cols-4 gap-3 relative z-10">
                <div className="col-span-3">
                    <Input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Artículo..."
                        disabled={isLoading}
                        autoFocus
                        className="h-[46px]"
                    />
                </div>
                
                <div className="col-span-1">
                    <Input
                        type="text"
                        inputMode="numeric"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Cant."
                        disabled={isLoading}
                        className="h-[46px] text-center"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
                <button
                    type="submit"
                    disabled={isLoading || !name}
                    className="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.05)]"
                >
                    <FiCheckCircle size={18} />
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="p-3 text-slate-500 hover:text-red-400 hover:bg-white/5 border border-transparent hover:border-white/5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center"
                >
                    <FiX size={18} />
                </button>
            </div>
        </form>
    );
}
