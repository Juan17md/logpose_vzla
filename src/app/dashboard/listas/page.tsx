"use client";

// Shopping Lists Page - Redesigned
import { useState, useEffect, useRef, useMemo } from "react";
import { useShoppingLists, ShoppingList, ShoppingItem } from "@/hooks/useShoppingLists";
import { FiShoppingCart, FiPlus, FiTrash2, FiCheck, FiSquare, FiList, FiMinus, FiSearch, FiEdit2, FiCopy, FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import PaginationControls from "@/components/ui/PaginationControls";
import Swal from "sweetalert2";
import { getBCVRate } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";

export default function ShoppingListsPage() {
    const { lists, loading, createList, deleteList, addItem, toggleItem, deleteItem, updateItemProgress, updateListName, duplicateList, updateItem } = useShoppingLists();
    const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
    const [bcvRate, setBcvRate] = useState(0);
    const [filterText, setFilterText] = useState("");
    const [itemFilterText, setItemFilterText] = useState("");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "za">("newest");
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

    const handleCreateList = async () => {
        const { value: name } = await Swal.fire({
            title: 'Nueva Lista de Compras',
            input: 'text',
            inputPlaceholder: 'Ej: Supermercado Mensual',
            showCancelButton: true,
            background: "#1f2937",
            color: "#fff",
            confirmButtonText: 'Crear',
            confirmButtonColor: '#10b981',
            inputValidator: (value) => {
                if (!value) return 'Necesitas escribir un nombre';
            }
        });

        if (name) {
            await createList(name);
            Swal.fire({
                icon: "success",
                title: "Lista creada",
                timer: 1000,
                showConfirmButton: false,
                background: "#1f2937",
                color: "#fff",
            });
        }
    };

    const handleEditListName = async () => {
        if (!selectedList) return;

        const { value: name } = await Swal.fire({
            title: 'Editar nombre de la lista',
            input: 'text',
            inputValue: selectedList.name,
            inputPlaceholder: 'Nuevo nombre',
            showCancelButton: true,
            background: "#1f2937",
            color: "#fff",
            confirmButtonText: 'Guardar',
            confirmButtonColor: '#10b981',
            inputValidator: (value) => {
                if (!value) return 'Necesitas escribir un nombre';
            }
        });

        if (name) {
            await updateListName(selectedList.id, name);
            Swal.fire({
                icon: "success",
                title: "Nombre actualizado",
                timer: 1000,
                showConfirmButton: false,
                background: "#1f2937",
                color: "#fff",
            });
        }
    };

    const handleAddItem = async () => {
        if (!selectedList) return;

        const { value: formValues } = await Swal.fire({
            title: 'Agregar Producto',
            html:
                '<div class="flex flex-col gap-3">' +
                '<input id="swal-input1" class="swal2-input m-0 w-full" placeholder="Nombre (ej: Arroz)">' +
                '<input id="swal-input2" class="swal2-input m-0 w-full" type="number" placeholder="Cantidad">' +
                '<input id="swal-input3" class="swal2-input m-0 w-full" type="number" step="0.01" placeholder="Precio Unitario ($)">' +
                `<div id="bs-reference" class="text-emerald-400 font-bold text-sm text-right">≈ Bs. 0.00</div>` +
                '</div>',
            focusConfirm: false,
            background: "#1f2937",
            color: "#fff",
            showCancelButton: true,
            confirmButtonText: 'Agregar',
            confirmButtonColor: '#10b981',
            didOpen: () => {
                const priceInput = Swal.getPopup()?.querySelector('#swal-input3') as HTMLInputElement;
                const bsRef = Swal.getPopup()?.querySelector('#bs-reference');

                if (priceInput && bsRef) {
                    priceInput.addEventListener('input', () => {
                        const val = parseFloat(priceInput.value);
                        if (!isNaN(val)) {
                            bsRef.textContent = `≈ Bs. ${(val * bcvRate).toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;
                        } else {
                            bsRef.textContent = `≈ Bs. 0.00`;
                        }
                    })
                }
            },
            preConfirm: () => {
                return [
                    (document.getElementById('swal-input1') as HTMLInputElement).value,
                    (document.getElementById('swal-input2') as HTMLInputElement).value,
                    (document.getElementById('swal-input3') as HTMLInputElement).value
                ]
            }
        });

        if (formValues) {
            const [name, qty, price] = formValues;
            if (!name) return;

            await addItem(selectedList.id, {
                name,
                quantity: qty ? parseFloat(qty) : 1,
                price: price ? parseFloat(price) : 0
            });
        }
    };

    const handleEditItem = async (item: ShoppingItem) => {
        if (!selectedList) return;

        const { value: formValues } = await Swal.fire({
            title: 'Editar Producto',
            html:
                '<div class="flex flex-col gap-3">' +
                `<input id="swal-edit-input1" class="swal2-input m-0 w-full" placeholder="Nombre" value="${item.name}">` +
                `<input id="swal-edit-input2" class="swal2-input m-0 w-full" type="number" placeholder="Cantidad" value="${item.quantity}">` +
                `<input id="swal-edit-input3" class="swal2-input m-0 w-full" type="number" step="0.01" placeholder="Precio Unitario ($)" value="${item.price > 0 ? item.price : ''}">` +
                `<div id="bs-reference-edit" class="text-emerald-400 font-bold text-sm text-right">≈ Bs. 0.00</div>` +
                '</div>',
            focusConfirm: false,
            background: "#1f2937",
            color: "#fff",
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            confirmButtonColor: '#3b82f6',
            didOpen: () => {
                const priceInput = Swal.getPopup()?.querySelector('#swal-edit-input3') as HTMLInputElement;
                const bsRef = Swal.getPopup()?.querySelector('#bs-reference-edit');

                const updateBs = () => {
                    const val = parseFloat(priceInput.value);
                    if (!isNaN(val) && bsRef) {
                        bsRef.textContent = `≈ Bs. ${(val * bcvRate).toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;
                    } else if (bsRef) {
                        bsRef.textContent = `≈ Bs. 0.00`;
                    }
                };

                if (priceInput) {
                    updateBs(); // Initial update
                    priceInput.addEventListener('input', updateBs);
                }
            },
            preConfirm: () => {
                return [
                    (document.getElementById('swal-edit-input1') as HTMLInputElement).value,
                    (document.getElementById('swal-edit-input2') as HTMLInputElement).value,
                    (document.getElementById('swal-edit-input3') as HTMLInputElement).value
                ]
            }
        });

        if (formValues) {
            const [name, qty, price] = formValues;
            if (!name) return;

            // Get the current list from the lists array to ensure we have the latest items
            const currentList = lists.find(l => l.id === selectedList.id);
            if (!currentList) return;

            await updateItem(selectedList.id, currentList.items, item.id, {
                name,
                quantity: qty ? parseFloat(qty) : 1,
                price: price ? parseFloat(price) : 0
            });
        }
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
        setListPage(1);
    }, [filterText, sortBy]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Desktop Header */}
            <div className="hidden md:block bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiShoppingCart className="text-9xl text-emerald-400" />
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Listas de Compras</h1>
                    <p className="text-slate-400 text-lg">
                        Planifica tus compras mensuales o crea listas de deseos.
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
                                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                    <FiList className="text-emerald-500 text-xl" />
                                </div>
                            </div>

                            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg flex justify-between items-center">
                                <div>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Items Totales</p>
                                    <p className="text-2xl font-black text-white">{lists.reduce((acc, l) => acc + (l.items?.length || 0), 0)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Estimado Total</p>
                                    <p className="text-2xl font-black text-emerald-400">
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
                        onClick={handleCreateList}
                        className="hidden md:flex w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-4 px-6 rounded-2xl items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 transform hover:-translate-y-1"
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
                                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 placeholder-slate-600 transition-all"
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button
                                onClick={() => setSortBy("newest")}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${sortBy === "newest" ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-900/30 text-slate-500 border-slate-800 hover:border-slate-700"}`}
                            >
                                Recientes
                            </button>
                            <button
                                onClick={() => setSortBy("az")}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${sortBy === "az" ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-900/30 text-slate-500 border-slate-800 hover:border-slate-700"}`}
                            >
                                A-Z
                            </button>
                            <button
                                onClick={() => setSortBy("za")}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${sortBy === "za" ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-900/30 text-slate-500 border-slate-800 hover:border-slate-700"}`}
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
                                        className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex justify-between items-center overflow-hidden ${selectedList?.id === list.id
                                            ? "bg-slate-800 border-emerald-500/50 shadow-2xl shadow-emerald-500/5"
                                            : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                                            }`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`p-4 rounded-2xl transition-all ${selectedList?.id === list.id ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}>
                                                <FiShoppingCart size={24} />
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
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                        ${calculateTotal(list.items || []).toLocaleString("es-ES")}
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
                                                        Swal.fire({
                                                            title: '¿Duplicar lista?',
                                                            text: "Se creará una copia vacía.",
                                                            icon: 'question',
                                                            showCancelButton: true,
                                                            confirmButtonText: 'Sí, duplicar',
                                                            background: "#1f2937",
                                                            color: "#fff",
                                                        }).then(async (res) => {
                                                            if (res.isConfirmed) await duplicateList(list.id);
                                                        })
                                                    }}
                                                    className="p-2.5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
                                                >
                                                    <FiCopy size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        Swal.fire({
                                                            title: '¿Borrar lista?',
                                                            text: "Esta acción es irreversible.",
                                                            icon: 'warning',
                                                            showCancelButton: true,
                                                            confirmButtonColor: '#ef4444',
                                                            confirmButtonText: 'Borrar',
                                                            background: "#1f2937",
                                                            color: "#fff",
                                                        }).then((res) => {
                                                            if (res.isConfirmed) {
                                                                if (selectedList?.id === list.id) setSelectedList(null);
                                                                deleteList(list.id);
                                                            }
                                                        })
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
                                className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border-2 border-slate-800 shadow-2xl p-6 md:p-10 min-h-[600px] flex flex-col relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

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

                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                                    <div>
                                                        <div className="flex items-center gap-4 mb-2">
                                                            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">{currentList.name}</h2>
                                                            <button
                                                                onClick={handleEditListName}
                                                                className="p-3 bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-2xl transition-all"
                                                            >
                                                                <FiEdit2 size={20} />
                                                            </button>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <div className="bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20 text-emerald-400 font-black text-lg">
                                                                ${total.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                                                            </div>
                                                            <div className="bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700/50 text-slate-400 font-bold text-xs uppercase tracking-widest">
                                                                Bs. {(total * bcvRate).toLocaleString("es-VE", { maximumFractionDigits: 0 })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={handleAddItem}
                                                        className="hidden md:flex items-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
                                                    >
                                                        <FiPlus size={20} /> Agregar Item
                                                    </button>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                        <span>Progreso de compra</span>
                                                        <span className="text-emerald-500">{completedItems} / {totalItemsCount} comprados</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progressPercent}%` }}
                                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                                        />
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
                                                    className="w-full bg-slate-800/40 border-2 border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/30 placeholder-slate-600 transition-all"
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
                                                                key={item.id}
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: idx * 0.03 }}
                                                                className={`group flex flex-col p-5 rounded-[2rem] border-2 transition-all ${item.completed
                                                                    ? "bg-slate-900/20 border-slate-800/50 opacity-60"
                                                                    : "bg-slate-800/30 border-slate-800 hover:border-slate-700 active:scale-[0.98]"
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-4 mb-4">
                                                                    <button
                                                                        onClick={() => toggleItem(currentList.id, currentList.items, item.id)}
                                                                        className={`p-3 rounded-xl transition-all active:scale-90 ${item.completed ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500 hover:text-emerald-400"}`}
                                                                    >
                                                                        {item.completed ? <FiCheckCircle size={24} /> : <FiSquare size={24} />}
                                                                    </button>

                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className={`text-xl font-black tracking-tight truncate ${item.completed ? "text-slate-500 line-through decoration-2" : "text-white"}`}>
                                                                            {item.name}
                                                                        </h4>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                                P. Unitario: ${item.price.toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                                                                    <div className="flex items-center bg-slate-900/80 rounded-2xl border border-slate-800 p-1">
                                                                        <button
                                                                            onClick={() => updateItemProgress(currentList.id, currentList.items, item.id, -1)}
                                                                            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                                                        >
                                                                            <FiMinus size={16} />
                                                                        </button>
                                                                        <div className="px-4 text-center">
                                                                            <span className="text-sm font-black text-white">{item.purchasedQuantity || 0}</span>
                                                                            <span className="text-[10px] font-bold text-slate-500 mx-1">/</span>
                                                                            <span className="text-sm font-black text-slate-400">{item.quantity}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => updateItemProgress(currentList.id, currentList.items, item.id, 1)}
                                                                            className="p-2 text-slate-500 hover:text-emerald-400 transition-colors"
                                                                        >
                                                                            <FiPlus size={16} />
                                                                        </button>
                                                                    </div>

                                                                    <div className="text-right">
                                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Subtotal</p>
                                                                        <p className={`text-xl font-black ${item.completed ? 'text-slate-500' : 'text-white'}`}>
                                                                            ${(item.price * item.quantity).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Item actions */}
                                                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-800/30">
                                                                    <button
                                                                        onClick={() => handleEditItem(item)}
                                                                        className="p-2 text-slate-600 hover:text-blue-400"
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

            {/* Floating Action Button for Mobile */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={selectedList ? handleAddItem : handleCreateList}
                className="md:hidden fixed bottom-44 right-6 w-16 h-16 bg-emerald-500 text-white rounded-3xl shadow-2xl shadow-emerald-500/40 flex items-center justify-center z-50 border-4 border-slate-900 transition-colors"
            >
                <FiPlus size={32} />
            </motion.button>
        </div>
    );
}
