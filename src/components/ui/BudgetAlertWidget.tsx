"use client";

import { FiAlertTriangle } from "react-icons/fi";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Modal from "@/components/ui/Modal";
import { useState } from "react";

import { useUserData } from "@/contexts/UserDataContext";

interface Props {
    currentExpense: number;
    userId: string;
}

export default function BudgetAlertWidget({ currentExpense, userId }: Props) {
    const { userData } = useUserData();
    const budgetLimit = userData.monthlyBudget;

    const percentage = budgetLimit > 0 ? (currentExpense / budgetLimit) * 100 : 0;

    let statusColor = "bg-emerald-500";
    let textColor = "text-emerald-400";

    if (percentage >= 100) {
        statusColor = "bg-red-500";
        textColor = "text-red-400";
    } else if (percentage >= 80) {
        statusColor = "bg-yellow-500";
        textColor = "text-yellow-400";
    }

    const [showEdit, setShowEdit] = useState(false);
    const [editAmount, setEditAmount] = useState("");

    const abrirModal = () => {
        setEditAmount(budgetLimit ? budgetLimit.toString() : "");
        setShowEdit(true);
    };

    const guardarLimite = async () => {
        if (!userId) {
            toast.error("Usuario no autenticado");
            return;
        }

        const newLimit = editAmount === "" || isNaN(parseFloat(editAmount.replace(",", "."))) ? 0 : parseFloat(editAmount.replace(",", "."));

        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { monthlyBudget: newLimit });
            toast.success(newLimit === 0 ? "Límite eliminado" : "Límite actualizado");
            setShowEdit(false);
        } catch (e) {
            console.error(e);
            toast.error("No se pudo actualizar");
        }
    };

    const eliminarLimite = async () => {
        if (!userId) return;
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { monthlyBudget: 0 });
            toast.success("Límite eliminado");
            setShowEdit(false);
        } catch (e) {
            console.error(e);
            toast.error("No se pudo eliminar el límite");
        }
    };

    if (!budgetLimit || budgetLimit === 0) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-center items-center text-center group hover:bg-slate-900/70 transition-all hover:border-slate-600">
                <div className="p-4 bg-slate-800/50 rounded-2xl mb-4 text-slate-400 group-hover:text-yellow-400 group-hover:bg-yellow-500/10 transition-all">
                    <FiAlertTriangle size={28} />
                </div>
                <h3 className="text-white font-bold mb-2 text-lg">Sin Límite Definido</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-[200px]">Establece un tope de gastos para controlar mejor tus finanzas.</p>
                <button
                    onClick={abrirModal}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors border border-slate-700/50 hover:border-slate-600"
                >
                    Definir Límite
                </button>

                <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Definir Límite Mensual">
                    <div className="space-y-4">
                        <p className="text-sm text-slate-400">Te avisaremos si tus gastos superan este monto.</p>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') guardarLimite(); }}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50 transition-colors"
                            placeholder="0.00"
                        />
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
                                Cancelar
                            </button>
                            <button type="button" onClick={guardarLimite} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                                Guardar
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        );
    }

    return (
        <div className="group bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden transition-all duration-300 hover:bg-slate-900/70">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 transition-all opacity-0 group-hover:opacity-100 ${statusColor.replace('bg-', 'bg-').replace('500', '500/20')}`} />

            <div className="flex justify-between items-start mb-2 relative z-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg bg-opacity-20 ${statusColor.replace('bg-', 'bg-').replace('500', '500/20')} ${textColor}`}>
                        <FiAlertTriangle />
                    </span>
                    Límite Mensual
                </h3>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center py-2">
                <div className="relative w-40 h-40">
                    <svg height="100%" width="100%" viewBox="0 0 160 160" className="transform -rotate-90">
                        <circle stroke="#1e293b" strokeWidth="12" fill="transparent" r="68" cx="80" cy="80" />
                        <circle
                            className={`transition-all duration-1000 ease-out ${statusColor.replace("bg-", "text-")} drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                            stroke="currentColor" strokeWidth="12" strokeDasharray={68 * 2 * Math.PI}
                            strokeDashoffset={(68 * 2 * Math.PI) - (Math.min(percentage, 100) / 100) * (68 * 2 * Math.PI)}
                            strokeLinecap="round" fill="transparent" r="68" cx="80" cy="80"
                        />
                    </svg>
                    <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-center">
                        <span className={`text-2xl font-bold ${textColor}`}>{percentage > 999 ? '>999' : percentage.toFixed(1)}%</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Usado</span>
                    </div>
                </div>
                <div className="mt-2 text-center">
                    <p className="text-sm text-slate-400 font-medium">
                        $ <span className="text-white font-bold">{currentExpense.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        {budgetLimit.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">
                        {percentage >= 100 ? "⚠️ Excedido" : "Disponible"}
                    </p>
                </div>
            </div>

            <div className="mt-4 relative z-10">
                <button
                    onClick={abrirModal}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700/50 hover:border-slate-600 shadow-lg uppercase tracking-wider"
                >
                    Actualizar Límite
                </button>
            </div>

            <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Definir Límite Mensual">
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">Te avisaremos si tus gastos superan este monto.</p>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') guardarLimite(); }}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50 transition-colors"
                        placeholder="0.00"
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={eliminarLimite} className="px-4 py-2 text-slate-400 hover:text-red-400 transition-colors">
                            Eliminar
                        </button>
                        <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
                            Cancelar
                        </button>
                        <button type="button" onClick={guardarLimite} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                            Guardar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
