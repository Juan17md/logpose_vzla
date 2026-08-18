"use client";

import { useState } from "react";
import { useOnboarding, PerfilFinanciero } from "@/contexts/OnboardingContext";
import { FiDollarSign, FiTarget, FiTrendingUp, FiPieChart } from "react-icons/fi";
import { obtenerSimboloMoneda } from "@/lib/bankAccounts";

interface PasoPerfilFinancieroProps {
  onSiguiente: () => void;
}

export default function PasoPerfilFinanciero({ onSiguiente }: PasoPerfilFinancieroProps) {
  const { perfil, guardarPerfil } = useOnboarding();

  const [salaryStr, setSalaryStr] = useState(perfil?.monthlySalary?.toString() || "");
  const [budgetStr, setBudgetStr] = useState(perfil?.monthlyBudget?.toString() || "");
  const [monedaBase, setMonedaBase] = useState<"USD" | "VES">(perfil?.monedaBase || "VES");
  const [savingsPhysicalStr, setSavingsPhysicalStr] = useState(perfil?.savingsPhysical?.toString() || "");
  const [savingsUSDTStr, setSavingsUSDTStr] = useState(perfil?.savingsUSDT?.toString() || "");

  const parseNum = (v: string) => {
    const cleaned = v.replace(/[^0-9.,]/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: PerfilFinanciero = {
      monthlySalary: parseNum(salaryStr),
      monthlyBudget: parseNum(budgetStr),
      monedaBase,
      savingsPhysical: parseNum(savingsPhysicalStr),
      savingsUSDT: parseNum(savingsUSDTStr),
    };
    guardarPerfil(data);
    onSiguiente();
  };

  const simbolo = obtenerSimboloMoneda(monedaBase === "USD" ? "USD" : "BS");

  const valido = parseNum(salaryStr) > 0 && parseNum(budgetStr) > 0;

  return (
    <div
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/[.06] mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400/80 text-xs font-medium tracking-wider uppercase">Paso 1 de 6</span>
          </div>
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-outfit)" }}>
            Tu Perfil Financiero
          </h2>
          <p className="text-slate-400 text-sm mt-1">Cuéntanos sobre tus ingresos para empezar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative group">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FiTrendingUp className="text-amber-400" size={14} />
              Salario mensual esperado
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{simbolo}</span>
              <input
                type="text"
                inputMode="decimal"
                value={salaryStr}
                onChange={e => setSalaryStr(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3.5 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors duration-300 text-sm"
              />
            </div>
          </div>

          <div className="relative group">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FiTarget className="text-amber-400" size={14} />
              Presupuesto mensual de gastos
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{simbolo}</span>
              <input
                type="text"
                inputMode="decimal"
                value={budgetStr}
                onChange={e => setBudgetStr(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3.5 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors duration-300 text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
            <FiDollarSign className="text-amber-400" size={14} />
            Moneda base preferida
          </label>
          <div className="flex gap-3">
            {(["USD", "VES"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMonedaBase(m)}
                className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-colors duration-300 border ${
                  monedaBase === m
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-lg "
                    : "bg-slate-800/50 border-slate-700/30 text-slate-400 hover:border-slate-600/50"
                }`}
              >
                {m === "USD" ? "$ Dólares" : "Bs. Bolívares"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
            <FiPieChart className="text-amber-400" size={14} />
            Ahorros actuales (opcional)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 text-sm font-medium">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={savingsPhysicalStr}
                onChange={e => setSavingsPhysicalStr(e.target.value)}
                placeholder="Efectivo físico"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors duration-300 text-sm"
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400 text-sm font-medium">₮</span>
              <input
                type="text"
                inputMode="decimal"
                value={savingsUSDTStr}
                onChange={e => setSavingsUSDTStr(e.target.value)}
                placeholder="USDT"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors duration-300 text-sm"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!valido}
          className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 text-slate-950 font-bold py-4 px-6 rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-[transform,color] duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
        >
          <span>Siguiente paso</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
}
