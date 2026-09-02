"use client";

import { useState } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { FiPlus, FiTrash2, FiUsers, FiCheck } from "react-icons/fi";

interface PasoDeudasProps {
  onSiguiente: () => void;
  onAnterior: () => void;
}

export default function PasoDeudas({ onSiguiente, onAnterior }: PasoDeudasProps) {
  const { deudas, agregarDeuda, eliminarDeuda } = useOnboarding();

  const [personName, setPersonName] = useState("");
  const [type, setType] = useState<"por_cobrar" | "por_pagar">("por_cobrar");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<"USD" | "VES">("USD");

  const parseNum = (v: string) => parseFloat(v.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;

  const agregar = () => {
    const amount = parseNum(amountStr);
    if (!personName.trim() || amount <= 0) return;
    agregarDeuda({ personName: personName.trim(), type, amount, currency });
    setPersonName("");
    setType("por_cobrar");
    setAmountStr("");
    setCurrency("USD");
  };

  return (
    <div
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/[.06] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400/80 text-xs font-medium tracking-wider uppercase">Paso 4 de 6</span>
        </div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-outfit)" }}>
          Tus Deudas
        </h2>
        <p className="text-slate-400 text-sm mt-1">Registra deudas pendientes por cobrar o pagar</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre / Persona</label>
            <input
              type="text"
              value={personName}
              onChange={e => setPersonName(e.target.value)}
              placeholder="Ej: Préstamo Juan"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors duration-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Monto</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  {currency === "USD" ? "$" : "Bs."}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors duration-300 text-sm"
                />
              </div>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as "USD" | "VES")}
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 px-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
              >
                <option value="USD" className="bg-slate-900">USD</option>
                <option value="VES" className="bg-slate-900">VES</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setType("por_cobrar")}
              className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-colors duration-300 border ${
                type === "por_cobrar"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-slate-800/50 border-slate-700/30 text-slate-400 hover:border-slate-600/50"
              }`}
            >
              Por cobrar
            </button>
            <button
              type="button"
              onClick={() => setType("por_pagar")}
              className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-colors duration-300 border ${
                type === "por_pagar"
                  ? "bg-red-500/15 border-red-500/40 text-red-400"
                  : "bg-slate-800/50 border-slate-700/30 text-slate-400 hover:border-slate-600/50"
              }`}
            >
              Por pagar
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={agregar}
          disabled={!personName.trim() || parseNum(amountStr) <= 0}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-700/50 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-400 transition-colors duration-300 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiPlus size={16} />
          Agregar deuda
        </button>
      </div>
{deudas.length > 0 && (
          <div
            className="space-y-2 mb-6"
          >
            {deudas.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-slate-800/30 rounded-2xl px-4 py-3 border border-slate-700/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    d.type === "por_cobrar" ? "bg-emerald-500/10" : "bg-red-500/10"
                  }`}>
                    <FiUsers className={d.type === "por_cobrar" ? "text-emerald-400" : "text-red-400"} size={14} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{d.personName}</p>
                    <p className="text-xs text-slate-500">
                      {d.type === "por_cobrar" ? "Me deben" : "Debo"} &middot; {d.currency === "USD" ? "$" : "Bs."}{d.amount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => eliminarDeuda(i)}
                  className="p-2 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors duration-200"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
<div className="flex gap-3">
        <button
          type="button"
          onClick={onAnterior}
          className="flex-1 py-3.5 rounded-2xl border border-slate-700/50 text-slate-300 hover:bg-slate-800/50 transition-colors duration-300 text-sm font-medium"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          className="flex-[2] bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-lg hover: hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-[transform,color] duration-300 flex items-center justify-center gap-2 text-sm"
        >
          {deudas.length === 0 ? (
            "Omitir paso"
          ) : (
            <>
              <FiCheck size={16} />
              Continuar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
