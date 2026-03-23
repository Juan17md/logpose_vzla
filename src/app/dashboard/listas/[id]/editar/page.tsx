"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useShoppingLists, ShoppingList } from "@/hooks/useShoppingLists";
import ShoppingListForm from "@/components/forms/ShoppingListForm";
import { FiArrowLeft, FiEdit3 } from "react-icons/fi";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function EditarListaPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    
    const { lists, loading, updateListName } = useShoppingLists();
    const [isLoading, setIsLoading] = useState(false);
    const [list, setList] = useState<ShoppingList | null>(null);

    useEffect(() => {
        if (!loading) {
            const found = lists.find((l) => l.id === id);
            if (found) {
                setList(found);
            } else {
                toast.error("No se encontró la lista.");
                router.push("/dashboard/listas");
            }
        }
    }, [lists, loading, id, router]);

    const handleSubmit = async (name: string) => {
        setIsLoading(true);
        try {
            await updateListName(id, name);
            toast.success("Nombre de la lista actualizado");
            router.push("/dashboard/listas");
        } catch (error) {
            toast.error("Hubo un error al actualizar la lista");
        }
        setIsLoading(false);
    };

    if (loading || !list) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            {/* Header */}
            <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiEdit3 className="text-7xl md:text-9xl text-amber-400" />
                </div>
                
                <div className="relative z-10">
                    <Link
                        href="/dashboard/listas"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm font-medium"
                    >
                        <FiArrowLeft /> Volver a Listas
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Editar Nombre de Lista</h1>
                    <p className="text-slate-400 text-sm">Cambia el identificador principal de tu grupo de compras.</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <ShoppingListForm initialData={list} onSubmit={handleSubmit} isLoading={isLoading} />
            </motion.div>
        </div>
    );
}
