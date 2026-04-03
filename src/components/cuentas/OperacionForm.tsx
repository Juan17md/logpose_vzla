"use client";

import { useEffect, ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import {
    obtenerSimboloMoneda,
    type MonedaSoportada,
    type TipoOperacion,
    type CuentaBancaria,
} from "@/lib/bankAccounts";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/forms/Select";
import { toast } from "sonner";
import { FiArrowUpRight, FiArrowDownLeft, FiRepeat, FiSave, FiCreditCard, FiInfo } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface OperacionFormValues {
    tipo: TipoOperacion;
    cuentaOrigenId: string;
    cuentaDestinoId: string;
    monto: string;
    comision: string;
    tasaCambio: string;
    descripcion: string;
}

interface OperacionFormProps {
    isOpen: boolean;
    onClose: () => void;
    cuentaPreseleccionada?: CuentaBancaria;
}

export default function OperacionForm({
    isOpen,
    onClose,
    cuentaPreseleccionada,
}: OperacionFormProps) {
    const { cuentas, realizarOperacion, tasasEnBs } = useBankAccounts();
    
    const { control, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm<OperacionFormValues>({
        defaultValues: {
            tipo: "deposito",
            cuentaOrigenId: "",
            cuentaDestinoId: "",
            monto: "",
            comision: "",
            tasaCambio: "",
            descripcion: "",
        }
    });

    const tipo = watch("tipo");
    const cuentaOrigenId = watch("cuentaOrigenId");
    const cuentaDestinoId = watch("cuentaDestinoId");
    const monto = watch("monto");
    const tasaCambio = watch("tasaCambio");

    useEffect(() => {
        if (isOpen) {
            if (cuentaPreseleccionada) {
                setValue("cuentaOrigenId", cuentaPreseleccionada.id);
            }
        } else {
            reset();
        }
    }, [isOpen, cuentaPreseleccionada, setValue, reset]);

    const cuentaOrigen = cuentas.find(c => c.id === cuentaOrigenId);
    const cuentaDestino = cuentas.find(c => c.id === cuentaDestinoId);

    // Detectar si las monedas son diferentes para mostrar campo de tasa
    const monedasDiferentes = tipo === "transferencia" && cuentaOrigen && cuentaDestino && cuentaOrigen.moneda !== cuentaDestino.moneda;

    // Pre-rellenar tasa si aplica (Automágico)
    useEffect(() => {
        if (monedasDiferentes) {
            const origen = cuentaOrigen!.moneda;
            const destino = cuentaDestino!.moneda;

            if (origen === "BS") {
                const tasa = tasasEnBs[destino as keyof typeof tasasEnBs];
                if (tasa) setValue("tasaCambio", (1 / tasa).toFixed(4));
            } else if (destino === "BS") {
                const tasa = tasasEnBs[origen as keyof typeof tasasEnBs];
                if (tasa) setValue("tasaCambio", tasa.toFixed(4));
            } else {
                const tasaOrigenEnBs = tasasEnBs[origen as keyof typeof tasasEnBs];
                const tasaDestinoEnBs = tasasEnBs[destino as keyof typeof tasasEnBs];
                if (tasaOrigenEnBs && tasaDestinoEnBs) {
                    setValue("tasaCambio", (tasaOrigenEnBs / tasaDestinoEnBs).toFixed(4));
                }
            }
        }
    }, [monedasDiferentes, cuentaOrigen, cuentaDestino, tasasEnBs, setValue]);

    const onFormSubmit = async (data: OperacionFormValues) => {
        const montoNum = parseFloat(data.monto);
        if (!montoNum || montoNum <= 0) {
            toast.error("El monto debe ser mayor a 0");
            return;
        }

        if (!data.cuentaOrigenId) {
            toast.error("Selecciona una cuenta");
            return;
        }

        if (data.tipo === "transferencia" && !data.cuentaDestinoId) {
            toast.error("Selecciona una cuenta destino");
            return;
        }

        if (data.tipo === "transferencia" && data.cuentaOrigenId === data.cuentaDestinoId) {
            toast.error("La cuenta origen y destino no pueden ser la misma");
            return;
        }

        try {
            await realizarOperacion({
                cuentaOrigenId: data.cuentaOrigenId,
                tipo: data.tipo,
                monto: montoNum,
                descripcion: data.descripcion || undefined,
                cuentaDestinoId: data.tipo === "transferencia" ? data.cuentaDestinoId : undefined,
                comision: parseFloat(data.comision) || undefined,
                tasaCambio: parseFloat(data.tasaCambio) || undefined,
            });

            const etiquetas: Record<TipoOperacion, string> = {
                deposito: "Depósito registrado con éxito",
                retiro: "Retiro registrado con éxito",
                transferencia: "Transferencia completada",
                pago: "Pago registrado con éxito",
            };
            toast.success(etiquetas[data.tipo]);
            onClose();
            reset();
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : "Error al procesar operación";
            toast.error(mensaje);
        }
    };

    const tipos: { id: TipoOperacion; label: string; icon: any; color: string }[] = [
        { id: "deposito", label: "Depósito", icon: FiArrowUpRight, color: "emerald" },
        { id: "retiro", label: "Retiro", icon: FiArrowDownLeft, color: "red" },
        { id: "transferencia", label: "Transferir", icon: FiRepeat, color: "violet" },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nueva Operación">
            <div className="p-1">
                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
                    {/* Selector de Tipo (Toggle Groups Style) */}
                    <div className="flex p-1 bg-slate-950/40 rounded-2xl border border-white/5 gap-1 shadow-inner md:scale-105 mb-2 mx-auto max-w-sm md:max-w-none">
                        {tipos.map((t) => {
                            const Icon = t.icon;
                            const isActive = tipo === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setValue("tipo", t.id)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                                        isActive 
                                            ? `text-white shadow-lg` 
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div 
                                            layoutId="active-type"
                                            className={cn(
                                                "absolute inset-0 bg-linear-to-r transition-colors duration-500",
                                                t.color === "emerald" ? "from-emerald-600 to-teal-600" :
                                                t.color === "red" ? "from-red-600 to-rose-600" :
                                                "from-violet-600 to-indigo-600"
                                            )}
                                        />
                                    )}
                                    <Icon size={14} className="relative z-10" />
                                    <span className="relative z-10">{t.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                        {/* Cuenta Origen */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 ml-1">
                                {tipo === "transferencia" ? "Desde la cuenta" : "En la cuenta"}
                            </label>
                            <Controller
                                name="cuentaOrigenId"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        label=""
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Seleccionar cuenta..."
                                        options={cuentas.map(c => ({
                                            id: c.id,
                                            value: c.id,
                                            name: c.nombre,
                                            moneda: c.moneda,
                                            saldo: c.saldo
                                        }))}
                                        icon={<FiCreditCard />}
                                        renderOption={(opt) => (
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-bold">{opt.name}</span>
                                                <span className="text-[10px] opacity-60 font-black tabular-nums">
                                                    {obtenerSimboloMoneda(opt.moneda as MonedaSoportada)} {(opt.saldo as number).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                        className="bg-slate-950/40 border-white/5 rounded-2xl py-3.5"
                                    />
                                )}
                            />
                        </div>

                        {/* Cuenta Destino (solo transferencias) */}
                        {tipo === "transferencia" && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2"
                            >
                                <label className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 ml-1">
                                    Hacia la cuenta
                                </label>
                                <Controller
                                    name="cuentaDestinoId"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            label=""
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Seleccionar cuenta destino..."
                                            options={cuentas
                                                .filter(c => c.id !== cuentaOrigenId)
                                                .map(c => ({
                                                    id: c.id,
                                                    value: c.id,
                                                    name: c.nombre,
                                                    moneda: c.moneda,
                                                    saldo: c.saldo
                                                }))}
                                            icon={<FiCreditCard />}
                                            renderOption={(opt) => (
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="font-bold">{opt.name}</span>
                                                    <span className="text-[10px] opacity-60 font-black tabular-nums">
                                                        {obtenerSimboloMoneda(opt.moneda as MonedaSoportada)} {(opt.saldo as number).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                            className="bg-slate-950/40 border-white/5 rounded-2xl py-3.5"
                                        />
                                    )}
                                />
                            </motion.div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Monto */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 ml-1">
                                Importe Operación
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <span className="text-violet-500 font-black text-lg">
                                        {cuentaOrigen ? obtenerSimboloMoneda(cuentaOrigen.moneda) : "$"}
                                    </span>
                                </div>
                                <Controller
                                    name="monto"
                                    control={control}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            placeholder="0.00"
                                            className="w-full pl-14 bg-slate-950/40 border border-white/5 rounded-2xl px-5 py-4 text-white text-xl font-black outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder:text-slate-700"
                                        />
                                    )}
                                />
                            </div>
                            {cuentaOrigen && (tipo === "retiro" || tipo === "transferencia" || tipo === "pago") && (
                                <p className="text-[10px] text-slate-500 mt-1 ml-1 font-bold">
                                    Disponible: <span className="text-white">{obtenerSimboloMoneda(cuentaOrigen.moneda)} {cuentaOrigen.saldo.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</span>
                                </p>
                            )}
                        </div>

                        {/* Comisión (solo transferencias) */}
                        {tipo === "transferencia" && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 ml-1">
                                    Comisión <span className="text-[8px] opacity-50 ml-1">(Opcional)</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <span className="text-slate-600 font-bold">
                                            {cuentaOrigen ? obtenerSimboloMoneda(cuentaOrigen.moneda) : "$"}
                                        </span>
                                    </div>
                                    <Controller
                                        name="comision"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                className="w-full pl-14 bg-slate-950/40 border border-white/5 rounded-2xl px-5 py-4 text-white text-lg font-bold outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder:text-slate-700"
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tasa de Cambio */}
                    <AnimatePresence>
                        {monedasDiferentes && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2 overflow-hidden"
                            >
                                <label className="text-[10px] font-black uppercase tracking-[2px] text-emerald-500 ml-1 flex items-center gap-1.5">
                                    <FiInfo /> Tasa de Cambio <span className="normal-case opacity-60 ml-auto">(1 {cuentaOrigen!.moneda} = ? {cuentaDestino!.moneda})</span>
                                </label>
                                <Controller
                                    name="tasaCambio"
                                    control={control}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="number"
                                            step="0.000001"
                                            min="0.000001"
                                            placeholder="0.0000"
                                            className="w-full bg-slate-950/40 border border-emerald-500/10 rounded-2xl px-5 py-4 text-white text-lg font-black outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                                        />
                                    )}
                                />
                                {monto && tasaCambio && (
                                    <div className="text-[10px] text-emerald-400 mt-2 bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20 flex justify-between items-center">
                                        <span className="font-black uppercase tracking-wider">Recibirá:</span>
                                        <span className="text-sm font-black tabular-nums">
                                            {obtenerSimboloMoneda(cuentaDestino!.moneda)} {(parseFloat(monto) * parseFloat(tasaCambio)).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Descripción */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 ml-1">
                            Motivo o Referencia
                        </label>
                        <Controller
                            name="descripcion"
                            control={control}
                            render={({ field }) => (
                                <input
                                    {...field}
                                    type="text"
                                    placeholder="Escribe una breve descripción..."
                                    maxLength={80}
                                    className="w-full bg-slate-950/40 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder:text-slate-600"
                                />
                            )}
                        />
                    </div>

                    {/* Botón Final */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full relative group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-linear-to-r from-violet-600 to-indigo-600 transition-all group-disabled:opacity-50" />
                        <div className="relative px-6 py-4 flex items-center justify-center gap-3 text-white font-black text-xs uppercase tracking-[3px] transition-transform group-active:scale-[0.98]">
                            {isSubmitting ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <FiSave size={18} />
                                    Confirmar Transacción
                                </>
                            )}
                        </div>
                    </button>
                </form>
            </div>
        </Modal>
    );
}
