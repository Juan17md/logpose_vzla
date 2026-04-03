"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebts, Debt } from "@/hooks/useDebts";
import { FiPlus, FiTrash2, FiCheckCircle, FiDollarSign, FiUser, FiInfo, FiArrowUpRight, FiArrowDownLeft, FiClock, FiSearch, FiEdit2 } from "react-icons/fi";
import PaginationControls from "@/components/ui/PaginationControls";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getBCVRate } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import DebtForm from "@/components/forms/DebtForm";
import DebtPaymentForm from "@/components/forms/DebtPaymentForm";

export default function DebtsPage() {
    const router = useRouter();
    const { debts, loadingDebts, addDebt, deleteDebt, updateDebt, addPayment } = useDebts();
    const [bcvRate, setBcvRate] = useState(0);
    const [activeTab, setActiveTab] = useState<"por_cobrar" | "por_pagar">("por_cobrar");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Inline Form State
    const [view, setView] = useState<"create" | "edit" | "payment" | "none">("create");
    const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Confirm Delete
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate use: reset pagination on filter change
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    useEffect(() => {
        getBCVRate().then(setBcvRate);
    }, []);

    const filteredDebts = debts.filter(d => {
        const matchesType = d.type === activeTab;
        const matchesSearch = d.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesType && matchesSearch;
    });

    // Pagination
    const totalPages = Math.ceil(filteredDebts.length / itemsPerPage);
    const paginatedDebts = filteredDebts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


    // Calculate totals
    const totalReceivable = debts.filter(d => d.type === "por_cobrar").reduce((acc, d) => acc + (d.amount - d.payments.reduce((pAcc, p) => pAcc + p.amount, 0)), 0);
    const totalPayable = debts.filter(d => d.type === "por_pagar").reduce((acc, d) => acc + (d.amount - d.payments.reduce((pAcc, p) => pAcc + p.amount, 0)), 0);

    const handleAddDebtClick = () => {
        setView("create");
        setEditingDebt(null);
    };

    const handleEditDebtClick = (debt: Debt) => {
        setEditingDebt(debt);
        setView("edit");
    };

    const handleAddPaymentClick = (debt: Debt) => {
        setEditingDebt(debt);
        setView("payment");
    };

    const handleFormSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            if (view === "create") {
                await addDebt(data);
                toast.success("Deuda registrada correctamente");
            } else if (view === "edit" && editingDebt) {
                await updateDebt(editingDebt.id, data);
                toast.success("Deuda actualizada correctamente");
                setView("create");
                setEditingDebt(null);
            }
        } catch (error) {
            toast.error("Error al procesar la solicitud");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaymentSubmit = async (paymentData: any) => {
        if (!editingDebt) return;
        setIsSubmitting(true);
        try {
            const success = await addPayment(editingDebt.id, paymentData);
            if (success) {
                toast.success("Pago registrado correctamente");
                setView("create");
                setEditingDebt(null);
            }
        } catch (error) {
            toast.error("Error al registrar el pago");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setShowConfirmDelete(true);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        try {
            await deleteDebt(deletingId);
            toast.success('Borrado!');
        } catch (err) {
            toast.error('Error al borrar');
        } finally {
            setShowConfirmDelete(false);
        }
    };

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0, scale: 0.95 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 10
            } as const
        }
    };

    if (loadingDebts) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            {/* MOBILE VIEW */}
            <motion.div
                className="md:hidden flex flex-col gap-6 pb-20"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Mobile Header */}
                <motion.div variants={itemVariants} className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-white">Deudas</h1>
                    <p className="text-slate-400 text-sm">Gestiona tus préstamos y cobros</p>
                </motion.div>

                {/* Mobile Tabs / Stats Horizontal Scroll */}
                <motion.div variants={itemVariants} className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                    {/* Card: Por Cobrar */}
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveTab('por_cobrar')}
                        className={`flex-none w-40 p-4 rounded-2xl border transition-all relative overflow-hidden ${activeTab === 'por_cobrar'
                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                            : 'bg-slate-900/50 border-slate-700/50'
                            }`}
                    >
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <div className={`p-2 rounded-full w-fit ${activeTab === 'por_cobrar' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                <FiArrowUpRight size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mt-2">${totalReceivable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                                <p className="text-xs text-slate-400">Por Cobrar</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Card: Por Pagar */}
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveTab('por_pagar')}
                        className={`flex-none w-40 p-4 rounded-2xl border transition-all relative overflow-hidden ${activeTab === 'por_pagar'
                            ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10'
                            : 'bg-slate-900/50 border-slate-700/50'
                            }`}
                    >
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <div className={`p-2 rounded-full w-fit ${activeTab === 'por_pagar' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                                <FiArrowDownLeft size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mt-2">${totalPayable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                                <p className="text-xs text-slate-400">Por Pagar</p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Mobile Actions: Add Button */}
                <motion.div variants={itemVariants} className="px-1 space-y-6">
                    <motion.button
                        whileHover={{ scale: 1.01, translateY: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAddDebtClick}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all relative overflow-hidden group ${view === 'create' ? 'bg-amber-500 text-slate-950 border border-amber-400' : 'bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-400/30'}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        {view === 'create' ? <FiPlus className="text-xl relative z-10 rotate-45" /> : <FiPlus className="text-xl relative z-10" />}
                        <span className="relative z-10 tracking-wide text-shadow-sm">
                            {view === 'create' ? 'Cancelar / Cerrar' : 'Nuevo Registro'}
                        </span>
                    </motion.button>

                    {/* Mobile Inline Form */}
                    <AnimatePresence mode="wait">
                        {view !== "none" && (
                            <motion.div
                                key={view + (editingDebt?.id || "")}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 overflow-hidden"
                            >
                                <div className="mb-4">
                                    <h2 className="text-lg font-black text-white uppercase italic">
                                        {view === "create" ? "Nueva Deuda" : view === "edit" ? "Editar Deuda" : "Registrar Pago"}
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        {view === "payment" ? "Abono al saldo" : "Detalles del registro"}
                                    </p>
                                </div>

                                {view === "payment" && editingDebt ? (
                                    <DebtPaymentForm 
                                        debt={editingDebt} 
                                        onSubmit={handlePaymentSubmit} 
                                        onCancel={() => { setView("none"); setEditingDebt(null); }}
                                        isLoading={isSubmitting} 
                                    />
                                ) : (
                                    <DebtForm 
                                        initialData={editingDebt} 
                                        onSubmit={handleFormSubmit} 
                                        onCancel={() => { setView("none"); setEditingDebt(null); }}
                                        isLoading={isSubmitting}
                                        defaultType={activeTab}
                                    />
                                )}
                                
                                <button
                                    onClick={() => { setView("none"); setEditingDebt(null); }}
                                    className="w-full mt-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
                                >
                                    Cerrar Formulario
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Mobile List */}
                <motion.div variants={itemVariants} className="flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-lg font-bold text-white">
                            {activeTab === 'por_cobrar' ? 'Pendientes de Cobro' : 'Pendientes de Pago'}
                        </h2>
                        <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-lg">
                            {paginatedDebts.length} reg.
                        </span>
                    </div>

                    <div className="space-y-3">
                        {paginatedDebts.length === 0 ? (
                            <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-dashed border-slate-700">
                                <p className="text-slate-500 text-sm">No hay deudas registradas aquí.</p>
                            </div>
                        ) : (
                            paginatedDebts.map((debt) => {
                                const totalPaid = debt.payments.reduce((a, b) => a + b.amount, 0);
                                const remaining = debt.amount - totalPaid;
                                const progress = (totalPaid / debt.amount) * 100;
                                const isFullyPaid = remaining <= 0.01;

                                return (
                                    <motion.div
                                        key={debt.id}
                                        variants={itemVariants}
                                        className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 relative overflow-hidden"
                                    >
                                        {/* Status Badge */}
                                        {isFullyPaid && (
                                            <div className="absolute top-0 right-0 p-2">
                                                <div className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-bl-xl rounded-tr-xl flex items-center gap-1">
                                                    <FiCheckCircle /> PAGADO
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${debt.type === 'por_cobrar' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    <FiUser />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-base leading-tight">{debt.personName}</h3>
                                                    <p className="text-xs text-slate-400 truncate max-w-[150px]">{debt.description || "Sin descripción"}</p>
                                                    {debt.dueDate && (
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                                            <FiClock size={10} />
                                                            <span>Vence: {new Date(debt.dueDate).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`block text-lg font-bold ${remaining > 0 ? (debt.type === 'por_cobrar' ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'}`}>
                                                    ${remaining.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </span>
                                                <span className="text-[10px] text-slate-500">
                                                    de ${debt.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar Compact */}
                                        <div className="h-1.5 w-full bg-slate-700/50 rounded-full mb-3 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isFullyPaid ? 'bg-emerald-500' : (debt.type === 'por_cobrar' ? 'bg-emerald-500' : 'bg-red-500')}`}
                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                            />
                                        </div>

                                        {/* Actions Bar */}
                                        <div className="flex items-center gap-2 mt-2">
                                            {!isFullyPaid && (
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleAddPaymentClick(debt)}
                                                    className="flex-1 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <FiDollarSign /> Abonar
                                                </motion.button>
                                            )}
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleEditDebtClick(debt)}
                                                className="p-1.5 text-slate-400 bg-slate-800 rounded-lg hover:text-white"
                                            >
                                                <FiEdit2 size={14} />
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleDeleteClick(debt.id)}
                                                className="p-1.5 text-slate-400 bg-slate-800 rounded-lg hover:text-red-400"
                                            >
                                                <FiTrash2 size={14} />
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    {/* Compact Pagination for Mobile */}
                    <div className="flex justify-center gap-4 mt-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="text-xs text-slate-400 disabled:opacity-30"
                        >
                            Anterior
                        </button>
                        <span className="text-xs text-slate-500">
                            Página {currentPage} de {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="text-xs text-slate-400 disabled:opacity-30"
                        >
                            Siguiente
                        </button>
                    </div>
                </motion.div>
            </motion.div>


            {/* DESKTOP VIEW */}
            <div className="hidden md:block pb-10">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    
                    {/* LEFT COLUMN: Sticky Form (1/3) */}
                    <div className="w-full lg:w-[380px] lg:sticky lg:top-8 flex-none">
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group">
                            {/* Decorative background circle */}
                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] group-hover:bg-amber-500/20 transition-all duration-700" />
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            <span className="w-2 h-2 bg-amber-500 rounded-full" />
                                            {view === "create" ? "Nueva Deuda" : view === "edit" ? "Editar Deuda" : "Registrar Pago"}
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {view === "payment" ? "Abonar al saldo pendiente" : "Completa los detalles abajo"}
                                        </p>
                                    </div>
                                    {(view !== "create") && (
                                        <button 
                                            onClick={() => { setView("create"); setEditingDebt(null); }}
                                            className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors"
                                        >
                                            <FiPlus className="rotate-45" size={20} />
                                        </button>
                                    )}
                                </div>
                                
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={view + (editingDebt?.id || "")}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {view === "payment" && editingDebt ? (
                                            <DebtPaymentForm 
                                                debt={editingDebt} 
                                                onSubmit={handlePaymentSubmit} 
                                                isLoading={isSubmitting} 
                                            />
                                        ) : (
                                            <DebtForm 
                                                initialData={editingDebt} 
                                                onSubmit={handleFormSubmit} 
                                                isLoading={isSubmitting}
                                                defaultType={activeTab}
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* BCV Ticker Card */}
                        <div className="mt-4 bg-amber-500/5 backdrop-blur-sm border border-amber-500/10 rounded-2xl p-4 flex items-center justify-between group overflow-hidden relative">
                            <div className="absolute inset-0 bg-linear-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                                    <FiDollarSign size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest leading-none mb-1">Tasa BCV hoy</p>
                                    <p className="text-sm font-bold text-white leading-none">Bs. {bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <div className="text-right relative z-10">
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Sincronizado</div>
                                <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 justify-end">
                                    <div className="w-1 h-1 bg-emerald-400 rounded-full" /> En Vivo
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Content (2/3) */}
                    <div className="flex-1 space-y-8 w-full">
                        {/* Header Modern / Urban Premium */}
                        <div className="relative overflow-hidden bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] group min-h-[160px] flex items-center">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px] -mr-40 -mt-40 animate-pulse" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/5 rounded-full blur-[80px] -ml-32 -mb-32" />
                            
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between w-full gap-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-white leading-none mb-2">
                                        Deudas y Préstamos
                                    </h1>
                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                        Gestiona tus préstamos y cobros
                                    </p>
                                </div>

                                {/* Quick Stats (Instead of separate cards) */}
                                <div className="flex gap-4">
                                    <div 
                                        onClick={() => setActiveTab("por_cobrar")}
                                        className={`px-6 py-4 rounded-3xl border transition-all cursor-pointer group/stat ${activeTab === "por_cobrar" ? "bg-emerald-500/10 border-emerald-500/50 shadow-2xl shadow-emerald-500/10" : "bg-slate-950/40 border-white/5 hover:border-emerald-500/20"}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${activeTab === "por_cobrar" ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-500 group-hover/stat:text-emerald-400"}`}>
                                                <FiArrowUpRight size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover/stat:text-emerald-500/60 transition-colors">Por Cobrar</p>
                                                <p className="text-xl font-black text-white leading-none">${totalReceivable.toLocaleString("es-ES", { minimumFractionDigits: 0 })}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div 
                                        onClick={() => setActiveTab("por_pagar")}
                                        className={`px-6 py-4 rounded-3xl border transition-all cursor-pointer group/stat ${activeTab === "por_pagar" ? "bg-red-500/10 border-red-500/50 shadow-2xl shadow-red-500/10" : "bg-slate-950/40 border-white/5 hover:border-red-500/20"}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${activeTab === "por_pagar" ? "bg-red-500 text-slate-950" : "bg-slate-900 text-slate-500 group-hover/stat:text-red-400"}`}>
                                                <FiArrowDownLeft size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover/stat:text-red-500/60 transition-colors">Por Pagar</p>
                                                <p className="text-xl font-black text-white leading-none">${totalPayable.toLocaleString("es-ES", { minimumFractionDigits: 0 })}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="space-y-6">
                            {/* Toolbar */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950/40 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                                <div className="relative w-full md:w-80 group">
                                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder={activeTab === "por_cobrar" ? "Buscar por nombre..." : "Buscar por acreedor..."}
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-amber-500/30 placeholder-slate-600 transition-all font-medium"
                                    />
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                                    <span className="w-2 h-2 bg-slate-800 rounded-full" />
                                    {filteredDebts.length} {activeTab === "por_cobrar" ? "Cobros" : "Pagos"} Encontrados
                                </div>
                            </div>

                            {/* Grid List */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {paginatedDebts.length === 0 ? (
                                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-slate-950/20">
                                        <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-700 italic font-black text-2xl border border-white/5">
                                            ?
                                        </div>
                                        <p className="text-slate-400 font-black uppercase tracking-[3px] text-sm">
                                            {searchTerm ? "No hay coincidencias" : "Lista vacía"}
                                        </p>
                                        <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-widest italic">Inicia registrando algo en el panel izquierdo</p>
                                    </div>
                                ) : (
                                    paginatedDebts.map((debt) => {
                                        const totalPaid = debt.payments.reduce((a, b) => a + b.amount, 0);
                                        const remaining = debt.amount - totalPaid;
                                        const progress = (totalPaid / debt.amount) * 100;
                                        const isFullyPaid = remaining <= 0.01;

                                        return (
                                            <motion.div 
                                                key={debt.id} 
                                                layout
                                                className={`bg-slate-950/40 border transition-all duration-300 rounded-[2.5rem] p-6 relative group/card flex flex-col ${isFullyPaid ? 'border-emerald-500/10' : (editingDebt?.id === debt.id ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20' : 'border-white/5 hover:border-white/10')}`}
                                            >
                                                {isFullyPaid && (
                                                    <div className="absolute top-6 right-6">
                                                        <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-1 uppercase tracking-widest shadow-lg shadow-emerald-500/10">
                                                            <FiCheckCircle size={14} /> Saldado
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-start gap-5 mb-6">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover/card:scale-110 duration-500 ${debt.type === 'por_cobrar' ? 'bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/5' : 'bg-red-500/10 text-red-400 shadow-lg shadow-red-500/5'}`}>
                                                        <FiUser />
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="text-lg font-bold text-white truncate">{debt.personName}</h3>
                                                        </div>
                                                        <p className="text-xs text-slate-500 line-clamp-2 min-h-8">{debt.description || "Sin descripción"}</p>
                                                    </div>
                                                </div>

                                                {/* Amount Stats Modern */}
                                                <div className="grid grid-cols-2 gap-3 mb-6">
                                                    <div className="bg-slate-900/60 p-4 rounded-3xl border border-white/5 relative overflow-hidden group/statcard">
                                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-800" />
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Inicial</p>
                                                        <p className="text-lg font-bold text-slate-400">${debt.amount.toLocaleString("es-ES", { minimumFractionDigits: 0 })}</p>
                                                    </div>
                                                    <div className={`p-4 rounded-3xl border relative overflow-hidden group/statcard ${isFullyPaid ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white/5 border-white/5'}`}>
                                                        <div className={`absolute inset-x-0 bottom-0 h-1 ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Restante</p>
                                                        <p className={`text-lg font-bold ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                            ${remaining.toLocaleString("es-ES", { minimumFractionDigits: 0 })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Actions Section */}
                                                <div className="mt-auto flex items-center gap-2">
                                                    {isFullyPaid ? (
                                                        <div className="flex-1 flex justify-center py-2.5 bg-slate-900/50 rounded-2xl border border-white/5">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transacción Completada</span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAddPaymentClick(debt)}
                                                            className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-xs transition-all shadow-xl shadow-emerald-500/10 border border-white/10 flex items-center justify-center gap-2 group-hover/card:scale-[1.02]"
                                                        >
                                                            <FiDollarSign size={14} /> Registrar Abono
                                                        </button>
                                                    )}
                                                    
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditDebtClick(debt)}
                                                            className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-2xl border border-white/5 transition-all"
                                                            title="Editar"
                                                        >
                                                            <FiEdit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(debt.id)}
                                                            className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-red-500 bg-slate-900/50 hover:bg-red-500/10 rounded-2xl border border-white/5 transition-all"
                                                            title="Eliminar"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Footer metadata */}
                                                <div className="mt-5 pt-4 border-t border-white/5 flex justify-between items-center px-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-1 w-12 bg-slate-900 rounded-full overflow-hidden">
                                                            <div className={`h-full ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${progress}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter italic">{progress.toFixed(0)}%</span>
                                                    </div>
                                                    
                                                    {debt.dueDate && (
                                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                            <FiClock size={12} className={new Date(debt.dueDate) < new Date() && !isFullyPaid ? 'text-red-400' : ''} />
                                                            <span>Vence: {new Date(debt.dueDate).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="pt-4 flex justify-end">
                                <PaginationControls
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showConfirmDelete}
                onClose={() => setShowConfirmDelete(false)}
                onConfirm={confirmDelete}
                title="Eliminar Deuda"
                message="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
                type="danger"
            />
        </>
    );
}
