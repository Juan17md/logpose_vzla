"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    increment,
    deleteDoc,
    getDoc,
    runTransaction
} from "firebase/firestore";
import Swal from "sweetalert2";
import {
    FiDollarSign,
    FiPlus,
    FiMinus,
    FiActivity,
    FiCalendar,
    FiTrash2,
    FiArrowUpRight,
    FiArrowDownLeft,
    FiBriefcase,
    FiSearch
} from "react-icons/fi";
import PaginationControls from "@/components/ui/PaginationControls";
import { SiTether } from "react-icons/si";
import { getBCVRate } from "@/lib/currency";
import GoalsSection from "@/components/savings/GoalsSection";

interface SavingsTransaction {
    id: string;
    amount: number;
    type: "deposit" | "withdrawal";
    method: "physical" | "usdt"; // 'physical' or 'usdt'
    description: string;
    date: any; // Timestamp
}

export default function SavingsPage() {
    const [user, setUser] = useState<any>(null);
    const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [balancePhysical, setBalancePhysical] = useState(0);
    const [balanceUSDT, setBalanceUSDT] = useState(0);
    const [bcvRate, setBcvRate] = useState(0);

    // Form State
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [method, setMethod] = useState<"physical" | "usdt">("physical");
    const [type, setType] = useState<"deposit" | "withdrawal">("deposit");

    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Swal.fire({
                icon: 'error',
                title: 'Monto inválido',
                text: 'Por favor ingresa un monto mayor a 0',
                background: "#1f2937",
                color: "#fff",
            });
            return;
        }

        const numAmount = parseFloat(amount);

        // Validation for withdrawal
        if (type === "withdrawal") {
            const currentBalance = method === "physical" ? balancePhysical : balanceUSDT;
            if (numAmount > currentBalance) {
                Swal.fire({
                    icon: 'error',
                    title: 'Saldo insuficiente',
                    text: `No tienes suficientes fondos en ${method === "physical" ? "Efectivo" : "USDT"} para retirar esa cantidad.`,
                    background: "#1f2937",
                    color: "#fff",
                });
                return;
            }
        }

        try {
            const userRef = doc(db, "users", user.uid);
            const fieldToUpdate = method === "physical" ? "savingsPhysical" : "savingsUSDT";
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

            Swal.fire({
                icon: 'success',
                title: 'Movimiento registrado',
                timer: 1500,
                showConfirmButton: false,
                background: "#1f2937",
                color: "#fff",
            });

            // Reset Form (keep method/type as prefernece or reset? Let's reset amount/desc)
            setAmount("");
            setDescription("");

        } catch (error) {
            console.error("Error adding transaction:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo registrar el movimiento',
                background: "#1f2937",
                color: "#fff",
            });
        }
    };

    const handleDelete = async (trans: SavingsTransaction) => {
        const result = await Swal.fire({
            title: '¿Eliminar registro?',
            text: "Esto revertirá el saldo asociado.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            background: "#1f2937",
            color: "#fff",
        });

        if (result.isConfirmed) {
            try {
                const userRef = doc(db, "users", user.uid);
                const fieldToUpdate = trans.method === "physical" ? "savingsPhysical" : "savingsUSDT";

                // If it was a deposit, we subtract to revert. If withdrawal, we add to revert.
                const revertValue = trans.type === "deposit" ? -trans.amount : trans.amount;

                await runTransaction(db, async (transaction) => {
                    const userDoc = await transaction.get(userRef);
                    if (!userDoc.exists()) throw "User does not exist";

                    const newBalance = (userDoc.data()[fieldToUpdate] || 0) + revertValue;

                    transaction.update(userRef, {
                        [fieldToUpdate]: newBalance
                    });

                    transaction.delete(doc(db, "users", user.uid, "savings_transactions", trans.id));
                });

                Swal.fire({
                    title: 'Eliminado',
                    icon: 'success',
                    timer: 1000,
                    showConfirmButton: false,
                    background: "#1f2937",
                    color: "#fff",
                });
            } catch (error) {
                console.error("Error deleting transaction:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo eliminar el registro',
                    background: "#1f2937",
                    color: "#fff",
                });
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const totalBalance = balancePhysical + balanceUSDT;

    const filteredTransactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.amount.toString().includes(searchTerm)
    );

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiBriefcase className="text-7xl md:text-9xl text-emerald-400" />
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">Mis Ahorros</h1>
                        <p className="text-slate-400 text-sm md:text-lg">
                            Gestiona tu capital físico y digital.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Balance Cards */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Physical */}
                    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-green-500/20 transition-all"></div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Efectivo Físico</h3>
                            <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                                <FiDollarSign size={20} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">$ {balancePhysical.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                        <p className="text-sm text-slate-500">Valor estable</p>
                    </div>

                    {/* USDT */}
                    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-teal-500/20 transition-all"></div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">USDT (Cripto)</h3>
                            <div className="p-2 bg-teal-500/20 rounded-lg text-teal-400">
                                <SiTether size={20} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{balanceUSDT.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDT</p>
                        <p className="text-sm text-slate-500">Dólar Digital</p>
                    </div>
                </div>

                {/* Total Summary */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-md p-6 rounded-3xl border border-indigo-500/30 shadow-lg flex flex-col justify-center relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-2">Total Ahorrado</h3>
                        <p className="text-4xl font-bold text-white mb-2">$ {totalBalance.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                        <div className="inline-block px-3 py-1 bg-white/10 rounded-full border border-white/10 text-xs text-indigo-100 mb-4">
                            ≈ Bs. {(totalBalance * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Transaction Form */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <FiActivity className="text-emerald-400" />
                            Registrar Movimiento
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Type Selection */}
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700/30">
                                <button
                                    type="button"
                                    onClick={() => setType("deposit")}
                                    className={`py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${type === "deposit" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    <FiArrowUpRight /> Ingreso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType("withdrawal")}
                                    className={`py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${type === "withdrawal" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    <FiArrowDownLeft /> Retiro
                                </button>
                            </div>

                            {/* Method Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Billetera</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all ${method === "physical" ? "bg-green-500/10 border-green-500/50" : "bg-slate-800/30 border-slate-700 hover:border-slate-600"}`}>
                                        <input type="radio" name="method" value="physical" className="hidden" checked={method === "physical"} onChange={() => setMethod("physical")} />
                                        <FiDollarSign className={method === "physical" ? "text-green-400" : "text-slate-500"} size={24} />
                                        <span className={`text-sm ${method === "physical" ? "text-green-400 font-bold" : "text-slate-400"}`}>Efectivo</span>
                                    </label>
                                    <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all ${method === "usdt" ? "bg-teal-500/10 border-teal-500/50" : "bg-slate-800/30 border-slate-700 hover:border-slate-600"}`}>
                                        <input type="radio" name="method" value="usdt" className="hidden" checked={method === "usdt"} onChange={() => setMethod("usdt")} />
                                        <SiTether className={method === "usdt" ? "text-teal-400" : "text-slate-500"} size={24} />
                                        <span className={`text-sm ${method === "usdt" ? "text-teal-400 font-bold" : "text-slate-400"}`}>USDT</span>
                                    </label>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Monto ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-600 font-mono text-lg"
                                />
                            </div>

                            {/* Description Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nota (Opcional)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ej. Ahorro semanal"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transform transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2"
                            >
                                <FiPlus className="text-xl" />
                                <span>Registrar Movimiento</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* History List */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col h-full">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FiCalendar className="text-blue-400" />
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
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-all"
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
                                                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                        : "bg-teal-500/10 text-teal-400 border-teal-500/20"
                                                        }`}>
                                                        {t.method === "physical" ? "Efectivo" : "USDT"}
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
                                                {t.type === "deposit" ? "+" : "-"}${t.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                            </p>
                                            <button
                                                onClick={() => handleDelete(t)}
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
    );
}
