"use client";

import { useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useUserData } from "@/contexts/UserDataContext";

export interface NivelSalud {
    label: string;
    color: string;
    emoji: string;
    bg: string;
    border: string;
}

export interface SaludFinanciera {
    score: number;
    nivel: NivelSalud;
    ratioAhorro: number;
    proyeccion: number;
    tendencia: number;
    gastos: number;
    ingresos: number;
    usoPresupuesto: number;
    presupuesto: number;
}

/**
 * Cálculo de salud financiera (score 0-100) usado por FinancialHealthWidget.
 * Extraído del widget para separar lógica de presentación (ver ADR 12, B4).
 */
export function useFinancialHealth(): SaludFinanciera {
    const { transactions } = useTransactions();
    const { userData } = useUserData();

    return useMemo(() => {
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
        let nivel: NivelSalud;
        if (score >= 80) nivel = { label: "Excelente", color: "text-emerald-400", emoji: "🟢", bg: "bg-emerald-500/20", border: "border-emerald-500/30" };
        else if (score >= 60) nivel = { label: "Bueno", color: "text-lime-400", emoji: "🟡", bg: "bg-lime-500/20", border: "border-lime-500/30" };
        else if (score >= 40) nivel = { label: "Regular", color: "text-amber-400", emoji: "🟠", bg: "bg-amber-500/20", border: "border-amber-500/30" };
        else nivel = { label: "Crítico", color: "text-red-400", emoji: "🔴", bg: "bg-red-500/20", border: "border-red-500/30" };

        return { score, nivel, ratioAhorro, proyeccion, tendencia, gastos, ingresos, usoPresupuesto, presupuesto };
    }, [transactions, userData]);
}