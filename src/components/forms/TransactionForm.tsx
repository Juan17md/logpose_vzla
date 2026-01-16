"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import Swal from "sweetalert2";
import { FiDollarSign, FiCalendar, FiTag, FiFileText, FiSave, FiTrendingUp, FiTrendingDown, FiX } from "react-icons/fi";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale/es';
import { getBCVRate } from "@/lib/currency";
import { useEditTransaction } from "@/contexts/EditTransactionContext";
import Input from "../ui/forms/Input";
import CustomCurrencyInput from "../ui/forms/CurrencyInput";
import Select from "../ui/forms/Select";
import { motion, AnimatePresence } from "framer-motion";

registerLocale('es', es);

const CATEGORIES = [
    { id: "Comida", name: "🍕 Comida", value: "Comida" },
    { id: "Transporte", name: "🚗 Transporte", value: "Transporte" },
    { id: "Salud", name: "💊 Salud", value: "Salud" },
    { id: "Salario", name: "💰 Salario", value: "Salario" },
    { id: "Entretenimiento", name: "🎮 Entretenimiento", value: "Entretenimiento" },
    { id: "Servicios", name: "🔧 Servicios", value: "Servicios" },
    { id: "Educación", name: "📚 Educación", value: "Educación" },
    { id: "Ropa", name: "👕 Ropa", value: "Ropa" },
    { id: "Hogar", name: "🏠 Hogar", value: "Hogar" },
    { id: "Mascotas", name: "🐾 Mascotas", value: "Mascotas" },
    { id: "Tecnología", name: "💻 Tecnología", value: "Tecnología" },
    { id: "Regalos", name: "🎁 Regalos", value: "Regalos" },
    { id: "Viajes", name: "✈️ Viajes", value: "Viajes" },
    { id: "Inversiones", name: "📈 Inversiones", value: "Inversiones" },
    { id: "Seguros", name: "🛡️ Seguros", value: "Seguros" },
    { id: "Belleza", name: "💄 Belleza", value: "Belleza" },
    { id: "Gym", name: "🏋️ Gym", value: "Gym" },
    { id: "Deudas", name: "💳 Deudas", value: "Deudas" },
    { id: "Freelance", name: "💼 Freelance", value: "Freelance" },
    { id: "Propinas", name: "🤝 Propinas", value: "Propinas" },
    { id: "Transferencias", name: "💸 Transferencias", value: "Transferencias" },
    { id: "Comisiones", name: "📊 Comisiones", value: "Comisiones" },
    { id: "Impuestos", name: "🏛️ Impuestos", value: "Impuestos" },
    { id: "Otra", name: "📌 Otra", value: "Otra" }
];

const transactionSchema = z.object({
    amount: z.string().min(1, "El monto es obligatorio"),
    description: z.string().optional(),
    category: z.string().min(1, "La categoría es obligatoria"),
    customCategory: z.string().optional(),
    date: z.date(),
    type: z.enum(["ingreso", "gasto"]),
    currency: z.enum(["USD", "VES"]),
    exchangeRate: z.string().optional(),
    vesAmount: z.string().optional(),
}).refine(data => {
    if (data.category === "Otra" && (!data.customCategory || data.customCategory.trim() === "")) {
        return false;
    }
    return true;
}, {
    message: "Especifica la categoría",
    path: ["customCategory"],
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export default function TransactionForm() {
    const { transactionToEdit, clearEditing } = useEditTransaction();
    const [loading, setLoading] = useState(false);
    const [rate, setRate] = useState<number>(0);

    const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            amount: "",
            description: "",
            category: "Comida",
            customCategory: "",
            date: new Date(),
            type: "gasto",
            currency: "USD",
            exchangeRate: "",
            vesAmount: "",
        }
    });

    const currency = watch("currency");
    const amount = watch("amount");
    const vesAmount = watch("vesAmount");
    const exchangeRate = watch("exchangeRate");
    const category = watch("category");

    // Fetch Rate on Mount
    useEffect(() => {
        getBCVRate().then(r => {
            if (r) {
                setRate(r);
                setValue("exchangeRate", r.toString());
            }
        });
    }, [setValue]);

    // Populate form if editing
    useEffect(() => {
        if (transactionToEdit) {
            const isStandardCategory = CATEGORIES.some(c => c.value === transactionToEdit.category);

            reset({
                amount: transactionToEdit.amount.toString(),
                description: transactionToEdit.description || "",
                category: isStandardCategory ? transactionToEdit.category : "Otra",
                customCategory: isStandardCategory ? "" : transactionToEdit.category,
                date: new Date(transactionToEdit.date),
                type: transactionToEdit.type,
                currency: transactionToEdit.currency || "USD",
                exchangeRate: transactionToEdit.exchangeRate?.toString() || rate.toString(),
                vesAmount: transactionToEdit.currency === "VES" && transactionToEdit.originalAmount // Assuming logic
                    ? transactionToEdit.originalAmount.toString()
                    : "",
            });
        }
    }, [transactionToEdit, reset, rate]);

    // Smart Category Detection
    const description = watch("description");
    useEffect(() => {
        if (transactionToEdit) return; // Don't auto-change when editing existing one

        const lowerDesc = description?.toLowerCase() || "";

        const KEYWORD_MAPPING: Record<string, string[]> = {
            "Comida": ["mcdonalds", "pizza", "burger", "almuerzo", "cena", "desayuno", "mercado", "comida", "hamburguesa", "sushi", "pan", "restaurant", "cafe", "cocina"],
            "Transporte": ["uber", "taxi", "gasolina", "pasaje", "bus", "metro", "ridery", "yummy rides", "auto", "moto", "transporte"],
            "Servicios": ["luz", "agua", "internet", "cantv", "saldo", "recarga", "netflix", "spotify", "corpoelec", "inter", "digitel", "movistar"],
            "Salud": ["farmacia", "medico", "doctor", "medicina", "pastillas", "consulta", "hospital", "clinica", "terapia"],
            "Salario": ["nomina", "sueldo", "pago", "quincena", "salario", "ingreso"],
            "Entretenimiento": ["cine", "pelicula", "entrada", "juego", "steam", "playstation", "xbox", "nintendo", "concierto", "teatro"],
            "Educación": ["curso", "clase", "universidad", "mensualidad", "libros", "colegio", "escuela", "matricula"],
            "Hogar": ["muebles", "electrodomestico", "lampara", "decoracion", "limpieza", "detergente", "cocina", "cama", "hogar"],
            "Mascotas": ["veterinario", "perrarina", "gatarina", "mascota", "perro", "gato", "alimento", "vacuna"],
            "Tecnología": ["celular", "telefono", "laptop", "computadora", "tablet", "auriculares", "cable", "cargador", "mouse", "teclado"],
            "Regalos": ["regalo", "cumpleaños", "navidad", "aniversario", "detalle", "obsequio"],
            "Viajes": ["hotel", "avion", "vuelo", "hospedaje", "vacaciones", "paseo", "excursion", "turismo"],
            "Inversiones": ["accion", "cripto", "bitcoin", "ethereum", "forex", "bolsa", "inversion", "ahorro"],
            "Seguros": ["seguro", "poliza", "prima", "cobertura"],
            "Belleza": ["peluqueria", "salon", "maquillaje", "cosmetico", "perfume", "manicure", "pedicure", "spa"],
            "Gym": ["gimnasio", "gym", "entrenamiento", "crossfit", "yoga", "piscina", "deporte"],
            "Ropa": ["camisa", "pantalon", "zapatos", "ropa", "vestido", "tienda"],
            "Deudas": ["prestamo", "cuota", "credito", "abono", "deuda", "financiamiento", "pago deuda"],
            "Freelance": ["freelance", "proyecto", "cliente", "trabajo independiente", "comision", "extra", "bolo"],
            "Propinas": ["propina", "tip", "gratificacion", "servicio"],
            "Transferencias": ["transferencia", "envio", "zelle", "paypal", "pago movil", "remesa"],
            "Comisiones": ["comision", "fee", "cargo", "tasa"],
            "Impuestos": ["impuesto", "igtf", "iva", "islr", "tasa", "tributo"],
        };

        for (const [cat, keywords] of Object.entries(KEYWORD_MAPPING)) {
            if (keywords.some(k => lowerDesc.includes(k))) {
                setValue("category", cat);
                break;
            }
        }
    }, [description, setValue, transactionToEdit]);

    // Calculate USD from VES
    useEffect(() => {
        if (currency === "VES" && vesAmount && exchangeRate) {
            const v = parseFloat(vesAmount);
            const r = parseFloat(exchangeRate);
            if (!isNaN(v) && !isNaN(r) && r > 0) {
                setValue("amount", (v / r).toFixed(2));
            }
        }
    }, [currency, vesAmount, exchangeRate, setValue]);

    const onSubmit = async (data: TransactionFormData) => {
        setLoading(true);

        if (!auth.currentUser) {
            Swal.fire("Error", "Debes iniciar sesión", "error");
            setLoading(false);
            return;
        }

        try {
            const finalCategory = data.category === "Otra" ? data.customCategory!.trim() : data.category;

            const transactionData = {
                amount: parseFloat(data.amount),
                type: data.type,
                category: finalCategory,
                description: data.description || "",
                date: data.date,
                currency: data.currency,
                originalAmount: data.currency === "VES" ? parseFloat(data.vesAmount || "0") : parseFloat(data.amount),
                exchangeRate: data.currency === "VES" ? parseFloat(data.exchangeRate || "1") : 1,
            };

            if (transactionToEdit) {
                await updateDoc(doc(db, "transactions", transactionToEdit.id), transactionData);
                Swal.fire({
                    icon: "success", title: "Actualizado", text: "El movimiento ha sido modificado.",
                    timer: 1500, showConfirmButton: false, background: "#1f2937", color: "#fff",
                });
                clearEditing();
            } else {
                await addDoc(collection(db, "transactions"), {
                    userId: auth.currentUser.uid,
                    ...transactionData,
                    period: "mensual",
                    createdAt: serverTimestamp(),
                });
                Swal.fire({
                    icon: "success", title: "Guardado", text: "El movimiento se ha registrado correctamente.",
                    timer: 1500, showConfirmButton: false, background: "#1f2937", color: "#fff",
                });

                // Reset form but keep some defaults
                reset({
                    amount: "", description: "", category: "Comida", customCategory: "",
                    date: new Date(), type: "gasto", currency: "USD",
                    exchangeRate: rate.toString(), vesAmount: ""
                });
            }
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "Error", text: "No se pudo guardar.", background: "#1f2937", color: "#fff" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 md:p-8 rounded-3xl border border-slate-700/50 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <span className="p-3 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-inner">
                        <FiDollarSign size={24} />
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold text-white">
                        {transactionToEdit ? "Editar Movimiento" : "Nuevo Movimiento"}
                    </h2>
                </div>
                {transactionToEdit && (
                    <button
                        onClick={() => {
                            clearEditing();
                            reset({
                                amount: "", description: "", category: "Comida", customCategory: "",
                                date: new Date(), type: "gasto", currency: "USD",
                                exchangeRate: rate.toString(), vesAmount: ""
                            });
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
                    >
                        <FiX size={24} />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">

                {/* Type Toggle */}
                <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950/50 rounded-2xl border border-slate-800/50 text-sm">
                    <Controller
                        control={control}
                        name="type"
                        render={({ field }) => (
                            <>
                                <button
                                    type="button"
                                    onClick={() => field.onChange("ingreso")}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${field.value === "ingreso"
                                        ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                        : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    <FiTrendingUp /> Ingreso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => field.onChange("gasto")}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${field.value === "gasto"
                                        ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/20"
                                        : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    <FiTrendingDown /> Gasto
                                </button>
                            </>
                        )}
                    />
                </div>

                {/* Amount Section */}
                <div className="space-y-4">
                    <div className="flex gap-4">
                        {/* Currency Toggle */}
                        <div className="flex-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Moneda</label>
                            <Controller
                                control={control}
                                name="currency"
                                render={({ field }) => (
                                    <div className="flex p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        {(["USD", "VES"] as const).map((curr) => (
                                            <button
                                                key={curr}
                                                type="button"
                                                onClick={() => {
                                                    field.onChange(curr);
                                                    setValue("amount", "");
                                                    setValue("vesAmount", "");
                                                }}
                                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${field.value === curr
                                                    ? curr === "USD" ? "bg-emerald-500 text-white shadow-md" : "bg-blue-500 text-white shadow-md"
                                                    : "text-slate-400 hover:text-white"
                                                    }`}
                                            >
                                                {curr === "VES" ? "Bs (VES)" : "USD"}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            />
                        </div>
                        {/* Rate Input */}
                        <AnimatePresence>
                            {currency === "VES" && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "33%" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="overflow-hidden"
                                >
                                    <Input
                                        label="Tasa"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        {...control.register("exchangeRate")}
                                        error={errors.exchangeRate}
                                        className="text-center"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="relative">
                        <Controller
                            control={control}
                            name={currency === "VES" ? "vesAmount" : "amount"}
                            render={({ field }) => (
                                <CustomCurrencyInput
                                    label={`Monto ${currency === "VES" ? "(Bolívares)" : "(Dólares)"}`}
                                    placeholder="0.00"
                                    prefix={currency === "VES" ? "Bs. " : "$ "}
                                    decimalsLimit={2}
                                    onValueChange={(value) => field.onChange(value || "")}
                                    value={field.value}
                                    error={currency === "VES" ? errors.vesAmount : errors.amount}
                                />
                            )}
                        />
                        {currency === "VES" && amount && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-9 right-4 pointer-events-none"
                            >
                                <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                    ≈ ${amount}
                                </span>
                            </motion.div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Category */}
                    <div>
                        <Controller
                            control={control}
                            name="category"
                            render={({ field }) => (
                                <Select
                                    label="Categoría"
                                    options={CATEGORIES}
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.category}
                                    icon={<FiTag />}
                                />
                            )}
                        />
                        <AnimatePresence>
                            {category === "Otra" && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                >
                                    <Input
                                        placeholder="Especifica la categoría..."
                                        icon={<FiTag className="text-emerald-400" />}
                                        {...control.register("customCategory")}
                                        error={errors.customCategory}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Fecha</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 transition-colors">
                                <FiCalendar className="text-slate-400 group-focus-within:text-emerald-400" />
                            </div>
                            <Controller
                                control={control}
                                name="date"
                                render={({ field }) => (
                                    <DatePicker
                                        selected={field.value}
                                        onChange={(date: Date | null) => field.onChange(date)}
                                        locale="es"
                                        dateFormat="dd/MM/yyyy"
                                        className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm font-medium rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all cursor-pointer hover:border-slate-600 hover:bg-slate-800"
                                        wrapperClassName="w-full"
                                        calendarClassName="!bg-slate-800 !border-slate-700 !text-white !font-sans !shadow-xl !rounded-2xl overflow-hidden"
                                        dayClassName={(date: Date) => "hover:!bg-emerald-500 hover:!text-white !text-slate-300 !rounded-lg transition-all"}
                                        weekDayClassName={() => "!text-slate-500 !uppercase !text-xs !tracking-wider"}
                                        popperClassName="!z-50"
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Descripción</label>
                    <div className="relative">
                        <div className="absolute top-4 left-4 pointer-events-none text-slate-400">
                            <FiFileText />
                        </div>
                        <textarea
                            rows={3}
                            {...control.register("description")}
                            className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm font-medium rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all placeholder:text-slate-600 resize-none hover:border-slate-600 hover:bg-slate-800"
                            placeholder="Detalles opcionales..."
                        />
                    </div>
                </div>

                {/* Action Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <>
                            <FiSave size={18} />
                            <span>{transactionToEdit ? "ACTUALIZAR MOVIMIENTO" : "GUARDAR MOVIMIENTO"}</span>
                        </>
                    )}
                </motion.button>

            </form>
        </div>
    );
}
