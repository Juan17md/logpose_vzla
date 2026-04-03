"use client";

import { useEffect, useState } from "react";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { getBCVRate } from "@/lib/currency";
import {
    obtenerSimboloMoneda,
    formatearSaldo,
    obtenerColorMoneda,
    type MonedaSoportada,
} from "@/lib/bankAccounts";
import CuentaCard from "@/components/cuentas/CuentaCard";
import Link from "next/link";
import { FiCreditCard, FiChevronRight, FiPlus, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import CurrencySelector from "@/components/ui/CurrencySelector";
import { MONEDAS_SOPORTADAS } from "@/lib/bankAccounts";

export default function BankAccountsWidget() {
    const { cuentas, loading, calcularSaldoTotal, monedaBase, actualizarMonedaBase } = useBankAccounts();
    const router = useRouter();

    const saldoTotal = calcularSaldoTotal();

    if (loading) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden animate-pulse">
                <div className="h-4 w-24 bg-slate-800 rounded mb-3" />
                <div className="h-8 w-32 bg-slate-800 rounded mb-4" />
                <div className="space-y-2">
                    <div className="h-12 bg-slate-800 rounded-xl" />
                    <div className="h-12 bg-slate-800 rounded-xl" />
                </div>
            </div>
        );
    }

    const cuentasAMostrar = cuentas.slice(0, 4);
    const cuentasRestantes = cuentas.length - cuentasAMostrar.length;

    return (
        <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden group hover:border-violet-500/30 transition-all">
            {/* Decoraciones */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/20 transition-all" />

            <div className="p-6 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-violet-500/20 rounded-xl border border-violet-500/20">
                            <FiCreditCard className="text-violet-400" size={18} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Mis Cuentas
                        </p>
                    </div>
                    <Link
                        href="/dashboard/cuentas"
                        className="text-violet-400 hover:text-violet-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                        Ver todas <FiChevronRight size={14} />
                    </Link>
                </div>

                {/* Saldo Consolidado */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-2xl font-bold text-white tabular-nums">
                            {obtenerSimboloMoneda(monedaBase)} {saldoTotal.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <CurrencySelector value={monedaBase} onChange={actualizarMonedaBase} compact />
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                        Capital en {MONEDAS_SOPORTADAS.find(m => m.id === monedaBase)?.nombre}
                    </p>
                </div>

                {/* Lista compacta de cuentas */}
                {cuentas.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3"
                    >
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 shrink-0">
                            <FiCreditCard size={18} />
                        </div>
                        <div>
                            <p className="text-amber-200 text-sm font-bold">Sin cuentas bancarias</p>
                            <p className="text-amber-500/70 text-xs mt-0.5 leading-relaxed">
                                No puedes registrar movimientos sin una cuenta de destino. Configura una en la sección de cuentas.
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-1.5">
                        {cuentasAMostrar.map((cuenta) => (
                            <CuentaCard
                                key={cuenta.id}
                                cuenta={cuenta}
                                compact
                                onEditar={() => router.push("/dashboard/cuentas")}
                                onEliminar={() => router.push("/dashboard/cuentas")}
                                onVerDetalle={() => router.push("/dashboard/cuentas")}
                            />
                        ))}
                        {cuentasRestantes > 0 && (
                            <Link
                                href="/dashboard/cuentas"
                                className="block text-center text-xs text-slate-500 hover:text-violet-400 py-2 transition-colors"
                            >
                                + {cuentasRestantes} cuenta{cuentasRestantes > 1 ? "s" : ""} más
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
