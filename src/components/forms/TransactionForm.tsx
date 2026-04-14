"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection, serverTimestamp, doc, updateDoc, runTransaction } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { toast } from "sonner";
import { FiDollarSign, FiCalendar, FiTag, FiFileText, FiSave, FiTrendingUp, FiTrendingDown, FiX, FiCreditCard } from "react-icons/fi";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale/es';
import { getBCVRate } from "@/lib/currency";
import { createVenezuelaDate } from "@/lib/timezone";
import { useEditTransaction } from "@/contexts/EditTransactionContext";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { obtenerSimboloMoneda } from "@/lib/bankAccounts";
import Input from "../ui/forms/Input";
import CustomCurrencyInput from "../ui/forms/CurrencyInput";
import Select, { SelectOption } from "../ui/forms/Select";
import { motion, AnimatePresence } from "framer-motion";

// Interfaz tipada para las opciones del selector de cuentas
interface OpcionCuenta extends SelectOption<string> {
    moneda: string;
    saldo: number;
    banco: string;
}

registerLocale('es', es);

const CATEGORIES = [
    { id: "Comida", name: "🍕 Comida", value: "Comida" },
    { id: "Deudas", name: "💳 Deudas", value: "Deudas" },
    { id: "Educación", name: "📚 Educación", value: "Educación" },
    { id: "Entretenimiento", name: "🎮 Entretenimiento", value: "Entretenimiento" },
    { id: "Freelance", name: "💼 Trabajo Informal", value: "Trabajo Informal" },
    { id: "Hogar", name: "🏠 Hogar", value: "Hogar" },
    { id: "Inversiones", name: "📈 Inversiones", value: "Inversiones" },
    { id: "Mascotas", name: "🐾 Mascotas", value: "Mascotas" },
    { id: "Regalos", name: "🎁 Regalos", value: "Regalos" },
    { id: "Ropa", name: "👕 Ropa", value: "Ropa" },
    { id: "Salario", name: "💰 Salario", value: "Salario" },
    { id: "Salud", name: "💊 Salud", value: "Salud" },
    { id: "Servicios", name: "🔧 Servicios", value: "Servicios" },
    { id: "Tecnología", name: "💻 Tecnología", value: "Tecnología" },
    { id: "Transferencias", name: "💸 Transferencias", value: "Transferencias" },
    { id: "Transporte", name: "🚗 Transporte", value: "Transporte" },
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
    accountId: z.string().min(1, "Debes seleccionar una cuenta"),
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
    const { cuentas, tasasEnBs } = useBankAccounts();
    const [loading, setLoading] = useState(false);
    const [rate, setRate] = useState<number>(0);

    const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            amount: "",
            description: "",
            category: "Comida",
            customCategory: "",
            date: createVenezuelaDate(),
            type: "gasto",
            currency: "USD",
            exchangeRate: "",
            vesAmount: "",
            accountId: "",
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
                const formattedRate = parseFloat(r.toFixed(2));
                setRate(formattedRate);
                setValue("exchangeRate", formattedRate.toFixed(2));
            }
        });
    }, [setValue]);

    // Precarga desde query params (flujo de pago de gastos fijos)
    useEffect(() => {
        if (transactionToEdit) return; // No precargar si estamos editando
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('precarga') === 'gasto-fijo') {
            const precargaAmount = searchParams.get('amount') || '';
            const precargaCategory = searchParams.get('category') || 'Servicios';
            const precargaDescription = searchParams.get('description') || '';
            const rawCurrency = searchParams.get('currency') || 'USD';
            const precargaMontoBs = searchParams.get('montoBs') || '';

            const isStandardCategory = CATEGORIES.some(c => c.value === precargaCategory);

            reset({
                amount: precargaAmount,
                description: precargaDescription,
                category: isStandardCategory ? precargaCategory : 'Otra',
                customCategory: isStandardCategory ? '' : precargaCategory,
                date: createVenezuelaDate(),
                type: 'gasto',
                currency: rawCurrency === 'BS' ? 'VES' : rawCurrency as 'USD' | 'VES',
                exchangeRate: rate > 0 ? rate.toFixed(2) : '',
                vesAmount: rawCurrency === 'BS' ? precargaMontoBs : '',
                accountId: '',
            });

            // Limpiar URL para evitar re-llenado
            window.history.replaceState({}, '', '/dashboard/movimientos');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rate]);

    // Populate form if editing
    useEffect(() => {
        if (transactionToEdit) {
            const isStandardCategory = CATEGORIES.some(c => c.value === transactionToEdit.category);

            reset({
                amount: parseFloat(transactionToEdit.amount.toFixed(2)).toString(),
                description: transactionToEdit.description || "",
                category: isStandardCategory ? transactionToEdit.category : "Otra",
                customCategory: isStandardCategory ? "" : transactionToEdit.category,
                date: new Date(transactionToEdit.date),
                type: transactionToEdit.type,
                currency: transactionToEdit.currency || "USD",
                exchangeRate: transactionToEdit.exchangeRate ? parseFloat(transactionToEdit.exchangeRate.toFixed(2)).toString() : rate.toString(),
                vesAmount: transactionToEdit.currency === "VES" && transactionToEdit.originalAmount
                    ? parseFloat(transactionToEdit.originalAmount.toFixed(2)).toString()
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
        if (cuentas.length === 0) {
            toast.error("Debes crear una cuenta bancaria antes de registrar movimientos.");
            return;
        }
        setLoading(true);

        if (!auth.currentUser) {
            toast.error("Debes iniciar sesión");
            setLoading(false);
            return;
        }

        try {
            const finalCategory = data.category === "Otra" ? data.customCategory!.trim() : data.category;
            const montoUSD = parseFloat(data.amount);
            const tasaActual = data.currency === "VES" ? parseFloat(data.exchangeRate || "1") : (rate || tasasEnBs.USD || 1);

            // === ANCLA MONETARIA ===
            // montoBs: fuente de verdad inmutable en Bolívares
            const montoBs = data.currency === "VES"
                ? parseFloat(data.vesAmount || "0")
                : montoUSD * tasaActual;

            // montoEnCuenta: monto en la moneda nativa de la cuenta destino
            const cuentaDestino = cuentas.find(c => c.id === data.accountId);
            let montoEnCuenta = montoUSD; // default USD
            if (cuentaDestino) {
                switch (cuentaDestino.moneda) {
                    case "BS": montoEnCuenta = montoBs; break;
                    case "USD": montoEnCuenta = montoUSD; break;
                    case "EUR": montoEnCuenta = tasasEnBs.EUR > 0 ? montoUSD * (tasasEnBs.USD / tasasEnBs.EUR) : montoUSD; break;
                    case "USDT": montoEnCuenta = tasasEnBs.USDT > 0 ? montoUSD * (tasasEnBs.USD / tasasEnBs.USDT) : montoUSD; break;
                }
            }

            const transactionData = {
                amount: montoUSD,
                type: data.type,
                category: finalCategory,
                description: data.description || "",
                date: data.date,
                currency: data.currency,
                originalAmount: data.currency === "VES" ? parseFloat(data.vesAmount || "0") : montoUSD,
                exchangeRate: data.currency === "VES" ? tasaActual : 1,
                accountId: data.accountId,
                // Campos de Ancla Monetaria
                montoBs,
                tasaRegistro: tasaActual,
                montoEnCuenta,
                monedaCuenta: cuentaDestino?.moneda || "USD",
            };

            if (transactionToEdit) {
                // Al editar, ajustar saldo: revertir el anterior y aplicar el nuevo
                const cuentaRef = doc(db, "users", auth.currentUser.uid, "bank_accounts", data.accountId);
                // Ancla Monetaria: usar montoEnCuenta para revertir anterior
                const oldMontoParaSaldo = transactionToEdit.montoEnCuenta ?? transactionToEdit.amount;
                await runTransaction(db, async (transaction) => {
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        let saldo = cuentaDoc.data().saldo || 0;
                        // Revertir movimiento anterior si era de la misma cuenta
                        if (transactionToEdit.accountId === data.accountId) {
                            if (transactionToEdit.type === "ingreso") saldo -= oldMontoParaSaldo;
                            else saldo += oldMontoParaSaldo;
                        }
                        // Aplicar nuevo movimiento con montoEnCuenta
                        if (data.type === "ingreso") saldo += montoEnCuenta;
                        else saldo -= montoEnCuenta;
                        transaction.update(cuentaRef, { saldo, actualizadoEn: serverTimestamp() });
                    }
                    transaction.update(doc(db, "transactions", transactionToEdit.id), transactionData);
                });
                toast.success("El movimiento ha sido modificado.");
                clearEditing();
            } else {
                // Crear transacción y actualizar saldo con montoEnCuenta
                const cuentaRef = doc(db, "users", auth.currentUser.uid, "bank_accounts", data.accountId);
                await runTransaction(db, async (transaction) => {
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        const saldo = cuentaDoc.data().saldo || 0;
                        const nuevoSaldo = data.type === "ingreso" ? saldo + montoEnCuenta : saldo - montoEnCuenta;
                        transaction.update(cuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                    const newTransRef = doc(collection(db, "transactions"));
                    transaction.set(newTransRef, {
                        userId: auth.currentUser!.uid,
                        ...transactionData,
                        period: "mensual",
                        createdAt: serverTimestamp(),
                    });
                });
                toast.success("El movimiento se ha registrado correctamente.");

                // Reset form but keep some defaults
                reset({
                    amount: "", description: "", category: "Comida", customCategory: "",
                    date: createVenezuelaDate(), type: "gasto", currency: "USD",
                    exchangeRate: rate.toFixed(2), vesAmount: "", accountId: data.accountId,
                });
            }
        } catch (error) {
            console.error(error);
            toast.error("No se pudo guardar el movimiento.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-violet-500/10 text-violet-400 rounded-2xl border border-violet-500/20 ring-4 ring-violet-500/5">
                        <FiDollarSign size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight">
                            {transactionToEdit ? "Editar Movimiento" : "Nuevo Movimiento"}
                        </h2>
                    </div>
                </div>
                {transactionToEdit && (
                    <button
                        onClick={() => {
                            clearEditing();
                            reset({
                                amount: "", description: "", category: "Comida", customCategory: "",
                                date: createVenezuelaDate(), type: "gasto", currency: "USD",
                                exchangeRate: rate.toFixed(2), vesAmount: "", accountId: "",
                            });
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
                    >
                        <FiX size={24} />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative z-10">

                {/* Type Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/60 rounded-[1.25rem] border border-slate-800/80 text-sm shadow-inner relative z-10">
                    <Controller
                        control={control}
                        name="type"
                        render={({ field }) => (
                            <>
                                <button
                                    type="button"
                                    onClick={() => field.onChange("ingreso")}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300 ${field.value === "ingreso"
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                                        }`}
                                >
                                    <FiTrendingUp /> Ingreso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => field.onChange("gasto")}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300 ${field.value === "gasto"
                                        ? "bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                                        }`}
                                >
                                    <FiTrendingDown /> Gasto
                                </button>
                            </>
                        )}
                    />
                </div>

                {/* Advertencia de falta de cuentas */}
                {cuentas.length === 0 && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3"
                    >
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 shrink-0">
                            <FiCreditCard size={18} />
                        </div>
                        <div>
                            <p className="text-amber-200 text-sm font-bold">Sin cuentas bancarias</p>
                            <p className="text-amber-500/70 text-xs mt-0.5 leading-relaxed">
                                No puedes registrar movimientos sin una cuenta de destino. Configure una en la sección de cuentas para continuar.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Cuenta Bancaria - OBLIGATORIO */}
                <div className="z-20 relative">
                    <Controller
                        control={control}
                        name="accountId"
                        render={({ field }) => (
                            <Select<string>
                                label="Cuenta"
                                icon={<FiCreditCard size={14} />}
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.accountId}
                                placeholder="Seleccionar cuenta..."
                                options={cuentas.map((c): OpcionCuenta => ({
                                    id: c.id,
                                    value: c.id,
                                    name: c.nombre,
                                    moneda: c.moneda,
                                    saldo: c.saldo,
                                    banco: c.banco
                                }))}
                                renderOption={(opt) => {
                                    const opcionCuenta = opt as OpcionCuenta;
                                    return (
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-100">{opcionCuenta.name}</span>
                                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-700/50">
                                                    {opcionCuenta.moneda}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-amber-500/80 font-medium">
                                                    {obtenerSimboloMoneda(opcionCuenta.moneda as any)} {opcionCuenta.saldo.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[10px] text-slate-500 italic uppercase tracking-tighter">
                                                    • {opcionCuenta.banco}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }}
                                renderValue={(opt) => {
                                    const opcionCuenta = opt as OpcionCuenta;
                                    return (
                                        <div className="flex items-center justify-between w-full pr-2">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="truncate">{opcionCuenta.name}</span>
                                                <span className="text-[10px] text-slate-500 shrink-0">({opcionCuenta.banco})</span>
                                            </div>
                                            <span className="text-amber-500 font-black text-xs shrink-0 bg-amber-500/10 px-2 py-0.5 rounded-lg ml-2">
                                                {obtenerSimboloMoneda(opcionCuenta.moneda as any)} {opcionCuenta.saldo.toLocaleString("es-ES", { maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    );
                                }}
                            />
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
                                    <div className="flex p-1 bg-slate-900/60 rounded-[1.25rem] border border-slate-700/50 shadow-inner">
                                        {(["USD", "VES"] as const).map((curr) => (
                                            <button
                                                key={curr}
                                                type="button"
                                                onClick={() => {
                                                    field.onChange(curr);
                                                    setValue("amount", "");
                                                    setValue("vesAmount", "");
                                                }}
                                                className={`flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all duration-300 ${field.value === curr
                                                    ? curr === "USD" 
                                                        ? "bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                                                        : "bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent"
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
                                        className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm font-medium rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all cursor-pointer hover:border-slate-600 hover:bg-slate-800"
                                        wrapperClassName="w-full"
                                        calendarClassName="!bg-slate-800 !border-slate-700 !text-white !font-sans !shadow-xl !rounded-2xl overflow-hidden"
                                        dayClassName={() => "hover:!bg-emerald-500 hover:!text-white !text-slate-300 !rounded-lg transition-all"}
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
                        <Controller
                            control={control}
                            name="description"
                            render={({ field }) => (
                                <textarea
                                    rows={3}
                                    {...field}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm font-medium rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder:text-slate-600 resize-none hover:border-slate-600 hover:bg-slate-800"
                                    placeholder="Detalles opcionales..."
                                />
                            )}
                        />
                    </div>
                </div>

                {/* Action Button */}
                <motion.button
                    whileHover={{ scale: 1.01, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full relative group overflow-hidden bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-400/30 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                >
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    {loading ? (
                        <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin z-10"></span>
                    ) : (
                        <div className="flex items-center space-x-2 z-10 text-shadow-sm">
                            <FiSave size={18} />
                            <span className="tracking-wide">{transactionToEdit ? "ACTUALIZAR MOVIMIENTO" : "GUARDAR MOVIMIENTO"}</span>
                        </div>
                    )}
                </motion.button>

            </form>
        </div>
    );
}
