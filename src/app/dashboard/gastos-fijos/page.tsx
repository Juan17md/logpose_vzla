"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFixedExpenses, FixedExpense } from "@/hooks/useFixedExpenses";
import { FiCalendar, FiPlus, FiTrash2, FiCheckCircle, FiDollarSign, FiEdit2, FiInfo, FiActivity, FiSearch, FiList, FiArrowLeft } from "react-icons/fi";
import PaginationControls from "@/components/ui/PaginationControls";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getBCVRate } from "@/lib/currency";
import FixedExpensesCalendar from "@/components/ui/FixedExpensesCalendar";
import { motion, AnimatePresence } from "framer-motion";
import FixedExpenseForm from "@/components/forms/FixedExpenseForm";
import OnePieceQuote from "@/components/ui/OnePieceQuote";

export default function FixedExpensesPage() {
    const router = useRouter();
    const { fixedExpenses, loadingFixedExpenses, addFixedExpense, deleteFixedExpense, updateFixedExpense } = useFixedExpenses();
    const [bcvRate, setBcvRate] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const itemsPerPage = 8;
    // Modals State

    const [showPayModal, setShowPayModal] = useState(false);
    const [payingExpense, setPayingExpense] = useState<FixedExpense | null>(null);

    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [showAlreadyPaidConfirm, setShowAlreadyPaidConfirm] = useState(false);
    const [alreadyPaidExpense, setAlreadyPaidExpense] = useState<FixedExpense | null>(null);

    const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [mobileView, setMobileView] = useState<'list' | 'form'>('list');


    useEffect(() => {
        getBCVRate().then(setBcvRate);
    }, []);

    const handleAddExpenseClick = () => {
        setEditingExpense(null);
        setMobileView('form');
    };

    const handleEditExpenseClick = (expense: FixedExpense) => {
        setEditingExpense(expense);
        setMobileView('form');
    };

    const handleFormSubmit = async (data: any) => {
        setIsSaving(true);
        try {
            if (editingExpense) {
                await updateFixedExpense(editingExpense.id, data);
                toast.success("Gasto actualizado correctamente");
                setEditingExpense(null);
            } else {
                await addFixedExpense(data);
                toast.success("Gasto creado correctamente");
            }
            if (window.innerWidth < 768) {
                setMobileView('list');
            }
        } catch (error) {
            toast.error("Error al guardar el gasto");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingExpense(null);
        if (window.innerWidth < 768) {
            setMobileView('list');
        }
    };

    const handlePayExpenseClick = (expense: FixedExpense) => {
        const isPaidThisMonth = expense.lastPaidDate &&
            new Date(expense.lastPaidDate).getMonth() === new Date().getMonth() &&
            new Date(expense.lastPaidDate).getFullYear() === new Date().getFullYear();

        if (isPaidThisMonth) {
            setAlreadyPaidExpense(expense);
            setShowAlreadyPaidConfirm(true);
            return;
        }

        setPayingExpense(expense);
        setShowPayModal(true);
    };

    const confirmAlreadyPaidWrapper = () => {
        if (!alreadyPaidExpense) return;
        setShowAlreadyPaidConfirm(false);
        setPayingExpense(alreadyPaidExpense);
        setShowPayModal(true);
        setAlreadyPaidExpense(null);
    };

    const executePay = async (mode: 'redirect' | 'direct' | 'mark-only') => {
        if (!payingExpense) return;

        try {
            if (mode === 'redirect') {
                // Redirigir a Movimientos con datos precargados editables
                const montoBs = payingExpense.montoBs || payingExpense.amount * bcvRate;
                const params = new URLSearchParams({
                    precarga: 'gasto-fijo',
                    amount: payingExpense.amount.toString(),
                    category: payingExpense.category,
                    description: `Pago mensual: ${payingExpense.title}`,
                    currency: payingExpense.currency,
                    montoBs: montoBs.toString(),
                });

                // Marcar como pagado antes de redirigir
                await updateFixedExpense(payingExpense.id, {
                    lastPaidDate: new Date()
                });

                setShowPayModal(false);
                setPayingExpense(null);
                router.push(`/dashboard/movimientos?${params.toString()}`);
                return;
            }

            if (mode === 'direct' && auth.currentUser) {
                // Registrar transacción directa con campos de Ancla Monetaria
                const montoBs = payingExpense.montoBs || payingExpense.amount * bcvRate;
                await addDoc(collection(db, "transactions"), {
                    userId: auth.currentUser.uid,
                    amount: payingExpense.amount,
                    type: "gasto",
                    category: payingExpense.category,
                    description: `Pago mensual: ${payingExpense.title}`,
                    date: Timestamp.now(),
                    currency: payingExpense.currency === "BS" ? "VES" : "USD",
                    originalAmount: payingExpense.currency === "BS" ? montoBs : payingExpense.amount,
                    exchangeRate: bcvRate,
                    // Campos de Ancla Monetaria
                    montoBs,
                    tasaRegistro: bcvRate,
                });
                toast.success("Pago y Gasto registrados");
            } else {
                toast.success("Marcado como Pagado sin afectar saldo");
            }

            // Update Fixed Expense Last Paid Date
            await updateFixedExpense(payingExpense.id, {
                lastPaidDate: new Date()
            });

        } catch (error) {
            toast.error("No se pudo actualizar el estado.");
        } finally {
            setShowPayModal(false);
            setPayingExpense(null);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setShowConfirmDelete(true);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        try {
            await deleteFixedExpense(deletingId);
            toast.success("Borrado exitosamente");
        } catch (err) {
            toast.error("Error al borrar el gasto");
        } finally {
            setShowConfirmDelete(false);
        }
    };

    const isPaidCurrentMonth = (date?: Date) => {
        if (!date) return false;
        const now = new Date();
        const paidDate = new Date(date);
        return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
    };

    // Calculate derived values but don't render until we are sure we are not loading.
    // Actually, we can just calculate them; they will be empty if fixedExpenses is empty.

    const totalMonthly = fixedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPaid = fixedExpenses.filter(e => isPaidCurrentMonth(e.lastPaidDate)).reduce((acc, curr) => acc + curr.amount, 0);
    const progress = totalMonthly > 0 ? (totalPaid / totalMonthly) * 100 : 0;

    const filteredExpenses = fixedExpenses.filter(e =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
    const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loadingFixedExpenses) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-32 md:pb-10">
            {/* Desktop Header */}
            <div className="hidden md:block bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiCalendar className="text-9xl text-violet-400" />
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-r from-violet-500/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10 grid grid-cols-2 gap-8 items-end">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Gastos Fijos</h1>
                        <p className="text-slate-400 text-lg">
                            Gestiona tus pagos recurrentes mensuales.
                        </p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Progreso del Mes</p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    ${totalPaid.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-slate-500 text-sm font-normal">/ ${totalMonthly.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-emerald-400 font-bold text-xl">{progress.toFixed(0)}%</p>
                            </div>
                        </div>
                        <div className="w-full bg-slate-700/50 h-2 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full"
                            ></motion.div>
                        </div>
                    </div>
                </div>
            </div>

            <OnePieceQuote category="gastos-fijos" className="hidden md:block mb-6" />

            {/* Mobile Header & Summary */}
            <div className="md:hidden space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Gastos Fijos</h1>
                        <p className="text-slate-500 text-xs">Recursivos mensuales</p>
                    </div>
                    {mobileView === 'form' && (
                        <button
                            onClick={() => setMobileView('list')}
                            className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                    )}
                </div>

                {mobileView === 'list' && (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                                <FiActivity className="text-violet-500 text-xl" />
                            </div>
                            <div className="text-right">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Progreso</p>
                                <p className="text-xl font-bold text-emerald-400">{progress.toFixed(0)}%</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Pagado</p>
                                    <p className="text-xl font-bold text-white">${totalPaid.toLocaleString("es-ES")}</p>
                                </div>
                                <div className="text-right text-slate-400">
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total</p>
                                    <p className="text-lg font-medium">${totalMonthly.toLocaleString("es-ES")}</p>
                                </div>
                            </div>
                            <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <OnePieceQuote category="gastos-fijos" className="md:hidden" />

            {/* Layout Grid */}
            <div className="relative">
                {/* Mobile View Switcher */}
                <div className="md:hidden">
                    <AnimatePresence mode="wait">
                        {mobileView === 'list' ? (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                {/* Controls Mobile */}
                                <div className="flex gap-2">
                                    <div className="flex bg-slate-900/40 rounded-2xl p-1 border border-slate-700/30">
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-violet-500 text-white shadow-lg' : 'text-slate-400'}`}
                                        >
                                            <FiList size={20} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('calendar')}
                                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-violet-500 text-white shadow-lg' : 'text-slate-400'}`}
                                        >
                                            <FiCalendar size={20} />
                                        </button>
                                    </div>
                                    <div className="relative flex-1">
                                        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Buscar..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-slate-900/40 border border-slate-700/30 rounded-2xl py-2.5 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-violet-500/50"
                                        />
                                    </div>
                                </div>

                                {/* List Content Mobile */}
                                {renderContent()}
                                
                                {/* Floating Button */}
                                <motion.button
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setMobileView('form')}
                                    className="fixed bottom-32 right-6 w-16 h-16 bg-linear-to-r from-violet-600 to-indigo-600 border border-violet-400/30 text-white rounded-3xl shadow-xl flex items-center justify-center z-50"
                                >
                                    <FiPlus size={32} />
                                </motion.button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-6 rounded-3xl shadow-xl backdrop-blur-xl">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            {editingExpense ? (
                                                <><FiEdit2 className="text-amber-400" /> Editar Gasto</>
                                            ) : (
                                                <><FiPlus className="text-emerald-400" /> Nuevo Gasto</>
                                            )}
                                        </h2>
                                        {editingExpense && (
                                            <button
                                                onClick={handleCancelEdit}
                                                className="text-xs text-slate-400 hover:text-white underline"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                    <FixedExpenseForm
                                        onSubmit={handleFormSubmit}
                                        onCancel={() => {
                                            setMobileView('list');
                                            setEditingExpense(null);
                                        }}
                                        initialData={editingExpense || undefined}
                                        isLoading={isSaving}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Desktop Layout Grid */}
                <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="sticky top-6 space-y-6">
                            <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-6 rounded-3xl shadow-xl backdrop-blur-xl">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        {editingExpense ? (
                                            <><FiEdit2 className="text-amber-400" /> Editar Gasto</>
                                        ) : (
                                            <><FiPlus className="text-emerald-400" /> Nuevo Gasto</>
                                        )}
                                    </h2>
                                    {editingExpense && (
                                        <button
                                            onClick={handleCancelEdit}
                                            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                                        >
                                            <FiArrowLeft size={14} /> Cancelar edición
                                        </button>
                                    )}
                                </div>
                                <FixedExpenseForm
                                    onSubmit={handleFormSubmit}
                                    onCancel={handleCancelEdit}
                                    initialData={editingExpense || undefined}
                                    isLoading={isSaving}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: List */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Desktop Controls */}
                        <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-3xl border border-slate-700/30 backdrop-blur-md">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="flex bg-slate-800/50 rounded-2xl p-1 border border-slate-700/50 shadow-inner">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                                        title="Vista Lista"
                                    >
                                        <FiList size={20} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('calendar')}
                                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                                        title="Vista Calendario"
                                    >
                                        <FiCalendar size={20} />
                                    </button>
                                </div>
                                <div className="relative flex-1 max-w-md">
                                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Filtrar por nombre o categoría..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-800/30 border border-slate-700/50 rounded-2xl py-2.5 pl-11 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rendering content based on view mode */}
                        <AnimatePresence mode="popLayout">
                            {renderContent()}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Pago Modal */}
            <Modal
                isOpen={showPayModal}
                onClose={() => setShowPayModal(false)}
                title="Confirmar Pago"
            >
                <div className="p-6 text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                        <FiDollarSign className="text-4xl text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">¿Cómo deseas registrar este pago?</h3>
                        <p className="text-slate-400 text-sm">
                            Puedes ir a Movimientos para personalizar el registro, registrar rápidamente o solo marcarlo.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 pt-4">
                        <button
                            onClick={() => executePay('redirect')}
                            className="w-full py-4 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <FiEdit2 size={18} /> Ir a Movimientos (editable)
                        </button>
                        <button
                            onClick={() => executePay('direct')}
                            className="w-full py-4 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <FiActivity size={18} /> Registro Rápido
                        </button>
                        <button
                            onClick={() => executePay('mark-only')}
                            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2"
                        >
                            <FiCheckCircle size={18} /> Solo marcar como pagado
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirmación Ya Pagado */}
            <ConfirmDialog
                isOpen={showAlreadyPaidConfirm}
                onClose={() => setShowAlreadyPaidConfirm(false)}
                onConfirm={confirmAlreadyPaidWrapper}
                title="¿Volver a pagar?"
                message={`Este gasto (${alreadyPaidExpense?.title}) ya fue marcado como pagado este mes. ¿Deseas registrar otro pago?`}
                confirmText="Sí, registrar de nuevo"
                type="warning"
            />

            {/* Confirmación Borrado */}
            <ConfirmDialog
                isOpen={showConfirmDelete}
                onClose={() => setShowConfirmDelete(false)}
                onConfirm={confirmDelete}
                title="¿Eliminar gasto fijo?"
                message="Esta acción no se puede deshacer y el gasto dejará de aparecer mensualmente."
                confirmText="Si, eliminar"
                type="danger"
            />
        </div>
    );

    // Dynamic content renderer to avoid code duplication
    function renderContent() {
        if (viewMode === 'calendar') {
            return (
                <motion.div
                    key="calendar-view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                >
                    <FixedExpensesCalendar expenses={filteredExpenses} onPayExpense={handlePayExpenseClick} />
                </motion.div>
            );
        }

        return (
            <motion.div
                key="list-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
            >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {paginatedExpenses.length === 0 ? (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/20">
                            <FiInfo className="text-4xl text-slate-600 mx-auto mb-4" />
                            <h3 className="text-white font-bold text-lg">No se encontraron gastos</h3>
                            <p className="text-slate-500">Prueba ajustando los filtros de búsqueda.</p>
                        </div>
                    ) : (
                        paginatedExpenses.map((expense, index) => renderExpenseCard(expense, index))
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="pt-6">
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </motion.div>
        );
    }

    function renderExpenseCard(expense: FixedExpense, index: number) {
        const isPaid = isPaidCurrentMonth(expense.lastPaidDate);
        return (
            <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative flex flex-col bg-slate-900/40 backdrop-blur-xl border-2 rounded-4xl p-5 transition-all hover:bg-slate-900/60 ${isPaid ? 'border-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'border-slate-800 hover:border-slate-700'}`}
            >
                {/* ... existing card content ... */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl shadow-inner ${isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                            <FiActivity size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg tracking-tight">{expense.title}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{expense.category}</span>
                                <span className="h-1 w-1 bg-slate-700 rounded-full"></span>
                                <span className="text-xs font-bold text-emerald-500/80">Día {expense.dueDay}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => handleEditExpenseClick(expense)}
                            className="p-2 text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 rounded-xl transition-all"
                        >
                            <FiEdit2 size={18} />
                        </button>
                        <button
                            onClick={() => handleDeleteClick(expense.id)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        >
                            <FiTrash2 size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-1 mb-8">
                    <div className="flex items-center gap-1.5">
                        <span className="text-3xl font-black text-white">$</span>
                        <span className="text-4xl font-black text-white tracking-tighter">
                            {Math.floor(expense.amount).toLocaleString("es-ES")}
                            <span className="text-xl text-slate-500 font-bold">
                                ,{(expense.amount % 1).toFixed(2).split('.')[1] || '00'}
                            </span>
                        </span>
                    </div>
                    <p className="text-xs font-bold text-slate-500 tracking-wide">
                        ≈ Bs. {(expense.amount * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3">
                    <button
                        onClick={() => handlePayExpenseClick(expense)}
                        disabled={isPaid}
                        className={`flex-1 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all relative overflow-hidden group active:scale-95 ${isPaid
                            ? "bg-slate-800/50 text-emerald-500 cursor-not-allowed border border-emerald-500/20"
                            : "bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-violet-400/30"}`}
                    >
                        {!isPaid && <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>}
                        <div className="relative z-10 flex items-center gap-2">
                            {isPaid ? (
                                <><FiCheckCircle size={18} /> PAGADO</>
                            ) : (
                                <><FiDollarSign size={18} /> PAGAR ESTE MES</>
                            )}
                        </div>
                    </button>
                </div>
            </motion.div>
        );
    }
}
