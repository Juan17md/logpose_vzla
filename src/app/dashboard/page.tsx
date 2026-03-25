"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { useTransactions } from "@/hooks/useTransactions";
import { FiTrendingUp, FiTrendingDown, FiCreditCard, FiArrowRight, FiActivity, FiPlusCircle, FiPieChart, FiTarget, FiShoppingCart, FiCalendar, FiEdit2, FiEye, FiEyeOff, FiChevronRight, FiClock, FiAlertCircle, FiSave, FiTag } from "react-icons/fi";
import Link from "next/link";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import RecentTransactions from "@/components/ui/RecentTransactions";
import ExchangeRateWidget from "@/components/ui/ExchangeRateWidget";
import SavingsGoalsWidget from "@/components/ui/SavingsGoalsWidget";
import BudgetAlertWidget from "@/components/ui/BudgetAlertWidget";

import CryptoCashWalletWidget from "@/components/ui/CryptoCashWalletWidget";
import PendingDebtsWidget from "@/components/ui/PendingDebtsWidget";
import { getBCVRate } from "@/lib/currency";
import ExpensePieChart from "@/components/ui/ExpensePieChart";
import CashFlowChart from "@/components/ui/CashFlowChart";

// MotionLink creado fuera del componente para evitar recrearlo en cada render
const MotionLink = motion.create(Link);

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const { transactions, loading: transactionsLoading } = useTransactions();
    const [bcvRate, setBcvRate] = useState<number>(0);
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustAmount, setAdjustAmount] = useState<string>("");
    const [adjustCurrency, setAdjustCurrency] = useState<"USD" | "BS">("USD");

    // Variantes de animación para Staggered Entrance
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
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
        const daysPassed = now.getDate();

        let totalBalance = 0;
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        const expensesByCategory: Record<string, number> = {};

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
                    // Track category expenses
                    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + amount;
                }
            }
        });

        // Find top category
        let topCategoryName = "N/A";
        let topCategoryAmount = 0;
        Object.entries(expensesByCategory).forEach(([cat, amount]) => {
            if (amount > topCategoryAmount) {
                topCategoryAmount = amount;
                topCategoryName = cat;
            }
        });

        const dailyAverage = daysPassed > 0 ? monthlyExpense / daysPassed : 0;

        // Redondear a 2 decimales y eliminar -0 por errores de punto flotante
        const balanceRedondeado = Math.round(totalBalance * 100) / 100;
        const balanceFinal = Object.is(balanceRedondeado, -0) ? 0 : balanceRedondeado;

        return { totalBalance: balanceFinal, monthlyIncome, monthlyExpense, topCategoryName, topCategoryAmount, dailyAverage };
    }, [transactions]);

    const handleUpdateBalanceClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (bcvRate === 0) {
            toast.warning("Espera a que se cargue la tasa del BCV para usar esta función.");
            return;
        }

        setAdjustAmount(stats.totalBalance.toFixed(2));
        setAdjustCurrency("USD");
        setShowAdjustModal(true);
    };

    const handleCurrencyChange = (newCurrency: "USD" | "BS") => {
        if (newCurrency === adjustCurrency) return;
        const currentVal = parseFloat(adjustAmount);
        if (!isNaN(currentVal) && bcvRate > 0) {
            if (newCurrency === "BS") {
                setAdjustAmount((currentVal * bcvRate).toFixed(2));
            } else {
                setAdjustAmount((currentVal / bcvRate).toFixed(2));
            }
        }
        setAdjustCurrency(newCurrency);
    };

    const submitAdjustBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(adjustAmount);
        
        if (isNaN(amount)) {
            toast.error("Debes ingresar un monto válido");
            return;
        }

        const newBalanceUSD = adjustCurrency === 'BS' ? amount / bcvRate : amount;
        const currentBalance = stats.totalBalance;
        const diff = newBalanceUSD - currentBalance;

        if (Math.abs(diff) < 0.01) {
            setShowAdjustModal(false);
            return;
        }

        const isIncome = diff > 0;
        const adjustmentAmount = Math.abs(diff);

        try {
            await addDoc(collection(db, "transactions"), {
                userId: user!.uid,
                amount: adjustmentAmount,
                type: isIncome ? 'ingreso' : 'gasto',
                category: 'Ajuste',
                description: `Ajuste manual de saldo (${adjustCurrency === 'BS' ? `Original: ${amount} Bs` : 'USD'})`,
                date: Timestamp.now(),
                currency: 'USD',
                originalAmount: adjustmentAmount,
                exchangeRate: 1,
            });

            toast.success(`Saldo ajustado: Se generó un ${isIncome ? 'Ingreso' : 'Gasto'} de $${adjustmentAmount.toFixed(2)}`);
            setShowAdjustModal(false);
        } catch (error) {
            console.error("Error creating adjustment transaction:", error);
            toast.error("No se pudo ajustar el saldo.");
        }
    };

    if (authLoading || transactionsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Obtener las últimas 3 transacciones para la preview móvil
    const recentThree = transactions.slice(0, 3);
    const savingsPercentage = stats.monthlyIncome > 0
        ? Math.max(0, ((stats.monthlyIncome - stats.monthlyExpense) / stats.monthlyIncome) * 100)
        : 0;



    return (
        <>
            {/* ===== MOBILE-FIRST LAYOUT ===== */}
            <motion.div
                className="md:hidden flex flex-col gap-4 pb-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >

                {/* Saludo compacto + Privacidad */}
                <motion.div variants={itemVariants} className="flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm">¡Hola de nuevo!</p>
                        <h1 className="text-xl font-bold text-white">{user?.displayName || "Usuario"}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                            className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/50 text-slate-400 transition-colors"
                        >
                            {isPrivacyMode ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                        </motion.button>
                    </div>
                </motion.div>

                {/* Balance Card Principal - Hero */}
                <motion.div variants={itemVariants} className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-500/30 p-5 rounded-3xl shadow-2xl overflow-hidden">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl -ml-16 -mb-16"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-slate-400 text-sm font-medium">Balance Disponible</p>
                            <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                                <span className="text-xs">🇻🇪</span>
                                <span className="text-xs text-amber-500 font-medium">{bcvRate.toFixed(2)}</span>
                            </div>
                        </div>

                        <h2 className="text-4xl font-bold text-white tracking-tight mb-1">
                            {isPrivacyMode ? "$ ••••••" : `$ ${stats.totalBalance.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </h2>

                        <p className="text-slate-500 text-sm">
                            ≈ Bs. {isPrivacyMode ? "••••••" : (stats.totalBalance * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                        </p>

                        {/* Mini estadísticas */}
                        <div className="flex gap-4 mt-5 pt-4 border-t border-amber-500/20">
                            <div className="flex-1 bg-emerald-500/20 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 bg-emerald-400/30 rounded-xl flex items-center justify-center">
                                        <FiTrendingUp className="text-emerald-300" size={16} />
                                    </div>
                                    <span className="text-emerald-200 text-xs font-medium">Ingresos</span>
                                </div>
                                <p className="text-emerald-300 font-bold text-lg">
                                    {isPrivacyMode ? "••••" : `$${stats.monthlyIncome.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </p>
                            </div>
                            <div className="flex-1 bg-red-500/20 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 bg-red-400/30 rounded-xl flex items-center justify-center">
                                        <FiTrendingDown className="text-red-300" size={16} />
                                    </div>
                                    <span className="text-red-200 text-xs font-medium">Gastos</span>
                                </div>
                                <p className="text-red-300 font-bold text-lg">
                                    {isPrivacyMode ? "••••" : `$${stats.monthlyExpense.toLocaleString("es-ES", { minimumFractionDigits: 0 })}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Acciones Rápidas - Horizontal Scroll */}
                <motion.div variants={itemVariants} className="-mx-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-4 pl-5">Acceso Rápido</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {/* Spacer inicial */}
                        <div className="flex-none w-4"></div>

                        <MotionLink
                            href="/dashboard/movimientos"
                            whileTap={{ scale: 0.9 }}
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-amber-500/30 rounded-xl flex items-center justify-center">
                                <FiPlusCircle className="text-amber-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-amber-400">Registrar</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/reportes"
                            whileTap={{ scale: 0.9 }}
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-violet-500/30 rounded-xl flex items-center justify-center">
                                <FiPieChart className="text-violet-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-violet-400">Reportes</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/ahorros"
                            whileTap={{ scale: 0.9 }}
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center">
                                <FiTarget className="text-indigo-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-400">Ahorros</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/listas"
                            whileTap={{ scale: 0.9 }}
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                                <FiShoppingCart className="text-emerald-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-400">Listas</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/gastos-fijos"
                            whileTap={{ scale: 0.9 }}
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-cyan-500/30 rounded-xl flex items-center justify-center">
                                <FiCalendar className="text-cyan-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-cyan-400">Fijos</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/deudas"
                            whileTap={{ scale: 0.9 }}
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-red-500/30 rounded-xl flex items-center justify-center">
                                <FiAlertCircle className="text-red-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-red-400">Deudas</span>
                        </MotionLink>

                        {/* Spacer final */}
                        <div className="flex-none w-4"></div>
                    </div>
                </motion.div>

                {/* Últimos Movimientos - Preview Compacta */}
                <motion.div variants={itemVariants} className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-700/50 rounded-xl flex items-center justify-center">
                                <FiClock className="text-slate-400" size={16} />
                            </div>
                            <h3 className="text-sm font-bold text-white">Últimos Movimientos</h3>
                        </div>
                        <Link href="/dashboard/movimientos" className="text-amber-400 text-xs font-semibold flex items-center gap-1">
                            Ver todo <FiChevronRight size={14} />
                        </Link>
                    </div>

                    <div className="divide-y divide-slate-700/30">
                        {recentThree.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-sm">
                                <FiActivity className="mx-auto mb-2 opacity-50" size={24} />
                                <p>Sin movimientos registrados</p>
                            </div>
                        ) : (
                            recentThree.map((t) => (
                                <motion.div
                                    key={t.id}
                                    className="flex items-center justify-between p-4 active:bg-slate-800/50 transition-colors"
                                    whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 41, 59, 0.8)" }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'ingreso' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                                            }`}>
                                            {t.type === 'ingreso' ? (
                                                <FiTrendingUp className="text-emerald-400" size={18} />
                                            ) : (
                                                <FiTrendingDown className="text-red-400" size={18} />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium truncate max-w-[150px]">
                                                {t.description || t.category}
                                            </p>
                                            <p className="text-slate-500 text-xs">{t.category}</p>
                                        </div>
                                    </div>
                                    <p className={`font-bold text-sm ${t.type === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {t.type === 'ingreso' ? '+' : '-'}
                                        {t.currency === 'VES' ? 'Bs.' : '$'}
                                        {isPrivacyMode ? '••••' : Number(t.currency === 'VES' && t.originalAmount ? t.originalAmount : t.amount).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Widgets en Cards Compactas - Horizontal Scroll */}
                <motion.div variants={itemVariants} className="-mx-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-4 pl-5">Resumen Rápido</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-5 scrollbar-hide">
                        {/* Widget: Mayor Gasto - Premium Look */}
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            className="flex-none w-48 relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 shadow-lg group"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-red-500/20 transition-all"></div>

                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="p-2 bg-red-500/20 rounded-xl text-red-400">
                                    <FiTag size={18} />
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Top Gasto</span>
                            </div>

                            <div className="relative z-10">
                                <h4 className="text-white font-bold text-lg truncate mb-1">
                                    {stats.topCategoryName}
                                </h4>
                                <p className="text-red-400 font-semibold text-sm">
                                    {isPrivacyMode ? "••••" : `$${stats.topCategoryAmount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </p>
                            </div>
                        </motion.div>

                        {/* Widget: Promedio Diario - Premium Look */}
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            className="flex-none w-48 relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 shadow-lg group"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-violet-500/20 transition-all"></div>

                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="p-2 bg-violet-500/20 rounded-xl text-violet-400">
                                    <FiCalendar size={18} />
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Promedio</span>
                            </div>

                            <div className="relative z-10">
                                <h4 className="text-white font-bold text-lg truncate mb-1">
                                    Diario
                                </h4>
                                <p className="text-violet-400 font-semibold text-sm">
                                    {isPrivacyMode ? "••••" : `$${stats.dailyAverage.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`} <span className="text-slate-600 text-xs text-normal">/día</span>
                                </p>
                            </div>
                        </motion.div>

                        {/* Widget: Uso de Ingresos - Premium Look */}
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            className="flex-none w-48 relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 shadow-lg group"
                        >
                            <div className="absolute bottom-0 left-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl -ml-10 -mb-10 group-hover:bg-indigo-500/20 transition-all"></div>

                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                                    <FiPieChart size={18} />
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Uso</span>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-end gap-2 mb-1">
                                    <h4 className="text-white font-bold text-2xl">
                                        {stats.monthlyIncome > 0 ? Math.round((stats.monthlyExpense / stats.monthlyIncome) * 100) : 0}%
                                    </h4>
                                </div>
                                <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full"
                                        style={{ width: `${stats.monthlyIncome > 0 ? Math.min((stats.monthlyExpense / stats.monthlyIncome) * 100, 100) : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Widget: Tasa de Ahorro - Premium Look */}
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            className="flex-none w-48 relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 shadow-lg group"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-emerald-500/20 transition-all"></div>

                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                                    <FiSave size={18} />
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ahorro</span>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between">
                                    <h4 className={`font-bold text-2xl ${savingsPercentage >= 20 ? 'text-emerald-400' : savingsPercentage >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {savingsPercentage.toFixed(0)}%
                                    </h4>
                                    <span className="text-xl">
                                        {savingsPercentage >= 20 ? "🚀" : savingsPercentage >= 10 ? "👍" : "⚠️"}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-[10px] mt-1 truncate">
                                    {savingsPercentage >= 20 ? "¡Sigue así!" : "Puedes más"}
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Gráficas compactas para móvil */}
                <motion.div variants={itemVariants} className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1">Análisis del Mes</h3>

                    {/* Gráfico de Flujo de Caja */}
                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 bg-violet-500/20 rounded-lg flex items-center justify-center">
                                <FiActivity className="text-violet-400" size={14} />
                            </div>
                            <span className="text-white text-sm font-semibold">Flujo de Caja</span>
                        </div>
                        <div className="h-44">
                            <CashFlowChart transactions={transactions} />
                        </div>
                    </motion.div>

                    {/* Gráfico de Gastos por Categoría */}
                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                <FiPieChart className="text-amber-400" size={14} />
                            </div>
                            <span className="text-white text-sm font-semibold">Gastos por Categoría</span>
                        </div>
                        <div className="h-52">
                            <ExpensePieChart transactions={transactions} />
                        </div>
                    </motion.div>
                </motion.div>

                {/* CTA Ajustar Saldo */}
                <motion.button
                    variants={itemVariants}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUpdateBalanceClick}
                    className="w-full py-4 px-5 bg-slate-800/80 border border-slate-700/50 rounded-2xl flex items-center justify-between transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                            <FiEdit2 className="text-violet-400" size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-white text-sm font-semibold">Ajustar Saldo</p>
                            <p className="text-slate-500 text-xs">Corrige tu balance actual</p>
                        </div>
                    </div>
                    <FiChevronRight className="text-slate-500" size={20} />
                </motion.button>
            </motion.div>

            {/* ===== DESKTOP LAYOUT (Original) ===== */}
            <div className="hidden md:flex flex-col gap-8 pb-10">
                {/* Header */}
                <div className="order-1 bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                        <FiActivity className="text-7xl md:text-9xl text-amber-400" />
                    </div>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6">
                        <div>
                            <div className="flex items-center gap-3 md:gap-4 mb-1 md:mb-2">
                                <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Dashboard</h1>
                                <button
                                    onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                    className="p-1.5 md:p-2 rounded-full bg-slate-800/50 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-all backdrop-blur-sm group"
                                    title={isPrivacyMode ? "Mostrar montos" : "Ocultar montos"}
                                >
                                    {isPrivacyMode ? <FiEyeOff size={16} className="md:w-5 md:h-5" /> : <FiEye size={16} className="md:w-5 md:h-5" />}
                                </button>
                            </div>
                            <p className="text-slate-400 text-sm md:text-lg">
                                Bienvenido de nuevo, <span className="text-amber-400 font-semibold">{user?.displayName || "Usuario"}</span>.
                            </p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-md p-2 rounded-2xl border border-slate-700/50 shadow-inner">
                            <ExchangeRateWidget />
                        </div>
                    </div>
                </div>

                {/* Quick Actions Shortcuts */}
                <div className="order-3 md:order-2 mb-2">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                        Accesos Rápidos
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <Link href="/dashboard/movimientos" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-amber-500/50 p-4 rounded-2xl transition-all flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-amber-500/20 transition-all"></div>
                            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-amber-500/10">
                                <FiPlusCircle size={24} />
                            </div>
                            <div className="relative z-10">
                                <p className="font-bold text-white text-sm md:text-base">Registrar</p>
                                <p className="text-[10px] md:text-xs text-slate-400">Nuevo Movimiento</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/reportes" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-violet-500/50 p-4 rounded-2xl transition-all flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-violet-500/20 transition-all"></div>
                            <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-violet-500/10">
                                <FiPieChart size={24} />
                            </div>
                            <div className="relative z-10">
                                <p className="font-bold text-white text-sm md:text-base">Reportes</p>
                                <p className="text-[10px] md:text-xs text-slate-400">Ver Estadísticas</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/ahorros" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 p-4 rounded-2xl transition-all flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-indigo-500/20 transition-all"></div>
                            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-indigo-500/10">
                                <FiTarget size={24} />
                            </div>
                            <div className="relative z-10">
                                <p className="font-bold text-white text-sm md:text-base">Metas</p>
                                <p className="text-[10px] md:text-xs text-slate-400">Ahorros y Wallet</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/listas" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 p-4 rounded-2xl transition-all flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-emerald-500/20 transition-all"></div>
                            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-emerald-500/10">
                                <FiShoppingCart size={24} />
                            </div>
                            <div className="relative z-10">
                                <p className="font-bold text-white text-sm md:text-base">Compras</p>
                                <p className="text-[10px] md:text-xs text-slate-400">Listas Super</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/gastos-fijos" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-cyan-500/50 p-4 rounded-2xl transition-all flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-cyan-500/20 transition-all"></div>
                            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-cyan-500/10">
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
                <div className="order-2 md:order-3 grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Saldo Total */}
                    <div
                        onClick={() => router.push('/dashboard/reportes')}
                        className="group bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg hover:border-emerald-500/30 hover:bg-slate-900/70 transition-all duration-300 relative overflow-hidden cursor-pointer active:scale-95"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/20 transition-all"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Saldo Total</p>
                                </div>
                                <h3 className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400`}>
                                    {isPrivacyMode ? "****" : `$ ${stats.totalBalance.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mt-1 pl-1 border-l-2 border-violet-500/30">
                                    ≈ Bs. {isPrivacyMode ? "****" : (stats.totalBalance * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 bg-violet-500/20 rounded-2xl border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                                <FiCreditCard className="text-2xl text-violet-400" />
                            </div>
                        </div>
                        <button
                            onClick={handleUpdateBalanceClick}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-wide bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/20 hover:border-violet-500/30 relative z-20"
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
                                    {isPrivacyMode ? "****" : `$ ${stats.monthlyIncome.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </h3>
                                <p className="text-sm text-emerald-500/60 font-medium mt-1 pl-1 border-l-2 border-emerald-500/30">
                                    ≈ Bs. {isPrivacyMode ? "****" : (stats.monthlyIncome * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                    {isPrivacyMode ? "****" : `$ ${stats.monthlyExpense.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </h3>
                                <p className="text-sm text-red-500/60 font-medium mt-1 pl-1 border-l-2 border-red-500/30">
                                    ≈ Bs. {isPrivacyMode ? "****" : (stats.monthlyExpense * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                {/* Visual Analytics Section */}
                <div className="order-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-violet-500 rounded-full"></span>
                            Flujo de Caja (Mes Actual)
                        </h3>
                        <CashFlowChart transactions={transactions} />
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                            Distribución de Gastos
                        </h3>
                        <ExpensePieChart transactions={transactions} />
                    </div>
                </div>

                {/* Widgets Section: Savings, Budget & Salary */}
                <div className="order-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SavingsGoalsWidget bcvRate={bcvRate} />

                    <CryptoCashWalletWidget userId={user?.uid} bcvRate={bcvRate} />

                    <BudgetAlertWidget
                        currentExpense={stats.monthlyExpense}
                        userId={user?.uid ?? ''}
                    />



                    <PendingDebtsWidget />
                </div>



                {/* Quick Actions & Recent */}
                <div className="order-5 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-3">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-8 bg-amber-500 rounded-full"></span>
                                Últimos Movimientos
                            </h2>
                            <Link href="/dashboard/movimientos" className="text-amber-400 hover:text-amber-300 text-sm font-bold uppercase tracking-wider transition-colors border-b border-transparent hover:border-amber-400">Ver todos</Link>
                        </div>
                        <RecentTransactions />
                    </div>
                </div>
            </div>

            <Modal
                isOpen={showAdjustModal}
                onClose={() => setShowAdjustModal(false)}
                title="Ajustar Saldo Actual"
            >
                <form onSubmit={submitAdjustBalance} className="flex flex-col gap-4 text-left">
                    <p className="text-sm text-slate-400">Ingresa el monto real que tienes actualmente.</p>
                    
                    <div className="flex flex-col gap-2">
                         <label className="text-xs font-semibold text-slate-400 uppercase">Monto Real</label>
                         <input
                             type="number"
                             step="0.01"
                             value={adjustAmount}
                             onChange={(e) => setAdjustAmount(e.target.value)}
                             required
                             className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                         />
                    </div>

                    <div className="flex gap-4">
                        <label className="flex-1 cursor-pointer">
                            <input
                                type="radio"
                                name="currency"
                                value="USD"
                                className="peer sr-only"
                                checked={adjustCurrency === "USD"}
                                onChange={() => handleCurrencyChange("USD")}
                            />
                            <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 text-center peer-checked:border-amber-500 peer-checked:bg-amber-500/20 peer-checked:text-amber-400 transition-all">
                                <span className="font-bold">USD ($)</span>
                            </div>
                        </label>
                        <label className="flex-1 cursor-pointer">
                            <input
                                type="radio"
                                name="currency"
                                value="BS"
                                className="peer sr-only"
                                checked={adjustCurrency === "BS"}
                                onChange={() => handleCurrencyChange("BS")}
                            />
                            <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 text-center peer-checked:border-amber-500 peer-checked:bg-amber-500/20 peer-checked:text-amber-400 transition-all">
                                <span className="font-bold">Bs. (VES)</span>
                            </div>
                        </label>
                    </div>
                    
                    <p className="text-xs text-center text-slate-500 mt-2">
                        Tasa BCV: {bcvRate} Bs/$
                    </p>

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={() => setShowAdjustModal(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
                        >
                            Ajustar
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
