"use client";

import { useTransactions } from "@/hooks/useTransactions";
import { useUserData } from "@/contexts/UserDataContext";
import { useMemo } from "react";
import { FiHeart, FiTrendingUp, FiTrendingDown, FiTarget, FiShield } from "react-icons/fi";

export default function FinancialHealthWidget() {
    const { transactions } = useTransactions();
    const { userData } = useUserData();

    const salud = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const daysPassed = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        // Mes actual
        const monthTx = transactions.filter(t => {
            const d = t.date instanceof Date ? t.date : new Date(t.date);
            return d >= startOfMonth;
        });
        const ingresos = monthTx.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
        const gastos = monthTx.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);

        // Mes anterior
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const prevGastos = transactions.filter(t => {
            const d = t.date instanceof Date ? t.date : new Date(t.date);
            return t.type === 'gasto' && d >= prevStart && d <= prevEnd;
        }).reduce((s, t) => s + t.amount, 0);

        // Ratio de ahorro
        const ratioAhorro = ingresos > 0 ? ((ingresos - gastos) / ingresos) * 100 : 0;

        // Proyección
        const promediodiario = daysPassed > 0 ? gastos / daysPassed : 0;
        const proyeccion = promediodiario * daysInMonth;

        // Tendencia vs mes anterior
        const tendencia = prevGastos > 0 ? ((gastos - prevGastos) / prevGastos) * 100 : 0;

        // Uso de presupuesto
        const presupuesto = userData.monthlyBudget || 0;
        const usoPresupuesto = presupuesto > 0 ? (gastos / presupuesto) * 100 : 0;

        // Score de salud (0-100)
        let score = 50; // Base
        if (ratioAhorro >= 30) score += 25;
        else if (ratioAhorro >= 15) score += 15;
        else if (ratioAhorro >= 0) score += 5;
        else score -= 15;

        if (presupuesto > 0) {
            if (usoPresupuesto <= 70) score += 15;
            else if (usoPresupuesto <= 90) score += 5;
            else score -= 10;
        }

        if (tendencia < -10) score += 10;
        else if (tendencia > 20) score -= 10;

        score = Math.max(0, Math.min(100, score));

        // Nivel
        let nivel: { label: string; color: string; emoji: string; bg: string; border: string };
        if (score >= 80) nivel = { label: "Excelente", color: "text-emerald-400", emoji: "🟢", bg: "bg-emerald-500/20", border: "border-emerald-500/30" };
        else if (score >= 60) nivel = { label: "Bueno", color: "text-lime-400", emoji: "🟡", bg: "bg-lime-500/20", border: "border-lime-500/30" };
        else if (score >= 40) nivel = { label: "Regular", color: "text-amber-400", emoji: "🟠", bg: "bg-amber-500/20", border: "border-amber-500/30" };
        else nivel = { label: "Crítico", color: "text-red-400", emoji: "🔴", bg: "bg-red-500/20", border: "border-red-500/30" };

        return { score, nivel, ratioAhorro, proyeccion, tendencia, gastos, ingresos, usoPresupuesto, presupuesto };
    }, [transactions, userData]);

    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (salud.score / 100) * circumference;

    return (
        <div className={`bg-slate-900/50 backdrop-blur-md p-5 rounded-3xl border shadow-lg relative overflow-hidden group hover:${salud.nivel.border} transition-all ${salud.nivel.border}`}>
            <div className={`absolute top-0 right-0 w-32 h-32 ${salud.nivel.bg} rounded-full blur-3xl -mr-16 -mt-16 opacity-50`} />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 ${salud.nivel.bg} rounded-xl border ${salud.nivel.border}`}>
                            <FiHeart className={salud.nivel.color} size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Salud Financiera</h3>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${salud.nivel.color}`}>{salud.nivel.emoji} {salud.nivel.label}</p>
                        </div>
                    </div>
                </div>

                {/* Score circular */}
                <div className="flex items-center gap-5 mb-4">
                    <div className="relative w-24 h-24 flex-shrink-0">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-800" />
                            <circle
                                cx="50" cy="50" r="40"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                strokeLinecap="round"
                                className={salud.nivel.color}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-2xl font-black ${salud.nivel.color}`}>{salud.score}</span>
                            <span className="text-[8px] text-slate-500 uppercase font-bold">/ 100</span>
                        </div>
                    </div>

                    {/* Métricas clave */}
                    <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <FiShield size={12} className="text-slate-500 flex-shrink-0" />
                                <span className="text-[10px] text-slate-500 truncate">Ahorro</span>
                            </div>
                            <span className={`text-xs font-bold ${salud.ratioAhorro >= 15 ? 'text-emerald-400' : salud.ratioAhorro >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                {salud.ratioAhorro.toFixed(0)}%
                            </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                                {salud.tendencia <= 0 ? (
                                    <FiTrendingDown size={12} className="text-emerald-500 flex-shrink-0" />
                                ) : (
                                    <FiTrendingUp size={12} className="text-red-500 flex-shrink-0" />
                                )}
                                <span className="text-[10px] text-slate-500 truncate">vs Mes Ant.</span>
                            </div>
                            <span className={`text-xs font-bold ${salud.tendencia <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {salud.tendencia > 0 ? '+' : ''}{salud.tendencia.toFixed(0)}%
                            </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <FiTarget size={12} className="text-slate-500 flex-shrink-0" />
                                <span className="text-[10px] text-slate-500 truncate">Proyección</span>
                            </div>
                            <span className="text-xs font-bold text-white">
                                ${salud.proyeccion.toFixed(0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Barra de presupuesto */}
                {salud.presupuesto > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Presupuesto</span>
                            <span className={`text-[10px] font-bold ${salud.usoPresupuesto > 90 ? 'text-red-400' : salud.usoPresupuesto > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                ${salud.gastos.toFixed(0)} / ${salud.presupuesto.toFixed(0)}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                    salud.usoPresupuesto > 90
                                        ? 'bg-gradient-to-r from-red-500 to-red-400'
                                        : salud.usoPresupuesto > 70
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                        : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                }`}
                                style={{ width: `${Math.min(salud.usoPresupuesto, 100)}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
