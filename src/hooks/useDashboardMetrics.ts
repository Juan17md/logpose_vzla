"use client";

import { useCallback, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useBankAccounts } from "@/contexts/BankAccountsContext";

/**
 * Métricas del dashboard: balance total, ingresos/gastos del mes, categoría
 * top, promedio diario y datos para gráficas, más las conversiones de la
 * moneda base a Bs./USD. Extraído de `dashboard/page.tsx` (ver ADR 12, B4).
 */
export function useDashboardMetrics() {
    const { transactions } = useTransactions();
    const { calcularSaldoTotal, tasasEnBs, monedaBase } = useBankAccounts();

    const convertirMontoBaseABs = useCallback((monto: number): number => {
        if (monedaBase === "BS") return monto;
        const tasaMonedaBase = tasasEnBs[monedaBase] || 0;
        return monto * tasaMonedaBase;
    }, [monedaBase, tasasEnBs]);

    const convertirMontoBaseAUsd = useCallback((monto: number): number => {
        const montoEnBs = convertirMontoBaseABs(monto);
        const tasaUsdEnBs = tasasEnBs.USD || 0;
        if (!tasaUsdEnBs || tasaUsdEnBs <= 0) return 0;
        return montoEnBs / tasaUsdEnBs;
    }, [convertirMontoBaseABs, tasasEnBs]);

    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const daysPassed = now.getDate();

        let monthlyIncome = 0;
        let monthlyExpense = 0;
        const expensesByCategory: Record<string, number> = {};

        const totalBalance = calcularSaldoTotal();
        const tasaBaseEnBs = tasasEnBs[monedaBase] || 1;
        const convertirDesdeBs = (montoEnBs: number): number => {
            if (monedaBase === "BS") return montoEnBs;
            if (!tasaBaseEnBs || tasaBaseEnBs <= 0) return 0;
            return montoEnBs / tasaBaseEnBs;
        };
        const convertirTransaccionAMonedaBase = (t: typeof transactions[number]): number => {
            const amount = Number(t.amount) || 0;
            const currency = String(t.currency || "USD").toUpperCase();
            const exchangeRate = Number(t.exchangeRate) || 0;
            const originalAmount = Number(t.originalAmount) || 0;

            let montoEnBs = 0;
            if (currency === "VES" || currency === "BS") {
                if (originalAmount > 0) montoEnBs = originalAmount;
                else if (exchangeRate > 0 && exchangeRate !== 1) montoEnBs = amount * exchangeRate;
                else montoEnBs = amount * (tasasEnBs.USD || 0);
            } else if (currency === "USDT") {
                montoEnBs = amount * (tasasEnBs.USDT || 0);
            } else if (currency === "EUR") {
                montoEnBs = amount * (tasasEnBs.EUR || 0);
            } else {
                // USD
                if (exchangeRate > 0 && exchangeRate !== 1) {
                    montoEnBs = amount * exchangeRate;
                } else {
                    montoEnBs = amount * (tasasEnBs.USD || 0);
                }
            }

            return convertirDesdeBs(montoEnBs);
        };

        transactions.forEach(t => {
            const amount = convertirTransaccionAMonedaBase(t);
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

        const categoryData = Object.entries(expensesByCategory)
            .map(([name, value]) => ({ name, value: convertirMontoBaseAUsd(value) }))
            .sort((a, b) => b.value - a.value);

        // Redondear a 2 decimales y eliminar -0 por errores de punto flotante
        const balanceRedondeado = Math.round(totalBalance * 100) / 100;
        const balanceFinal = Object.is(balanceRedondeado, -0) ? 0 : balanceRedondeado;

        return { totalBalance: balanceFinal, monthlyIncome, monthlyExpense, topCategoryName, topCategoryAmount, dailyAverage, categoryData };
    }, [transactions, calcularSaldoTotal, tasasEnBs, monedaBase, convertirMontoBaseAUsd]);

    const savingsPercentage = stats.monthlyIncome > 0
        ? Math.max(0, ((stats.monthlyIncome - stats.monthlyExpense) / stats.monthlyIncome) * 100)
        : 0;

    return {
        stats,
        savingsPercentage,
        tasasEnBs,
        convertirMontoBaseABs,
        convertirMontoBaseAUsd,
    };
}