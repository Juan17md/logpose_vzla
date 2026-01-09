"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Swal from "sweetalert2";
import { FiDollarSign, FiEdit2, FiBox, FiCpu } from "react-icons/fi";
import { SiTether } from "react-icons/si";

interface WalletData {
    savingsPhysical: number;
    savingsUSDT: number;
}

import { useUserData } from "@/contexts/UserDataContext";

export default function CryptoCashWalletWidget({ userId, bcvRate }: { userId: string | undefined, bcvRate: number }) {
    const { userData, loading } = useUserData();

    // Local state for optimistic UI or just use context? Context will update automatically.
    // We don't need local state for display anymore.

    // We keep handleUpdate for writing.



    const handleUpdate = async (field: keyof WalletData, label: string) => {
        if (!userId) return;

        const currentValue = userData[field];

        const { value: amount } = await Swal.fire({
            title: `Actualizar ${label}`,
            input: 'number',
            inputLabel: 'Nuevo monto total ($)',
            inputValue: currentValue,
            showCancelButton: true,
            background: "#1f2937",
            color: "#fff",
            confirmButtonColor: '#10b981',
            inputValidator: (value) => {
                if (!value || isNaN(parseFloat(value)) || parseFloat(value) < 0) {
                    return 'Ingresa un monto válido';
                }
                return null;
            }
        });

        if (amount !== undefined) {
            try {
                await updateDoc(doc(db, "users", userId), {
                    [field]: parseFloat(amount)
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    timer: 1000,
                    showConfirmButton: false,
                    background: "#1f2937",
                    color: "#fff",
                });
            } catch (error) {
                console.error("Error updating wallet:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error al actualizar',
                    text: 'Inténtalo de nuevo',
                    background: "#1f2937",
                    color: "#fff",
                });
            }
        }
    };

    if (loading) return <div className="h-48 bg-slate-900/50 rounded-3xl animate-pulse"></div>;

    if (loading) return <div className="h-48 bg-slate-900/50 rounded-3xl animate-pulse"></div>;

    const totalSaved = userData.savingsPhysical + userData.savingsUSDT;

    return (
        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-lg relative overflow-hidden group hover:bg-slate-900/70 transition-all duration-300 flex flex-col justify-between">
            {/* Background Decoration */}
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mb-16 group-hover:bg-purple-500/20 transition-all opacity-50"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                        <FiBox />
                    </span>
                    Fondos Ahorrados
                </h3>
            </div>

            <div className="space-y-4 relative z-10">
                {/* Physical Cash */}
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/30 flex justify-between items-center hover:bg-slate-800/60 transition-colors group/item">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-xl text-green-400">
                            <FiDollarSign size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">Efectivo Físico</p>
                            <p className="text-lg font-bold text-white">$ {userData.savingsPhysical.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleUpdate('savingsPhysical', 'Efectivo Físico')}
                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover/item:opacity-100"
                    >
                        <FiEdit2 size={16} />
                    </button>
                </div>

                {/* USDT */}
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/30 flex justify-between items-center hover:bg-slate-800/60 transition-colors group/item">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-500/20 rounded-xl text-teal-400">
                            <SiTether size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">USDT (Cripto)</p>
                            <p className="text-lg font-bold text-white">{userData.savingsUSDT.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDT</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleUpdate('savingsUSDT', 'USDT')}
                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover/item:opacity-100"
                    >
                        <FiEdit2 size={16} />
                    </button>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/50 relative z-10">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Ahorrado</p>
                        <p className="text-sm text-slate-400 mt-1">
                            ≈ Bs. {(totalSaved * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        $ {totalSaved.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            <div className="mt-4 relative z-10">
                <a href="/dashboard/ahorros" className="block w-full text-center py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all border border-slate-700/50 hover:border-slate-600 shadow-lg">
                    Registrar Ahorro
                </a>
            </div>
        </div>
    );
}
