"use client";

import { useMemo, useState } from "react";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import {
    obtenerEtiquetaOperacion,
    obtenerSimboloMoneda,
    type CuentaBancaria,
    type TransaccionCuenta,
} from "@/lib/bankAccounts";
import { Timestamp } from "firebase/firestore";
import PaginationControls from "@/components/ui/PaginationControls";
import { FiSearch, FiArrowUpRight, FiArrowDownLeft, FiRepeat, FiCreditCard } from "react-icons/fi";

interface HistorialCuentaProps {
    cuenta?: CuentaBancaria;
}

const ITEMS_POR_PAGINA = 8;

function formatearFecha(fecha: Timestamp | Date | undefined): string {
    if (!fecha) return "";
    const date = fecha instanceof Timestamp ? fecha.toDate() : new Date(fecha as unknown as string);
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function obtenerIconoOperacion(tipo: string) {
    switch (tipo) {
        case "deposito": return <FiArrowUpRight size={16} />;
        case "retiro": return <FiArrowDownLeft size={16} />;
        case "transferencia": return <FiRepeat size={16} />;
        case "pago": return <FiCreditCard size={16} />;
        default: return <FiArrowUpRight size={16} />;
    }
}

export default function HistorialCuenta({ cuenta }: HistorialCuentaProps) {
    const { transaccionesCuenta, obtenerCuenta, loadingTransacciones } = useBankAccounts();
    const [busqueda, setBusqueda] = useState("");
    const [paginaActual, setPaginaActual] = useState(1);

    const transaccionesFiltradas = useMemo(() => {
        let resultado: TransaccionCuenta[];

        if (cuenta) {
            resultado = transaccionesCuenta.filter(
                t => t.cuentaOrigenId === cuenta.id || t.cuentaDestinoId === cuenta.id
            );
        } else {
            resultado = transaccionesCuenta;
        }

        if (busqueda) {
            const termino = busqueda.toLowerCase();
            resultado = resultado.filter(
                t => t.descripcion.toLowerCase().includes(termino) ||
                    t.monto.toString().includes(termino)
            );
        }

        return resultado;
    }, [transaccionesCuenta, cuenta, busqueda]);

    const totalPaginas = Math.ceil(transaccionesFiltradas.length / ITEMS_POR_PAGINA);
    const transaccionesPaginadas = transaccionesFiltradas.slice(
        (paginaActual - 1) * ITEMS_POR_PAGINA,
        paginaActual * ITEMS_POR_PAGINA
    );

    if (loadingTransacciones) {
        return <div className="h-40 bg-slate-900/50 rounded-2xl animate-pulse" />;
    }

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
            {/* Decorative element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                <h3 className="text-xl font-black text-white tracking-tight">
                    {cuenta ? `Movimientos — ${cuenta.nombre}` : "Historial de Operaciones"}
                </h3>
                <div className="relative w-full sm:w-64">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar operación..."
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                        className="w-full bg-slate-950/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 placeholder-slate-600 transition-all"
                    />
                </div>
            </div>

            <div className="space-y-2">
                {transaccionesPaginadas.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        {busqueda ? "No se encontraron movimientos." : "Sin movimientos registrados."}
                    </div>
                ) : (
                    transaccionesPaginadas.map((t) => {
                        const etiqueta = obtenerEtiquetaOperacion(t.tipo);
                        const esEntrada = t.tipo === "deposito" || (t.tipo === "transferencia" && cuenta && t.cuentaDestinoId === cuenta.id);
                        const cuentaOrigenNombre = obtenerCuenta(t.cuentaOrigenId)?.nombre || "Cuenta eliminada";
                        const cuentaDestinoNombre = t.cuentaDestinoId ? (obtenerCuenta(t.cuentaDestinoId)?.nombre || "Cuenta eliminada") : null;

                        return (
                            <div
                                key={t.id}
                                className="flex items-center justify-between p-4 bg-slate-950/20 hover:bg-slate-950/40 border border-white/5 rounded-2xl transition-all group relative overflow-hidden"
                            >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="relative">
                                        <div className={`p-3 rounded-2xl shrink-0 ${etiqueta.bgColor} ${etiqueta.color} border border-current/10 shadow-lg relative z-10`}>
                                            {obtenerIconoOperacion(t.tipo)}
                                        </div>
                                        <div className="absolute top-1/2 left-full w-4 h-px bg-white/5 -translate-y-1/2" />
                                    </div>
                                    <div className="min-w-0 pr-4">
                                        <p className="font-bold text-white text-sm truncate mb-0.5">
                                            {t.descripcion}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[8px] uppercase px-2 py-0.5 rounded-full font-black tracking-widest border border-current/20 ${etiqueta.bgColor} ${etiqueta.color}`}>
                                                {etiqueta.label}
                                            </span>
                                            {t.tipo === "transferencia" && cuentaDestinoNombre && (
                                                <span className="text-[10px] text-slate-500 font-medium">
                                                    {cuentaOrigenNombre} <FiArrowUpRight className="inline mx-0.5" /> {cuentaDestinoNombre}
                                                </span>
                                            )}
                                            {t.comision ? (
                                                <span className="text-[9px] text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                                                    Com: {obtenerSimboloMoneda(t.moneda)}{t.comision}
                                                </span>
                                            ) : null}
                                            <span className="text-[10px] text-slate-600 font-medium">
                                                {formatearFecha(t.fecha)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <p className={`font-black text-base tabular-nums ${
                                        esEntrada ? "text-emerald-400" : "text-red-400"
                                    }`}>
                                        {esEntrada ? "+" : "-"}{obtenerSimboloMoneda(t.moneda)}{t.monto.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {totalPaginas > 1 && (
                <div className="mt-4 pt-3 border-t border-slate-700/30">
                    <PaginationControls
                        currentPage={paginaActual}
                        totalPages={totalPaginas}
                        onPageChange={setPaginaActual}
                    />
                </div>
            )}
        </div>
    );
}
