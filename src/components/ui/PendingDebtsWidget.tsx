"use client";

import { useDebts, Debt } from "@/hooks/useDebts";
import { FiArrowUp, FiArrowDown, FiCreditCard, FiCheckCircle, FiClock, FiAlertCircle } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function PendingDebtsWidget() {
    const { debts, loadingDebts } = useDebts();
    const router = useRouter();

    if (loadingDebts) return (
        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700/50 shadow-lg animate-pulse h-64"></div>
    );

    const pendingDebts = debts.filter(d => !d.isPaid);

    // Calculate totals
    const totalReceivable = pendingDebts
        .filter(d => d.type === "por_cobrar")
        .reduce((acc, curr) => acc + (curr.amount - curr.payments.reduce((p, c) => p + c.amount, 0)), 0);

    const totalPayable = pendingDebts
        .filter(d => d.type === "por_pagar")
        .reduce((acc, curr) => acc + (curr.amount - curr.payments.reduce((p, c) => p + c.amount, 0)), 0);

    // Get top 3 urgent debts (closest due date or simply by creation if no due date)
    const urgentDebts = [...pendingDebts].sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
    }).slice(0, 3);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg hover:border-violet-500/30 transition-all duration-300 relative overflow-hidden flex flex-col h-full"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/20 transition-all"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                            <FiCreditCard size={18} />
                        </span>
                        Deudas Pendientes
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="bg-slate-800/50 p-3 rounded-2xl border border-emerald-500/10">
                    <p className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1">
                        <FiArrowDown className="text-emerald-400" /> Por Cobrar
                    </p>
                    <p className="text-lg font-bold text-emerald-400">$ {totalReceivable.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-2xl border border-red-500/10">
                    <p className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1">
                        <FiArrowUp className="text-red-400" /> Por Pagar
                    </p>
                    <p className="text-lg font-bold text-red-400">$ {totalPayable.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div className="flex-1 space-y-3 relative z-10">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Próximos Vencimientos</p>
                {urgentDebts.length > 0 ? (
                    urgentDebts.map((debt) => {
                        const remaining = debt.amount - debt.payments.reduce((acc, curr) => acc + curr.amount, 0);
                        return (
                            <div key={debt.id} className="flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-800/60 rounded-xl transition-colors border border-transparent hover:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${debt.type === 'por_cobrar' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-200">{debt.personName}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            {debt.dueDate ? (
                                                <span className={`${debt.dueDate && new Date() > debt.dueDate ? "text-red-400 font-bold" : ""}`}>
                                                    <FiClock className="inline mr-1" />
                                                    {debt.dueDate.toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span><FiAlertCircle className="inline mr-1" /> Sin fecha</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-sm font-bold ${debt.type === 'por_cobrar' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ${remaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-4 text-slate-500 text-sm">
                        <FiCheckCircle className="mx-auto text-2xl mb-2 opacity-50" />
                        No tienes deudas pendientes.
                    </div>
                )}
            </div>

            <button
                onClick={() => router.push('/dashboard/deudas')}
                className="w-full mt-4 py-2.5 text-sm font-bold text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-xl transition-colors border border-violet-500/20"
            >
                Gestionar Deudas
            </button>
        </motion.div>
    );
}
