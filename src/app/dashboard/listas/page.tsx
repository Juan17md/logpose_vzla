"use client";

// Shopping Lists Page - Redesigned
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import ShoppingItemForm from "@/components/forms/ShoppingItemForm";
import { useShoppingLists, ShoppingList, ShoppingItem } from "@/hooks/useShoppingLists";
import { FiShoppingCart, FiPlus, FiTrash2, FiSquare, FiList, FiMinus, FiSearch, FiEdit2, FiCopy, FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import PaginationControls from "@/components/ui/PaginationControls";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getBCVRate } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";

export default function ShoppingListsPage() {
    const router = useRouter();
    const { lists, loading, createList, deleteList, addItem, toggleItem, deleteItem, updateItemProgress, updateListName, duplicateList, updateItem } = useShoppingLists();
    const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
    const [bcvRate, setBcvRate] = useState(0);
    const [filterText, setFilterText] = useState("");
    const [itemFilterText, setItemFilterText] = useState("");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "za">("newest");
    const [confirmConfig, setConfirmConfig] = useState<{ type: "duplicate" | "delete" | null, listId: string }>({ type: null, listId: "" });
    const [showItemForm, setShowItemForm] = useState(false);
    const [isEditingItem, setIsEditingItem] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const detailRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getBCVRate().then(setBcvRate);
    }, []);

    useEffect(() => {
        if (selectedList && window.innerWidth < 1024) {
            setTimeout(() => {
                detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [selectedList]);

    const handleAddListClick = () => {
        router.push("/dashboard/listas/nueva");
    };

    const handleEditListNameClick = () => {
        if (!selectedList) return;
        router.push(`/dashboard/listas/${selectedList.id}/editar`);
    };

    const handleAddItemClick = () => {
        setIsEditingItem(false);
        setEditingItemId(null);
        setShowItemForm(true);
    };

    const handleEditItemClick = (item: ShoppingItem) => {
        setIsEditingItem(true);
        setEditingItemId(item.id);
        setShowItemForm(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleItemSubmit = async (data: any) => {
        if (!selectedList) return;
        
        try {
            if (isEditingItem && editingItemId) {
                await updateItem(selectedList.id, selectedList.items, editingItemId, {
                    name: data.name,
                    quantity: data.quantity,
                    price: data.price
                });
                toast.success("Artículo actualizado");
                setEditingItemId(null);
                setIsEditingItem(false);
            } else {
                await addItem(selectedList.id, {
                    name: data.name,
                    quantity: data.quantity,
                    price: data.price
                });
                toast.success("Artículo agregado a la lista");
                setShowItemForm(false); 
            }
        } catch (error) {
            toast.error("Error al procesar el artículo");
        }
    };

    const executeConfirm = async () => {
        if (!confirmConfig.type || !confirmConfig.listId) return;
        if (confirmConfig.type === "duplicate") {
            await duplicateList(confirmConfig.listId);
            toast.success("Lista duplicada");
        } else if (confirmConfig.type === "delete") {
            if (selectedList?.id === confirmConfig.listId) setSelectedList(null);
            await deleteList(confirmConfig.listId);
            toast.success("Lista eliminada");
        }
        setConfirmConfig({ type: null, listId: "" });
    };

    const calculateTotal = (items: ShoppingItem[]) => {
        return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    };

    const filteredLists = useMemo(() => {
        let result = [...lists];

        // Filter
        if (filterText) {
            result = result.filter(list => list.name.toLowerCase().includes(filterText.toLowerCase()));
        }

        // Sort
        // Helper to get timestamp value from Timestamp or Date
        const getTime = (date: Date | import('firebase/firestore').Timestamp | undefined): number => {
            if (!date) return 0;
            if (date instanceof Date) return date.getTime();
            if ('seconds' in date) return date.seconds * 1000;
            return 0;
        };

        result.sort((a, b) => {
            switch (sortBy) {
                case "az":
                    return a.name.localeCompare(b.name);
                case "za":
                    return b.name.localeCompare(a.name);
                case "oldest":
                    return getTime(a.createdAt) - getTime(b.createdAt);
                case "newest":
                default:
                    return getTime(b.createdAt) - getTime(a.createdAt);
            }
        });

        return result;
    }, [lists, filterText, sortBy]);

    const [listPage, setListPage] = useState(1);
    const listsPerPage = 5;

    // ... (existing useMemo for filteredLists logic)
    const paginatedLists = useMemo(() => {
        const startIndex = (listPage - 1) * listsPerPage;
        return filteredLists.slice(startIndex, startIndex + listsPerPage);
    }, [filteredLists, listPage]);

    const totalListPages = Math.ceil(filteredLists.length / listsPerPage);

    // Reset page when filter/sort changes (Add useEffect)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate use: reset pagination on filter change
        setListPage(1);
    }, [filterText, sortBy]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-32 md:pb-10">
            {/* Desktop Header */}
            <div className="hidden md:block bg-slate-900/40 border border-slate-700/50 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden backdrop-blur-xl group">
                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform duration-700">
                    <FiShoppingCart className="text-9xl text-amber-500" />
                </div>
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10">
                    <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Listas de Compras</h1>
                    <p className="text-slate-400 text-lg max-w-lg font-medium">
                        Planifica tus compras mensuales o crea listas de deseos con precisión y estilo.
                    </p>
                </div>
            </div>

            {/* Mobile Header & Summary */}
            <div className="md:hidden space-y-4">
                <AnimatePresence mode="wait">
                    {!selectedList && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h1 className="text-2xl font-bold text-white tracking-tight">Mis Listas</h1>
                                    <p className="text-slate-500 text-xs text-[10px] uppercase font-bold tracking-widest">{lists.length} Listas creadas</p>
                                </div>
                                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                    <FiList className="text-amber-500 text-xl" />
                                </div>
                            </div>

                            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-2xl flex justify-between items-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-amber-500/5 to-transparent pointer-events-none"></div>
                                <div className="relative z-10">
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Items Totales</p>
                                    <p className="text-3xl font-black text-white">{lists.reduce((acc, l) => acc + (l.items?.length || 0), 0)}</p>
                                </div>
                                <div className="text-right relative z-10">
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Estimado Total</p>
                                    <p className="text-3xl font-black text-amber-400">
                                        ${lists.reduce((acc, l) => acc + calculateTotal(l.items || []), 0).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
                {/* Lists Sidebar */}
                <div className={`lg:col-span-1 space-y-6 ${selectedList ? 'hidden lg:block' : 'block'}`}>
                    <button
                        onClick={handleAddListClick}
                        className="hidden md:flex w-full bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-900 font-bold py-4 px-6 rounded-2xl items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 transform hover:-translate-y-1"
                    >
                        <FiPlus size={24} /> Nueva Lista
                    </button>

                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar listas..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 placeholder-slate-600 transition-all"
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            <button
                                onClick={() => setSortBy("newest")}
                                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border-2 active:scale-95 ${sortBy === "newest" ? "bg-amber-500 border-amber-500 text-slate-900 shadow-lg shadow-amber-500/20" : "bg-slate-900/40 text-slate-500 border-slate-800 hover:border-slate-700"}`}
                            >
                                Recientes
                            </button>
                            <button
                                onClick={() => setSortBy("az")}
                                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border-2 active:scale-95 ${sortBy === "az" ? "bg-amber-500 border-amber-500 text-slate-900 shadow-lg shadow-amber-500/20" : "bg-slate-900/40 text-slate-500 border-slate-800 hover:border-slate-700"}`}
                            >
                                A-Z
                            </button>
                            <button
                                onClick={() => setSortBy("za")}
                                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border-2 active:scale-95 ${sortBy === "za" ? "bg-amber-500 border-amber-500 text-slate-900 shadow-lg shadow-amber-500/20" : "bg-slate-900/40 text-slate-500 border-slate-800 hover:border-slate-700"}`}
                            >
                                Z-A
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {paginatedLists.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-slate-900/30 border-2 border-dashed border-slate-800 p-10 rounded-[2rem] text-center text-slate-600 flex flex-col items-center"
                                >
                                    <FiList size={40} className="mb-4 opacity-20" />
                                    <p className="font-bold text-sm uppercase tracking-wider">Cero resultados</p>
                                </motion.div>
                            ) : (
                                paginatedLists.map((list, index) => (
                                    <motion.div
                                        key={list.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => setSelectedList(list)}
                                        className={`group relative p-4 md:p-6 rounded-3xl border-2 cursor-pointer transition-all flex justify-between items-center overflow-hidden active:scale-[0.98] ${selectedList?.id === list.id
                                            ? "bg-slate-800/80 border-amber-500 shadow-[0_20px_50px_-12px_rgba(245,158,11,0.15)]"
                                            : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60 shadow-lg"
                                            }`}
                                    >
                                        <div className="flex items-center gap-5 relative z-10">
                                            <div className={`p-4 rounded-2xl transition-all ${selectedList?.id === list.id ? 'bg-amber-500 text-slate-900 shadow-xl' : 'bg-slate-800 text-slate-500'}`}>
                                                <FiShoppingCart size={22} />
                                            </div>
                                            <div>
                                                <h3 className={`font-black text-xl tracking-tight transition-colors ${selectedList?.id === list.id ? "text-white" : "text-slate-200"}`}>
                                                    {list.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                        {list.items?.length || 0} items
                                                    </span>
                                                    <span className="h-1 w-1 bg-slate-700 rounded-full"></span>
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                                        ${calculateTotal(list.items || []).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-1 items-center">
                                            {/* Mobile: visible by default, Desktop: hover */}
                                            <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmConfig({ type: "duplicate", listId: list.id });
                                                    }}
                                                    className="p-2.5 text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 rounded-xl transition-all"
                                                >
                                                    <FiCopy size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmConfig({ type: "delete", listId: list.id });
                                                    }}
                                                    className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                                >
                                                    <FiTrash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>

                        <div className="pt-4">
                            <PaginationControls
                                currentPage={listPage}
                                totalPages={totalListPages}
                                onPageChange={setListPage}
                            />
                        </div>
                    </div>
                </div>

                {/* List Detail View */}
                <div className={`lg:col-span-2 ${selectedList ? 'block' : 'hidden lg:block'}`} ref={detailRef}>
                    <AnimatePresence mode="wait">
                        {selectedList ? (
                            <motion.div
                                key={selectedList.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="bg-slate-900/50 backdrop-blur-xl rounded-3xl md:rounded-[2.5rem] border-2 border-slate-800 shadow-2xl p-5 md:p-10 min-h-[600px] flex flex-col relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

                                {/* Refresh context for reactivity */}
                                {(() => {
                                    const currentList = lists.find(l => l.id === selectedList.id) || selectedList;
                                    const total = calculateTotal(currentList.items || []);
                                    const completedItems = currentList.items?.filter(i => i.completed).length || 0;
                                    const totalItemsCount = currentList.items?.length || 0;
                                    const progressPercent = totalItemsCount > 0 ? (completedItems / totalItemsCount) * 100 : 0;

                                    return (
                                        <>
                                            <div className="flex flex-col gap-6 mb-8 relative z-10">
                                                {/* Back button for mobile */}
                                                <button
                                                    onClick={() => setSelectedList(null)}
                                                    className="lg:hidden flex items-center gap-2 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-white transition-colors w-fit"
                                                >
                                                    <FiArrowLeft size={18} /> Volver a Listas
                                                </button>

                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                                                    <div>
                                                        <div className="flex items-center gap-4 mb-3">
                                                            <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">{currentList.name}</h2>
                                                            <button
                                                                onClick={handleEditListNameClick}
                                                                className="p-3 bg-slate-800/80 text-slate-400 hover:text-amber-400 rounded-2xl transition-all border border-slate-700/50 hover:border-amber-500/30 active:scale-90"
                                                            >
                                                                <FiEdit2 size={20} />
                                                            </button>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <div className="bg-emerald-500/10 px-5 py-2.5 rounded-2xl border border-emerald-500/20 text-emerald-400 font-black text-xl shadow-lg shadow-emerald-500/5">
                                                                ${total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                            <div className="bg-slate-800/40 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-slate-700/30 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                                                                Bs. {(total * bcvRate).toLocaleString("es-VE", { maximumFractionDigits: 0 })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={handleAddItemClick}
                                                        className="hidden md:flex items-center gap-3 px-8 py-5 bg-amber-500 text-slate-900 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.15em] hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/30 active:scale-95"
                                                    >
                                                        <FiPlus size={22} /> Agregar Artículo
                                                    </button>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="space-y-3 relative z-10">
                                                    <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                                                        <span className="flex items-center gap-2"><FiShoppingCart className="text-amber-500" /> Progreso de compra</span>
                                                        <span className="text-emerald-500 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">{completedItems} / {totalItemsCount}</span>
                                                    </div>
                                                    <div className="h-3 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30 p-0.5">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progressPercent}%` }}
                                                            className="h-full bg-linear-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full relative overflow-hidden"
                                                        >
                                                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                                                        </motion.div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative z-10 mb-6">
                                                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Filtrar productos..."
                                                    value={itemFilterText}
                                                    onChange={(e) => setItemFilterText(e.target.value)}
                                                    className="w-full bg-slate-800/40 border-2 border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-amber-500/30 placeholder-slate-600 transition-all"
                                                />
                                            </div>

                                            <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar pb-10">
                                                {(!currentList.items || currentList.items.length === 0) ? (
                                                    <div className="flex flex-col items-center justify-center py-20 text-slate-600 opacity-50">
                                                        <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6">
                                                            <FiShoppingCart size={32} />
                                                        </div>
                                                        <p className="font-black uppercase tracking-widest text-xs">Lista vacía</p>
                                                    </div>
                                                ) : (
                                                    (() => {
                                                        let displayedItems = [...currentList.items];
                                                        if (itemFilterText) {
                                                            displayedItems = displayedItems.filter(item =>
                                                                item.name.toLowerCase().includes(itemFilterText.toLowerCase())
                                                            );
                                                        }
                                                        displayedItems.sort((a, b) => Number(a.completed) - Number(b.completed));

                                                        return displayedItems.map((item, idx) => (
                                                            <motion.div
                                                                layout
                                                                key={item.id}
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: idx * 0.03 }}
                                                                className={`group flex flex-col p-3.5 md:p-6 rounded-2xl md:rounded-[2rem] border-2 transition-all relative overflow-hidden ${item.completed
                                                                    ? "bg-slate-900/40 border-slate-800/50 opacity-60"
                                                                    : "bg-slate-800/40 border-slate-800/80 hover:border-amber-500/30 active:scale-[0.98] shadow-lg"
                                                                    }`}
                                                            >
                                                                {item.completed && <div className="absolute top-0 right-0 p-6 text-emerald-500/20"><FiCheckCircle size={80} /></div>}
                                                                <div className="flex items-center gap-4 mb-4">
                                                                    <button
                                                                        onClick={() => toggleItem(currentList.id, currentList.items, item.id)}
                                                                        className={`p-3 rounded-xl transition-all active:scale-90 ${item.completed ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500 hover:text-amber-400"}`}
                                                                    >
                                                                        {item.completed ? <FiCheckCircle size={24} /> : <FiSquare size={24} />}
                                                                    </button>

                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className={`text-lg md:text-xl font-black tracking-tight truncate ${item.completed ? "text-slate-500 line-through decoration-2" : "text-white"}`}>
                                                                            {item.name}
                                                                        </h4>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                                P. Unitario: ${item.price.toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between pt-5 border-t border-slate-800/50 relative z-10">
                                                                    <div className="flex items-center bg-slate-900/60 rounded-2xl border border-slate-800/80 p-1.5 shadow-inner">
                                                                        <button
                                                                            onClick={() => updateItemProgress(currentList.id, currentList.items, item.id, -1)}
                                                                            className="p-2 text-slate-500 hover:text-red-400 transition-colors active:scale-75"
                                                                        >
                                                                            <FiMinus size={18} />
                                                                        </button>
                                                                        <div className="px-5 text-center flex flex-col">
                                                                            <span className="text-xs font-black text-white">{item.purchasedQuantity || 0} <span className="text-slate-500 text-[10px] font-normal">/ {item.quantity}</span></span>
                                                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-0.5">Cantidad</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => updateItemProgress(currentList.id, currentList.items, item.id, 1)}
                                                                            className="p-2 text-slate-500 hover:text-amber-400 transition-colors active:scale-75"
                                                                        >
                                                                            <FiPlus size={18} />
                                                                        </button>
                                                                    </div>
 
                                                                    <div className="text-right">
                                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Subtotal Item</p>
                                                                        <p className={`text-xl md:text-2xl font-black tracking-tight ${item.completed ? 'text-slate-500' : 'text-white'}`}>
                                                                            ${(item.price * item.quantity).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Item actions */}
                                                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-800/30">
                                                                    <button
                                                                        onClick={() => handleEditItemClick(item)}
                                                                        className="p-2 text-slate-600 hover:text-violet-400"
                                                                    >
                                                                        <FiEdit2 size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteItem(currentList.id, currentList.items, item.id)}
                                                                        className="p-2 text-slate-600 hover:text-red-400"
                                                                    >
                                                                        <FiTrash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        ));
                                                    })()
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="hidden md:flex bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800 h-[600px] flex-col items-center justify-center text-slate-600 p-10"
                            >
                                <div className="w-24 h-24 bg-slate-900/50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl">
                                    <FiShoppingCart size={40} className="opacity-20" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight mb-2">Nada seleccionado</h3>
                                <p className="text-sm font-bold text-center max-w-xs uppercase tracking-widest leading-relaxed">Escoge una lista del menú lateral para comenzar a gestionar tus compras.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Floating Action Button for Mobile — Elevado para no tapar a Nami */}
            <motion.button
                aria-label={selectedList ? "Agregar artículo" : "Nueva lista"}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={selectedList ? handleAddItemClick : handleAddListClick}
                className="md:hidden fixed bottom-safe-fab-above right-4 md:right-8 w-14 h-14 bg-amber-500 text-slate-900 rounded-2xl shadow-2xl shadow-amber-500/40 flex items-center justify-center z-50 border-2 border-slate-900 transition-all"
            >
                <FiPlus size={28} />
            </motion.button>
        </div>
    );
}
