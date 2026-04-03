"use client";

import { useGoals, Goal } from "@/hooks/useGoals";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { FiTarget, FiPlus, FiTrash2 } from "react-icons/fi";
import { useState } from "react";

import { useBankAccounts } from "@/contexts/BankAccountsContext";

export default function SavingsGoalsWidget() {
    const { goals, loading, addGoal, deleteGoal, addContribution } = useGoals();
    const { tasasEnBs } = useBankAccounts();
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [newGoalName, setNewGoalName] = useState("");
    const [newGoalTarget, setNewGoalTarget] = useState("");

    const [showProgressModal, setShowProgressModal] = useState<Goal | null>(null);
    const [progressAmount, setProgressAmount] = useState("");
    const [progressMethod, setProgressMethod] = useState<"physical" | "usdt">("physical");

    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    const handleCreateGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoalName || !newGoalTarget) return;

        try {
            await addGoal(newGoalName, parseFloat(newGoalTarget));
            toast.success("Meta creada exitosamente");
            setShowAddModal(false);
            setNewGoalName("");
            setNewGoalTarget("");
        } catch (error) {
            console.error(error);
            toast.error("Error al crear la meta");
        }
    };

    const confirmAddProgress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showProgressModal || !progressAmount || isNaN(Number(progressAmount))) {
            toast.error("Monto inválido");
            return;
        }

        const amt = parseFloat(progressAmount);
        try {
            await addContribution(showProgressModal.id, showProgressModal.name, amt, progressMethod);
            toast.success(`Se agregaron $${amt} a tu meta`);
            setShowProgressModal(null);
            setProgressAmount("");
        } catch (error) {
            console.error(error);
            toast.error("Error al registrar el ahorro");
        }
    };

    const confirmDelete = async () => {
        if (!showDeleteConfirm) return;
        try {
            await deleteGoal(showDeleteConfirm);
            toast.success("Meta eliminada");
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar la meta");
        } finally {
            setShowDeleteConfirm(null);
        }
    };

    if (loading) return <div className="h-48 bg-slate-900/50 rounded-3xl animate-pulse"></div>;

    return (
        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden group hover:bg-slate-900/70 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all opacity-50"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                        <FiTarget />
                    </span>
                    Metas de Ahorro
                </h3>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all transform hover:scale-105"
                >
                    <FiPlus size={20} />
                </button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                {goals.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 flex flex-col items-center">
                        <FiTarget size={32} className="mb-2 opacity-50" />
                        <p className="mb-2">No tienes metas activas.</p>
                        <button onClick={() => setShowAddModal(true)} className="text-emerald-400 text-sm font-medium hover:underline">Crear mi primera meta</button>
                    </div>
                ) : (
                    goals.map(goal => {
                        const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                        return (
                            <div key={goal.id} className="bg-slate-800/40 hover:bg-slate-800/60 transition-colors p-4 rounded-2xl border border-slate-700/30 group/item">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{goal.name}</h4>
                                        <p className="text-xs text-slate-400 mt-1 font-medium">
                                            <span className="text-white">${goal.currentAmount}</span> <span className="text-slate-500">de</span> ${goal.targetAmount}
                                        </p>
                                    </div>
                                    <div className="flex space-x-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setShowProgressModal(goal)}
                                            className="p-1.5 text-emerald-400 hover:text-white hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1"
                                            title="Agregar Ahorro"
                                        >
                                            <FiPlus size={14} /> <span className="text-[10px] font-bold">Aportar</span>
                                        </button>
                                        <button onClick={() => setShowDeleteConfirm(goal.id)} className="p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors">
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Barra de Progreso */}
                                <div className="w-full bg-slate-700/50 rounded-full h-3 mb-2 overflow-hidden backdrop-blur-sm">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-violet-500 to-indigo-500'}`}
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 font-medium">
                                    <span className={progress >= 100 ? "text-emerald-400 font-bold" : "text-violet-400"}>{progress.toFixed(0)}% Completado</span>
                                    <span>Meta: Bs. {(goal.targetAmount * tasasEnBs.USD).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal for Creating Goal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Nueva Meta de Ahorro"
            >
                <form onSubmit={handleCreateGoal} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Nombre de la meta</label>
                        <input
                            type="text"
                            required
                            value={newGoalName}
                            onChange={(e) => setNewGoalName(e.target.value)}
                            placeholder="Ej. Viaje, Auto nuevo..."
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Monto Objetivo ($)</label>
                        <input
                            type="number"
                            required
                            min="1"
                            step="0.01"
                            value={newGoalTarget}
                            onChange={(e) => setNewGoalTarget(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setShowAddModal(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Crear Meta
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal for Adding Progress */}
            <Modal
                isOpen={!!showProgressModal}
                onClose={() => {
                    setShowProgressModal(null);
                    setProgressAmount("");
                }}
                title={`Ahorrar para ${showProgressModal?.name}`}
            >
                <form onSubmit={confirmAddProgress} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Monto a agregar ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={progressAmount}
                            onChange={(e) => setProgressAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500/50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Origen del dinero</label>
                        <div className="grid grid-cols-2 gap-2">
                            <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-1 transition-colors ${progressMethod === 'physical' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700/50 bg-slate-800/30'}`}>
                                <input
                                    type="radio"
                                    className="hidden"
                                    checked={progressMethod === 'physical'}
                                    onChange={() => setProgressMethod('physical')}
                                />
                                <span className={`text-sm font-bold ${progressMethod === 'physical' ? 'text-emerald-400' : 'text-slate-400'}`}>Efectivo</span>
                            </label>
                            <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-1 transition-colors ${progressMethod === 'usdt' ? 'border-teal-500 bg-teal-500/10' : 'border-slate-700/50 bg-slate-800/30'}`}>
                                <input
                                    type="radio"
                                    className="hidden"
                                    checked={progressMethod === 'usdt'}
                                    onChange={() => setProgressMethod('usdt')}
                                />
                                <span className={`text-sm font-bold ${progressMethod === 'usdt' ? 'text-teal-400' : 'text-slate-400'}`}>USDT</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-slate-700/50">
                        <button
                            type="button"
                            onClick={() => {
                                setShowProgressModal(null);
                                setProgressAmount("");
                            }}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Registrar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete Form */}
            <ConfirmDialog
                isOpen={!!showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(null)}
                onConfirm={confirmDelete}
                title="¿Borrar Meta?"
                message="No podrás revertir esto. Se eliminará la meta y su progreso."
                confirmText="Sí, borrar"
                type="danger"
            />
        </div>
    );
}
