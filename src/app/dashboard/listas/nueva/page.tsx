"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import ShoppingListForm from "@/components/forms/ShoppingListForm";
import { FiArrowLeft, FiShoppingCart } from "react-icons/fi";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function NuevaListaPage() {
    const router = useRouter();
    const { createList } = useShoppingLists();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (name: string) => {
        setIsLoading(true);
        try {
            await createList(name);
            toast.success("Lista creada con éxito");
            router.push("/dashboard/listas");
        } catch (error) {
            toast.error("Hubo un error al crear la lista");
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            {/* Header */}
            <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiShoppingCart className="text-7xl md:text-9xl text-amber-400" />
                </div>
                
                <div className="relative z-10">
                    <Link
                        href="/dashboard/listas"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm font-medium"
                    >
                        <FiArrowLeft /> Volver a Listas
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Nueva Lista</h1>
                    <p className="text-slate-400 text-sm">Crea un nuevo grupo de compras o planificación.</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <ShoppingListForm onSubmit={handleSubmit} isLoading={isLoading} />
            </motion.div>
        </div>
    );
}
