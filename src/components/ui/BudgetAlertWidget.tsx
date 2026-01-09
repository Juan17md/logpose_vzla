"use client";

import { FiAlertTriangle } from "react-icons/fi";
import Swal from "sweetalert2";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    let glowColor = "group-hover:bg-emerald-500/10";
    let borderColor = "hover:border-emerald-500/30";

    if (percentage >= 100) {
        statusColor = "bg-red-500";
        textColor = "text-red-400";
        glowColor = "group-hover:bg-red-500/10";
        borderColor = "hover:border-red-500/30";
    } else if (percentage >= 80) {
        statusColor = "bg-yellow-500";
        textColor = "text-yellow-400";
        glowColor = "group-hover:bg-yellow-500/10";
        borderColor = "hover:border-yellow-500/30";
    }

    const handleSetLimit = async () => {
        const { value: amount } = await Swal.fire({
            title: 'Definir Límite Mensual',
            text: 'Te avisaremos si tus gastos superan este monto.',
            input: 'number',
            inputValue: budgetLimit || '',
            showCancelButton: true,
            background: "#1f2937",
            color: "#fff",
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar / Eliminar',
            confirmButtonColor: '#10b981',
        });

        if (amount !== undefined) {
            const newLimit = amount === "" ? 0 : parseFloat(amount);

            try {
                const userRef = doc(db, "users", userId);
                await updateDoc(userRef, { monthlyBudget: newLimit });
                // Context updates automatically

                Swal.fire({
                    icon: "success",
                    title: "Límite actualizado",
                    timer: 1000,
                    showConfirmButton: false,
                    background: "#1f2937",
                    color: "#fff"
                });

            } catch (e) {
                console.error(e);
                Swal.fire("Error", "No se pudo actualizar.", "error");
            }
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
                    onClick={handleSetLimit}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors border border-slate-700/50 hover:border-slate-600"
                >
                    Definir Límite
                </button>
            </div>
        );
    }

    return (
        <div className={`group bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden transition-all duration-300 ${borderColor} hover:bg-slate-900/70`}>
            {/* Ambient Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 transition-all opacity-0 group-hover:opacity-100 ${statusColor.replace('bg-', 'bg-').replace('500', '500/20')}`}></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg bg-opacity-20 ${statusColor.replace('bg-', 'bg-').replace('500', '500/20')} ${textColor}`}>
                        <FiAlertTriangle />
                    </span>
                    Límite Mensual
                </h3>
            </div>

            {/* Circular Chart Section */}
            <div className="relative z-10 flex flex-col items-center justify-center py-2">
                <div className="relative w-40 h-40">
                    <svg
                        height="100%"
                        width="100%"
                        viewBox="0 0 160 160"
                        className="transform -rotate-90"
                    >
                        {/* Track Circle */}
                        <circle
                            stroke="#1e293b" // slate-800
                            strokeWidth="12"
                            fill="transparent"
                            r="68"
                            cx="80"
                            cy="80"
                        />
                        {/* Progress Circle */}
                        <circle
                            className={`transition-all duration-1000 ease-out ${statusColor.replace("bg-", "text-")} drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                            stroke="currentColor"
                            strokeWidth="12"
                            strokeDasharray={68 * 2 * Math.PI}
                            strokeDashoffset={(68 * 2 * Math.PI) - (Math.min(percentage, 100) / 100) * (68 * 2 * Math.PI)}
                            strokeLinecap="round"
                            fill="transparent"
                            r="68"
                            cx="80"
                            cy="80"
                        />
                    </svg>
                    {/* Centered Text */}
                    <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-center">
                        <span className={`text-2xl font-bold ${textColor}`}>
                            {percentage > 999 ? '>999' : percentage.toFixed(1)}%
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Usado</span>
                    </div>
                </div>

                {/* Legend / Details */}
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

            {/* Footer Button */}
            <div className="mt-4 relative z-10">
                <button
                    onClick={handleSetLimit}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700/50 hover:border-slate-600 shadow-lg uppercase tracking-wider"
                >
                    Actualizar Límite
                </button>
            </div>
        </div>
    );
}

