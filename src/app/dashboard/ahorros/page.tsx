/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore Timestamps use any type */
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    runTransaction
} from "firebase/firestore";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
    FiDollarSign,
    FiPlus,
    FiActivity,
    FiCalendar,
    FiTrash2,
    FiArrowUpRight,
    FiArrowDownLeft,
    FiBriefcase,
    FiSearch
} from "react-icons/fi";
import { TbCoinFilled } from "react-icons/tb";
import PaginationControls from "@/components/ui/PaginationControls";
import { SiTether } from "react-icons/si";
import { getBCVRate } from "@/lib/currency";
import GoalsSection from "@/components/savings/GoalsSection";
import AhorrosForm from "@/components/forms/AhorrosForm";

interface SavingsTransaction {
    id: string;
    amount: number;
    type: "deposit" | "withdrawal";
    method: "physical" | "usdt" | "bs"; // 'physical', 'usdt' or 'bs'
    description: string;
    date: any; // Timestamp
}

export default function SavingsPage() {
    const [user, setUser] = useState<any>(null);
    const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [balancePhysical, setBalancePhysical] = useState(0);
    const [balanceUSDT, setBalanceUSDT] = useState(0);
    const [balanceBs, setBalanceBs] = useState(0);
    const [bcvRate, setBcvRate] = useState(0);

    // Form State

    const [type, setType] = useState<"deposit" | "withdrawal">("deposit");

    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    // Delete Confirm State
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [deletingTrans, setDeletingTrans] = useState<SavingsTransaction | null>(null);

    const itemsPerPage = 8;

    useEffect(() => {
        getBCVRate().then(setBcvRate);
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // Listen to User Balance
                const unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setBalancePhysical(data.savingsPhysical || 0);
                        setBalanceUSDT(data.savingsUSDT || 0);
                        setBalanceBs(data.savingsBs || 0);
                    }
                });

                // Listen to Transactions
                const q = query(
                    collection(db, "users", currentUser.uid, "savings_transactions"),
                    orderBy("date", "desc")
                );

                const unsubTrans = onSnapshot(q, (snapshot) => {
                    const trans = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as SavingsTransaction[];
                    setTransactions(trans);
                    setLoading(false);
                });

                return () => {
                    unsubUser();
                    unsubTrans();
                };
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const handleFormSubmit = async (data: { amount: string; description: string; method: "physical" | "usdt" | "bs" }) => {
        const { amount, description, method } = data;
        
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {

            toast.error("Por favor ingresa un monto mayor a 0");
            return;
        }

        const numAmount = parseFloat(amount);

        // Validation for withdrawal
        if (type === "withdrawal") {
            const currentBalance = method === "physical" ? balancePhysical : method === "usdt" ? balanceUSDT : balanceBs;
            if (numAmount > currentBalance) {
                const methodName = method === "physical" ? "Efectivo" : method === "usdt" ? "USDT" : "Bolívares";
                toast.error(`No tienes suficientes fondos en ${methodName} para retirar esa cantidad.`);
                return;
            }
        }

        try {
            const userRef = doc(db, "users", user.uid);
            const fieldToUpdate = method === "physical" ? "savingsPhysical" : method === "usdt" ? "savingsUSDT" : "savingsBs";
            const incrementValue = type === "deposit" ? numAmount : -numAmount;

            // Run as a transaction to ensure data integrity
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw "User does not exist";

                const newBalance = (userDoc.data()[fieldToUpdate] || 0) + incrementValue;

                transaction.update(userRef, {
                    [fieldToUpdate]: newBalance
                });

                const transRef = doc(collection(db, "users", user.uid, "savings_transactions"));
                transaction.set(transRef, {
                    amount: numAmount,
                    type,
                    method,
                    description: description || (type === "deposit" ? "Depósito" : "Retiro"),
                    date: serverTimestamp()
                });
            });

            toast.success("Movimiento registrado exitosamente");

            // Reset Form (Handled by component)

        } catch (error) {
            console.error("Error adding transaction:", error);
            toast.error("No se pudo registrar el movimiento");
        }
    };

    const handleDeleteClick = (trans: SavingsTransaction) => {
        setDeletingTrans(trans);
        setShowConfirmDelete(true);
    };

    const confirmDelete = async () => {
        if (!deletingTrans) return;
        
        try {
            const userRef = doc(db, "users", user.uid);
            const fieldToUpdate = deletingTrans.method === "physical" ? "savingsPhysical" : deletingTrans.method === "usdt" ? "savingsUSDT" : "savingsBs";

            const revertValue = deletingTrans.type === "deposit" ? -deletingTrans.amount : deletingTrans.amount;

            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw "User does not exist";

                const newBalance = (userDoc.data()[fieldToUpdate] || 0) + revertValue;

                transaction.update(userRef, {
                    [fieldToUpdate]: newBalance
                });

                transaction.delete(doc(db, "users", user.uid, "savings_transactions", deletingTrans.id));
            });

            toast.success("Eliminado exitosamente");
        } catch (error) {
            console.error("Error deleting transaction:", error);
            toast.error("No se pudo eliminar el registro");
        } finally {
            setShowConfirmDelete(false);
            setDeletingTrans(null);
        }
    };

    // Variant definitions
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
            } as const // Fix strict type checking
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const totalBalance = balancePhysical + balanceUSDT + (balanceBs / bcvRate || 0);

    const filteredTransactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.amount.toString().includes(searchTerm)
    );

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <>
            {/* ===== MOBILE LAYOUT ===== */}
            <motion.div
                className="md:hidden flex flex-col gap-6 pb-20"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Mobile Header */}
                <motion.div variants={itemVariants} className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Ahorros</h1>
                        <p className="text-slate-400 text-xs">Gestiona tu capital</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
                        <span className="text-xs text-slate-400 font-medium px-1">Total:</span>
                        <span className="text-sm font-bold text-emerald-400">$ {totalBalance.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                </motion.div>

                {/* Balances Horizontal Scroll */}
                <motion.div variants={itemVariants} className="-mx-4">
                    <div className="flex gap-3 overflow-x-auto pb-4 px-4 scrollbar-hide">
                        {/* Physical Card */}
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            className="flex-none w-40 bg-linear-to-br from-emerald-600/20 to-emerald-900/10 p-4 rounded-2xl border border-emerald-500/20 relative overflow-hidden"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400"><FiDollarSign size={14} /></div>
                                <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Efectivo</span>
                            </div>
                            <p className="text-xl font-bold text-white mb-0.5">$ {balancePhysical.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                        </motion.div>

                        {/* USDT Card */}
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            className="flex-none w-40 bg-linear-to-br from-teal-600/20 to-teal-900/10 p-4 rounded-2xl border border-teal-500/20 relative overflow-hidden"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-teal-500/20 rounded-lg text-teal-400"><SiTether size={14} /></div>
                                <span className="text-xs font-bold text-teal-200 uppercase tracking-wider">USDT</span>
                            </div>
                            <p className="text-xl font-bold text-white mb-0.5">{balanceUSDT.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                        </motion.div>

                        {/* Bs Card */}
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            className="flex-none w-48 bg-linear-to-br from-amber-600/20 to-amber-900/10 p-4 rounded-2xl border border-amber-500/20 relative overflow-hidden"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400"><TbCoinFilled size={14} /></div>
                                <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">Bolívares</span>
                            </div>
                            <p className="text-xl font-bold text-white mb-0.5">Bs. {balanceBs.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                            <p className="text-[10px] text-amber-200/60">≈ ${bcvRate > 0 ? (balanceBs / bcvRate).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</p>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Quick Add Form Section */}
                <motion.div variants={itemVariants} className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50">
                    <AhorrosForm 
                        type={type} 
                        setType={setType} 
                        onSubmit={handleFormSubmit} 
                        isLoading={false} 
                    />
                </motion.div>

                {/* Goals Preview */}
                <motion.div variants={itemVariants}>
                    {user && <GoalsSection userId={user.uid} />}
                </motion.div>

                {/* Recent History Mobile */}
                <motion.div variants={itemVariants} className="pb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Historial Reciente</h3>
                    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden divide-y divide-slate-700/30">
                        {paginatedTransactions.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-xs">Sin movimientos</div>
                        ) : (
                            paginatedTransactions.slice(0, 5).map(t => (
                                <div key={t.id} className="flex items-center justify-between p-4 active:bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${t.type === "deposit"
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : "bg-red-500/10 text-red-400"
                                            }`}>
                                            {t.type === "deposit" ? <FiArrowUpRight size={16} /> : <FiArrowDownLeft size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">{t.description}</p>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${t.method === "physical"
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : t.method === "usdt"
                                                        ? "bg-teal-500/10 text-teal-400"
                                                        : "bg-amber-500/10 text-amber-400"
                                                    }`}>
                                                    {t.method === "physical" ? "Efectivo" : t.method === "usdt" ? "USDT" : "Bs"}
                                                </span>
                                                <span className="text-xs text-slate-500">{t.date?.toDate().toLocaleDateString("es-ES", { day: '2-digit', month: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className={`font-mono font-bold text-sm ${t.type === "deposit" ? "text-emerald-400" : "text-white"
                                            }`}>
                                            {t.type === "deposit" ? "+" : "-"}{t.method === "bs" ? "Bs." : "$"}{t.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </p>
                                        <button
                                            onClick={() => handleDeleteClick(t)}
                                            className="text-slate-600 active:text-red-400"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                        <div className="p-3 text-center">
                            <button onClick={() => { }} className="text-xs text-emerald-400 font-medium">Ver historial completo</button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>


            {/* ===== DESKTOP LAYOUT (Original wrapped) ===== */}
            <div className="hidden md:block space-y-8 pb-10">
                {/* Header */}
                <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                        <FiBriefcase className="text-7xl md:text-9xl text-violet-400" />
                    </div>
                    <div className="absolute top-0 left-0 w-full h-full bg-linear-to-r from-violet-500/10 to-transparent pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">Mis Ahorros</h1>
                            <p className="text-slate-400 text-sm md:text-lg">
                                Gestiona tu capital físico y digital.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Balance Cards - Horizontal scroll en móvil */}
                    <div className="lg:col-span-3">
                        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 scrollbar-hide">
                            {/* Physical */}
                            <div className="flex-none w-64 md:w-auto bg-slate-900/50 backdrop-blur-md p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all"></div>
                                <div className="flex items-center justify-between mb-3 md:mb-4">
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Efectivo Físico</h3>
                                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                                        <FiDollarSign size={18} />
                                    </div>
                                </div>
                                <p className="text-2xl md:text-3xl font-bold text-white mb-1">$ {balancePhysical.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                                <p className="text-xs md:text-sm text-slate-500">Valor estable</p>
                            </div>

                            {/* USDT */}
                            <div className="flex-none w-64 md:w-auto bg-slate-900/50 backdrop-blur-md p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-teal-500/20 transition-all"></div>
                                <div className="flex items-center justify-between mb-3 md:mb-4">
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">USDT (Cripto)</h3>
                                    <div className="p-2 bg-teal-500/20 rounded-lg text-teal-400">
                                        <SiTether size={18} />
                                    </div>
                                </div>
                                <p className="text-2xl md:text-3xl font-bold text-white mb-1">{balanceUSDT.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDT</p>
                                <p className="text-xs md:text-sm text-slate-500">Dólar Digital</p>
                            </div>

                            {/* Bolívares */}
                            <div className="flex-none w-64 md:w-auto bg-slate-900/50 backdrop-blur-md p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/20 transition-all"></div>
                                <div className="flex items-center justify-between mb-3 md:mb-4">
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Bolívares</h3>
                                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                                        <TbCoinFilled size={18} />
                                    </div>
                                </div>
                                <p className="text-2xl md:text-3xl font-bold text-white mb-1">Bs. {balanceBs.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                                <p className="text-xs md:text-sm text-slate-500">≈ ${bcvRate > 0 ? (balanceBs / bcvRate).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Total Summary */}
                    <div className="bg-linear-to-br from-violet-900/40 to-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-violet-500/30 shadow-lg flex flex-col justify-center relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-violet-200 text-sm font-bold uppercase tracking-wider mb-2">Total Ahorrado</h3>
                            <p className="text-3xl md:text-4xl font-bold text-white mb-2">$ {totalBalance.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                            <div className="inline-block px-3 py-1 bg-white/10 rounded-full border border-white/10 text-xs text-violet-200 mb-4">
                                ≈ Bs. {(totalBalance * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Transaction Form */}
                    <div className="lg:col-span-1">
                        <AhorrosForm 
                            type={type} 
                            setType={setType} 
                            onSubmit={handleFormSubmit} 
                            isLoading={false} 
                        />
                    </div>

                    {/* History List */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col h-full">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FiCalendar className="text-violet-400" />
                                    Historial de Movimientos
                                </h3>
                                <div className="relative w-full md:w-64">
                                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-600 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                                {paginatedTransactions.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        {searchTerm ? "No se encontraron movimientos." : "No hay movimientos registrados."}
                                    </div>
                                ) : (
                                    paginatedTransactions.map(t => (
                                        <div key={t.id} className="bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 rounded-2xl p-4 flex items-center justify-between transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${t.type === "deposit"
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-red-500/10 text-red-400"
                                                    }`}>
                                                    {t.type === "deposit" ? <FiArrowUpRight size={20} /> : <FiArrowDownLeft size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white flex items-center gap-2">
                                                        {t.description}
                                                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${t.method === "physical"
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                            : t.method === "usdt"
                                                                ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                                                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                            }`}>
                                                            {t.method === "physical" ? "Efectivo" : t.method === "usdt" ? "USDT" : "Bs"}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {t.date?.toDate().toLocaleDateString("es-ES", { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <p className={`font-mono font-bold text-lg ${t.type === "deposit" ? "text-emerald-400" : "text-red-400"
                                                    }`}>
                                                    {t.type === "deposit" ? "+" : "-"}{t.method === "bs" ? "Bs." : "$"}{t.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                </p>
                                                <button
                                                    onClick={() => handleDeleteClick(t)}
                                                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-700/30">
                                <PaginationControls
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Goals Section - Now appears after transaction form and history */}
                {user && <GoalsSection userId={user.uid} />}
            </div >
        </>
    );
}
