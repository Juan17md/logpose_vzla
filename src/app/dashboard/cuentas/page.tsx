"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { getBCVRate } from "@/lib/currency";
import {
    obtenerSimboloMoneda,
    type CuentaBancaria,
    type MonedaSoportada,
    MONEDAS_SOPORTADAS,
} from "@/lib/bankAccounts";
import CuentaCard from "@/components/cuentas/CuentaCard";
import CuentaForm from "@/components/cuentas/CuentaForm";
import OperacionForm from "@/components/cuentas/OperacionForm";
import HistorialCuenta from "@/components/cuentas/HistorialCuenta";
import CuentaDetalleModal from "@/components/cuentas/CuentaDetalleModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CurrencySelector from "@/components/ui/CurrencySelector";
import { toast } from "sonner";
import { FiPlus, FiCreditCard, FiDollarSign, FiTrendingUp, FiCheck, FiArrowUp } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Inter, Bungee } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });
const bungee = Bungee({ subsets: ["latin"], weight: ["400"] });

export default function CuentasPage() {
    const {
        cuentas,
        loading,
        monedaBase, 
        actualizarMonedaBase, 
        calcularSaldoTotal, 
        apiRates, 
        tasasManuales,
        actualizarTasaManual,
        crearCuenta,
        editarCuenta,
        eliminarCuenta,
    } = useBankAccounts();
    
    // Estado para saber qué tasa estamos viendo/editando en el widget
    const [tasaAModificar, setTasaAModificar] = useState<"USD" | "EUR" | "USDT">("USD");
    const [tempTasa, setTempTasa] = useState("");

    const [mostrarFormCuenta, setMostrarFormCuenta] = useState(false);
    const [mostrarFormOperacion, setMostrarFormOperacion] = useState(false);
    const [cuentaEditando, setCuentaEditando] = useState<CuentaBancaria | null>(null);
    const [cuentaDetalle, setCuentaDetalle] = useState<CuentaBancaria | null>(null);
    const [cuentaEliminar, setCuentaEliminar] = useState<CuentaBancaria | null>(null);
    const [cuentaOperacion, setCuentaOperacion] = useState<CuentaBancaria | undefined>(undefined);

    // Actualizar tempTasa cuando cambie la moneda a modificar o las tasas
    useEffect(() => {
        const manual = tasasManuales[tasaAModificar];
        if (manual) setTempTasa(manual.toFixed(2));
        else {
            const api = tasaAModificar === "USD" ? apiRates.usd : tasaAModificar === "EUR" ? apiRates.eur : apiRates.usdt;
            setTempTasa(api > 0 ? api.toFixed(2) : "");
        }
    }, [tasaAModificar, tasasManuales, apiRates]);

    const handleAplicarTasa = () => {
        const val = parseFloat(tempTasa.replace(",", "."));
        if (isNaN(val) || val <= 0) {
            toast.error("Ingresa una tasa válida");
            return;
        }
        actualizarTasaManual(tasaAModificar, val);
        toast.success(`Tasa ${tasaAModificar} actualizada correctamente`);
    };

    const handleResetearTasa = () => {
        actualizarTasaManual(tasaAModificar, null);
        toast.info(`Usando tasa ${tasaAModificar} oficial`);
    };

    const saldoTotal = useMemo(() => calcularSaldoTotal(), [calcularSaldoTotal, apiRates, tasasManuales, monedaBase]);
    const hasManual = !!tasasManuales[tasaAModificar];

    const handleCrearCuenta = async (data: any) => {
        const id = await crearCuenta(data);
        if (id) toast.success("Cuenta creada exitosamente");
        else toast.error("Error al crear la cuenta");
    };

    const handleEditarCuenta = async (data: any) => {
        if (!cuentaEditando) return;
        const ok = await editarCuenta(cuentaEditando.id, data);
        if (ok) {
            toast.success("Cuenta actualizada");
            setCuentaEditando(null);
        } else toast.error("Error al actualizar");
    };

    const confirmarEliminar = async () => {
        if (!cuentaEliminar) return;
        const ok = await eliminarCuenta(cuentaEliminar.id);
        if (ok) {
            toast.success("Cuenta eliminada");
            if (cuentaDetalle?.id === cuentaEliminar.id) setCuentaDetalle(null);
        } else toast.error("Error al eliminar");
        setCuentaEliminar(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className={cn(inter.className, "space-y-8 pb-32 md:pb-10")}>
            <style>{`
                @keyframes gtext {
                    0%,100% { background-position:0% 50%; }
                    50%     { background-position:100% 50%; }
                }
                .sidebar-grad-text {
                    background: linear-gradient(135deg,#FBBF24,#F59E0B,#CA8A04,#FBBF24);
                    background-size:300% 300%;
                    -webkit-background-clip:text; -webkit-text-fill-color:transparent;
                    background-clip:text;
                    animation: gtext 5s ease infinite;
                }
            `}</style>

            {/* Desktop Banner Header - Matches Gastos Fijos style */}
            <div className="hidden md:block bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform translate-x-10 -translate-y-10">
                    <FiCreditCard className="text-9xl text-violet-400 rotate-12" />
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-r from-violet-500/10 to-transparent pointer-events-none" />

                <div className="relative z-10 grid grid-cols-2 gap-8 items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-[3px]">Gestión Bancaria</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-none mb-3">
                            Mis <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-400 to-indigo-400">Cuentas</span>
                        </h1>
                        <p className="text-slate-400 text-lg font-medium max-w-md">
                            Gestiona tus billeteras y cuentas bancarias con el LogPose Premium.
                        </p>
                    </div>

                    {/* Integrated Total Balance Widget */}
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 backdrop-blur-md relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-[3px]">Capital Consolidado</h4>
                            <div className="flex items-center gap-2 bg-slate-900/40 px-2.5 py-1 rounded-lg border border-slate-700/50">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">Base:</span>
                                <CurrencySelector
                                    value={monedaBase}
                                    onChange={(v) => actualizarMonedaBase(v)}
                                    compact
                                />
                            </div>
                        </div>

                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-xl font-bold text-slate-500">{obtenerSimboloMoneda(monedaBase)}</span>
                            <h3 className="text-4xl font-black text-white tracking-tighter tabular-nums truncate">
                                {saldoTotal.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                        </div>

                        {/* Tasas Quick Control */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex gap-2">
                                {(["USD", "EUR", "USDT"] as const).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setTasaAModificar(m)}
                                        className={cn(
                                            "px-2 py-1 rounded text-[8px] font-black uppercase transition-all",
                                            tasaAModificar === m 
                                                ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" 
                                                : "text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={tempTasa}
                                    onChange={(e) => setTempTasa(e.target.value)}
                                    className="w-16 bg-transparent text-violet-400 text-right font-black outline-none text-[10px]"
                                />
                                <button onClick={handleAplicarTasa} className="text-slate-500 hover:text-violet-400 transition-colors">
                                    <FiCheck size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Header (Simplified) */}
            <header className="md:hidden space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Mis Cuentas</h1>
                        <p className="text-slate-500 text-xs">Gestión Premium</p>
                    </div>
                </div>
                {/* Mobile Total Balance */}
                <div className="bg-slate-900 shadow-xl border border-white/5 p-5 rounded-3xl">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[2px] mb-1">Saldo Total</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-slate-500 font-bold">{obtenerSimboloMoneda(monedaBase)}</span>
                        <span className="text-3xl font-black text-white tabular-nums">
                            {saldoTotal.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </header>

            {/* Desktop Layout Grid - Matches Gastos Fijos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Form (1/3) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="sticky top-6">
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-white flex items-center gap-3">
                                    {cuentaEditando ? (
                                        <><FiCreditCard className="text-amber-400" /> Editar Cuenta</>
                                    ) : (
                                        <><FiPlus className="text-violet-500" /> Nueva Cuenta</>
                                    )}
                                </h2>
                                {cuentaEditando && (
                                    <button
                                        onClick={() => setCuentaEditando(null)}
                                        className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                            
                            <CuentaForm 
                                isOpen={true} 
                                onClose={() => {
                                    setMostrarFormCuenta(false);
                                    setCuentaEditando(null);
                                }} 
                                onSubmit={cuentaEditando ? handleEditarCuenta : handleCrearCuenta}
                                datosIniciales={cuentaEditando || undefined}
                                modoEdicion={!!cuentaEditando}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Cards & History (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Controls & New Operation Action */}
                    <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                                <FiTrendingUp className="text-violet-500 text-xl" />
                            </div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Estado de Carteras</h3>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setCuentaOperacion(undefined); setMostrarFormOperacion(true); }}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-violet-600 to-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all border border-violet-400/30"
                        >
                            <FiDollarSign className="text-sm" />
                            Nuevo Registro
                        </motion.button>
                    </div>

                    {/* Accounts Cards Grid */}
                    <section className="relative">
                        {cuentas.length === 0 ? (
                            <div className="p-12 text-center bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10">
                                <FiCreditCard className="text-5xl text-slate-700 mx-auto mb-6" />
                                <h3 className="text-xl font-bold text-white mb-2">Sin Cuentas</h3>
                                <p className="text-slate-500 text-sm max-w-xs mx-auto">Comienza inicializando una cuenta bancaria o billetera en el panel lateral.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AnimatePresence mode="popLayout">
                                    {cuentas.map((cuenta) => (
                                        <motion.div
                                            key={cuenta.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <CuentaCard
                                                cuenta={cuenta}
                                                onEditar={setCuentaEditando}
                                                onEliminar={setCuentaEliminar}
                                                onVerDetalle={setCuentaDetalle}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </section>

                    {/* Historial Unificado Section */}
                    {cuentas.length > 0 && (
                        <section className="space-y-6 pt-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.4)]" />
                                <h2 className="text-xs font-black text-slate-500 uppercase tracking-[4px]">Historial de Navegación</h2>
                            </div>
                            <HistorialCuenta />
                        </section>
                    )}
                </div>
            </div>

            {/* Global Modals & Dialogs */}
            <OperacionForm
                isOpen={mostrarFormOperacion}
                onClose={() => { setMostrarFormOperacion(false); setCuentaOperacion(undefined); }}
                cuentaPreseleccionada={cuentaOperacion}
            />

            <ConfirmDialog
                isOpen={cuentaEliminar !== null}
                title="Desvincular Cuenta"
                message={`¿Proceder con la desvinculación de "${cuentaEliminar?.nombre}"?`}
                onConfirm={confirmarEliminar}
                onClose={() => setCuentaEliminar(null)}
                type="danger"
            />

            <CuentaDetalleModal
                isOpen={cuentaDetalle !== null}
                onClose={() => setCuentaDetalle(null)}
                cuenta={cuentaDetalle}
                onEditar={setCuentaEditando}
                onEliminar={setCuentaEliminar}
                onNuevaOperacion={(c) => { setCuentaOperacion(c); setMostrarFormOperacion(true); }}
            />
        </div>
    );

}
