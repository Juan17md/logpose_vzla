"use client";

import { FiDollarSign, FiBriefcase } from "react-icons/fi";
import Swal from "sweetalert2";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useUserData } from "@/contexts/UserDataContext";

interface Props {
    userId: string;
    bcvRate: number;
}

export default function SalaryPlanningWidget({ userId, bcvRate }: Props) {
    const { userData } = useUserData();
    const salary = userData.monthlySalary;

    const handleSetSalary = async () => {
        const { value: amount } = await Swal.fire({
            title: 'Registrar Sueldo Mensual',
            text: 'Ingresa tu ingreso fijo mensual para planificar mejor.',
            input: 'number',
            inputValue: salary || '',
            showCancelButton: true,
            background: "#1f2937",
            color: "#fff",
            confirmButtonText: 'Guardar',
            confirmButtonColor: '#10b981',
        });

        if (amount !== undefined) {
            const newSalary = amount === "" ? 0 : parseFloat(amount);
            try {
                const userRef = doc(db, "users", userId);
                await updateDoc(userRef, { monthlySalary: newSalary });
                // Context updates automatically via listener


                Swal.fire({
                    icon: "success",
                    title: "Sueldo actualizado",
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

    return (
        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between relative overflow-hidden group hover:bg-slate-900/70 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all opacity-50"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <FiBriefcase />
                        </span>
                        Planificación
                    </h3>
                    <p className="text-sm text-slate-400 mt-2 font-medium">
                        Tu base para el presupuesto mensual.
                    </p>
                </div>
                <button onClick={handleSetSalary} className="text-xs font-semibold text-slate-500 hover:text-white uppercase tracking-wider transition-colors bg-slate-800/50 px-3 py-1 rounded-lg hover:bg-slate-700">
                    {salary > 0 ? "Editar Salario" : "Definir Salario"}
                </button>
            </div>

            <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 mb-4 group hover:border-blue-500/30 transition-all">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Sueldo Mensual</span>
                    <span className="font-bold text-white text-2xl">${salary.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-700/50 pt-2 mt-2">
                    <span className="text-slate-500 text-xs">Equivalente Estimado</span>
                    <span className="font-semibold text-blue-400 text-sm">
                        Bs. {(salary * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
        </div>
    );
}
