"use client";

import { useState } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { FiPlus, FiTrash2, FiCalendar, FiCheck } from "react-icons/fi";

const CATEGORIAS = [
  "Servicios", "Hogar", "Suscripciones", "Educación",
  "Salud", "Transporte", "Seguros", "Otros",
];

interface PasoGastosFijosProps {
  onSiguiente: () => void;
  onAnterior: () => void;
}

export default function PasoGastosFijos({ onSiguiente, onAnterior }: PasoGastosFijosProps) {
  const { gastosFijos, agregarGastoFijo, eliminarGastoFijo } = useOnboarding();

  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<"USD" | "BS">("USD");
  const [category, setCategory] = useState(CATEGORIAS[0]);
  const [dueDay, setDueDay] = useState("");

  const parseNum = (v: string) => parseFloat(v.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;

  const agregar = () => {
    const amount = parseNum(amountStr);
    const day = parseInt(dueDay);
    if (!title.trim() || amount <= 0 || day < 1 || day > 31) return;
    agregarGastoFijo({ title: title.trim(), amount, currency, category, dueDay: day });
    setTitle("");
    setAmountStr("");
    setCurrency("USD");
    setCategory(CATEGORIAS[0]);
    setDueDay("");
  };

  return (
    <div
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/[.06] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-sky-400/80 text-xs font-medium tracking-wider uppercase">Paso 5 de 6</span>
        </div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-outfit)" }}>
          Tus Gastos Fijos
        </h2>
        <p className="text-slate-400 text-sm mt-1">Registra tus pagos recurrentes mensuales</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre del gasto</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Internet"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-colors duration-300 text-sm"
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
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-colors duration-300 text-sm"
                />
              </div>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as "USD" | "BS")}
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 px-3 text-white text-sm focus:outline-none focus:border-sky-500/50 appearance-none cursor-pointer"
              >
                <option value="USD" className="bg-slate-900">USD</option>
                <option value="BS" className="bg-slate-900">BS</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoría</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 px-4 text-white text-sm focus:outline-none focus:border-sky-500/50 appearance-none cursor-pointer"
            >
              {CATEGORIAS.map(c => (
                <option key={c} value={c} className="bg-slate-900">{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FiCalendar size={12} className="text-sky-400" />
              Día de pago (1-31)
            </label>
            <input
              type="text"
              inputMode="numeric"
              min={1}
              max={31}
              value={dueDay}
              onChange={e => setDueDay(e.target.value)}
              placeholder="1-31"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-colors duration-300 text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={agregar}
          disabled={!title.trim() || parseNum(amountStr) <= 0}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-700/50 text-slate-400 hover:border-sky-500/30 hover:text-sky-400 transition-colors duration-300 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiPlus size={16} />
          Agregar gasto fijo
        </button>
      </div>
{gastosFijos.length > 0 && (
          <div
            className="space-y-2 mb-6"
          >
            {gastosFijos.map((g, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-slate-800/30 rounded-2xl px-4 py-3 border border-slate-700/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
                    <FiCalendar className="text-sky-400" size={14} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{g.title}</p>
                    <p className="text-xs text-slate-500">
                      {g.currency === "USD" ? "$" : "Bs."}{g.amount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &middot; Día {g.dueDay}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => eliminarGastoFijo(i)}
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
          className="flex-[2] bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-400 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-[transform,color] duration-300 flex items-center justify-center gap-2 text-sm"
        >
          {gastosFijos.length === 0 ? (
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
