"use client";

import { useState } from "react";
import { FiDollarSign, FiPlus, FiBriefcase, FiFileText, FiSave, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { SiTether } from "react-icons/si";
import { TbCoinFilled } from "react-icons/tb";
import { motion } from "framer-motion";
import Input from "../ui/forms/Input";

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
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-4 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="hidden md:flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 ring-4 ring-amber-500/5">
                        <FiDollarSign size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight">
                            Registro de Ahorros
                        </h2>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                {/* Type Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-sm shadow-inner relative z-10">
                    <div className="relative flex w-full col-span-2">
                        <motion.div
                            layout
                            className={`absolute top-1 h-[calc(100%-8px)] rounded-xl border shadow-[0_0_15px_rgba(0,0,0,0.25)] ${
                                type === "deposit"
                                    ? "left-[4px] w-[calc(50%-6px)] bg-amber-500/15 border-amber-500/30"
                                    : "left-[calc(50%+2px)] w-[calc(50%-6px)] bg-red-500/15 border-red-500/30"
                            }`}
                            transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        />
                        <button
                            type="button"
                            onClick={() => setType("deposit")}
                            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all duration-300 text-xs md:text-sm ${
                                type === "deposit"
                                    ? "text-amber-300 font-extrabold"
                                    : "text-slate-500 hover:text-slate-300"
                            }`}
                            disabled={isLoading}
                        >
                            <FiTrendingUp className={type === "deposit" ? "text-amber-300" : ""} /> Depositar
                        </button>
                        <button
                            type="button"
                            onClick={() => setType("withdrawal")}
                            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all duration-300 text-xs md:text-sm ${
                                type === "withdrawal"
                                    ? "text-red-300 font-extrabold"
                                    : "text-slate-500 hover:text-slate-300"
                            }`}
                            disabled={isLoading}
                        >
                            <FiTrendingDown className={type === "withdrawal" ? "text-red-300" : ""} /> Retirar
                        </button>
                    </div>
                </div>

                {/* Moneda / Método Selector (Bento Grid) */}
                <div className="pt-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400/80 mb-2.5 ml-0.5">
                        Moneda / Método
                    </label>
                    <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950/40 rounded-2xl border border-slate-800/60 shadow-inner">
                        {[
                            { id: "physical", label: "USD Físico", icono: FiBriefcase, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                            { id: "usdt", label: "USDT Tether", icono: SiTether, color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
                            { id: "bs", label: "Bolívares", icono: TbCoinFilled, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" }
                        ].map((opt) => {
                            const IconoOpt = opt.icono;
                            const esActivo = method === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setMethod(opt.id as any)}
                                    disabled={isLoading}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-300 min-h-[56px] ${
                                        esActivo
                                            ? "bg-slate-800 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-2 ring-amber-500/10"
                                            : "bg-slate-900/30 border-slate-800/80 hover:bg-slate-800/20 text-slate-400 hover:text-slate-300"
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-lg transition-colors duration-300 mb-1 ${
                                        esActivo ? opt.color : "bg-slate-950/60 text-slate-500 border border-slate-800/40"
                                    }`}>
                                        <IconoOpt size={16} />
                                    </div>
                                    <span className={`text-[10px] block truncate font-black tracking-tight ${
                                        esActivo ? "text-white" : "text-slate-400"
                                    }`}>{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Amount Input */}
                <div className="relative">
                    <Input
                        label="Monto"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        icon={<FiDollarSign />}
                        placeholder="0.00"
                        disabled={isLoading}
                    />
                </div>

                {/* Description Input */}
                <div>
                    <Input
                        label="Descripción"
                        type="text"
                        maxLength={50}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        icon={<FiFileText />}
                        placeholder="Motivo del ahorro (opcional)"
                        disabled={isLoading}
                    />
                </div>

                {/* Action Button */}
                <motion.button
                    whileHover={{ scale: 1.01, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative group overflow-hidden bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.25)] border border-amber-400/30 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                >
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    {isLoading ? (
                        <span className="w-6 h-6 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin z-10"></span>
                    ) : (
                        <div className="flex items-center space-x-2 z-10 text-shadow-sm">
                            <FiSave size={18} />
                            <span className="tracking-wide uppercase">Guardar Ahorro</span>
                        </div>
                    )}
                </motion.button>
            </form>
        </div>
    );
}
