"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { addDoc, collection, Timestamp, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { useTransactions } from "@/hooks/useTransactions";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { FiTrendingUp, FiTrendingDown, FiCreditCard, FiArrowRight, FiActivity, FiPlusCircle, FiPieChart, FiTarget, FiShoppingCart, FiCalendar, FiEdit2, FiEye, FiEyeOff, FiChevronRight, FiClock, FiAlertCircle, FiSave, FiTag } from "react-icons/fi";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { obtenerSimboloMoneda, MONEDAS_SOPORTADAS, type MonedaSoportada } from "@/lib/bankAccounts";
import CurrencySelector from "@/components/ui/CurrencySelector";
import Select from "@/components/ui/forms/Select";


// ─── Placeholder ligero para widgets durante carga ────────────────────────────
const SkeletonWidget = () => (
    <div className="bg-slate-800/40 rounded-3xl animate-pulse h-36 w-full" aria-hidden="true" />
);

// ─── Imports diferidos — solo se descargan cuando el DOM los necesita ─────────
// Recharts es la dependencia más pesada (~40KB), cargamos sus componentes lazy
const CashFlowChart = dynamic(() => import("@/components/ui/CashFlowChart"), {
    ssr: false,
    loading: () => <SkeletonWidget />,
});
const ExpensePieChart = dynamic(() => import("@/components/ui/ExpensePieChart"), {
    ssr: false,
    loading: () => <SkeletonWidget />,
});

// Widgets secundarios — importantes pero no críticos para el LCP
const RecentTransactions = dynamic(() => import("@/components/ui/RecentTransactions"), {
    ssr: false,
    loading: () => <SkeletonWidget />,
});
const SavingsGoalsWidget = dynamic(() => import("@/components/ui/SavingsGoalsWidget"), {
    ssr: false,
    loading: () => <SkeletonWidget />,
});
const BudgetAlertWidget = dynamic(() => import("@/components/ui/BudgetAlertWidget"), {
    ssr: false,
    loading: () => <SkeletonWidget />,
});
const BankAccountsWidget = dynamic(() => import("@/components/ui/BankAccountsWidget"), {
    ssr: false,
    loading: () => <SkeletonWidget />,
});
const PendingDebtsWidget = dynamic(() => import("@/components/ui/PendingDebtsWidget"), {
    ssr: false,
    loading: () => <SkeletonWidget />,
});
const SalaryPlanningWidget = dynamic(() => import("@/components/ui/SalaryPlanningWidget"), {
    ssr: false,
    loading: () => <SkeletonWidget />,
});
const ExchangeRateWidget = dynamic(() => import("@/components/ui/ExchangeRateWidget"), {
    ssr: false,
    loading: () => <SkeletonWidget />,
});
const UpcomingPaymentsWidget = dynamic(() => import("@/components/ui/UpcomingPaymentsWidget"), {
    ssr: false,
    loading: () => <SkeletonWidget />,
});
const FinancialHealthWidget = dynamic(() => import("@/components/ui/FinancialHealthWidget"), {
    ssr: false,
    loading: () => <SkeletonWidget />,
});

// Enlaces del dashboard (antiguo MotionLink con animaciones de framer-motion)
const MotionLink = Link;

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const { transactions, loading: transactionsLoading } = useTransactions();
    const { 
        cuentas, 
        obtenerCuenta, 
        monedaBase, 
        actualizarMonedaBase 
    } = useBankAccounts();
    const {
        stats,
        tasasEnBs,
        convertirMontoBaseABs,
        convertirMontoBaseAUsd,
    } = useDashboardMetrics();
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [cuentaAjustando, setCuentaAjustando] = useState<string>("");
    const [ajustandoBalance, setAjustandoBalance] = useState("");

    // Variantes de animación eliminadas — se prioriza la fluidez (ver ADR 11)

    useEffect(() => {
        // En PWA, el estado puede tardar unos milisegundos extra en restaurarse
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                // Pequeño delay de cortesía para evitar parpadeos o falsos negativos en PWA
                const timer = setTimeout(() => {
                    if (!auth.currentUser) {
                        router.push("/login");
                    }
                }, 500);
                return () => clearTimeout(timer);
            } else {
                setUser(currentUser);
                setAuthLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleUpdateBalanceClick = (e: React.MouseEvent, accountId?: string) => {
        e.stopPropagation();
        setCuentaAjustando(accountId || (cuentas.length > 0 ? cuentas[0].id : ""));
        setAjustandoBalance("");
        setShowAdjustModal(true);
    };

    const submitAdjustBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user || !cuentaAjustando) return;

        const amount = parseFloat(ajustandoBalance.replace(",", "."));
        if (isNaN(amount)) {
            toast.error("Ingresa un monto válido");
            return;
        }

        const cuenta = cuentas.find(c => c.id === cuentaAjustando);
        if (!cuenta) return;

        if (Math.abs(cuenta.saldo - amount) < 0.01) {
            toast.info("El saldo es el mismo, no hay cambios que guardar.");
            return;
        }

        try {
            await runTransaction(db, async (transaction) => {
                const diff = amount - cuenta.saldo;
                const cuentaRef = doc(db, "users", user.uid, "bank_accounts", cuentaAjustando);
                
                transaction.update(cuentaRef, { 
                    saldo: amount, 
                    actualizadoEn: serverTimestamp() 
                });

                const newTransRef = doc(collection(db, "transactions"));
                transaction.set(newTransRef, {
                    userId: user.uid,
                    accountId: cuentaAjustando,
                    amount: Math.abs(diff),
                    type: diff > 0 ? 'ingreso' : 'gasto',
                    category: 'Ajuste',
                    description: `Ajuste manual de saldo`,
                    date: Timestamp.now(),
                    currency: cuenta.moneda,
                    originalAmount: Math.abs(diff),
                    exchangeRate: 1,
                    createdAt: serverTimestamp()
                });
            });

            toast.success("Saldo actualizado correctamente");
            setShowAdjustModal(false);
        } catch (error) {
            console.error("Error al ajustar saldo:", error);
            toast.error("No se pudo actualizar el saldo.");
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



    return (
        <>
            {/* ===== MOBILE-FIRST LAYOUT ===== */}
            <div
                className="md:hidden flex flex-col gap-4 pb-32"
            >

                {/* Privacidad - Removido saludo y botón externo */}

                {/* Balance Card Principal - Hero */}
                <div className="relative bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-500/30 p-5 rounded-3xl shadow-lg overflow-hidden">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl -ml-16 -mb-16"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-slate-400 text-sm font-medium">Balance Disponible</p>
                            <div className="flex items-center gap-2">
                                {monedaBase !== "BS" && (
                                <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                                    <span className="text-xs">🇻🇪</span>
                                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-tighter">
                                        {(tasasEnBs[monedaBase] || 0).toFixed(2)}
                                    </span>
                                </div>
                                )}
                                <CurrencySelector 
                                    value={monedaBase} 
                                    onChange={actualizarMonedaBase} 
                                    compact 
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-1">
                            <h2 className={cn(
                                "text-3xl font-black text-white tracking-tight",
                                isPrivacyMode && "blur-sm"
                            )}>
                                {isPrivacyMode ? `${obtenerSimboloMoneda(monedaBase)} ••••••` : `${obtenerSimboloMoneda(monedaBase)} ${stats.totalBalance.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </h2>
                            <button
                                onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 transition-colors"
                            >
                                {isPrivacyMode ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>

                        <p className="text-slate-500 text-sm font-medium">
                            {monedaBase === "BS" 
                                ? `≈ $ ${isPrivacyMode ? "••••" : convertirMontoBaseAUsd(stats.totalBalance).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                                : `≈ Bs. ${isPrivacyMode ? "••••" : convertirMontoBaseABs(stats.totalBalance).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
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
                                    {isPrivacyMode ? "••••" : `${obtenerSimboloMoneda(monedaBase)}${stats.monthlyIncome.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
                                    {isPrivacyMode ? "••••" : `${obtenerSimboloMoneda(monedaBase)}${stats.monthlyExpense.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Acciones Rápidas - Horizontal Scroll */}
                <div className="-mx-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-4 pl-5">Acceso Rápido</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {/* Spacer inicial */}
                        <div className="flex-none w-4"></div>

                        <MotionLink
                            href="/dashboard/movimientos?view=form"
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-linear-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-amber-500/30 rounded-xl flex items-center justify-center">
                                <FiPlusCircle className="text-amber-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-amber-400">Registrar</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/reportes"
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-linear-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-violet-500/30 rounded-xl flex items-center justify-center">
                                <FiPieChart className="text-violet-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-violet-400">Reportes</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/ahorros"
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-linear-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center">
                                <FiTarget className="text-indigo-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-400">Ahorros</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/listas"
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-linear-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                                <FiShoppingCart className="text-emerald-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-400">Listas</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/gastos-fijos"
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-linear-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-cyan-500/30 rounded-xl flex items-center justify-center">
                                <FiCalendar className="text-cyan-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-cyan-400">Fijos</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/deudas"
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-linear-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-red-500/30 rounded-xl flex items-center justify-center">
                                <FiAlertCircle className="text-red-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-red-400">Deudas</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/cuentas"
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-linear-to-br from-sky-500/20 to-sky-600/10 border border-sky-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-sky-500/30 rounded-xl flex items-center justify-center">
                                <FiCreditCard className="text-sky-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-sky-400">Cuentas</span>
                        </MotionLink>

                        <MotionLink
                            href="/dashboard/categorias"
                            className="flex-none flex flex-col items-center justify-center gap-2 w-20 h-20 bg-linear-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/30 rounded-2xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-pink-500/30 rounded-xl flex items-center justify-center">
                                <FiTag className="text-pink-400" size={22} />
                            </div>
                            <span className="text-[10px] font-semibold text-pink-400">Categorías</span>
                        </MotionLink>

                        {/* Spacer final */}
                        <div className="flex-none w-4"></div>
                    </div>
                </div>

                {/* Últimos Movimientos - Preview Compacta */}
                <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden">
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
                                <div
                                    key={t.id}
                                    className="flex items-center justify-between p-4 active:bg-slate-800/50 transition-colors"
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
                                        {t.type === 'ingreso' ? '+' : ''}
                                        {t.currency === 'VES' 
                                            ? 'Bs.' 
                                            : obtenerSimboloMoneda(t.accountId ? obtenerCuenta(t.accountId)?.moneda || 'USD' : 'USD')
                                        } 
                                        {isPrivacyMode ? '••••' : Number(t.currency === 'VES' && t.originalAmount ? t.originalAmount : t.amount).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>



                {/* Gráficas compactas para móvil */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1">Análisis del Mes</h3>

                    {/* Gráfico de Flujo de Caja */}
                    <div
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
                    </div>

                    {/* Gráfico de Gastos por Categoría */}
                    <div
                        className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                <FiPieChart className="text-amber-400" size={14} />
                            </div>
                            <span className="text-white text-sm font-semibold">Gastos por Categoría</span>
                        </div>
                        <div className="min-h-52">
                            <ExpensePieChart data={stats.categoryData} />
                        </div>
                    </div>
                </div>

                {/* Widgets: Salud Financiera + Próximos Pagos */}
                <div className="flex flex-col gap-4">
                    <FinancialHealthWidget />
                    <UpcomingPaymentsWidget />
                </div>

                {/* CTA Ajustar Saldo */}
                <button
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
                </button>
            </div>

            {/* ===== DESKTOP LAYOUT (Original) ===== */}
            <div className="hidden md:flex flex-col gap-8 pb-10">
                {/* Header */}
                <div className="order-1 bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 md:p-8 rounded-3xl shadow-lg relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                        <FiActivity className="text-7xl md:text-9xl text-amber-400" />
                    </div>
                    <div className="absolute top-0 left-0 w-full h-full bg-linear-to-r from-amber-500/10 to-transparent pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6">
                        <div>
                            <div className="flex items-center gap-3 md:gap-4 mb-1 md:mb-2">
                                <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Dashboard</h1>
                                <button
                                    onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                    className="p-1.5 md:p-2 rounded-full bg-slate-800/50 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-colors backdrop-blur-sm group"
                                    title={isPrivacyMode ? "Mostrar montos" : "Ocultar montos"}
                                >
                                    {isPrivacyMode ? <FiEyeOff size={16} className="md:w-5 md:h-5" /> : <FiEye size={16} className="md:w-5 md:h-5" />}
                                </button>
                            </div>
                            <p className="text-slate-400 text-sm md:text-lg">
                                Resumen financiero consolidado de tu ecosistema.
                            </p>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md p-1 px-2 rounded-2xl border border-slate-700/50 shadow-inner flex items-center">
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
                        <Link href="/dashboard/movimientos?view=form" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-amber-500/50 p-4 rounded-2xl transition-colors flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-amber-500/20 transition-colors"></div>
                            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-amber-500/10">
                                <FiPlusCircle size={24} />
                            </div>
                            <div className="relative z-10">
                                <p className="font-bold text-white text-sm md:text-base">Registrar</p>
                                <p className="text-[10px] md:text-xs text-slate-400">Nuevo Movimiento</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/reportes" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-violet-500/50 p-4 rounded-2xl transition-colors flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-violet-500/20 transition-colors"></div>
                            <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-violet-500/10">
                                <FiPieChart size={24} />
                            </div>
                            <div className="relative z-10">
                                <p className="font-bold text-white text-sm md:text-base">Reportes</p>
                                <p className="text-[10px] md:text-xs text-slate-400">Ver Estadísticas</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/ahorros" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 p-4 rounded-2xl transition-colors flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-indigo-500/20 transition-colors"></div>
                            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-indigo-500/10">
                                <FiTarget size={24} />
                            </div>
                            <div className="relative z-10">
                                <p className="font-bold text-white text-sm md:text-base">Metas</p>
                                <p className="text-[10px] md:text-xs text-slate-400">Ahorros y Wallet</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/listas" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 p-4 rounded-2xl transition-colors flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-emerald-500/20 transition-colors"></div>
                            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner border border-emerald-500/10">
                                <FiShoppingCart size={24} />
                            </div>
                            <div className="relative z-10">
                                <p className="font-bold text-white text-sm md:text-base">Compras</p>
                                <p className="text-[10px] md:text-xs text-slate-400">Listas Super</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/gastos-fijos" className="group bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-cyan-500/50 p-4 rounded-2xl transition-colors flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-cyan-500/20 transition-colors"></div>
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
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/reportes'); }}
                        className="group bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg hover:border-emerald-500/30 hover:bg-slate-900/70 transition-[transform,color] duration-300 relative overflow-hidden cursor-pointer active:scale-95"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/20 transition-colors"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Saldo Total</p>
                                </div>
                                <h3 className={`text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-slate-400`}>
                                    {isPrivacyMode ? "****" : `${obtenerSimboloMoneda(monedaBase)} ${stats.totalBalance.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mt-1 pl-1 border-l-2 border-violet-500/30">
                                    {monedaBase === "BS"
                                        ? `≈ $ ${isPrivacyMode ? "****" : convertirMontoBaseAUsd(stats.totalBalance).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                                        : `≈ Bs. ${isPrivacyMode ? "****" : convertirMontoBaseABs(stats.totalBalance).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    }
                                </p>
                            </div>
                            <div className="p-3 bg-violet-500/20 rounded-2xl border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                                <FiCreditCard className="text-2xl text-violet-400" />
                            </div>
                        </div>
                        <button
                            onClick={handleUpdateBalanceClick}
                            aria-label="Ajustar saldo de cuentas"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-wide bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/20 hover:border-violet-500/30 relative z-20"
                        >
                            Ajustar Saldo <FiEdit2 />
                        </button>
                    </div>

                    {/* Ingresos del Mes */}
                    {/* Ingresos del Mes */}
                    <div
                        onClick={() => router.push('/dashboard/movimientos')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/movimientos'); }}
                        className="group bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg hover:border-emerald-500/30 hover:bg-slate-900/70 transition-[transform,color] duration-300 relative overflow-hidden cursor-pointer active:scale-95"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/20 transition-colors"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Ingresos (Mes)</p>
                                <h3 className="text-3xl font-bold text-emerald-400">
                                    {isPrivacyMode ? "****" : `${obtenerSimboloMoneda(monedaBase)} ${stats.monthlyIncome.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </h3>
                                <p className="text-sm text-emerald-500/60 font-medium mt-1 pl-1 border-l-2 border-emerald-500/30">
                                    {monedaBase === "BS"
                                        ? `≈ $ ${isPrivacyMode ? "****" : convertirMontoBaseAUsd(stats.monthlyIncome).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                                        : `≈ Bs. ${isPrivacyMode ? "****" : convertirMontoBaseABs(stats.monthlyIncome).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    }
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
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/reportes'); }}
                        className="group bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg hover:border-emerald-500/30 hover:bg-slate-900/70 transition-[transform,color] duration-300 relative overflow-hidden cursor-pointer active:scale-95"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/20 transition-colors"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Gastos (Mes)</p>
                                <h3 className="text-3xl font-bold text-red-400">
                                    {isPrivacyMode ? "****" : `${obtenerSimboloMoneda(monedaBase)} ${stats.monthlyExpense.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </h3>
                                <p className="text-sm text-red-500/60 font-medium mt-1 pl-1 border-l-2 border-red-500/30">
                                    {monedaBase === "BS"
                                        ? `≈ $ ${isPrivacyMode ? "****" : convertirMontoBaseAUsd(stats.monthlyExpense).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                                        : `≈ Bs. ${isPrivacyMode ? "****" : convertirMontoBaseABs(stats.monthlyExpense).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    }
                                </p>
                            </div>
                            <div className="p-3 bg-red-500/20 rounded-2xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                <FiTrendingDown className="text-2xl text-red-400" />
                            </div>
                        </div>

                        {stats.monthlyIncome > 0 && (
                            <div className="w-full bg-slate-800 rounded-full h-2 mt-2 border border-slate-700/50 overflow-hidden">
                                <div
                                    className="bg-linear-to-r from-red-500 to-orange-500 h-full rounded-full transition-colors duration-500"
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
                    <div className="bg-slate-900/50 backdrop-blur-md p-4 rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden">
                        <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                            <span className="w-1 h-4 bg-violet-500 rounded-full"></span>
                            Flujo de Caja (Mes Actual)
                        </h3>
                        <div className="h-56">
                            <CashFlowChart transactions={transactions} />
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-md p-4 rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden">
                        <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                            <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                            Distribución de Gastos
                        </h3>
                        <div className="h-56">
                            <ExpensePieChart data={stats.categoryData} />
                        </div>
                    </div>
                </div>

                {/* Widgets Section: Savings, Budget & Salary */}
                <div className="order-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FinancialHealthWidget />
                    <UpcomingPaymentsWidget />
                    <SavingsGoalsWidget />

                    <BankAccountsWidget />

                    <BudgetAlertWidget
                        currentExpense={convertirMontoBaseAUsd(stats.monthlyExpense)}
                        userId={user?.uid ?? ''}
                    />

                    <SalaryPlanningWidget userId={user?.uid || ""} />

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
                title="Ajustar Saldo"
            >
                <form onSubmit={submitAdjustBalance} className="flex flex-col gap-4 text-left">
                    <p className="text-sm text-slate-400">Selecciona la cuenta y escribe el nuevo saldo.</p>
                    
                    {/* Selector de cuenta */}
                    <div className="z-50 relative">
                        <Select<string>
                            label="Cuenta"
                            icon={<FiCreditCard size={14} className="text-amber-500" />}
                            value={cuentaAjustando}
                            onChange={(val) => {
                                setCuentaAjustando(val);
                                setAjustandoBalance("");
                            }}
                            options={cuentas.map((c) => ({
                                id: c.id,
                                value: c.id,
                                name: c.nombre,
                                moneda: c.moneda,
                                saldo: c.saldo,
                                banco: c.banco
                            }))}
                            placeholder="Seleccionar cuenta..."
                            renderOption={(opt) => (
                                <div className="flex flex-col text-left">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-slate-100 truncate">{opt.name}</span>
                                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-700/50 font-black shrink-0">
                                            {opt.moneda as string}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-1">
                                        <span className="text-xs text-amber-500/80 font-bold">
                                            {obtenerSimboloMoneda(opt.moneda as MonedaSoportada)} {(opt.saldo as number).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[10px] text-slate-500 italic uppercase tracking-tighter truncate max-w-[120px]">
                                            {opt.banco as string}
                                        </span>
                                    </div>
                                </div>
                            )}
                            renderValue={(opt) => (
                                <div className="flex flex-col text-left whitespace-normal w-full pr-2">
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-bold text-slate-100 truncate text-sm mr-2">{opt.name}</span>
                                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-700/50 font-black shrink-0">
                                            {opt.moneda as string}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between w-full mt-1.5">
                                        <span className="text-xs text-slate-400 truncate mr-2">
                                            {opt.banco as string}
                                        </span>
                                        <span className="text-amber-500 font-black text-xs shrink-0 bg-amber-500/10 px-2 py-0.5 rounded-lg ml-auto">
                                            {obtenerSimboloMoneda(opt.moneda as MonedaSoportada)} {(opt.saldo as number).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        />
                    </div>


                    {cuentaAjustando && (() => {
                        const cuenta = cuentas.find(c => c.id === cuentaAjustando);
                        if (!cuenta) return null;
                        return (
                            <div className="bg-slate-800/40 p-4 rounded-2xl border border-amber-500/20">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-lg"></div>
                                        <span className="text-sm font-bold text-white uppercase tracking-wide">{cuenta.nombre}</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-amber-400 border-amber-500/20 bg-amber-500/10">
                                        {cuenta.moneda}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Saldo Actual</span>
                                    <span className="text-sm font-bold text-slate-300">
                                        {obtenerSimboloMoneda(cuenta.moneda)} {cuenta.saldo.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                        <span className="text-slate-500 font-bold text-lg">{obtenerSimboloMoneda(cuenta.moneda)}</span>
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={ajustandoBalance}
                                        onChange={(e) => setAjustandoBalance(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white font-bold text-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-colors placeholder:text-slate-700"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        );
                    })()}

                    <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-700/50">
                        <button
                            type="button"
                            onClick={() => setShowAdjustModal(false)}
                            className="px-5 py-2.5 text-slate-400 hover:text-white font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!cuentaAjustando || cuentas.length === 0}
                            className="px-8 py-2.5 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl transition-transform shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            Actualizar Saldo
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
