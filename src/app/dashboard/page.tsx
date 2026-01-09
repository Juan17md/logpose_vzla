"use client";

import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, addDoc, collection, Timestamp } from "firebase/firestore";
import { useTransactions } from "@/hooks/useTransactions";
import { FiTrendingUp, FiTrendingDown, FiCreditCard, FiArrowRight, FiActivity, FiPlusCircle, FiPieChart, FiTarget, FiShoppingCart, FiCalendar, FiEdit2 } from "react-icons/fi";
import Link from "next/link";
import Swal from "sweetalert2";
import RecentTransactions from "@/components/ui/RecentTransactions";
import ExchangeRateWidget from "@/components/ui/ExchangeRateWidget";
import SavingsGoalsWidget from "@/components/ui/SavingsGoalsWidget";
import BudgetAlertWidget from "@/components/ui/BudgetAlertWidget";

import CryptoCashWalletWidget from "@/components/ui/CryptoCashWalletWidget";
import PendingDebtsWidget from "@/components/ui/PendingDebtsWidget";
import { getBCVRate } from "@/lib/currency";

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const { transactions, loading: transactionsLoading } = useTransactions();
    const [bcvRate, setBcvRate] = useState<number>(0);

    useEffect(() => {
        getBCVRate().then(setBcvRate);
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push("/login");
            } else {
                setUser(currentUser);
            }
            setAuthLoading(false);
        });

        return () => unsubscribeAuth();
    }, [router]);

    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalBalance = 0;
        let monthlyIncome = 0;
        let monthlyExpense = 0;

        transactions.forEach(t => {
            const amount = Number(t.amount);
            if (t.type === "ingreso") {
                totalBalance += amount;
            } else {
                totalBalance -= amount;
            }
            const tDate = new Date(t.date);
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                if (t.type === "ingreso") {
                    monthlyIncome += amount;
                } else {
                    monthlyExpense += amount;
                }
            }
        });

        return { totalBalance, monthlyIncome, monthlyExpense };
    }, [transactions]);

    const handleUpdateBalance = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent navigation to reports

        const { value: amountStr } = await Swal.fire({
            title: 'Ajustar Saldo Actual',
            text: 'Ingresa el monto real que tienes actualmente. Se creará un movimiento de ajuste automático.',
            input: 'number',
            inputValue: stats.totalBalance,
            showCancelButton: true,
            confirmButtonText: 'Ajustar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981',
            background: "#1f2937",
            color: "#fff",
            inputValidator: (value) => {
                if (!value || isNaN(parseFloat(value))) {
                    return 'Debes ingresar un monto válido';
                }
                return null;
            }
        });

        if (amountStr !== undefined) {
            const newBalance = parseFloat(amountStr);
            const currentBalance = stats.totalBalance;
            const diff = newBalance - currentBalance;

            if (Math.abs(diff) < 0.01) return; // No change

            const isIncome = diff > 0;
            const adjustmentAmount = Math.abs(diff);

            try {
                await addDoc(collection(db, "transactions"), {
                    userId: user.uid,
                    amount: adjustmentAmount,
                    type: isIncome ? 'ingreso' : 'gasto',
                    category: 'Ajuste',
                    description: 'Ajuste manual de saldo',
                    date: Timestamp.now(),
                    currency: 'USD',
                    originalAmount: adjustmentAmount,
                    exchangeRate: 1,
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Saldo Ajustado',
                    text: `Se ha generado un ${isIncome ? 'Ingreso' : 'Gasto'} de $${adjustmentAmount.toFixed(2)} para cuadrar el saldo.`,
                    timer: 2000,
                    showConfirmButton: false,
                    background: "#1f2937",
                    color: "#fff"
                });
            } catch (error) {
                console.error("Error creating adjustment transaction:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo ajustar el saldo.',
                    background: "#1f2937",
                    color: "#fff"
                });
            }
        }
    };

    if (authLoading || transactionsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiActivity className="text-9xl text-emerald-400" />
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Dashboard</h1>
                        <p className="text-slate-400 text-lg">
                            Bienvenido de nuevo, <span className="text-emerald-400 font-semibold">{user?.displayName || "Usuario"}</span>.
                        </p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-md p-2 rounded-2xl border border-slate-700/50 shadow-inner">
                        <ExchangeRateWidget />
                    </div>
                </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="mb-2">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                    Accesos Rápidos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Link href="/dashboard/movimientos" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 p-4 rounded-2xl transition-all flex items-center gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-emerald-500/20 transition-all"></div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-emerald-500/10">
                            <FiPlusCircle size={24} />
                        </div>
                        <div className="relative z-10">
                            <p className="font-bold text-white text-sm md:text-base">Registrar</p>
                            <p className="text-[10px] md:text-xs text-slate-400">Nuevo Movimiento</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/reportes" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 p-4 rounded-2xl transition-all flex items-center gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-blue-500/20 transition-all"></div>
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-blue-500/10">
                            <FiPieChart size={24} />
                        </div>
                        <div className="relative z-10">
                            <p className="font-bold text-white text-sm md:text-base">Reportes</p>
                            <p className="text-[10px] md:text-xs text-slate-400">Ver Estadísticas</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/ahorros" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-purple-500/50 p-4 rounded-2xl transition-all flex items-center gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-purple-500/20 transition-all"></div>
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-purple-500/10">
                            <FiTarget size={24} />
                        </div>
                        <div className="relative z-10">
                            <p className="font-bold text-white text-sm md:text-base">Metas</p>
                            <p className="text-[10px] md:text-xs text-slate-400">Ahorros y Wallet</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/listas" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-orange-500/50 p-4 rounded-2xl transition-all flex items-center gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-orange-500/20 transition-all"></div>
                        <div className="p-3 bg-orange-500/10 text-orange-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-orange-500/10">
                            <FiShoppingCart size={24} />
                        </div>
                        <div className="relative z-10">
                            <p className="font-bold text-white text-sm md:text-base">Compras</p>
                            <p className="text-[10px] md:text-xs text-slate-400">Listas Super</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/gastos-fijos" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-teal-500/50 p-4 rounded-2xl transition-all flex items-center gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-teal-500/20 transition-all"></div>
                        <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-teal-500/10">
                            <FiCalendar size={24} />
                        </div>
                        <div className="relative z-10">
                            <p className="font-bold text-white text-sm md:text-base">Fijos</p>
                            <p className="text-[10px] md:text-xs text-slate-400">Pagos Mes</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Big Numbers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Saldo Total */}
                {/* Saldo Total */}
                <div
                    onClick={() => router.push('/dashboard/reportes')}
                    className="group bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg hover:border-emerald-500/30 hover:bg-slate-900/70 transition-all duration-300 relative overflow-hidden cursor-pointer active:scale-95"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Saldo Total</p>
                            </div>
                            <h3 className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400`}>
                                $ {stats.totalBalance.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium mt-1 pl-1 border-l-2 border-blue-500/30">
                                ≈ Bs. {(stats.totalBalance * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                            <FiCreditCard className="text-2xl text-blue-400" />
                        </div>
                    </div>
                    <button
                        onClick={handleUpdateBalance}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-blue-500 hover:text-blue-300 transition-colors uppercase tracking-wide bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:border-blue-500/40 relative z-20"
                    >
                        Ajustar Saldo <FiEdit2 />
                    </button>
                </div>

                {/* Ingresos del Mes */}
                {/* Ingresos del Mes */}
                <div
                    onClick={() => router.push('/dashboard/movimientos')}
                    className="group bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg hover:border-emerald-500/30 hover:bg-slate-900/70 transition-all duration-300 relative overflow-hidden cursor-pointer active:scale-95"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Ingresos (Mes)</p>
                            <h3 className="text-3xl font-bold text-emerald-400">
                                $ {stats.monthlyIncome.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-sm text-emerald-500/60 font-medium mt-1 pl-1 border-l-2 border-emerald-500/30">
                                ≈ Bs. {(stats.monthlyIncome * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <FiTrendingUp className="text-2xl text-emerald-400" />
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-500 hover:text-emerald-300 transition-colors uppercase tracking-wide bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40">
                        Ver Detalles <FiArrowRight />
                    </div>
                </div>

                {/* Gastos del Mes */}
                {/* Gastos del Mes */}
                <div
                    onClick={() => router.push('/dashboard/reportes')}
                    className="group bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg hover:border-red-500/30 hover:bg-slate-900/70 transition-all duration-300 relative overflow-hidden cursor-pointer active:scale-95"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-red-500/20 transition-all"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Gastos (Mes)</p>
                            <h3 className="text-3xl font-bold text-red-400">
                                $ {stats.monthlyExpense.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-sm text-red-500/60 font-medium mt-1 pl-1 border-l-2 border-red-500/30">
                                ≈ Bs. {(stats.monthlyExpense * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="p-3 bg-red-500/20 rounded-2xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            <FiTrendingDown className="text-2xl text-red-400" />
                        </div>
                    </div>

                    {stats.monthlyIncome > 0 && (
                        <div className="w-full bg-slate-800 rounded-full h-2 mt-2 border border-slate-700/50 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((stats.monthlyExpense / stats.monthlyIncome) * 100, 100)}%` }}
                            ></div>
                        </div>
                    )}
                    <div className="text-xs text-slate-500 mt-2 font-medium">
                        {stats.monthlyIncome > 0
                            ? `${Math.round((stats.monthlyExpense / stats.monthlyIncome) * 100)}% de tus ingresos`
                            : "Sin ingresos registrados"}
                    </div>
                </div>
            </div>

            {/* Widgets Section: Savings, Budget & Salary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SavingsGoalsWidget bcvRate={bcvRate} />

                <CryptoCashWalletWidget userId={user?.uid} bcvRate={bcvRate} />

                <BudgetAlertWidget
                    currentExpense={stats.monthlyExpense}
                    userId={user?.uid}
                />



                <PendingDebtsWidget />
            </div>



            {/* Quick Actions & Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-3">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <span className="w-1.5 h-8 bg-emerald-500 rounded-full"></span>
                            Últimos Movimientos
                        </h2>
                        <Link href="/dashboard/movimientos" className="text-emerald-400 hover:text-emerald-300 text-sm font-bold uppercase tracking-wider transition-colors border-b border-transparent hover:border-emerald-400">Ver todos</Link>
                    </div>
                    <RecentTransactions />
                </div>
            </div>
        </div>
    );
}
