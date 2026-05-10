"use client";

import { useState } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiTrash2, FiTarget, FiCheck } from "react-icons/fi";

interface PasoMetasProps {
  onSiguiente: () => void;
  onAnterior: () => void;
}

export default function PasoMetas({ onSiguiente, onAnterior }: PasoMetasProps) {
  const { metas, agregarMeta, eliminarMeta } = useOnboarding();

  const [name, setName] = useState("");
  const [targetStr, setTargetStr] = useState("");
  const [currentStr, setCurrentStr] = useState("");

  const parseNum = (v: string) => parseFloat(v.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;

  const agregar = () => {
    const target = parseNum(targetStr);
    if (!name.trim() || target <= 0) return;
    agregarMeta({ name: name.trim(), targetAmount: target, currentAmount: parseNum(currentStr) });
    setName("");
    setTargetStr("");
    setCurrentStr("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/[.06] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-violet-400/80 text-xs font-medium tracking-wider uppercase">Paso 3 de 6</span>
        </div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-outfit)" }}>
          Tus Metas de Ahorro
        </h2>
        <p className="text-slate-400 text-sm mt-1">Define objetivos financieros para mantenerte motivado</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre de la meta</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Viaje a Miami"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Monto objetivo ($)</label>
            <input
              type="text"
              inputMode="decimal"
              value={targetStr}
              onChange={e => setTargetStr(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Ahorro inicial <span className="text-slate-600">(opcional)</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={currentStr}
              onChange={e => setCurrentStr(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-300 text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={agregar}
          disabled={!name.trim() || parseNum(targetStr) <= 0}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-700/50 text-slate-400 hover:border-violet-500/30 hover:text-violet-400 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiPlus size={16} />
          Agregar meta
        </button>
      </div>

      <AnimatePresence>
        {metas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2 mb-6"
          >
            {metas.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between bg-slate-800/30 rounded-2xl px-4 py-3 border border-slate-700/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <FiTarget className="text-violet-400" size={14} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{m.name}</p>
                    <p className="text-xs text-slate-500">$ {m.targetAmount.toLocaleString()} objetivo</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => eliminarMeta(i)}
                  className="p-2 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all duration-200"
                >
                  <FiTrash2 size={14} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onAnterior}
          className="flex-1 py-3.5 rounded-2xl border border-slate-700/50 text-slate-300 hover:bg-slate-800/50 transition-all duration-300 text-sm font-medium"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          disabled={metas.length === 0}
          className="flex-[2] bg-gradient-to-r from-violet-600 via-violet-500 to-purple-400 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg text-sm"
        >
          {metas.length === 0 ? (
            "Agrega al menos 1 meta"
          ) : (
            <>
              <FiCheck size={16} />
              Continuar
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
