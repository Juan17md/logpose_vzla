"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebts, Debt } from "@/hooks/useDebts";
import { FiPlus, FiTrash2, FiCheckCircle, FiDollarSign, FiUser, FiInfo, FiArrowUpRight, FiArrowDownLeft, FiClock, FiSearch, FiEdit2 } from "react-icons/fi";
import PaginationControls from "@/components/ui/PaginationControls";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getBCVRate } from "@/lib/currency";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { motion } from "framer-motion";

export default function DebtsPage() {
    const router = useRouter();
    const { debts, loadingDebts, addDebt, deleteDebt, updateDebt, addPayment } = useDebts();
    const [bcvRate, setBcvRate] = useState(0);
    const [activeTab, setActiveTab] = useState<"por_cobrar" | "por_pagar">("por_cobrar");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    // Debt Modal

    // Payment Modal
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

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


    // Calculate totals (should align with search or raw? Usually totals at top align with TAB, regardless of search? 
    // The user code previously calculated totals based on 'debts.filter(type)'. Let's keep totals global for the tab, not affected by search.)
    const totalReceivable = debts.filter(d => d.type === "por_cobrar").reduce((acc, d) => acc + (d.amount - d.payments.reduce((pAcc, p) => pAcc + p.amount, 0)), 0);
    const totalPayable = debts.filter(d => d.type === "por_pagar").reduce((acc, d) => acc + (d.amount - d.payments.reduce((pAcc, p) => pAcc + p.amount, 0)), 0);

    const handleAddDebtClick = () => {
        router.push("/dashboard/deudas/nueva");
    };

    const handleEditDebtClick = (debt: Debt) => {
        router.push(`/dashboard/deudas/${debt.id}/editar`);
    };

    const handleAddPaymentClick = (debt: Debt) => {
        router.push(`/dashboard/deudas/${debt.id}/pagar`);
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
                <motion.div variants={itemVariants} className="px-1">
                    <motion.button
                        whileHover={{ scale: 1.01, translateY: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAddDebtClick}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-400/30 transition-all relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        <FiPlus className="text-xl relative z-10" />
                        <span className="relative z-10 tracking-wide text-shadow-sm">Nuevo Registro</span>
                    </motion.button>
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
            <div className="hidden md:block space-y-8 pb-10">
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                        <FiDollarSign className="text-7xl md:text-9xl text-violet-400" />
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-violet-500/10 to-transparent pointer-events-none"></div>

                    <div className="relative z-10">
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">Deudas y Préstamos</h1>
                        <p className="text-slate-400 text-sm md:text-lg">
                            Controla lo que debes y lo que te deben.
                        </p>
                    </div>
                </div>

                {/* Stats Cards - Horizontal scroll en móvil */}
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 scrollbar-hide">
                    <div
                        className={`flex-none w-56 md:w-auto p-5 md:p-6 rounded-2xl md:rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${activeTab === 'por_cobrar' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'bg-slate-900/50 border-slate-700/50 hover:border-emerald-500/30'}`}
                        onClick={() => setActiveTab('por_cobrar')}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FiArrowUpRight className="text-6xl md:text-8xl text-emerald-500" />
                        </div>
                        <div className="relative z-10">
                            <p className={`text-xs md:text-sm font-bold uppercase tracking-wider mb-1 ${activeTab === 'por_cobrar' ? 'text-emerald-400' : 'text-slate-400'}`}>Por Cobrar</p>
                            <h2 className="text-2xl md:text-3xl font-bold text-white">${totalReceivable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</h2>
                            <p className="text-[10px] md:text-xs text-slate-500 mt-1">Gente que te debe</p>
                        </div>
                    </div>

                    <div
                        className={`flex-none w-56 md:w-auto p-5 md:p-6 rounded-2xl md:rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${activeTab === 'por_pagar' ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10' : 'bg-slate-900/50 border-slate-700/50 hover:border-red-500/30'}`}
                        onClick={() => setActiveTab('por_pagar')}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FiArrowDownLeft className="text-6xl md:text-8xl text-red-500" />
                        </div>
                        <div className="relative z-10">
                            <p className={`text-xs md:text-sm font-bold uppercase tracking-wider mb-1 ${activeTab === 'por_pagar' ? 'text-red-400' : 'text-slate-400'}`}>Por Pagar</p>
                            <h2 className="text-2xl md:text-3xl font-bold text-white">${totalPayable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</h2>
                            <p className="text-[10px] md:text-xs text-slate-500 mt-1">Dinero que debes</p>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30">
                    <div className="relative w-full md:w-80">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder={activeTab === "por_cobrar" ? "Buscar deudor..." : "Buscar acreedor..."}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-600 transition-all"
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05, translateY: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddDebtClick}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold hover:from-violet-500 hover:to-indigo-500 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-400/30 w-full md:w-auto justify-center relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        <FiPlus className="relative z-10" /> 
                        <span className="relative z-10 tracking-wide text-shadow-sm">Nuevo Registro</span>
                    </motion.button>
                </div>

                {/* List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {paginatedDebts.length === 0 && (
                        <div className="col-span-full py-12 text-center border border-dashed border-slate-700 rounded-3xl bg-slate-900/30">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiInfo className="text-2xl text-slate-500" />
                            </div>
                            <p className="text-slate-400">
                                {searchTerm ? "No se encontraron resultados." : "No hay registros en esta sección."}
                            </p>
                        </div>
                    )}

                    {paginatedDebts.map((debt) => {
                        const totalPaid = debt.payments.reduce((a, b) => a + b.amount, 0);
                        const remaining = debt.amount - totalPaid;
                        const progress = (totalPaid / debt.amount) * 100;
                        const isFullyPaid = remaining <= 0.01;

                        return (
                            <div key={debt.id} className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6 relative group hover:border-slate-600 transition-all">
                                {isFullyPaid && (
                                    <div className="absolute top-4 right-4">
                                        <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                                            <FiCheckCircle /> PAGADO
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${debt.type === 'por_cobrar' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        <FiUser />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{debt.personName}</h3>
                                        <p className="text-sm text-slate-500">{debt.description || "Sin descripción"}</p>
                                    </div>
                                </div>

                                {/* Amount Display */}
                                <div className="mb-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/30">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-xs text-slate-400 uppercase font-bold">Total</span>
                                        <span className="text-xl font-bold text-white">${debt.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-slate-400 uppercase font-bold">Restante</span>
                                        <span className={`text-lg font-bold ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            ${remaining.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-right">
                                        <span className="text-xs text-slate-500">
                                            ≈ Bs. {(remaining * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-1 text-slate-400">
                                        <span>Progreso de pago</span>
                                        <span>{progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Payments History (Collapsible or just minimal info?) - Let's show last payment or count */}
                                {debt.payments.length > 0 && (
                                    <div className="mb-4 text-xs text-slate-500 bg-slate-800/30 p-3 rounded-xl">
                                        <p className="font-bold text-slate-400 mb-1">Historial del Pagos ({debt.payments.length}):</p>
                                        <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar">
                                            {debt.payments.slice().reverse().map((pay, i) => (
                                                <div key={i} className="flex justify-between items-center">
                                                    <span>{new Date(pay.date).toLocaleDateString()}</span>
                                                    <div className="text-right">
                                                        <div className="text-white font-bold">
                                                            {pay.currency === 'VES' && pay.originalAmount
                                                                ? `Bs. ${pay.originalAmount.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                                                                : `$${pay.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                                                            }
                                                        </div>
                                                        {pay.currency === 'VES' && (
                                                            <div className="text-xs text-slate-500">
                                                                ≈ ${pay.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 mt-auto">
                                    {!isFullyPaid && (
                                        <button
                                            onClick={() => handleAddPaymentClick(debt)}
                                            className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                        >
                                            Registrar Abono
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEditDebtClick(debt)}
                                        className="p-2 text-slate-500 hover:text-emerald-400 transition-colors bg-slate-800 hover:bg-slate-700 rounded-xl"
                                        title="Editar"
                                    >
                                        <FiEdit2 />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(debt.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 transition-colors bg-slate-800 hover:bg-slate-700 rounded-xl"
                                        title="Eliminar"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>

                                {/* Due Date Indicator */}
                                {debt.dueDate && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 justify-center">
                                        <FiClock /> Vence: {new Date(debt.dueDate).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </>
    );
}
