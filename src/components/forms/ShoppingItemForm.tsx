"use client";

import { useState, useEffect } from "react";
import { FiSave, FiX, FiCheckCircle } from "react-icons/fi";
import { ShoppingItem } from "@/hooks/useShoppingLists";

interface ShoppingItemFormProps {
    initialData?: ShoppingItem | null;
    onSubmit: (data: Omit<ShoppingItem, "id" | "completed" | "purchasedQuantity">) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
}

export default function ShoppingItemForm({ initialData, onSubmit, onCancel, isLoading }: ShoppingItemFormProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || "1");
    // const [price, setPrice] = useState(initialData?.price?.toString() || "");

    // To reset form after add
    useEffect(() => {
        if (!initialData) {
            setName("");
            setQuantity("1");
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        await onSubmit({
            name,
            quantity: parseInt(quantity) || 1,
            price: 0, // Using 0 for new items as they typically input price on purchase
        });

        if (!initialData) {
            setName("");
            setQuantity("1");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-md flex items-center gap-3">
            <div className="flex-1 grid grid-cols-4 gap-3">
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3 bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                    placeholder="Artículo..."
                    disabled={isLoading}
                    autoFocus
                />
                
                <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="col-span-1 bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                    placeholder="Cant."
                    disabled={isLoading}
                />
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="submit"
                    disabled={isLoading || !name}
                    className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl transition-all disabled:opacity-50"
                >
                    <FiCheckCircle size={18} />
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                >
                    <FiX size={18} />
                </button>
            </div>
        </form>
    );
}
