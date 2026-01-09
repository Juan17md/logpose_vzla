"use client";

import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { ExpenseCategoryChart, BalanceChart } from "@/components/charts/FinancialCharts";
import { FiCalendar, FiTrendingUp, FiTrendingDown, FiDollarSign, FiPieChart, FiBriefcase } from "react-icons/fi";
import { useSavingsTransactions } from "@/hooks/useSavingsTransactions";

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

        return { income, expense, balance: income - expense, categoryData };
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
        { name: "Ahorro", value: Math.max(0, stats.balance), color: "#3b82f6" }
    ];

    const MONTHS = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    if (loading || loadingSavings) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header & Filter */}
            {/* Header & Filter */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiPieChart className="text-9xl text-emerald-400" />
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Reportes Financieros</h1>
                    <p className="text-slate-400 text-lg">Analiza tus finanzas por periodos.</p>
                </div>

                <div className="relative z-10 flex space-x-2 bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50 backdrop-blur-md">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-transparent text-white font-medium p-2.5 rounded-xl outline-none cursor-pointer hover:bg-slate-700/50 transition-colors"
                    >
                        {MONTHS.map((m, i) => (
                            <option key={m} value={i} className="bg-slate-900 text-slate-300">{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-transparent text-white font-medium p-2.5 rounded-xl outline-none cursor-pointer hover:bg-slate-700/50 transition-colors"
                    >
                        {[2023, 2024, 2025, 2026].map(y => (
                            <option key={y} value={y} className="bg-slate-900 text-slate-300">{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all"></div>
                    <div className="flex items-center space-x-3 text-emerald-400 mb-3 relative z-10">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20"><FiTrendingUp size={20} /></div>
                        <span className="font-bold uppercase tracking-wider text-xs text-slate-400">Ingresos Totales</span>
                    </div>
                    <p className="text-4xl font-bold text-white relative z-10">$ {stats.income.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-red-500/20 transition-all"></div>
                    <div className="flex items-center space-x-3 text-red-400 mb-3 relative z-10">
                        <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20"><FiTrendingDown size={20} /></div>
                        <span className="font-bold uppercase tracking-wider text-xs text-slate-400">Gastos Totales</span>
                    </div>
                    <p className="text-4xl font-bold text-white relative z-10">$ {stats.expense.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex items-center space-x-3 text-blue-400 mb-3 relative z-10">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20"><FiDollarSign size={20} /></div>
                        <span className="font-bold uppercase tracking-wider text-xs text-slate-400">Balance Neto</span>
                    </div>
                    <p className={`text-4xl font-bold relative z-10 ${stats.balance >= 0 ? "text-white" : "text-red-400"}`}>
                        $ {stats.balance.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/20 transition-all"></div>
                    <div className="flex items-center space-x-3 text-purple-400 mb-3 relative z-10">
                        <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20"><FiBriefcase size={20} /></div>
                        <span className="font-bold uppercase tracking-wider text-xs text-slate-400">Ahorro del Periodo</span>
                    </div>
                    <p className={`text-4xl font-bold relative z-10 ${savingsStats.netSavings >= 0 ? "text-white" : "text-red-400"}`}>
                        $ {savingsStats.netSavings.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Balance Chart */}
                <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Balance del Periodo</h3>
                    </div>
                    <BalanceChart data={balanceData} />
                </div>

                {/* Categories Pie Chart */}
                <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Gastos por Categoría</h3>
                    </div>
                    <ExpenseCategoryChart data={stats.categoryData} />
                    {/* Custom Legend */}
                    <div className="mt-4 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {stats.categoryData.map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-colors border border-slate-700/30">
                                <div className="flex items-center">
                                    <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"][index % 6] }}></span>
                                    <span className="text-slate-300 capitalize font-medium">{item.name}</span>
                                </div>
                                <span className="font-bold text-white">${item.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
