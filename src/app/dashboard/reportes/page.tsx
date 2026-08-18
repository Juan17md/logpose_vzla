"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTransactions } from "@/hooks/useTransactions";
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiPieChart, FiBriefcase, FiPercent, FiActivity, FiArrowUpRight, FiArrowDownRight, FiAward } from "react-icons/fi";
import { useSavingsTransactions } from "@/hooks/useSavingsTransactions";
import Select from "@/components/ui/forms/Select";
import { FiCalendar, FiClock } from "react-icons/fi";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { obtenerSimboloMoneda } from "@/lib/bankAccounts";

// Recharts (~40KB) cargado de forma diferida — solo se descarga al navegar a /reportes
const SkeletonChart = () => <div className="h-80 w-full bg-slate-800/40 rounded-2xl animate-pulse" aria-hidden="true" />;
const ExpenseCategoryChart = dynamic(
    () => import("@/components/charts/FinancialCharts").then(m => ({ default: m.ExpenseCategoryChart })),
    { ssr: false, loading: () => <SkeletonChart /> }
);
const BalanceChart = dynamic(
    () => import("@/components/charts/FinancialCharts").then(m => ({ default: m.BalanceChart })),
    { ssr: false, loading: () => <SkeletonChart /> }
);

export default function ReportsPage() {
    const { transactions, loading } = useTransactions();
    const { savingsTransactions, loadingSavings } = useSavingsTransactions();
    const { monedaBase, tasasEnBs, apiRates } = useBankAccounts();

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const tasasEnBsEfectivas = useMemo(() => {
        return tasasEnBs || { USD: apiRates.usd || 0, EUR: apiRates.eur || 0, USDT: apiRates.usdt || 0, BS: 1 };
    }, [tasasEnBs, apiRates]);

    const convertirDesdeBs = (montoEnBs: number): number => {
        if (monedaBase === "BS") return montoEnBs;
        const tasaBaseEnBs = tasasEnBsEfectivas[monedaBase] || 1;
        if (!tasaBaseEnBs || tasaBaseEnBs <= 0) return 0;
        return montoEnBs / tasaBaseEnBs;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convertirTransaccionAMonedaBase = (t: any): number => {
        const amount = Number(t.amount) || 0;
        const currency = String(t.currency || "USD").toUpperCase();
        const exchangeRate = Number(t.exchangeRate) || 0;
        const originalAmount = Number(t.originalAmount) || 0;

        let montoEnBs = 0;
        if (currency === "VES" || currency === "BS") {
            if (originalAmount > 0) montoEnBs = originalAmount;
            else if (exchangeRate > 0 && exchangeRate !== 1) montoEnBs = amount * exchangeRate;
            else montoEnBs = amount * (tasasEnBsEfectivas.USD || 0);
        } else if (currency === "USDT") {
            montoEnBs = amount * (tasasEnBsEfectivas.USDT || 0);
        } else if (currency === "EUR") {
            montoEnBs = amount * (tasasEnBsEfectivas.EUR || 0);
        } else {
            // USD
            if (exchangeRate > 0 && exchangeRate !== 1) {
                montoEnBs = amount * exchangeRate;
            } else {
                montoEnBs = amount * (tasasEnBsEfectivas.USD || 0);
            }
        }

        return convertirDesdeBs(montoEnBs);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convertirAhorroAMonedaBase = (t: any): number => {
        const amount = Number(t.amount) || 0;
        const method = t.method;

        let montoEnBs = 0;
        if (method === "bs") {
            montoEnBs = amount;
        } else {
            montoEnBs = amount * (apiRates.usd || 0);
        }

        if (monedaBase === "BS") {
            return montoEnBs;
        } else {
            const tasaUsdEnBs = apiRates.usd || 1;
            return montoEnBs / tasaUsdEnBs;
        }
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
    }, [transactions, selectedMonth, selectedYear]);

    const convertirAUsd = (monto: number): number => {
        if (monedaBase === "BS") {
            const tasaUsd = apiRates.usd || 0;
            return tasaUsd > 0 ? monto / tasaUsd : 0;
        }
        return monto;
    };

    const stats = useMemo(() => {
        let income = 0;
        let expense = 0;
        const categoryExpenses: Record<string, number> = {};

        filteredTransactions.forEach(t => {
            const amountConverted = convertirTransaccionAMonedaBase(t);
            if (t.type === "ingreso") {
                income += amountConverted;
            } else {
                expense += amountConverted;
                categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + amountConverted;
            }
        });

        const incomeUsd = convertirAUsd(income);
        const expenseUsd = convertirAUsd(expense);
        const categoryData = Object.entries(categoryExpenses).map(([name, value]) => ({
            name,
            value: convertirAUsd(value)
        })).sort((a, b) => b.value - a.value);

        const balanceCalculado = Math.round((incomeUsd - expenseUsd) * 100) / 100;
        const balanceFinal = Object.is(balanceCalculado, -0) ? 0 : balanceCalculado;
        return { income: incomeUsd, expense: expenseUsd, balance: balanceFinal, categoryData };
    }, [filteredTransactions, monedaBase, tasasEnBsEfectivas, apiRates.usd, convertirAUsd, convertirTransaccionAMonedaBase]);

    const savingsStats = useMemo(() => {
        const periodSavings = savingsTransactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });

        let totalDeposited = 0;
        let totalWithdrawn = 0;

        periodSavings.forEach(t => {
            const amountConverted = convertirAhorroAMonedaBase(t);
            if (t.type === "deposit") {
                totalDeposited += amountConverted;
            } else {
                totalWithdrawn += amountConverted;
            }
        });

        const totalDepositedUsd = convertirAUsd(totalDeposited);
        const totalWithdrawnUsd = convertirAUsd(totalWithdrawn);
        return {
            totalDeposited: totalDepositedUsd,
            totalWithdrawn: totalWithdrawnUsd,
            netSavings: totalDepositedUsd - totalWithdrawnUsd
        };
    }, [savingsTransactions, selectedMonth, selectedYear, monedaBase, apiRates, convertirAUsd, convertirAhorroAMonedaBase]);

    const balanceData = [
        { name: "Ingresos", value: stats.income, color: "#10b981" },
        { name: "Gastos", value: stats.expense, color: "#ef4444" },
        { name: "Ahorro", value: Math.max(0, savingsStats.netSavings), color: "#8b5cf6" }
    ];

    const advancedStats = useMemo(() => {
        // 1. Día de mayor gasto (Peak Spending Day)
        const dailyExpenses: Record<number, number> = {};
        filteredTransactions.forEach(t => {
            if (t.type === "gasto") {
                const d = new Date(t.date);
                const day = d.getDate();
                dailyExpenses[day] = (dailyExpenses[day] || 0) + convertirTransaccionAMonedaBase(t);
            }
        });

        let peakDay = null;
        let peakAmount = 0;
        Object.entries(dailyExpenses).forEach(([day, amount]) => {
            if (amount > peakAmount) {
                peakAmount = amount;
                peakDay = Number(day);
            }
        });

        // 2. Promedio de Gasto Diario
        const now = new Date();
        let daysInSelectedPeriod = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        if (selectedMonth === now.getMonth() && selectedYear === now.getFullYear()) {
            daysInSelectedPeriod = now.getDate();
        }
        const dailyAverage = stats.expense / (daysInSelectedPeriod || 1);
        const peakAmountUsd = convertirAUsd(peakAmount);

        // 3. Comparativa con el mes anterior (MoM)
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

        const prevPeriodTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });

        let prevIncome = 0;
        let prevExpense = 0;
        prevPeriodTransactions.forEach(t => {
            const amountConverted = convertirTransaccionAMonedaBase(t);
            if (t.type === "ingreso") {
                prevIncome += amountConverted;
            } else if (t.type === "gasto") {
                prevExpense += amountConverted;
            }
        });

        const incomeDiff = stats.income - prevIncome;
        const incomeChangePct = prevIncome > 0 ? (incomeDiff / prevIncome) * 100 : 0;

        const expenseDiff = stats.expense - prevExpense;
        const expenseChangePct = prevExpense > 0 ? (expenseDiff / prevExpense) * 100 : 0;

        // 4. Eficiencia de consumo (Gastos / Ingresos)
        const expenseToIncomeRatio = stats.income > 0 ? (stats.expense / stats.income) * 100 : 0;

        // 5. Tasa de Ahorro Real (Net Savings / Incomes)
        const netSavings = savingsStats.netSavings;
        const savingRate = stats.income > 0 ? (netSavings / stats.income) * 100 : 0;

        return {
            peakDay,
            peakAmount: peakAmountUsd,
            dailyAverage,
            incomeChangePct,
            expenseChangePct,
            expenseToIncomeRatio,
            savingRate
        };
    }, [filteredTransactions, stats, transactions, selectedMonth, selectedYear, savingsStats, monedaBase, tasasEnBsEfectivas, apiRates.usd, convertirAUsd, convertirTransaccionAMonedaBase]);

    const MONTHS = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Variantes de animación eliminadas — se prioriza la fluidez (ver ADR 11)

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
            <div
                className="md:hidden flex flex-col gap-6 pb-20"
            >
                {/* Mobile Header & Filters */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Reportes</h1>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Resumen financiero mensual</p>
                        </div>
                        <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500 shadow-lg ">
                            <FiPieChart size={24} />
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
                </div>

                {/* KPI Grid 2x2 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-emerald-500/30 backdrop-blur-xl relative overflow-hidden group active:scale-95 transition-[transform,color]">
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
                        <div className="mb-4 w-10 h-10 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center shadow-lg ">
                            <FiTrendingUp size={20} />
                        </div>
                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">Ingresos</p>
                        <p className="text-2xl font-black text-white tracking-tight">$ {stats.income.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>

                    <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-red-500/30 backdrop-blur-xl relative overflow-hidden group active:scale-95 transition-[transform,color]">
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-colors"></div>
                        <div className="mb-4 w-10 h-10 rounded-xl bg-red-500 text-slate-900 flex items-center justify-center shadow-lg ">
                            <FiTrendingDown size={20} />
                        </div>
                        <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">Gastos</p>
                        <p className="text-2xl font-black text-white tracking-tight">$ {stats.expense.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>

                    <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-amber-500/30 backdrop-blur-xl relative overflow-hidden group active:scale-95 transition-[transform,color]">
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors"></div>
                        <div className="mb-4 w-10 h-10 rounded-xl bg-amber-500 text-slate-900 flex items-center justify-center shadow-lg ">
                            <FiDollarSign size={20} />
                        </div>
                        <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">Balance</p>
                        <p className={`text-2xl font-black tracking-tight ${stats.balance >= 0 ? "text-white" : "text-red-400"}`}>
                            $ {stats.balance.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>

                    <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-violet-500/30 backdrop-blur-xl relative overflow-hidden group active:scale-95 transition-[transform,color]">
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-colors"></div>
                        <div className="mb-4 w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center shadow-lg ">
                            <FiBriefcase size={20} />
                        </div>
                        <p className="text-[10px] text-violet-500 font-black uppercase tracking-widest mb-1">Ahorro</p>
                        <p className={`text-2xl font-black tracking-tight ${savingsStats.netSavings >= 0 ? "text-white" : "text-red-400"}`}>
                            $ {savingsStats.netSavings.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>

                {/* Mobile Charts Area */}
                <div className="space-y-4">
                    {/* Balance Chart Card */}
                    <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                            Balance del Periodo
                        </h3>
                        <BalanceChart data={balanceData} />
                    </div>

                    {/* Expenses Chart Card */}
                    <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                            Gastos por Categoría
                        </h3>
                        <ExpenseCategoryChart data={stats.categoryData} />
                    </div>
                </div>

                {/* Mobile Category Detail List */}
                <div>
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
                                        <p className="text-white font-bold text-sm">$ {item.value.toLocaleString("es-ES", { minimumFractionDigits: 0 })}</p>
                                        <p className="text-slate-500 text-xs">{((item.value / stats.expense) * 100).toFixed(1)}%</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Mobile Advanced Analytics Bento Grid */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Análisis de Eficiencia</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Card 1: Tasa de Ahorro */}
                        <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-violet-500/20 backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl"></div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/10">
                                    <FiBriefcase size={16} />
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Ahorro Real</p>
                            <p className="text-xl font-black text-white">{advancedStats.savingRate.toFixed(1)}%</p>
                            <span className={`text-[8px] font-black uppercase inline-block mt-2 px-2 py-0.5 rounded-full ${
                                advancedStats.savingRate >= 20 
                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                    : advancedStats.savingRate >= 10 
                                        ? 'bg-amber-500/20 text-amber-400' 
                                        : 'bg-red-500/20 text-red-400'
                            }`}>
                                {advancedStats.savingRate >= 20 ? 'Excelente' : advancedStats.savingRate >= 10 ? 'Saludable' : 'Bajo'}
                            </span>
                        </div>

                        {/* Card 2: Eficiencia */}
                        <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-amber-500/20 backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/10">
                                    <FiPercent size={16} />
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Uso de Ingresos</p>
                            <p className="text-xl font-black text-white">{advancedStats.expenseToIncomeRatio.toFixed(1)}%</p>
                            <div className="w-full h-1 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${
                                        advancedStats.expenseToIncomeRatio <= 70 ? 'bg-emerald-500' : advancedStats.expenseToIncomeRatio <= 90 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(advancedStats.expenseToIncomeRatio, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Card 3: Día Crítico */}
                        <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-red-500/20 backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/5 rounded-full blur-2xl"></div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/10">
                                    <FiActivity size={16} />
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Pico de Gasto</p>
                            <p className="text-xl font-black text-white">
                                {advancedStats.peakDay ? `Día ${advancedStats.peakDay}` : 'N/A'}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 truncate">
                                {advancedStats.peakAmount > 0 ? `$$ ${Math.round(advancedStats.peakAmount)}` : 'Sin registros'}
                            </p>
                        </div>

                        {/* Card 4: Comparativa MoM */}
                        <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-emerald-500/20 backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/10">
                                    <FiAward size={16} />
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Cambio Gastos</p>
                            <p className={`text-xl font-black ${
                                advancedStats.expenseChangePct < 0 ? 'text-emerald-400' : advancedStats.expenseChangePct > 0 ? 'text-red-400' : 'text-white'
                            }`}>
                                {advancedStats.expenseChangePct === 0 ? '0%' : `${advancedStats.expenseChangePct > 0 ? '+' : ''}${advancedStats.expenseChangePct.toFixed(0)}%`}
                            </p>
                            <p className="text-[8px] text-slate-500 mt-1 font-medium">Respecto al mes anterior</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== DESKTOP LAYOUT (Original wrapped) ===== */}
            <div className="hidden md:block space-y-8">
                {/* Header & Filter */}
                <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 md:p-8 rounded-3xl shadow-lg relative overflow-hidden backdrop-blur-xl flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform duration-700">
                        <FiPieChart className="text-7xl md:text-9xl text-amber-500" />
                    </div>
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                    <div className="relative z-10">
                        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Reportes Financieros</h1>
                        <p className="text-slate-400 text-sm md:text-lg max-w-lg font-medium">Analiza tus finanzas con precisión y claridad estratégica.</p>
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

                {/* Summary Cards - Horizontal scroll en móvil */}
                {/* blur-3xl eliminado de las tarjetas — 4 capas GPU simultáneas en escritorio */}
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 scrollbar-hide">
                    <div className="flex-none w-64 md:w-auto bg-slate-900/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-emerald-500/30 relative overflow-hidden group active:scale-95 transition-transform">
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                        <div className="flex items-center space-x-3 text-emerald-400 mb-4">
                            <div className="p-3 bg-emerald-500 text-slate-900 rounded-xl shadow-lg "><FiTrendingUp size={20} /></div>
                            <span className="font-black uppercase tracking-[0.2em] text-[10px] text-emerald-500">Ingresos</span>
                        </div>
                        <p className="text-3xl font-black text-white">$ {stats.income.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>

                    <div className="flex-none w-64 md:w-auto bg-slate-900/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-red-500/30 relative overflow-hidden group active:scale-95 transition-transform">
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors"></div>
                        <div className="flex items-center space-x-3 text-red-400 mb-4">
                            <div className="p-3 bg-red-500 text-slate-900 rounded-xl shadow-lg "><FiTrendingDown size={20} /></div>
                            <span className="font-black uppercase tracking-[0.2em] text-[10px] text-red-500">Gastos</span>
                        </div>
                        <p className="text-3xl font-black text-white">$ {stats.expense.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>

                    <div className="flex-none w-64 md:w-auto bg-slate-900/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-amber-500/30 relative overflow-hidden group active:scale-95 transition-transform">
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
                        <div className="flex items-center space-x-3 text-amber-400 mb-4">
                            <div className="p-3 bg-amber-500 text-slate-900 rounded-xl shadow-lg "><FiDollarSign size={20} /></div>
                            <span className="font-black uppercase tracking-[0.2em] text-[10px] text-amber-500">Balance</span>
                        </div>
                        <p className={`text-3xl font-black ${stats.balance >= 0 ? "text-white" : "text-red-400"}`}>
                            $ {stats.balance.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="flex-none w-64 md:w-auto bg-slate-900/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-violet-500/30 relative overflow-hidden group active:scale-95 transition-transform">
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors"></div>
                        <div className="flex items-center space-x-3 text-violet-400 mb-4">
                            <div className="p-3 bg-violet-500 text-white rounded-xl shadow-lg "><FiBriefcase size={20} /></div>
                            <span className="font-black uppercase tracking-[0.2em] text-[10px] text-violet-500">Ahorro</span>
                        </div>
                        <p className={`text-3xl font-black ${savingsStats.netSavings >= 0 ? "text-white" : "text-red-400"}`}>
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
                                        <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: ["#10b981", "#ef4444", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899"][index % 6] }}></span>
                                        <span className="text-slate-300 capitalize font-medium">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-white">$ {item.value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Desktop Advanced Analytics Bento Grid */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                        Análisis de Eficiencia y Consumo
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Card 1: Tasa de Ahorro */}
                        <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-violet-500/20 backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors duration-500"></div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/10">
                                    <FiBriefcase size={20} />
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                                    advancedStats.savingRate >= 20 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                                        : advancedStats.savingRate >= 10 
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' 
                                            : 'bg-red-500/20 text-red-400 border border-red-500/20'
                                }`}>
                                    {advancedStats.savingRate >= 20 ? 'Excelente 🚀' : advancedStats.savingRate >= 10 ? 'Saludable 👍' : 'Bajo ⚠️'}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Tasa de Ahorro</p>
                            <p className="text-3xl font-black text-white">{advancedStats.savingRate.toFixed(1)}%</p>
                            <p className="text-[10px] text-slate-500 mt-2 font-medium">De tus ingresos totales de este mes.</p>
                        </div>

                        {/* Card 2: Eficiencia de Consumo */}
                        <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-amber-500/20 backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors duration-500"></div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/10">
                                    <FiPercent size={20} />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Eficiencia de Consumo</p>
                            <p className="text-3xl font-black text-white">{advancedStats.expenseToIncomeRatio.toFixed(1)}%</p>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-colors duration-500 ${
                                        advancedStats.expenseToIncomeRatio <= 70 ? 'bg-emerald-500' : advancedStats.expenseToIncomeRatio <= 90 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(advancedStats.expenseToIncomeRatio, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[9px] text-slate-500 mt-2 font-medium">Proporción de ingresos consumidos por gastos.</p>
                        </div>

                        {/* Card 3: Día de Mayor Consumo */}
                        <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-red-500/20 backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors duration-500"></div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/10">
                                    <FiActivity size={20} />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Día de Mayor Gasto</p>
                            <p className="text-3xl font-black text-white">
                                {advancedStats.peakDay ? `Día ${advancedStats.peakDay}` : 'N/A'}
                            </p>
                            <p className="text-[10px] text-red-400 font-bold mt-2">
                                {advancedStats.peakAmount > 0 ? `$$ ${advancedStats.peakAmount.toLocaleString('es-ES', { maximumFractionDigits: 2 })} acumulados` : 'Sin registros de gastos'}
                            </p>
                        </div>

                        {/* Card 4: Comparación MoM */}
                        <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-emerald-500/20 backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors duration-500"></div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/10">
                                    <FiAward size={20} />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Comparativa MoM</p>
                            <div className="space-y-1.5 mt-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-medium">Gastos:</span>
                                    <span className={`text-xs font-bold flex items-center ${
                                        advancedStats.expenseChangePct < 0 ? 'text-emerald-400' : advancedStats.expenseChangePct > 0 ? 'text-red-400' : 'text-slate-400'
                                    }`}>
                                        {advancedStats.expenseChangePct === 0 ? '' : advancedStats.expenseChangePct < 0 ? <FiArrowDownRight className="inline mr-0.5" /> : <FiArrowUpRight className="inline mr-0.5" />}
                                        {Math.abs(advancedStats.expenseChangePct).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-medium">Ingresos:</span>
                                    <span className={`text-xs font-bold flex items-center ${
                                        advancedStats.incomeChangePct > 0 ? 'text-emerald-400' : advancedStats.incomeChangePct < 0 ? 'text-red-400' : 'text-slate-400'
                                    }`}>
                                        {advancedStats.incomeChangePct === 0 ? '' : advancedStats.incomeChangePct > 0 ? <FiArrowUpRight className="inline mr-0.5" /> : <FiArrowDownRight className="inline mr-0.5" />}
                                        {Math.abs(advancedStats.incomeChangePct).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
