"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FiSave, FiX, FiCalendar, FiTag, FiFileText, FiDollarSign, FiLayers, FiAlertCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { getBCVRate } from "@/lib/currency";
import { FixedExpense } from "@/hooks/useFixedExpenses";
import Input from "../ui/forms/Input";
import CustomCurrencyInput from "../ui/forms/CurrencyInput";
import Select from "../ui/forms/Select";

const FIXED_CATEGORIES = [
    { id: "Servicios", name: "🔧 Servicios", value: "Servicios" },
    { id: "Hogar", name: "🏠 Hogar", value: "Hogar" },
    { id: "Suscripciones", name: "📺 Suscripciones", value: "Suscripciones" },
    { id: "Deudas", name: "💳 Deudas", value: "Deudas" },
    { id: "Educación", name: "📚 Educación", value: "Educación" },
    { id: "Salud", name: "💊 Salud", value: "Salud" },
    { id: "Transporte", name: "🚗 Transporte", value: "Transporte" },
    { id: "Seguros", name: "🛡️ Seguros", value: "Seguros" },
    { id: "Otros", name: "📌 Otros", value: "Otros" }
];

const fixedExpenseSchema = z.object({
    title: z.string().min(1, "El nombre es obligatorio"),
    amount: z.string().min(1, "El monto es obligatorio"),
    currency: z.enum(["USD", "BS"]),
    category: z.string().min(1, "La categoría es obligatoria"),
    customCategory: z.string().optional(),
    dueDay: z.string().min(1, "El día de pago es obligatorio")
        .refine(val => {
            const num = parseInt(val);
            return num >= 1 && num <= 31;
        }, "Día debe estar entre 1 y 31"),
    description: z.string().optional(),
    exchangeRate: z.string().optional(),
    bsAmount: z.string().optional(),
}).refine(data => {
    if (data.category === "Otros" && (!data.customCategory || data.customCategory.trim() === "")) {
        return false;
    }
    return true;
}, {
    message: "Especifica la categoría",
    path: ["customCategory"],
});

type FixedExpenseFormData = z.infer<typeof fixedExpenseSchema>;

interface FixedExpenseFormProps {
    initialData?: FixedExpense | null;
    onSubmit: (data: Omit<FixedExpense, "id" | "createdAt" | "lastPaidDate">) => Promise<void>;
    onCancel?: () => void;
    isLoading: boolean;
}

export default function FixedExpenseForm({ initialData, onSubmit, onCancel, isLoading }: FixedExpenseFormProps) {
    const [rate, setRate] = useState<number>(0);

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FixedExpenseFormData>({
        resolver: zodResolver(fixedExpenseSchema),
        defaultValues: {
            title: "",
            amount: "",
            currency: "USD",
            category: "Servicios",
            customCategory: "",
            dueDay: "1",
            description: "",
            exchangeRate: "",
            bsAmount: "",
        }
    });

    const currency = watch("currency");
    const amount = watch("amount");
    const bsAmount = watch("bsAmount");
    const exchangeRate = watch("exchangeRate");
    const category = watch("category");
    const title = watch("title");

    // Fetch Rate on Mount
    useEffect(() => {
        getBCVRate().then(r => {
            if (r) {
                const formattedRate = parseFloat(r.toFixed(2));
                setRate(formattedRate);
                setValue("exchangeRate", formattedRate.toFixed(2));
            }
        });
    }, [setValue]);

    // Populate form if initialData exists (editing)
    useEffect(() => {
        if (initialData) {
            const isStandardCategory = FIXED_CATEGORIES.some(c => c.value === initialData.category);
            
            // Si la moneda es BS, el amount en Firestore es USD. 
            // Necesitamos calcular el bsAmount para que el usuario vea el valor en bolívares.
            const calculatedBsAmount = initialData.currency === "BS" && rate > 0 
                ? (initialData.amount * rate).toFixed(2) 
                : "";

            reset({
                title: initialData.title,
                amount: initialData.amount.toString(),
                currency: initialData.currency,
                category: isStandardCategory ? initialData.category : "Otros",
                customCategory: isStandardCategory ? "" : initialData.category,
                dueDay: initialData.dueDay.toString(),
                description: initialData.description || "",
                exchangeRate: rate > 0 ? rate.toFixed(2) : "",
                bsAmount: initialData.currency === "BS" ? (calculatedBsAmount || initialData.amount.toString()) : "",
            });
        } else {
            // Limpiar formulario cuando no hay datos iniciales (creación o limpieza post-guardado)
            reset({
                title: "",
                amount: "",
                currency: "USD",
                category: "Servicios",
                customCategory: "",
                dueDay: "1",
                description: "",
                exchangeRate: rate > 0 ? rate.toFixed(2) : "",
                bsAmount: "",
            });
        }
    }, [initialData, reset, rate]);

    // Smart Category Detection
    useEffect(() => {
        if (initialData) return;

        const lowerTitle = title?.toLowerCase() || "";
        const KEYWORD_MAPPING: Record<string, string[]> = {
            "Servicios": ["luz", "agua", "internet", "cantv", "gas", "aseo", "corpoelec", "hidro", "mantenimiento"],
            "Suscripciones": ["netflix", "spotify", "crunchyroll", "prime", "disney", "hbo", "icloud", "google", "adobe", "suscripcion"],
            "Educación": ["universidad", "colegio", "curso", "diplomado", "clase", "academia", "ingles", "mensualidad"],
            "Salud": ["seguro", "poliza", "medico", "gimnasio", "gym", "crossfit", "terapia", "dentista"],
            "Hogar": ["alquiler", "condominio", "limpieza", "seguridad", "estacionamiento", "parqueadero"],
            "Transporte": ["gasolina", "estacionamiento", "peaje", "seguro auto", "ridery", "uber"],
            "Deudas": ["prestamo", "tarjeta", "credito", "hipoteca", "cuota", "interes"],
            "Seguros": ["seguro", "poliza", "cobertura", "vida", "funerario"]
        };

        for (const [cat, keywords] of Object.entries(KEYWORD_MAPPING)) {
            if (keywords.some(k => lowerTitle.includes(k))) {
                setValue("category", cat);
                break;
            }
        }
    }, [title, setValue, initialData]);

    // Calculate USD from BS
    useEffect(() => {
        if (currency === "BS" && bsAmount && exchangeRate) {
            const v = parseFloat(bsAmount);
            const r = parseFloat(exchangeRate);
            if (!isNaN(v) && !isNaN(r) && r > 0) {
                setValue("amount", (v / r).toFixed(2));
            }
        }
    }, [currency, bsAmount, exchangeRate, setValue]);

    const handleOnSubmit = async (data: FixedExpenseFormData) => {
        const finalCategory = data.category === "Otros" ? data.customCategory!.trim() : data.category;
        
        await onSubmit({
            title: data.title,
            amount: parseFloat(data.amount),
            currency: data.currency,
            category: finalCategory,
            dueDay: parseInt(data.dueDay),
            description: data.description,
        });
    };

    return (
        <div className="relative overflow-hidden w-full">
            <form onSubmit={handleSubmit(handleOnSubmit)} className="space-y-4 relative z-10">


                
                {/* Nombre del Gasto */}
                <Controller
                    control={control}
                    name="title"
                    render={({ field }) => (
                        <Input
                            label="Nombre del Gasto"
                            placeholder="Ej: Internet, Alquiler, Gimnasio"
                            icon={<FiTag />}
                            {...field}
                            error={errors.title}
                        />
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Moneda Toggle */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/80 ml-1">Moneda</label>
                        <Controller
                            control={control}
                            name="currency"
                            render={({ field }) => (
                                <div className="flex p-1 bg-[#0A0E1A]/80 rounded-2xl border border-white/10 shadow-inner h-[46px]">
                                    {(["USD", "BS"] as const).map((curr) => (
                                        <button
                                            key={curr}
                                            type="button"
                                            onClick={() => {
                                                field.onChange(curr);
                                                setValue("amount", "");
                                                setValue("bsAmount", "");
                                            }}
                                            className={`flex-1 py-1 text-[11px] font-black tracking-tighter rounded-lg transition-all duration-300 ${field.value === curr
                                                ? curr === "USD" 
                                                    ? "bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                                                    : "bg-slate-800 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent"
                                                }`}
                                        >
                                            {curr === "BS" ? "BS (VES)" : "USD ($)"}
                                        </button>
                                    ))}
                                </div>
                            )}
                        />
                    </div>

                    {/* Día de Pago */}
                    <div>
                        <Controller
                            control={control}
                            name="dueDay"
                            render={({ field }) => (
                                <Input
                                    label="Día de Pago"
                                    type="number"
                                    min="1"
                                    max="31"
                                    placeholder="Ej: 15"
                                    icon={<FiCalendar className="text-[14px]" />}
                                    rightElement={
                                        <div className="group/info relative cursor-help">
                                            <FiAlertCircle className="text-slate-500 hover:text-violet-400 transition-colors" size={14} />
                                            <div className="absolute bottom-full right-0 mb-3 w-48 p-2 bg-slate-900 border border-slate-700 rounded-xl text-[10px] text-slate-400 opacity-0 group-hover/info:opacity-100 pointer-events-none transition-all shadow-2xl z-50 leading-tight">
                                                Se proyectará en tu flujo de caja este día del mes.
                                            </div>
                                        </div>
                                    }
                                    {...field}
                                    error={errors.dueDay}
                                />
                            )}
                        />
                    </div>
                </div>

                {/* Amount Section */}
                <div className="space-y-4">
                    <AnimatePresence>
                        {currency === "BS" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-3 gap-4"
                            >
                                <div className="col-span-1">
                                    <Controller
                                        control={control}
                                        name="exchangeRate"
                                        render={({ field }) => (
                                            <Input
                                                label="Tasa"
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                                error={errors.exchangeRate}
                                                className="text-center"
                                            />
                                        )}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Controller
                                        control={control}
                                        name="bsAmount"
                                        render={({ field }) => (
                                            <CustomCurrencyInput
                                                label="Monto en Bolívares"
                                                placeholder="0.00"
                                                prefix="Bs. "
                                                decimalsLimit={2}
                                                onValueChange={(value) => field.onChange(value || "")}
                                                value={field.value}
                                                error={errors.bsAmount}
                                            />
                                        )}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="relative">
                        <Controller
                            control={control}
                            name="amount"
                            render={({ field }) => (
                                <CustomCurrencyInput
                                    label={currency === "BS" ? "Equivalente en Dólares" : "Monto en Dólares"}
                                    placeholder="0.00"
                                    prefix="$ "
                                    decimalsLimit={2}
                                    onValueChange={(value) => field.onChange(value || "")}
                                    value={field.value}
                                    error={errors.amount}
                                    disabled={currency === "BS"}
                                />
                            )}
                        />
                        {currency === "BS" && amount && (
                            <div className="absolute top-9 right-4 pointer-events-none">
                                <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                    ≈ ${amount}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Category */}
                <div>
                    <Controller
                        control={control}
                        name="category"
                        render={({ field }) => (
                            <Select
                                label="Categoría"
                                options={FIXED_CATEGORIES}
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.category}
                                icon={<FiLayers />}
                            />
                        )}
                    />
                    <AnimatePresence>
                        {category === "Otros" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            >
                                <Controller
                                    control={control}
                                    name="customCategory"
                                    render={({ field }) => (
                                        <Input
                                            placeholder="Especifica la categoría..."
                                            icon={<FiTag className="text-violet-400" />}
                                            {...field}
                                            error={errors.customCategory}
                                        />
                                    )}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Descripción (Opcional)</label>
                    <div className="relative">
                        <div className="absolute top-4 left-4 pointer-events-none text-slate-400">
                            <FiFileText />
                        </div>
                        <Controller
                            control={control}
                            name="description"
                            render={({ field }) => (
                        <textarea
                                    rows={3}
                                    {...field}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm font-medium rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder:text-slate-600 resize-none hover:border-slate-600 hover:bg-slate-800"
                                    placeholder="Detalles sobre este gasto..."
                                />
                            )}
                        />
                    </div>
                </div>



                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3.5 px-4 rounded-xl font-bold text-[11px] tracking-widest border border-white/5 text-slate-500 hover:bg-slate-800 hover:text-white transition-all uppercase"
                    >
                        CANCELAR
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.02, translateY: -1 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading}
                        className="flex-[1.5] relative group overflow-hidden bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black py-3.5 rounded-xl shadow-lg border border-violet-400/30 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all text-xs tracking-wider"
                    >
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin z-10"></span>
                        ) : (
                            <div className="flex items-center space-x-2 z-10">
                                <FiSave size={16} />
                                <span>GUARDAR GASTO</span>
                            </div>
                        )}
                    </motion.button>
                </div>
            </form>
        </div>
    );
}
