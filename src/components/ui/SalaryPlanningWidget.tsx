"use client";

import { FiBriefcase } from "react-icons/fi";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Modal from "@/components/ui/Modal";
import { useState } from "react";

import { useUserData } from "@/contexts/UserDataContext";

import { useBankAccounts } from "@/contexts/BankAccountsContext";

interface Props {
    userId: string;
}

export default function SalaryPlanningWidget({ userId }: Props) {
    const { userData } = useUserData();
    const { tasasEnBs } = useBankAccounts();
    const salary = userData.monthlySalary;

    const [showEdit, setShowEdit] = useState(false);
    const [editAmount, setEditAmount] = useState("");

    const openEditModal = () => {
        setEditAmount(salary ? salary.toString() : "");
        setShowEdit(true);
    };

    const handleSetSalary = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newSalary = editAmount === "" || isNaN(parseFloat(editAmount)) ? 0 : parseFloat(editAmount);
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { monthlySalary: newSalary });
            
            toast.success("Sueldo actualizado");
            setShowEdit(false);
        } catch (e) {
            console.error(e);
            toast.error("No se pudo actualizar");
        }
    };

    return (
        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between relative overflow-hidden group hover:bg-slate-900/70 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/20 transition-all opacity-50"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="p-2 bg-violet-500/20 rounded-lg text-violet-400">
                            <FiBriefcase />
                        </span>
                        Planificación
                    </h3>
                    <p className="text-sm text-slate-400 mt-2 font-medium">
                        Tu base para el presupuesto mensual.
                    </p>
                </div>
                <button onClick={openEditModal} className="text-xs font-semibold text-slate-500 hover:text-white uppercase tracking-wider transition-colors bg-slate-800/50 px-3 py-1 rounded-lg hover:bg-slate-700">
                    {salary > 0 ? "Editar Salario" : "Definir Salario"}
                </button>
            </div>

            <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 mb-4 group hover:border-violet-500/30 transition-all">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Sueldo Mensual</span>
                    <span className="font-bold text-white text-2xl">${salary.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-700/50 pt-2 mt-2">
                    <span className="text-slate-500 text-xs">Equivalente Estimado</span>
                    <span className="font-semibold text-violet-400 text-sm">
                        Bs. {(salary * tasasEnBs.USD).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {salary > 0 && (
                <div className="grid grid-cols-2 gap-3 text-center relative z-10">
                    <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Necesidades (50%)</p>
                        <p className="font-bold text-white text-lg">${(salary * 0.5).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Deseos (30%)</p>
                        <p className="font-bold text-white text-lg">${(salary * 0.3).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 col-span-2">
                        <p className="text-[10px] text-emerald-500/80 uppercase tracking-wider font-bold mb-1">Ahorros (20%)</p>
                        <p className="font-bold text-emerald-400 text-lg">${(salary * 0.2).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>
            )}

            <Modal
                isOpen={showEdit}
                onClose={() => setShowEdit(false)}
                title="Registrar Sueldo Mensual"
            >
                <form onSubmit={handleSetSalary} className="space-y-4">
                    <p className="text-sm text-slate-400">Ingresa tu ingreso fijo mensual para planificar mejor.</p>
                    <div>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-violet-500/50 transition-colors"
                            placeholder="0.00"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setShowEdit(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/20"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
