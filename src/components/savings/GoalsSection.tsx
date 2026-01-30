"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Swal from "sweetalert2";
import { FiTarget, FiPlus, FiTrash2, FiX } from "react-icons/fi";

interface SavingGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    color: string;
}

export default function GoalsSection({ userId }: { userId: string }) {
    const [goals, setGoals] = useState<SavingGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // New Goal States
    const [newGoalName, setNewGoalName] = useState("");
    const [newGoalTarget, setNewGoalTarget] = useState("");
    const [newGoalColor] = useState("#10b981");

    useEffect(() => {
        if (!userId) return;
        const q = query(collection(db, "users", userId, "saving_goals"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const goalsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SavingGoal[];
            setGoals(goalsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const handleCreateGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "users", userId, "saving_goals"), {
                name: newGoalName,
                targetAmount: parseFloat(newGoalTarget),
                currentAmount: 0,
                color: newGoalColor,
                createdAt: serverTimestamp()
            });
            setShowAddModal(false);
            setNewGoalName("");
            setNewGoalTarget("");
            Swal.fire({
                icon: "success",
                title: "Meta creada",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000,
                background: "#1f2937",
                color: "#fff"
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteGoal = async (id: string) => {
        const result = await Swal.fire({
            title: '¿Eliminar meta?',
            text: "Se perderá el progreso registrado.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            background: "#1f2937",
            color: "#fff"
        });

        if (result.isConfirmed) {
            await deleteDoc(doc(db, "users", userId, "saving_goals", id));
        }
    };

    const handleAddProgress = async (goal: SavingGoal) => {
        const { value: amount } = await Swal.fire({
            title: 'Agregar Ahorro',
            text: `¿Cuánto deseas agregar a "${goal.name}"?`,
            input: 'number',
            inputAttributes: {
                min: '0.01',
                step: '0.01'
            },
            showCancelButton: true,
            confirmButtonText: 'Agregar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            background: "#1f2937",
            color: "#fff",
            inputValidator: (value) => {
                if (!value || parseFloat(value) <= 0) {
                    return 'Debes ingresar un monto válido';
                }
            }
        });

        if (amount) {
            const numAmount = parseFloat(amount);
            const goalRef = doc(db, "users", userId, "saving_goals", goal.id);
            await updateDoc(goalRef, {
                currentAmount: increment(numAmount)
            });

            Swal.fire({
                icon: "success",
                title: `¡+$${numAmount} agregados!`,
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000,
                background: "#1f2937",
                color: "#fff"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FiTarget className="text-purple-400" />
                    Metas de Ahorro
                </h3>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500/20 transition-all border border-purple-500/20 text-sm font-bold"
                >
                    <FiPlus /> Nueva Meta
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map((goal) => {
                    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                    return (
                        <div key={goal.id} className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group">
                            {/* Actions */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDeleteGoal(goal.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    <FiTrash2 size={16} />
                                </button>
                            </div>

                            <div className="mb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-3 rounded-xl bg-slate-800 text-2xl">
                                        🏁
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg leading-tight">{goal.name}</h4>
                                        <p className="text-slate-500 text-xs">Meta: ${goal.targetAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-white">${goal.currentAmount.toLocaleString()}</span>
                                    <span className="text-emerald-400">{progress.toFixed(1)}%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleAddProgress(goal)}
                                className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 border border-slate-700"
                            >
                                <FiPlus /> Agregar Ahorro
                            </button>
                        </div>
                    );
                })}

                {/* Empty State / Add Button Card */}
                {goals.length === 0 && !loading && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-700 rounded-2xl p-6 text-slate-500 hover:text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group min-h-[200px]"
                    >
                        <div className="p-4 rounded-full bg-slate-800 group-hover:bg-purple-500/10 transition-colors">
                            <FiPlus className="text-2xl" />
                        </div>
                        <span className="font-medium">Crear primera meta</span>
                    </button>
                )}
            </div>

            {/* Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl relative animation-fade-in">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <FiX size={24} />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-6">Nueva Meta de Ahorro</h3>

                        <form onSubmit={handleCreateGoal} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre de la meta</label>
                                <input
                                    type="text"
                                    required
                                    value={newGoalName}
                                    onChange={(e) => setNewGoalName(e.target.value)}
                                    placeholder="Ej. Viaje, Auto nuevo..."
                                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
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
                                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition-colors mt-2"
                            >
                                Crear Meta
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
