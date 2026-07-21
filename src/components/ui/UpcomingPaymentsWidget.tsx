"use client";

import { useFixedExpenses } from "@/hooks/useFixedExpenses";
import { FiCalendar, FiCheck, FiAlertTriangle } from "react-icons/fi";

export default function UpcomingPaymentsWidget() {
    const { fixedExpenses } = useFixedExpenses();

    const now = new Date();
    const hoy = now.getDate();
    const diasEnMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Determinar si un gasto fue pagado en el mes actual
    // La interfaz FixedExpense usa lastPaidDate (Date) — no existe isPaid
    const esPagadoEsteMes = (lastPaidDate?: Date): boolean => {
        if (!lastPaidDate) return false;
        const fecha = new Date(lastPaidDate);
        return fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear();
    };

    // Calcular días hasta vencimiento y ordenar
    const pagosOrdenados = fixedExpenses
        .map(e => {
            let diasHasta = e.dueDay - hoy;
            if (diasHasta < 0) diasHasta += diasEnMes;
            const pagado = esPagadoEsteMes(e.lastPaidDate);
            return {
                ...e,
                nombre: e.title || e.description,
                diasHasta,
                vencido: e.dueDay < hoy && !pagado,
                pagado,
            };
        })
        .sort((a, b) => a.diasHasta - b.diasHasta)
        .slice(0, 5);

    const totalFijos = fixedExpenses.reduce((s, e) => s + e.amount, 0);
    const totalPagados = fixedExpenses.filter(e => esPagadoEsteMes(e.lastPaidDate)).reduce((s, e) => s + e.amount, 0);
    const progreso = totalFijos > 0 ? (totalPagados / totalFijos) * 100 : 0;

    return (
        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-[2.5rem] border border-cyan-500/20 shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            {/* blur-3xl decorativo eliminado — widget aparece múltiples veces en el grid */}

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/20">
                            <FiCalendar className="text-cyan-400" size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Próximos Pagos</h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{fixedExpenses.length} fijos registrados</p>
                        </div>
                    </div>
                </div>

                {/* Barra de progreso del mes */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Progreso del mes</span>
                        <span className="text-xs font-bold text-cyan-400">{progreso.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(progreso, 100)}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-600">${totalPagados.toFixed(2)} pagados</span>
                        <span className="text-[10px] text-slate-600">${totalFijos.toFixed(2)} total</span>
                    </div>
                </div>

                {/* Lista de pagos */}
                <div className="space-y-2">
                    {pagosOrdenados.length === 0 ? (
                        <div className="text-center py-4 text-slate-600 text-xs">
                            Sin gastos fijos registrados
                        </div>
                    ) : (
                        pagosOrdenados.map((pago, i) => (
                            <div
                                key={pago.id || i}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                                    pago.pagado
                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                        : pago.diasHasta <= 3
                                        ? "bg-red-500/5 border-red-500/20"
                                        : pago.diasHasta <= 7
                                        ? "bg-amber-500/5 border-amber-500/20"
                                        : "bg-slate-800/30 border-slate-700/30"
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                                        pago.pagado
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : pago.diasHasta <= 3
                                            ? "bg-red-500/20 text-red-400"
                                            : "bg-slate-700/50 text-slate-400"
                                    }`}>
                                        {pago.pagado ? <FiCheck size={14} /> : pago.diasHasta <= 3 ? <FiAlertTriangle size={14} /> : pago.dueDay}
                                    </div>
                                    <div>
                                        <p className={`text-xs font-semibold truncate max-w-[100px] ${pago.pagado ? "text-emerald-300/70 line-through" : "text-white"}`}>
                                            {pago.nombre}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            {pago.pagado
                                                ? "✓ Pagado"
                                                : pago.diasHasta === 0
                                                ? "¡Hoy!"
                                                : pago.diasHasta === 1
                                                ? "Mañana"
                                                : `En ${pago.diasHasta} días`}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-xs font-bold ${
                                    pago.pagado ? "text-emerald-400/50" : pago.diasHasta <= 3 ? "text-red-400" : "text-white"
                                }`}>
                                    ${pago.amount.toFixed(2)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
