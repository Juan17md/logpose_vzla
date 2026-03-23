"use client";

import { useState } from "react";
import { FiDollarSign, FiPlus, FiBriefcase } from "react-icons/fi";
import { SiTether } from "react-icons/si";
import { TbCoinFilled } from "react-icons/tb";

interface AhorrosFormProps {
    type: "deposit" | "withdrawal";
    setType: (t: "deposit" | "withdrawal") => void;
    onSubmit: (data: { amount: string; description: string; method: "physical" | "usdt" | "bs" }) => Promise<void>;
    isLoading: boolean;
}

export default function AhorrosForm({ type, setType, onSubmit, isLoading }: AhorrosFormProps) {
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [method, setMethod] = useState<"physical" | "usdt" | "bs">("physical");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({ amount, description, method });
        setAmount("");
        setDescription("");
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 bg-slate-900/50 backdrop-blur-md rounded-[2rem] border border-slate-700/50 shadow-xl transition-all">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <FiDollarSign className="text-amber-500" /> Nuevo Movimiento
            </h2>

            <div className="flex gap-4 mb-6">
                <button
                    type="button"
                    onClick={() => setType("deposit")}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        type === "deposit"
                            ? "bg-amber-500/20 text-amber-500 border border-amber-500/50"
                            : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50"
                    }`}
                >
                    Depositar
                </button>
                <button
                    type="button"
                    onClick={() => setType("withdrawal")}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        type === "withdrawal"
                            ? "bg-red-500/20 text-red-500 border border-red-500/50"
                            : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50"
                    }`}
                >
                    Retirar
                </button>
            </div>

            <div className="space-y-5">
                <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1.5">Moneda/Método</label>
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            type="button"
                            onClick={() => setMethod("physical")}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                method === "physical"
                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                    : "bg-slate-800 border-slate-700 hover:bg-slate-700/50 text-slate-400"
                            }`}
                        >
                            <FiBriefcase className="text-xl mb-1" />
                            <span className="text-xs font-semibold">USD Físico</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMethod("usdt")}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                method === "usdt"
                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                    : "bg-slate-800 border-slate-700 hover:bg-slate-700/50 text-slate-400"
                            }`}
                        >
                            <SiTether className="text-xl mb-1" />
                            <span className="text-xs font-semibold">USDT</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMethod("bs")}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                method === "bs"
                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                    : "bg-slate-800 border-slate-700 hover:bg-slate-700/50 text-slate-400"
                            }`}
                        >
                            <TbCoinFilled className="text-xl mb-1 text-blue-400" />
                            <span className="text-xs font-semibold">Bolívares</span>
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1.5">
                        Monto <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="text-slate-500 font-bold">$</span>
                        </div>
                        <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full pl-10 bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                            placeholder="0.00"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1.5">Descripción</label>
                    <input
                        type="text"
                        maxLength={50}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                        placeholder="Motivo del ahorro (opcional)"
                        disabled={isLoading}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 py-3.5 rounded-xl font-bold font-montserrat shadow-lg border border-amber-400/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                >
                    {isLoading ? (
                        "Procesando..."
                    ) : (
                        <>
                            <FiPlus className="text-xl" /> Guardar
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
