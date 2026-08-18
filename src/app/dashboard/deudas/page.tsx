"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebts, Debt } from "@/hooks/useDebts";
import { FiPlus, FiTrash2, FiCheckCircle, FiDollarSign, FiUser, FiInfo, FiArrowUpRight, FiArrowDownLeft, FiClock, FiSearch, FiEdit2, FiArrowLeft } from "react-icons/fi";
import PaginationControls from "@/components/ui/PaginationControls";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getBCVRate } from "@/lib/currency";
import DebtForm from "@/components/forms/DebtForm";
import DebtPaymentForm from "@/components/forms/DebtPaymentForm";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { obtenerSimboloMoneda } from "@/lib/bankAccounts";

export default function DebtsPage() {
    const router = useRouter();
    const { debts, loadingDebts, addDebt, deleteDebt, updateDebt, addPayment } = useDebts();
    const [bcvRate, setBcvRate] = useState(0);
    const { monedaBase } = useBankAccounts();
    const [activeTab, setActiveTab] = useState<"por_cobrar" | "por_pagar">("por_cobrar");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Inline Form State
    const [view, setView] = useState<"create" | "edit" | "payment" | "none">("create");
    const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mobileView, setMobileView] = useState<"list" | "form">("list");

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
    const obtenerMontoRestanteConsolidado = (d: Debt, monedaDestino: "USD" | "BS") => {
        const totalPaid = d.payments?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;
        const remaining = Math.max(0, d.amount - totalPaid);
        const isVES = d.currency === "VES";
        if (monedaDestino === "BS") {
            return isVES ? remaining : remaining * (bcvRate || 1);
        } else {
            return isVES ? remaining / (bcvRate || 1) : remaining;
        }
    };

    const totalReceivable = debts
        .filter(d => d.type === "por_cobrar")
        .reduce((acc, d) => acc + obtenerMontoRestanteConsolidado(d, monedaBase === "BS" ? "BS" : "USD"), 0);

    const totalPayable = debts
        .filter(d => d.type === "por_pagar")
        .reduce((acc, d) => acc + obtenerMontoRestanteConsolidado(d, monedaBase === "BS" ? "BS" : "USD"), 0);

    const handleAddDebtClick = () => {
        setView("create");
        setEditingDebt(null);
        setMobileView("form");
    };

    const handleEditDebtClick = (debt: Debt) => {
        setEditingDebt(debt);
        setView("edit");
        setMobileView("form");
    };

    const handleAddPaymentClick = (debt: Debt) => {
        setEditingDebt(debt);
        setView("payment");
        setMobileView("form");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFormSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            if (view === "create") {
                await addDebt(data);
                toast.success("Deuda registrada correctamente");
            } else if (view === "edit" && editingDebt) {
                await updateDebt(editingDebt.id, data);
                toast.success("Deuda actualizada correctamente");
            }
            setMobileView("list");
            if (window.innerWidth < 768) {
                setView("none");
            } else {
                setView("create");
                setEditingDebt(null);
            }
        } catch (error) {
            toast.error("Error al procesar la solicitud");
        } finally {
            setIsSubmitting(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePaymentSubmit = async (paymentData: any) => {
        if (!editingDebt) return;
        setIsSubmitting(true);
        try {
            const success = await addPayment(editingDebt.id, paymentData);
            if (success) {
                toast.success("Pago registrado correctamente");
                setMobileView("list");
                if (window.innerWidth < 768) {
                    setView("none");
                } else {
                    setView("create");
                    setEditingDebt(null);
                }
            }
        } catch (error) {
            toast.error("Error al registrar el pago");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelMobile = () => {
        setMobileView("list");
        setTimeout(() => {
            setView("create");
            setEditingDebt(null);
        }, 300);
    };

    const handleCancelDesktop = () => {
        setView("create");
        setEditingDebt(null);
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

    // Variantes de animación eliminadas — se prioriza la fluidez (ver ADR 11)

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
            <div
                className="md:hidden flex flex-col gap-6 pb-32"
            >
{mobileView === 'list' ? (
                        <div
                            key="mobile-list"
                            className="space-y-6"
                        >
                            {/* Mobile Header */}
                            <div className="flex flex-col gap-1 px-1">
                                <h1 className="text-2xl font-bold text-white tracking-tight">Deudas</h1>
                                <p className="text-slate-400 text-sm">Gestiona tus préstamos y cobros</p>
                            </div>

                            {/* Mobile Stats Horizontal Scroll */}
                            <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                                {/* Card: Por Cobrar */}
                                <div
                                    onClick={() => setActiveTab('por_cobrar')}
                                    onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('por_cobrar'); } }}
                                    role="button"
                                    tabIndex={0}
                                    className={`flex-none w-44 p-5 rounded-3xl border transition-colors relative overflow-hidden ${activeTab === 'por_cobrar'
                                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg '
                                        : 'bg-slate-900/50 border-slate-700/30'
                                        }`}
                                >
                                    <div className="flex flex-col h-full justify-between relative z-10">
                                        <div className={`p-2.5 rounded-2xl w-fit ${activeTab === 'por_cobrar' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                                            <FiArrowUpRight size={20} />
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Por Cobrar</p>
                                            <h3 className="text-xl font-black text-white">{obtenerSimboloMoneda(monedaBase)} {totalReceivable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</h3>
                                        </div>
                                    </div>
                                </div>

                                {/* Card: Por Pagar */}
                                <div
                                    onClick={() => setActiveTab('por_pagar')}
                                    onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('por_pagar'); } }}
                                    role="button"
                                    tabIndex={0}
                                    className={`flex-none w-44 p-5 rounded-3xl border transition-colors relative overflow-hidden ${activeTab === 'por_pagar'
                                        ? 'bg-red-500/10 border-red-500/50 shadow-lg '
                                        : 'bg-slate-900/50 border-slate-700/30'
                                        }`}
                                >
                                    <div className="flex flex-col h-full justify-between relative z-10">
                                        <div className={`p-2.5 rounded-2xl w-fit ${activeTab === 'por_pagar' ? 'bg-red-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                                            <FiArrowDownLeft size={20} />
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Por Pagar</p>
                                            <h3 className="text-xl font-black text-white">{obtenerSimboloMoneda(monedaBase)} {totalPayable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Search Bar Mobile */}
                            <div className="relative group px-1">
                                <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700/30 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors placeholder-slate-600"
                                />
                            </div>

                            {/* Mobile List Items */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-2">
                                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                                        {activeTab === 'por_cobrar' ? 'Pendientes de Cobro' : 'Pendientes de Pago'}
                                    </h2>
                                    <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                                        {filteredDebts.length} reg.
                                    </span>
                                </div>

                                {paginatedDebts.length === 0 ? (
                                    <div className="text-center py-16 bg-slate-900/30 rounded-[2rem] border border-dashed border-slate-800">
                                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600 italic font-black text-xl">
                                            !
                                        </div>
                                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">No hay registros</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {paginatedDebts.map((debt) => {
                                            const totalPaid = debt.payments.reduce((a, b) => a + b.amount, 0);
                                            const remaining = debt.amount - totalPaid;
                                            const progress = (totalPaid / debt.amount) * 100;
                                            const isFullyPaid = remaining <= 0.01;

                                            const simboloDeuda = obtenerSimboloMoneda(debt.currency === "VES" ? "BS" : "USD");
                                            const montoInicialDeuda = debt.amount;
                                            const montoRestanteDeuda = remaining;

                                            return (
                                                <div
                                                    key={debt.id}
                                                    className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-3xl p-5 relative overflow-hidden"
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${debt.type === 'por_cobrar' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                                <FiUser />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-white text-base leading-tight">{debt.personName}</h3>
                                                                <p className="text-xs text-slate-500 line-clamp-1">{debt.description || "Sin descripción"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`block text-lg font-black ${remaining > 0 ? (debt.type === 'por_cobrar' ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}`}>
                                                                {simboloDeuda} {montoRestanteDeuda.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                                                                de {simboloDeuda} {montoInicialDeuda.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Mini Progress */}
                                                    <div className="flex items-center gap-3 mb-5">
                                                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-colors duration-1000 ${isFullyPaid ? 'bg-emerald-500' : (debt.type === 'por_cobrar' ? 'bg-emerald-500' : 'bg-red-500')}`}
                                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-600 italic">{progress.toFixed(0)}%</span>
                                                    </div>

                                                    {/* Mobile Card Actions */}
                                                    <div className="flex gap-2">
                                                        {!isFullyPaid && (
                                                            <button
                                                                onClick={() => handleAddPaymentClick(debt)}
                                                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <FiDollarSign size={14} /> Abonar
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleEditDebtClick(debt)}
                                                            className="p-2.5 text-slate-400 bg-slate-800/50 rounded-xl hover:text-white"
                                                        >
                                                            <FiEdit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(debt.id)}
                                                            className="p-2.5 text-slate-400 bg-slate-800/50 rounded-xl hover:text-red-500"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>

                                                    {debt.dueDate && (
                                                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                                            <FiClock size={12} className={new Date(debt.dueDate) < new Date() && !isFullyPaid ? 'text-red-500/50' : ''} />
                                                            Vence: {new Date(debt.dueDate).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Mobile Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex justify-center gap-4 pt-4 pb-10">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 bg-slate-900/50 text-slate-400 text-xs font-bold rounded-xl disabled:opacity-20"
                                        >
                                            Anterior
                                        </button>
                                        <div className="flex items-center text-xs font-black text-slate-500 uppercase tracking-tighter">
                                            {currentPage} / {totalPages}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 bg-slate-900/50 text-slate-400 text-xs font-bold rounded-xl disabled:opacity-20"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* FAB Button Fixed */}
                            <button
                                onClick={handleAddDebtClick}
                                aria-label="Nueva deuda"
                                className="fixed right-4 z-40 bottom-safe-fab-above w-14 h-14 bg-linear-to-br from-violet-600 to-indigo-700 text-white rounded-2xl shadow-lg  flex items-center justify-center border border-white/20 active:from-violet-700"
                            >
                                <FiPlus size={28} />
                            </button>
                        </div>
                    ) : (
                        <div
                            key="mobile-form"
                            className="space-y-6"
                        >
                            {/* Form Header Mobile */}
                            <div className="flex items-center gap-4 mb-2">
                                <button
                                    onClick={handleCancelMobile}
                                    className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400"
                                >
                                    <FiArrowLeft size={20} />
                                </button>
                                <div>
                                    <h2 className="text-xl font-bold text-white leading-none">
                                        {view === "create" ? "Nuevo Registro" : view === "edit" ? "Editar Deuda" : "Registrar Pago"}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Sección Deudas</p>
                                </div>
                            </div>

                            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 shadow-lg relative overflow-hidden">
                                <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-500/10 rounded-full blur-[80px]" />
                                
                                <div className="relative z-10">
                                    {view === "payment" && editingDebt ? (
                                        <DebtPaymentForm 
                                            debt={editingDebt} 
                                            onSubmit={handlePaymentSubmit} 
                                            onCancel={handleCancelMobile}
                                            isLoading={isSubmitting} 
                                        />
                                    ) : (
                                        <DebtForm 
                                            initialData={editingDebt} 
                                            onSubmit={handleFormSubmit} 
                                            onCancel={handleCancelMobile}
                                            isLoading={isSubmitting}
                                            defaultType={activeTab}
                                        />
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleCancelMobile}
                                className="w-full py-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] hover:text-white transition-colors"
                            >
                                Volver al Listado
                            </button>
                        </div>
                    )}
</div>


            {/* DESKTOP VIEW */}
            <div className="hidden md:block pb-10">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    
                    {/* LEFT COLUMN: Sticky Form (1/3) */}
                    <div className="w-full lg:w-[380px] lg:sticky lg:top-8 flex-none">
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 shadow-lg relative overflow-hidden group">
                            {/* Decorative background circle */}
                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] group-hover:bg-amber-500/20 transition-colors duration-700" />
                            
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
<div
                                        key={view + (editingDebt?.id || "")}
                                    >
                                        {view === "payment" && editingDebt ? (
                                            <DebtPaymentForm 
                                                debt={editingDebt} 
                                                onSubmit={handlePaymentSubmit} 
                                                onCancel={handleCancelDesktop}
                                                isLoading={isSubmitting} 
                                            />
                                        ) : (
                                            <DebtForm 
                                                initialData={editingDebt} 
                                                onSubmit={handleFormSubmit} 
                                                onCancel={handleCancelDesktop}
                                                isLoading={isSubmitting}
                                                defaultType={activeTab}
                                            />
                                        )}
                                    </div>
</div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Content (2/3) */}
                    <div className="flex-1 space-y-8 w-full">
                        {/* Header Modern / Urban */}
                        <div className="relative overflow-hidden bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] group min-h-[160px] flex items-center">
                        {/* blur decorativo eliminado — radio 100px/80px costoso en GPU móvil */}
                            
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
                                        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab("por_cobrar"); } }}
                                        role="button"
                                        tabIndex={0}
                                        className={`px-6 py-4 rounded-3xl border transition-colors cursor-pointer group/stat ${activeTab === "por_cobrar" ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg " : "bg-slate-950/40 border-white/5 hover:border-emerald-500/20"}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${activeTab === "por_cobrar" ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-500 group-hover/stat:text-emerald-400"}`}>
                                                <FiArrowUpRight size={20} />
                                            </div>
                                            <div>
                                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover/stat:text-emerald-500/60 transition-colors">Por Cobrar</p>
                                                 <p className="text-xl font-black text-white leading-none">{obtenerSimboloMoneda(monedaBase)} {totalReceivable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                                             </div>
                                        </div>
                                    </div>

                                    <div 
                                        onClick={() => setActiveTab("por_pagar")}
                                        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab("por_pagar"); } }}
                                        role="button"
                                        tabIndex={0}
                                        className={`px-6 py-4 rounded-3xl border transition-colors cursor-pointer group/stat ${activeTab === "por_pagar" ? "bg-red-500/10 border-red-500/50 shadow-lg " : "bg-slate-950/40 border-white/5 hover:border-red-500/20"}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${activeTab === "por_pagar" ? "bg-red-500 text-slate-950" : "bg-slate-900 text-slate-500 group-hover/stat:text-red-400"}`}>
                                                <FiArrowDownLeft size={20} />
                                            </div>
                                            <div>
                                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover/stat:text-red-500/60 transition-colors">Por Pagar</p>
                                                 <p className="text-xl font-black text-white leading-none">{obtenerSimboloMoneda(monedaBase)} {totalPayable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
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
                                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-amber-500/30 placeholder-slate-600 transition-colors font-medium"
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

                                        const simboloDeuda = obtenerSimboloMoneda(debt.currency === "VES" ? "BS" : "USD");
                                        const montoInicialDeuda = debt.amount;
                                        const montoRestanteDeuda = remaining;

                                        return (
                                            <div 
                                                key={debt.id} 
                                                className={`bg-slate-950/40 border transition-colors duration-300 rounded-[2.5rem] p-6 relative group/card flex flex-col ${isFullyPaid ? 'border-emerald-500/10' : (editingDebt?.id === debt.id ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20' : 'border-white/5 hover:border-white/10')}`}
                                            >
                                                {isFullyPaid && (
                                                    <div className="absolute top-6 right-6">
                                                        <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-1 uppercase tracking-widest shadow-lg ">
                                                            <FiCheckCircle size={14} /> Saldado
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-start gap-5 mb-6">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover/card:scale-110 duration-500 ${debt.type === 'por_cobrar' ? 'bg-emerald-500/10 text-emerald-400 shadow-lg ' : 'bg-red-500/10 text-red-400 shadow-lg '}`}>
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
                                                        <p className="text-lg font-bold text-slate-400">{simboloDeuda} {montoInicialDeuda.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                                                    </div>
                                                    <div className={`p-4 rounded-3xl border relative overflow-hidden group/statcard ${isFullyPaid ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white/5 border-white/5'}`}>
                                                        <div className={`absolute inset-x-0 bottom-0 h-1 ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Restante</p>
                                                        <p className={`text-lg font-bold ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                            {simboloDeuda} {montoRestanteDeuda.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                                                            className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-xs transition-colors shadow-xl shadow-emerald-500/10 border border-white/10 flex items-center justify-center gap-2 group-hover/card:scale-[1.02]"
                                                        >
                                                            <FiDollarSign size={14} /> Registrar Abono
                                                        </button>
                                                    )}
                                                    
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditDebtClick(debt)}
                                                            className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-2xl border border-white/5 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <FiEdit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(debt.id)}
                                                            className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-red-500 bg-slate-900/50 hover:bg-red-500/10 rounded-2xl border border-white/5 transition-colors"
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
                                            </div>
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
