"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTransactions } from "@/hooks/useTransactions";
import { ExpenseCategoryChart, BalanceChart, ExpenseRadarChart, TrendComposedChart } from "@/components/charts/FinancialCharts";
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiPieChart, FiBriefcase } from "react-icons/fi";
import { useSavingsTransactions } from "@/hooks/useSavingsTransactions";
import Select from "@/components/ui/forms/Select";
import { FiCalendar, FiClock } from "react-icons/fi";
import OnePieceQuote from "@/components/ui/OnePieceQuote";

export default function ReportsPage() {
    const { transactions, loading } = useTransactions();
    const { savingsTransactions, loadingSavings } = useSavingsTransactions();

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
    }, [transactions, selectedMonth, selectedYear]);

    const stats = useMemo(() => {
        let income = 0;
        let expense = 0;
        const categoryExpenses: Record<string, number> = {};

        filteredTransactions.forEach(t => {
            if (t.type === "ingreso") {
                income += Number(t.amount);
            } else {
                expense += Number(t.amount);
                categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + Number(t.amount);
            }
        });

        const categoryData = Object.entries(categoryExpenses).map(([name, value]) => ({
            name,
            value
        })).sort((a, b) => b.value - a.value);

        const balanceCalculado = Math.round((income - expense) * 100) / 100;
        const balanceFinal = Object.is(balanceCalculado, -0) ? 0 : balanceCalculado;
        return { income, expense, balance: balanceFinal, categoryData };
    }, [filteredTransactions]);

    const savingsStats = useMemo(() => {
        const periodSavings = savingsTransactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });

        let totalDeposited = 0;
        let totalWithdrawn = 0;

        periodSavings.forEach(t => {
            if (t.type === "deposit") {
                totalDeposited += Number(t.amount);
            } else {
                totalWithdrawn += Number(t.amount);
            }
        });

        return {
            totalDeposited,
            totalWithdrawn,
            netSavings: totalDeposited - totalWithdrawn
        };
    }, [savingsTransactions, selectedMonth, selectedYear]);

    const balanceData = [
        { name: "Ingresos", value: stats.income, color: "#10b981" },
        { name: "Gastos", value: stats.expense, color: "#ef4444" },
        { name: "Ahorro", value: Math.max(0, savingsStats.netSavings), color: "#8b5cf6" }
    ];

    const MONTHS = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const trendData = useMemo(() => {
        const data = [];
        // Calcular los últimos 6 meses (incluyendo el mes seleccionado o actual)
        const endMonth = selectedMonth;
        const endYear = selectedYear;

        for (let i = 5; i >= 0; i--) {
            let m = endMonth - i;
            let y = endYear;
            if (m < 0) {
                m += 12;
                y -= 1;
            }

            let inc = 0;
            let exp = 0;

            transactions.forEach(t => {
                const d = new Date(t.date);
                if (d.getMonth() === m && d.getFullYear() === y) {
                    if (t.type === "ingreso") inc += Number(t.amount);
                    else exp += Number(t.amount);
                }
            });

            data.push({
                name: MONTHS[m].substring(0, 3) + (y !== endYear ? ` ${y.toString().substring(2)}` : ''),
                ingresos: Math.round(inc),
                gastos: Math.round(exp),
                balance: Math.round(inc - exp)
            });
        }
        return data;
    }, [transactions, selectedMonth, selectedYear]);

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

    if (loading || loadingSavings) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            {/* ===== MOBILE LAYOUT ===== */}
            <motion.div
                className="md:hidden flex flex-col gap-6 pb-20"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Mobile Header & Filters */}
                <motion.div variants={itemVariants} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Reportes</h1>
                            <p className="text-slate-400 text-xs">Resumen financiero mensual</p>
                        </div>
                        <div className="p-2 bg-slate-800/50 rounded-xl border border-slate-700/50 text-amber-400">
                            <FiPieChart size={20} />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Select
                                label=""
                                value={selectedMonth.toString()}
                                onChange={(val) => setSelectedMonth(Number(val))}
                                options={MONTHS.map((m, i) => ({ id: i.toString(), value: i.toString(), name: m }))}
                                icon={<FiCalendar />}
                                className="py-2.5!"
                            />
                        </div>
                        <div className="flex-1">
                            <Select
                                label=""
                                value={selectedYear.toString()}
                                onChange={(val) => setSelectedYear(Number(val))}
                                options={[2023, 2024, 2025, 2026].map(y => ({ id: y.toString(), value: y.toString(), name: y.toString() }))}
                                icon={<FiClock />}
                                className="py-2.5!"
                            />
                        </div>
                    </div>
                </motion.div>

                <OnePieceQuote category="reportes" />

                {/* KPI Grid 2x2 */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                    <div className="bg-linear-to-br from-emerald-500/10 to-emerald-600/5 p-4 rounded-2xl border border-emerald-500/20 backdrop-blur-sm relative overflow-hidden">
                        <div className="mb-2 w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <FiTrendingUp size={16} />
                        </div>
                        <p className="text-xs text-emerald-200/70 font-medium uppercase tracking-wider mb-0.5">Ingresos</p>
                        <p className="text-lg font-bold text-white tracking-tight">${stats.income.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>

                    <div className="bg-linear-to-br from-red-500/10 to-red-600/5 p-4 rounded-2xl border border-red-500/20 backdrop-blur-sm relative overflow-hidden">
                        <div className="mb-2 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                            <FiTrendingDown size={16} />
                        </div>
                        <p className="text-xs text-red-200/70 font-medium uppercase tracking-wider mb-0.5">Gastos</p>
                        <p className="text-lg font-bold text-white tracking-tight">${stats.expense.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>

                    <div className="bg-linear-to-br from-amber-500/10 to-amber-600/5 p-4 rounded-2xl border border-amber-500/20 backdrop-blur-sm relative overflow-hidden">
                        <div className="mb-2 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                            <FiDollarSign size={16} />
                        </div>
                        <p className="text-xs text-amber-200/70 font-medium uppercase tracking-wider mb-0.5">Balance</p>
                        <p className={`text-lg font-bold tracking-tight ${stats.balance >= 0 ? "text-white" : "text-red-400"}`}>
                            ${stats.balance.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>

                    <div className="bg-linear-to-br from-violet-500/10 to-violet-600/5 p-4 rounded-2xl border border-violet-500/20 backdrop-blur-sm relative overflow-hidden">
                        <div className="mb-2 w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                            <FiBriefcase size={16} />
                        </div>
                        <p className="text-xs text-violet-200/70 font-medium uppercase tracking-wider mb-0.5">Ahorro</p>
                        <p className={`text-lg font-bold tracking-tight ${savingsStats.netSavings >= 0 ? "text-white" : "text-red-400"}`}>
                            ${savingsStats.netSavings.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </motion.div>

                {/* Mobile Charts Area */}
                <div className="space-y-4">
                    {/* Balance Chart Card */}
                    <motion.div variants={itemVariants} className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                            Balance del Periodo
                        </h3>
                        <BalanceChart data={balanceData} />
                    </motion.div>

                    {/* Expenses Chart Card */}
                    <motion.div variants={itemVariants} className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                            Gastos por Categoría
                        </h3>
                        <ExpenseCategoryChart data={stats.categoryData} />
                    </motion.div>

                    {/* Expense Radar Card */}
                    <motion.div variants={itemVariants} className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <div className="w-1 h-4 bg-violet-500 rounded-full"></div>
                            Estadísticas de Tripulante (Radar)
                        </h3>
                        <ExpenseRadarChart data={stats.categoryData} />
                    </motion.div>

                    {/* Trend Composed Chart Card */}
                    <motion.div variants={itemVariants} className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                            Histórico de Navegación (6 Meses)
                        </h3>
                        <TrendComposedChart data={trendData} />
                    </motion.div>
                </div>

                {/* Mobile Category Detail List */}
                <motion.div variants={itemVariants}>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Detalle de Gastos</h3>
                    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 divide-y divide-slate-700/30">
                        {stats.categoryData.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-sm">No hay gastos registrados</div>
                        ) : (
                            stats.categoryData.map((item, index) => (
                                <div key={item.name} className="flex items-center justify-between p-4 active:bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: ["#10b981", "#ef4444", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899"][index % 6] }}>
                                            {item.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium capitalize">{item.name}</p>
                                            <div className="w-24 h-1 bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${(item.value / stats.expense) * 100}%`,
                                                        backgroundColor: ["#10b981", "#ef4444", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899"][index % 6]
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-bold text-sm">${item.value.toLocaleString("es-ES", { minimumFractionDigits: 0 })}</p>
                                        <p className="text-slate-500 text-xs">{((item.value / stats.expense) * 100).toFixed(1)}%</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </motion.div>

            {/* ===== DESKTOP LAYOUT (Original wrapped) ===== */}
            <div className="hidden md:block space-y-8">
                {/* Header & Filter */}
                <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                    <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                        <FiPieChart className="text-7xl md:text-9xl text-amber-400" />
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-linear-to-r from-amber-500/10 to-transparent pointer-events-none"></div>

                    <div className="relative z-10">
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">Reportes Financieros</h1>
                        <p className="text-slate-400 text-sm md:text-lg">Analiza tus finanzas por periodos.</p>
                    </div>
                    <div className="relative z-10 flex gap-3 min-w-[300px]">
                        <div className="flex-1">
                            <Select
                                label=""
                                value={selectedMonth.toString()}
                                onChange={(val) => setSelectedMonth(Number(val))}
                                options={MONTHS.map((m, i) => ({ id: i.toString(), value: i.toString(), name: m }))}
                                icon={<FiCalendar />}
                                className="bg-transparent border-slate-700/30 hover:border-amber-500/30"
                            />
                        </div>
                        <div className="flex-1">
                            <Select
                                label=""
                                value={selectedYear.toString()}
                                onChange={(val) => setSelectedYear(Number(val))}
                                options={[2023, 2024, 2025, 2026].map(y => ({ id: y.toString(), value: y.toString(), name: y.toString() }))}
                                icon={<FiClock />}
                                className="bg-transparent border-slate-700/30 hover:border-amber-500/30"
                            />
                        </div>
                    </div>
                </div>

                <OnePieceQuote category="reportes" />

                {/* Summary Cards - Horizontal scroll en móvil */}
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 scrollbar-hide">
                    <div className="flex-none w-56 md:w-auto bg-slate-900/50 backdrop-blur-md p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-700/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all"></div>
                        <div className="flex items-center space-x-3 text-emerald-400 mb-3 relative z-10">
                            <div className="p-2 md:p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20"><FiTrendingUp size={18} /></div>
                            <span className="font-bold uppercase tracking-wider text-[10px] md:text-xs text-slate-400">Ingresos</span>
                        </div>
                        <p className="text-2xl md:text-4xl font-bold text-white relative z-10">$ {stats.income.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>

                    <div className="flex-none w-56 md:w-auto bg-slate-900/50 backdrop-blur-md p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-700/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-red-500/20 transition-all"></div>
                        <div className="flex items-center space-x-3 text-red-400 mb-3 relative z-10">
                            <div className="p-2 md:p-2.5 bg-red-500/10 rounded-xl border border-red-500/20"><FiTrendingDown size={18} /></div>
                            <span className="font-bold uppercase tracking-wider text-[10px] md:text-xs text-slate-400">Gastos</span>
                        </div>
                        <p className="text-2xl md:text-4xl font-bold text-white relative z-10">$ {stats.expense.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>

                    <div className="flex-none w-56 md:w-auto bg-slate-900/50 backdrop-blur-md p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-700/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/20 transition-all"></div>
                        <div className="flex items-center space-x-3 text-amber-400 mb-3 relative z-10">
                            <div className="p-2 md:p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20"><FiDollarSign size={18} /></div>
                            <span className="font-bold uppercase tracking-wider text-[10px] md:text-xs text-slate-400">Balance</span>
                        </div>
                        <p className={`text-2xl md:text-4xl font-bold relative z-10 ${stats.balance >= 0 ? "text-white" : "text-red-400"}`}>
                            $ {stats.balance.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="flex-none w-56 md:w-auto bg-slate-900/50 backdrop-blur-md p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-700/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/20 transition-all"></div>
                        <div className="flex items-center space-x-3 text-violet-400 mb-3 relative z-10">
                            <div className="p-2 md:p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20"><FiBriefcase size={18} /></div>
                            <span className="font-bold uppercase tracking-wider text-[10px] md:text-xs text-slate-400">Ahorro</span>
                        </div>
                        <p className={`text-2xl md:text-4xl font-bold relative z-10 ${savingsStats.netSavings >= 0 ? "text-white" : "text-red-400"}`}>
                            $ {savingsStats.netSavings.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Balance Chart */}
                    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 overflow-hidden shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                                Balance del Periodo
                            </h3>
                        </div>
                        <BalanceChart data={balanceData} />
                    </div>

                    {/* Categories Pie Chart */}
                    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 overflow-hidden shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
                                Gastos por Categoría
                            </h3>
                        </div>
                        <ExpenseCategoryChart data={stats.categoryData} />
                        {/* Custom Legend */}
                        <div className="mt-4 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {stats.categoryData.map((item, index) => (
                                <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-colors border border-slate-700/30">
                                    <div className="flex items-center">
                                        <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: ["#10b981", "#ef4444", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899"][index % 6] }}></span>
                                        <span className="text-slate-300 capitalize font-medium">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-white">${item.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Expense Radar Chart */}
                    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 overflow-hidden shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-violet-500 rounded-full"></div>
                                Estadísticas de Tripulante (Radar)
                            </h3>
                        </div>
                        <ExpenseRadarChart data={stats.categoryData} />
                    </div>

                    {/* Trend Composed Chart */}
                    <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 overflow-hidden shadow-lg lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                                Histórico de Navegación (6 Meses)
                            </h3>
                        </div>
                        <div className="h-96">
                            <TrendComposedChart data={trendData} />
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
