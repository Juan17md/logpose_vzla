"use client";

import { obtenerTipoBanco, obtenerSimboloMoneda, type CuentaBancaria } from "@/lib/bankAccounts";
import { FiEdit2, FiTrash2, FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import { useRef } from "react";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import BankLogo from "@/components/ui/BankLogo";
import { cn } from "@/lib/utils";
import { Outfit } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });

interface CuentaCardProps {
    cuenta: CuentaBancaria;
    onEditar: (cuenta: CuentaBancaria) => void;
    onEliminar: (cuenta: CuentaBancaria) => void;
    onVerDetalle: (cuenta: CuentaBancaria) => void;
    compact?: boolean;
}

export default function CuentaCard({
    cuenta,
    onEditar,
    onEliminar,
    onVerDetalle,
    compact = false,
}: CuentaCardProps) {
    const { tasasEnBs, toggleExclusionCuenta } = useBankAccounts();
    const cardRef = useRef<HTMLDivElement>(null);
    const tr = tasasEnBs.USD;
    
    const handleToggleExclusion = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await toggleExclusionCuenta(cuenta.id, !cuenta.excluirDelTotal);
    };
    
    // Tilt Effect (More subtle)
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
    const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);


    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    if (compact) {
        return (
            <button
                onClick={() => onVerDetalle(cuenta)}
                className={cn(
                    outfit.className,
                    "flex items-center gap-3 p-3 bg-slate-800/40 hover:bg-slate-800/60 rounded-xl border border-slate-700/30 transition-all cursor-pointer w-full text-left group"
                )}
            >
                <BankLogo bankId={cuenta.banco} size={24} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{cuenta.nombre}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter font-bold">{cuenta.banco}</p>
                </div>
                <span className={cn(
                    "text-sm font-bold shrink-0",
                    cuenta.excluirDelTotal ? "text-slate-600 line-through" : "text-white"
                )}>
                    {obtenerSimboloMoneda(cuenta.moneda)} {cuenta.saldo.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                </span>
            </button>
        );
    }

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(outfit.className, "group relative h-56 w-full cursor-pointer perspective-1000")}
            onClick={() => onVerDetalle(cuenta)}
        >
            {/* Card Body - Restore slate-900/40 aesthetic from Sidebar */}
            <div className={cn(
                "absolute inset-0 bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl transition-all duration-500 group-hover:border-violet-500/30 group-hover:bg-slate-900/80",
                cuenta.excluirDelTotal && "grayscale opacity-60 contrast-[0.8] bg-slate-950/40"
            )}>
                
                {/* Subtle Brand Glow */}
                <div 
                    className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-all duration-700" 
                    style={{ backgroundColor: cuenta.color }}
                />

                <div 
                    className="relative h-full flex flex-col p-6 z-10"
                    style={{ transform: "translateZ(30px)" }}
                >
                    {/* Header: Logo and Info */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-1 px-1 rounded-full bg-slate-800/50 border border-slate-700/50 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <BankLogo bankId={cuenta.banco} size={36} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-white font-extrabold text-base tracking-tight truncate max-w-[140px]">{cuenta.nombre}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">{cuenta.banco}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {cuenta.excluirDelTotal && (
                                <div className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/50 text-[7px] font-black uppercase text-slate-500 tracking-tighter">
                                    Excluida
                                </div>
                            )}
                            <div className={cn(
                                "px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest",
                                cuenta.moneda === "USD" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                                cuenta.moneda === "BS" ? "bg-violet-500/10 border-violet-500/30 text-violet-400" :
                                "bg-blue-500/10 border-blue-500/30 text-blue-400"
                            )}>
                                {cuenta.moneda}
                            </div>
                        </div>
                    </div>

                    {/* Balance Section */}
                    <div className="flex-1 flex flex-col justify-center">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[2px] mb-1 opacity-60">Balance Disponible</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-slate-500">{obtenerSimboloMoneda(cuenta.moneda)}</span>
                            <p className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter tabular-nums">
                                {cuenta.saldo.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        {cuenta.moneda === "BS" && tr > 0 && (
                            <p className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5 leading-none">
                                <span className="opacity-50 tracking-widest uppercase text-[8px]">Aprox.</span>
                                <span>$ {(cuenta.saldo / tr).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                            </p>
                        )}
                        {cuenta.moneda !== "BS" && tr > 0 && (
                            <p className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5 leading-none">
                                <span className="opacity-50 tracking-widest uppercase text-[8px]">Aprox.</span>
                                <span>Bs. {(cuenta.saldo * tr).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </p>
                        )}
                    </div>

                    {/* Actions Footer */}
                    <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-700/30">
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEditar(cuenta); }}
                                className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700/50"
                            >
                                <FiEdit2 size={12} />
                            </button>
                            <button
                                onClick={handleToggleExclusion}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all border",
                                    cuenta.excluirDelTotal 
                                        ? "bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                                        : "bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700/50"
                                )}
                                title={cuenta.excluirDelTotal ? "Incluir en total" : "Excluir del total"}
                            >
                                {cuenta.excluirDelTotal ? <FiEyeOff size={12} /> : <FiEye size={12} />}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onEliminar(cuenta); }}
                                className="p-2.5 bg-red-500/5 text-red-500/50 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border border-red-500/10"
                            >
                                <FiTrash2 size={12} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest group-hover:text-violet-400 transition-colors">
                            Detalles
                            <div className="p-1 px-1 rounded-full bg-slate-800/80 border border-slate-700/50 group-hover:border-violet-500/30 transition-all">
                                <FiArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
