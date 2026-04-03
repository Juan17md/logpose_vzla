"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
    BANCOS_PREDEFINIDOS,
    MONEDAS_SOPORTADAS,
    COLORES_CUENTA,
    obtenerColorAleatorio,
    type MonedaSoportada,
} from "@/lib/bankAccounts";
import Select from "@/components/ui/forms/Select";
import { FiSave, FiX, FiBriefcase, FiHash } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

interface CuentaFormValues {
    nombre: string;
    banco: string;
    bancoPersonalizado: string;
    moneda: MonedaSoportada;
    saldoInicial: string;
    color: string;
}

interface CuentaFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        nombre: string;
        banco: string;
        moneda: MonedaSoportada;
        saldoInicial: number;
        color: string;
    }) => Promise<void>;
    datosIniciales?: {
        nombre: string;
        banco: string;
        moneda: MonedaSoportada;
        color: string;
    };
    modoEdicion?: boolean;
}

export default function CuentaForm({
    isOpen,
    onClose,
    onSubmit,
    datosIniciales,
    modoEdicion = false,
}: CuentaFormProps) {
    const { control, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm<CuentaFormValues>({
        defaultValues: {
            nombre: datosIniciales?.nombre || "",
            banco: datosIniciales?.banco || "banesco",
            bancoPersonalizado: "",
            moneda: datosIniciales?.moneda || "USD",
            saldoInicial: "",
            color: datosIniciales?.color || obtenerColorAleatorio(),
        }
    });

    const banco = watch("banco");
    const moneda = watch("moneda");
    const color = watch("color");
    const esBancoPersonalizado = banco === "otro";

    useEffect(() => {
        if (isOpen && datosIniciales) {
            reset({
                nombre: datosIniciales.nombre,
                banco: BANCOS_PREDEFINIDOS.some(b => b.nombre === datosIniciales.banco) 
                    ? BANCOS_PREDEFINIDOS.find(b => b.nombre === datosIniciales.banco)?.id 
                    : "otro",
                bancoPersonalizado: !BANCOS_PREDEFINIDOS.some(b => b.nombre === datosIniciales.banco) ? datosIniciales.banco : "",
                moneda: datosIniciales.moneda,
                saldoInicial: "",
                color: datosIniciales.color,
            });
        } else if (!isOpen) {
            reset();
        }
    }, [isOpen, datosIniciales, reset]);

    const onFormSubmit = async (data: CuentaFormValues) => {
        try {
            const bancoSeleccionado = BANCOS_PREDEFINIDOS.find(b => b.id === data.banco);
            const nombreBanco = data.banco === "otro" ? data.bancoPersonalizado : (bancoSeleccionado?.nombre || data.banco);

            await onSubmit({
                nombre: data.nombre || `${nombreBanco} (${data.moneda})`,
                banco: nombreBanco,
                moneda: data.moneda,
                saldoInicial: parseFloat(data.saldoInicial) || 0,
                color: data.color,
            });

            onClose();
            reset();
        } catch (error) {
            console.error("Error al guardar cuenta:", error);
        }
    };

    const etiquetasTipo: Record<string, string> = {
        banco: "🏦 Bancos",
        billetera: "📱 Billeteras Digitales",
        efectivo: "💵 Efectivo",
        otro: "✏️ Personalizado",
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                >
                    <div className="relative">
                        {/* Decorative background glow */}
                        <div 
                            className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[60px] opacity-10 pointer-events-none"
                            style={{ backgroundColor: color }}
                        />

                        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Selector de Banco */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[2px] text-slate-500 ml-1">
                                        <FiBriefcase className="text-violet-500" /> Banco / Billetera
                                    </label>
                                    <Controller
                                        name="banco"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                label=""
                                                value={field.value}
                                                onChange={field.onChange}
                                                showGroups={true}
                                                options={BANCOS_PREDEFINIDOS.map(b => ({
                                                    id: b.id,
                                                    value: b.id,
                                                    name: b.nombre,
                                                    group: etiquetasTipo[b.tipo] || b.tipo
                                                }))}
                                                className="bg-slate-950/40 border-white/5 rounded-2xl py-3.5"
                                            />
                                        )}
                                    />
                                </div>

                                {/* Nombre de la Cuenta */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[2px] text-slate-500 ml-1">
                                        <FiHash className="text-violet-500" /> Nombre Identificador
                                    </label>
                                    <Controller
                                        name="nombre"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="text"
                                                placeholder="Ej: Ahorros Personales"
                                                className="w-full bg-slate-950/40 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder:text-slate-600"
                                            />
                                        )}
                                    />
                                </div>

                                {/* Campo personalizado si selecciona "Otro" */}
                                {esBancoPersonalizado && (
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-[2px] text-slate-500 ml-1">
                                            Nombre del Banco/Billetera Personalizado
                                        </label>
                                        <Controller
                                            name="bancoPersonalizado"
                                            control={control}
                                            rules={{ required: esBancoPersonalizado }}
                                            render={({ field }) => (
                                                <input
                                                    {...field}
                                                    type="text"
                                                    placeholder="Escribe el nombre aquí..."
                                                    className="w-full bg-slate-950/40 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                                                />
                                            )}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Selector de Moneda */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[2px] text-slate-500 ml-1">
                                        Moneda
                                    </label>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {MONEDAS_SOPORTADAS.map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                disabled={modoEdicion}
                                                onClick={() => setValue("moneda", m.id)}
                                                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                                                    moneda === m.id
                                                        ? "bg-violet-500/20 border-violet-500/50 text-white shadow-lg shadow-violet-500/10"
                                                        : modoEdicion 
                                                            ? "bg-slate-950/20 border-white/5 text-slate-600 opacity-50 cursor-not-allowed"
                                                            : "bg-slate-950/40 border-white/5 text-slate-500 hover:border-white/10 hover:bg-slate-950/60"
                                                }`}
                                            >
                                                <span className="text-base font-black">{m.simbolo}</span>
                                                <span className="text-[7px] font-black tracking-tighter uppercase mt-0.5">{m.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Saldo Inicial */}
                                {!modoEdicion && (
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[2px] text-slate-500 ml-1">
                                            Saldo de Apertura
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                <span className="text-violet-500 font-black text-lg">
                                                    {MONEDAS_SOPORTADAS.find(m => m.id === moneda)?.simbolo}
                                                </span>
                                            </div>
                                            <Controller
                                                name="saldoInicial"
                                                control={control}
                                                render={({ field }) => (
                                                    <input
                                                        {...field}
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        className="w-full pl-14 bg-slate-950/40 border border-white/5 rounded-2xl px-5 py-5 text-white text-2xl font-black outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder:text-slate-700"
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Selector de Color y Botones */}
                            <div className="pt-4 border-t border-white/5 space-y-5">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[2px] text-slate-500 ml-1">
                                        Identificador Visual
                                    </label>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {COLORES_CUENTA.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setValue("color", c)}
                                                className={`w-7 h-7 rounded-full transition-all relative ${
                                                    color === c
                                                        ? "scale-110 ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-950 z-10"
                                                        : "hover:scale-105 opacity-40 hover:opacity-100"
                                                }`}
                                                style={{ backgroundColor: c }}
                                            >
                                                {color === c && (
                                                    <motion.div 
                                                        layoutId="color-active"
                                                        className="absolute inset-0 rounded-full bg-white/20"
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {modoEdicion && (
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 px-4 py-3.5 text-slate-400 hover:text-white font-bold text-[10px] uppercase tracking-widest transition-all rounded-xl hover:bg-white/5"
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || (esBancoPersonalizado && !watch("bancoPersonalizado")?.trim())}
                                        className="flex-2 px-6 py-3.5 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all border border-violet-400/30"
                                    >
                                        {isSubmitting ? (
                                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <FiSave size={14} />
                                        )}
                                        {modoEdicion ? "Guardar" : "Crear Cuenta"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
