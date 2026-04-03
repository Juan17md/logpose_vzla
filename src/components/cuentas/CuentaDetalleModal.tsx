"use client";

import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { obtenerSimboloMoneda, type CuentaBancaria } from "@/lib/bankAccounts";
import Modal from "@/components/ui/Modal";
import BankLogo from "@/components/ui/BankLogo";
import HistorialCuenta from "@/components/cuentas/HistorialCuenta";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { Outfit } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });

interface CuentaDetalleModalProps {
    isOpen: boolean;
    onClose: () => void;
    cuenta: CuentaBancaria | null;
    onEditar: (cuenta: CuentaBancaria) => void;
    onEliminar: (cuenta: CuentaBancaria) => void;
    onNuevaOperacion: (cuenta: CuentaBancaria) => void;
}

export default function CuentaDetalleModal({
    isOpen,
    onClose,
    cuenta,
    onEditar,
    onEliminar,
    onNuevaOperacion,
}: CuentaDetalleModalProps) {
    const { tasas, monedaBase } = useBankAccounts();

    if (!cuenta) return null;

    // Obtener la tasa de la moneda de la cuenta respecto a la moneda base
    // tasas[moneda] devuelve cuánto de la moneda base es 1 unidad de la cuenta
    // Ejemplo: monedaBase=BS, cuenta.moneda=USD => tasas.USD = 36.5 (1 USD = 36.5 BS)
    // Ejemplo: monedaBase=USD, cuenta.moneda=BS => tasas.BS = 0.027 (1 BS = 0.027 USD)
    const tasaRespectoBase = tasas[cuenta.moneda] || 1;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Navegación de Cuenta"
            maxWidth="2xl"
        >
            <div className={cn(outfit.className, "space-y-6")}>
                {/* Header Detail */}
                <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-700/30 p-6 rounded-2xl relative overflow-hidden group">
                    {/* Brillo visual */}
                    <div 
                        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[60px] opacity-[0.08] transition-opacity" 
                        style={{ backgroundColor: cuenta.color }}
                    />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="p-3 rounded-2xl bg-slate-900/80 shadow-2xl border border-slate-700/50 group-hover:scale-105 transition-transform duration-500">
                                <BankLogo bankId={cuenta.banco} size={48} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{cuenta.nombre}</h3>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[2px]">{cuenta.banco}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                                        cuenta.moneda === "USD" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                                        cuenta.moneda === "BS" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                                        "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                    )}>
                                        {cuenta.moneda}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/20 text-right">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[2px] mb-1">Balance Actual</p>
                            <div className="flex items-baseline justify-end gap-2">
                                <span className="text-xl font-bold text-slate-500">{obtenerSimboloMoneda(cuenta.moneda)}</span>
                                <span className="text-4xl font-black text-white tabular-nums tracking-tighter">
                                    {cuenta.saldo.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            {cuenta.moneda !== monedaBase && (
                                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest tabular-nums opacity-60">
                                    {obtenerSimboloMoneda(monedaBase)} {(cuenta.saldo * tasaRespectoBase).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {monedaBase}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => { onClose(); onNuevaOperacion(cuenta); }}
                        className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-900/40 hover:bg-violet-500/10 border border-slate-700/50 hover:border-violet-500/30 rounded-2xl transition-all group"
                    >
                        <div className="p-3 bg-violet-500/10 rounded-xl group-hover:scale-110 transition-all border border-violet-500/20">
                            <FiPlus className="text-violet-400 text-xl" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[2px] text-slate-400 group-hover:text-violet-300">Operación</span>
                    </button>
                    
                    <button
                        onClick={() => { onClose(); onEditar(cuenta); }}
                        className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-900/40 hover:bg-amber-500/10 border border-slate-700/50 hover:border-amber-500/30 rounded-2xl transition-all group"
                    >
                        <div className="p-3 bg-amber-500/10 rounded-xl group-hover:scale-110 transition-all border border-amber-500/20">
                            <FiEdit2 className="text-amber-400 text-xl" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[2px] text-slate-400 group-hover:text-amber-300">Ajustar</span>
                    </button>

                    <button
                        onClick={() => { onClose(); onEliminar(cuenta); }}
                        className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-900/40 hover:bg-red-500/10 border border-slate-700/50 hover:border-red-500/30 rounded-2xl transition-all group"
                    >
                        <div className="p-3 bg-red-500/10 rounded-xl group-hover:scale-110 transition-all border border-red-500/20">
                            <FiTrash2 className="text-red-400 text-xl" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[2px] text-slate-400 group-hover:text-red-300">Vincular</span>
                    </button>
                </div>

                {/* History Section */}
                <div className="space-y-4 max-h-[400px] overflow-hidden flex flex-col">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[4px]">Diario de Navegación</span>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        <HistorialCuenta cuenta={cuenta} />
                    </div>
                </div>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 0.2);
                }
            `}</style>
        </Modal>
    );
}
