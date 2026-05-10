"use client";

import { useState } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiTrash2, FiCreditCard, FiCheck } from "react-icons/fi";
import { BANCOS_PREDEFINIDOS, MONEDAS_SOPORTADAS, obtenerSimboloMoneda } from "@/lib/bankAccounts";

interface PasoCuentasProps {
  onSiguiente: () => void;
  onAnterior: () => void;
}

export default function PasoCuentas({ onSiguiente, onAnterior }: PasoCuentasProps) {
  const { cuentas, agregarCuenta, eliminarCuenta } = useOnboarding();

  const [nombre, setNombre] = useState("");
  const [banco, setBanco] = useState("");
  const [moneda, setMoneda] = useState<"USD" | "EUR" | "USDT" | "BS">("USD");
  const [saldoStr, setSaldoStr] = useState("");

  const agregar = () => {
    const saldo = parseFloat(saldoStr.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    if (!nombre.trim() || !banco) return;
    agregarCuenta({ nombre: nombre.trim(), banco, moneda, saldoInicial: saldo });
    setNombre("");
    setBanco("");
    setMoneda("USD");
    setSaldoStr("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/[.06] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400/80 text-xs font-medium tracking-wider uppercase">Paso 2 de 6</span>
        </div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-outfit)" }}>
          Tus Cuentas Bancarias
        </h2>
        <p className="text-slate-400 text-sm mt-1">Registra tus cuentas y billeteras digitales</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre de la cuenta</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Mi Cuenta Principal"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all duration-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Banco / Billetera</label>
            <select
              value={banco}
              onChange={e => setBanco(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all duration-300 text-sm appearance-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">Selecciona...</option>
              {BANCOS_PREDEFINIDOS.map(b => (
                <option key={b.id} value={b.id} className="bg-slate-900">{b.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Moneda</label>
            <div className="flex gap-2 flex-wrap">
              {MONEDAS_SOPORTADAS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMoneda(m.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300 border ${
                    moneda === m.id
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                      : "bg-slate-800/50 border-slate-700/30 text-slate-400 hover:border-slate-600/50"
                  }`}
                >
                  {m.simbolo} {m.nombre}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Saldo inicial <span className="text-slate-600">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{obtenerSimboloMoneda(moneda)}</span>
              <input
                type="text"
                inputMode="decimal"
                value={saldoStr}
                onChange={e => setSaldoStr(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all duration-300 text-sm"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={agregar}
          disabled={!nombre.trim() || !banco}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-700/50 text-slate-400 hover:border-amber-500/30 hover:text-amber-400 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiPlus size={16} />
          Agregar cuenta
        </button>
      </div>

      <AnimatePresence>
        {cuentas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2 mb-6"
          >
            <p className="text-xs text-slate-500 font-medium mb-2">
              {cuentas.length} cuenta{cuentas.length !== 1 ? "s" : ""} agregada{cuentas.length !== 1 ? "s" : ""}:
            </p>
            {cuentas.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between bg-slate-800/30 rounded-2xl px-4 py-3 border border-slate-700/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <FiCreditCard className="text-amber-400" size={14} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{c.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {BANCOS_PREDEFINIDOS.find(b => b.id === c.banco)?.nombre || c.banco} &middot; {obtenerSimboloMoneda(c.moneda)}{c.moneda}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => eliminarCuenta(i)}
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
          disabled={cuentas.length === 0}
          className="flex-[2] bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 text-slate-950 font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg text-sm"
        >
          {cuentas.length === 0 ? (
            "Agrega al menos 1 cuenta"
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
