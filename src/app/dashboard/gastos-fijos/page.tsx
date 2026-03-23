"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFixedExpenses, FixedExpense } from "@/hooks/useFixedExpenses";
import { FiCalendar, FiPlus, FiTrash2, FiCheckCircle, FiDollarSign, FiEdit2, FiInfo, FiActivity, FiSearch, FiList } from "react-icons/fi";
import PaginationControls from "@/components/ui/PaginationControls";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getBCVRate } from "@/lib/currency";
import FixedExpensesCalendar from "@/components/ui/FixedExpensesCalendar";
import { motion, AnimatePresence } from "framer-motion";

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


    useEffect(() => {
        getBCVRate().then(setBcvRate);
    }, []);

    const handleAddExpenseClick = () => {
        router.push("/dashboard/gastos-fijos/nuevo");
    };

    const handleEditExpenseClick = (expense: FixedExpense) => {
        router.push(`/dashboard/gastos-fijos/${expense.id}/editar`);
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

    const executePay = async (withTransaction: boolean) => {
        if (!payingExpense) return;

        try {
            if (withTransaction && auth.currentUser) {
                await addDoc(collection(db, "transactions"), {
                    userId: auth.currentUser.uid,
                    amount: payingExpense.amount,
                    type: "gasto",
                    category: payingExpense.category,
                    description: `Pago mensual: ${payingExpense.title}`,
                    date: Timestamp.now(),
                    currency: "USD",
                    originalAmount: payingExpense.amount,
                    exchangeRate: bcvRate,
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
        <div className="space-y-8 pb-10">
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

            {/* Mobile Header & Summary */}
            <div className="md:hidden space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Gastos Fijos</h1>
                        <p className="text-slate-500 text-xs">Recursivos mensuales</p>
                    </div>
                </div>

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
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-3xl border border-slate-700/30 sticky top-4 z-20 backdrop-blur-md md:static md:bg-slate-900/40 md:p-4">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex bg-slate-800/50 rounded-2xl p-1 border border-slate-700/50">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-violet-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            title="Vista Lista"
                        >
                            <FiList size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-violet-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            title="Vista Calendario"
                        >
                            <FiCalendar size={20} />
                        </button>
                    </div>

                    <div className="relative w-full md:w-80">
                        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar gasto..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-2.5 pl-11 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 placeholder-slate-600 transition-all"
                        />
                    </div>
                </div>

                <button
                    onClick={handleAddExpenseClick}
                    className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-400/30 text-white rounded-2xl font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    <FiPlus className="relative z-10" /> <span className="relative z-10">Nuevo Gasto</span>
                </button>
            </div>

            {/* Content: List or Calendar */}
            {viewMode === 'calendar' ? (
                <FixedExpensesCalendar expenses={filteredExpenses} onPayExpense={handlePayExpenseClick} />
            ) : (
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedExpenses.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/20"
                                >
                                    <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                                        <FiInfo className="text-3xl text-slate-500" />
                                    </div>
                                    <h3 className="text-white font-bold text-xl mb-2">No hay resultados</h3>
                                    <p className="text-slate-500 max-w-xs mx-auto">
                                        {searchTerm ? "No encontramos gastos que coincidan con tu búsqueda." : "Aún no has registrado ningún gasto fijo mensual."}
                                    </p>
                                </motion.div>
                            )}

                            {/* Expense Cards */}
                            {paginatedExpenses.map((expense, index) => {
                                const isPaid = isPaidCurrentMonth(expense.lastPaidDate);
                                return (
                                    <motion.div
                                        key={expense.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`group relative flex flex-col bg-slate-900/40 backdrop-blur-xl border-2 rounded-4xl p-5 transition-all hover:bg-slate-900/60 ${isPaid ? 'border-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'border-slate-800 hover:border-slate-700'
                                            }`}
                                    >
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
                                                    : "bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-violet-400/30"
                                                    }`}
                                            >
                                                {!isPaid && <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>}
                                                <div className="relative z-10 flex items-center gap-2">
                                                    {isPaid ? (
                                                        <>
                                                            <FiCheckCircle size={18} /> PAGADO
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FiDollarSign size={18} /> PAGAR ESTE MES
                                                        </>
                                                    )}
                                                </div>
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </AnimatePresence>

                    <div className="pt-6">
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            )}

            {/* Floating Action Button for Mobile */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleAddExpenseClick}
                className="md:hidden fixed bottom-44 right-6 w-16 h-16 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-400/30 text-white rounded-3xl shadow-[0_0_20px_rgba(139,92,246,0.4)] flex items-center justify-center z-50 overflow-hidden group"
            >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <FiPlus size={32} className="relative z-10" />
            </motion.button>
        </div>
    );
}
