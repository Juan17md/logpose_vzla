"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection, serverTimestamp, doc, updateDoc, runTransaction } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { toast } from "sonner";
import { IconType } from "react-icons";
import {
    FiDollarSign,
    FiCalendar,
    FiTag,
    FiFileText,
    FiSave,
    FiTrendingUp,
    FiTrendingDown,
    FiX,
    FiCreditCard,
    FiRefreshCw,
    FiBookOpen,
    FiCoffee,
    FiFilm,
    FiBriefcase,
    FiHome,
    FiGift,
    FiShoppingBag,
    FiHeart,
    FiTool,
    FiMonitor,
    FiRepeat,
    FiTruck,
    FiCircle,
    FiPieChart,
    FiAward,
    FiShield,
    FiScissors,
    FiSmartphone,
    FiEdit2,
    FiInfo
} from "react-icons/fi";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale/es';
import { getBCVRate } from "@/lib/currency";
import { createVenezuelaDate } from "@/lib/timezone";
import { useEditTransaction } from "@/contexts/EditTransactionContext";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { useCategorias, MAPA_ICONOS } from "@/contexts/CategoriesContext";
import { obtenerSimboloMoneda, convertirMontoParaCuenta, calcularTasaConversion } from "@/lib/bankAccounts";
import { parseNumeroFlexible } from "@/lib/number";
import { calcularComision } from "@/lib/comisiones";
import Input from "../ui/forms/Input";
import Textarea from "../ui/forms/Textarea";
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

const transactionSchema = z.object({
    amount: z.string().min(1, "El monto es obligatorio"),
    description: z.string().optional(),
    category: z.string().min(1, "La categoría es obligatoria"),
    subcategory: z.string().optional(),
    customCategory: z.string().optional(),
    date: z.date(),
    type: z.enum(["ingreso", "gasto", "transferencia"]),
    currency: z.enum(["USD", "VES"]),
    exchangeRate: z.string().optional(),
    vesAmount: z.string().optional(),
    accountId: z.string().min(1, "Debes seleccionar una cuenta"),
    targetAccountId: z.string().optional(),
    hasCommission: z.boolean().optional(),
    commissionType: z.enum(["p2p", "p2c", "interbancaria", "custom"]).optional(),
    commissionAmount: z.string().optional(),
    vesCommissionAmount: z.string().optional(),
    tasaCambio: z.string().optional(),
    montoDestino: z.string().optional(),
}).refine(data => {
    if (data.type === "transferencia" && !data.targetAccountId) {
        return false;
    }
    return true;
}, {
    message: "Debes seleccionar una cuenta destino",
    path: ["targetAccountId"],
}).refine(data => {
    if (data.type === "transferencia" && data.accountId === data.targetAccountId) {
        return false;
    }
    return true;
}, {
    message: "La cuenta origen y destino deben ser distintas",
    path: ["targetAccountId"],
}).refine(data => {
    if (data.category === "Otra" && (!data.customCategory || data.customCategory.trim() === "")) {
        return false;
    }
    return true;
}, {
    message: "Especifica la categoría",
    path: ["customCategory"],
}).refine(data => {
    if (data.hasCommission && data.currency === "USD" && (!data.commissionAmount || parseNumeroFlexible(data.commissionAmount) <= 0)) {
        return false;
    }
    if (data.hasCommission && data.currency === "VES" && (!data.vesCommissionAmount || parseNumeroFlexible(data.vesCommissionAmount) <= 0)) {
        return false;
    }
    return true;
}, {
    message: "Monto requerido",
    path: ["commissionAmount"],
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export default function TransactionForm() {
    const { transactionToEdit, clearEditing } = useEditTransaction();
    const { cuentas, tasasEnBs } = useBankAccounts();
    const { categorias: categoriasUsuario } = useCategorias();
    const [loading, setLoading] = useState(false);
    const [rate, setRate] = useState<number>(0);

    const { control, handleSubmit, watch, setValue, reset, setError, formState: { errors } } = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            amount: "",
            description: "",
            category: "",
            subcategory: "",
            customCategory: "",
            date: createVenezuelaDate(),
            type: "gasto",
            currency: "VES",
            exchangeRate: "",
            vesAmount: "",
            accountId: "",
            targetAccountId: "",
            hasCommission: false,
            commissionType: "p2p",
            commissionAmount: "",
            vesCommissionAmount: "",
            tasaCambio: "",
            montoDestino: "",
        }
    });

    const type = watch("type");
    const currency = watch("currency");
    const amount = watch("amount");
    const vesAmount = watch("vesAmount");
    const exchangeRate = watch("exchangeRate");
    const category = watch("category");
    const subcategory = watch("subcategory");
    const hasCommission = watch("hasCommission");
    const commissionType = watch("commissionType");
    const commissionAmount = watch("commissionAmount");
    const vesCommissionAmount = watch("vesCommissionAmount");
    const currentAccountId = watch("accountId");
    const targetAccountId = watch("targetAccountId");
    const tasaCambio = watch("tasaCambio");
    const montoDestino = watch("montoDestino");

    // Ref para evitar bucles en la sincronización bidireccional monto ↔ montoDestino
    const sincronizandoDestino = useRef(false);

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

    // Populate form if editing
    useEffect(() => {
        if (transactionToEdit) {
            reset({
                amount: parseFloat(transactionToEdit.amount.toFixed(2)).toString(),
                description: transactionToEdit.description || "",
                category: transactionToEdit.category || "",
                subcategory: transactionToEdit.subcategory || "",
                customCategory: "",
                date: new Date(transactionToEdit.date),
                type: transactionToEdit.type,
                currency: transactionToEdit.currency || "USD",
                exchangeRate: transactionToEdit.exchangeRate ? parseFloat(transactionToEdit.exchangeRate.toFixed(2)).toString() : rate.toString(),
                vesAmount: transactionToEdit.currency === "VES" && transactionToEdit.originalAmount
                    ? parseFloat(transactionToEdit.originalAmount.toFixed(2)).toString()
                    : "",
                hasCommission: false,
                commissionType: "p2p",
                commissionAmount: "",
                vesCommissionAmount: "",
                tasaCambio: "",
                montoDestino: "",
                targetAccountId: "",
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

    // Efecto para desactivar comisiones en ingresos y forzar P2P por defecto en gastos/transferencias
    useEffect(() => {
        if (type === "ingreso") {
            setValue("hasCommission", false);
            setValue("commissionAmount", "");
            setValue("vesCommissionAmount", "");
        } else if (type === "gasto" || type === "transferencia") {
            const currentType = watch("commissionType");
            if (!currentType) {
                setValue("commissionType", "p2p");
            }
        }
    }, [type, setValue, watch]);

    // Efecto para forzar una categoría válida al cambiar el tipo de transacción
    useEffect(() => {
        if (transactionToEdit) return; // No sobreescribir al editar
        if (type === "transferencia") {
            setValue("category", "Transferencias");
            return;
        }
        const filtradas = categoriasUsuario.filter(c => {
            if (type === "gasto") return c.tipo === "gasto" || c.tipo === "ambas";
            if (type === "ingreso") return c.tipo === "ingreso" || c.tipo === "ambas";
            return false;
        });
        if (filtradas.length > 0) {
            const esValida = filtradas.some(c => c.nombre === category);
            if (!esValida) {
                setValue("category", filtradas[0].nombre);
            }
        } else {
            setValue("category", "");
        }
    }, [type, categoriasUsuario, category, setValue, transactionToEdit]);

    // Efecto para auto-seleccionar la primera subcategoría al cambiar de categoría principal
    useEffect(() => {
        if (!category) {
            setValue("subcategory", "");
            return;
        }
        const cat = categoriasUsuario.find(c => c.nombre === category);
        if (cat && cat.subcategorias.length > 0) {
            const subActual = watch("subcategory");
            if (!cat.subcategorias.includes(subActual || "")) {
                setValue("subcategory", cat.subcategorias[0]);
            }
        } else {
            setValue("subcategory", "");
        }
    }, [category, categoriasUsuario, setValue, watch]);

    // Calculate USD from VES
    useEffect(() => {
        if (currency === "VES" && vesAmount && exchangeRate) {
            const v = parseNumeroFlexible(vesAmount);
            const r = parseNumeroFlexible(exchangeRate);
            if (!isNaN(v) && !isNaN(r) && r > 0) {
                setValue("amount", (v / r).toFixed(2));
            }
        }
    }, [currency, vesAmount, exchangeRate, setValue]);

    // Calculate USD from VES for commission
    useEffect(() => {
        if (commissionType === "custom" && currency === "VES" && vesCommissionAmount && exchangeRate) {
            const v = parseNumeroFlexible(vesCommissionAmount);
            const r = parseNumeroFlexible(exchangeRate);
            if (!isNaN(v) && !isNaN(r) && r > 0) {
                setValue("commissionAmount", (v / r).toFixed(2));
            }
        }
    }, [currency, vesCommissionAmount, exchangeRate, commissionType, setValue]);

    // Cálculo automático de la comisión en base a commissionType y montos principales
    useEffect(() => {
        if (!hasCommission || !commissionType || commissionType === "custom") return;

        const tasa = parseNumeroFlexible(exchangeRate || "1") || rate || 1;
        const montoPrincipal = currency === "VES" ? vesAmount : amount;
        
        const { vesAmount: calculatedVES, usdAmount: calculatedUSD } = calcularComision(
            montoPrincipal || "0",
            currency,
            commissionType,
            tasa
        );

        if (calculatedVES > 0) {
            setValue("vesCommissionAmount", calculatedVES.toString());
            setValue("commissionAmount", calculatedUSD.toString());
        } else {
            setValue("vesCommissionAmount", "");
            setValue("commissionAmount", "");
        }
    }, [hasCommission, commissionType, currency, amount, vesAmount, exchangeRate, rate, setValue]);

    // Detectar si las monedas de origen y destino son diferentes
    const cuentaOrigen = cuentas.find(c => c.id === currentAccountId);
    const cuentaDestino = cuentas.find(c => c.id === targetAccountId);
    const monedasDiferentes = type === "transferencia" && cuentaOrigen && cuentaDestino && cuentaOrigen.moneda !== cuentaDestino.moneda;

    // Auto-calcular tasaCambio cuando las monedas son diferentes
    useEffect(() => {
        if (monedasDiferentes) {
            const tasa = calcularTasaConversion(cuentaOrigen!.moneda, cuentaDestino!.moneda, tasasEnBs);
            if (tasa > 0) {
                setValue("tasaCambio", tasa.toFixed(4));
            }
        } else {
            setValue("tasaCambio", "");
            setValue("montoDestino", "");
        }
    }, [monedasDiferentes, cuentaOrigen?.moneda, cuentaDestino?.moneda, tasasEnBs, setValue]);

    // Sincronizar monto → montoDestino cuando cambia el monto origen
    useEffect(() => {
        if (sincronizandoDestino.current) {
            sincronizandoDestino.current = false;
            return;
        }
        if (!monedasDiferentes || !amount || !tasaCambio) return;
        const montoUSD = parseNumeroFlexible(amount);
        const tasa = parseNumeroFlexible(tasaCambio);
        if (!isNaN(montoUSD) && !isNaN(tasa) && tasa > 0) {
            setValue("montoDestino", (montoUSD * tasa).toFixed(4));
        }
    }, [amount, monedasDiferentes, tasaCambio, setValue]);

    const onSubmit = async (data: TransactionFormData) => {
        if (cuentas.length === 0) {
            toast.error("Debes crear una cuenta bancaria antes de registrar movimientos.");
            return;
        }

        // Validación manual de subcategoría requerida
        if (data.type !== "transferencia") {
            const catObj = categoriasUsuario.find(c => c.nombre === data.category);
            if (catObj && catObj.subcategorias.length > 0 && (!data.subcategory || data.subcategory === "")) {
                setError("subcategory", { type: "manual", message: "La subcategoría es obligatoria" });
                return;
            }
        }

        setLoading(true);

        if (!auth.currentUser) {
            toast.error("Debes iniciar sesión");
            setLoading(false);
            return;
        }

        try {
            const finalCategory = data.category === "Otra" ? data.customCategory!.trim() : data.category;

            const transactionData = {
                amount: parseNumeroFlexible(data.amount),
                type: data.type,
                category: data.type === "transferencia" ? "Transferencias" : finalCategory,
                subcategory: data.type === "transferencia" ? "" : (data.subcategory || ""),
                description: data.description || "",
                date: data.date,
                currency: data.currency,
                originalAmount: data.currency === "VES" ? parseNumeroFlexible(data.vesAmount || "0") : parseNumeroFlexible(data.amount),
                exchangeRate: parseNumeroFlexible(data.exchangeRate) || rate || 1,
                accountId: data.accountId,
            };

            const montoUSD = parseNumeroFlexible(data.amount);

            if (data.type === "transferencia") {
                if (!data.targetAccountId) {
                    toast.error("Debes seleccionar una cuenta destino.");
                    setLoading(false);
                    return;
                }
                const cuentaOrigen = cuentas.find(c => c.id === data.accountId);
                const cuentaDestino = cuentas.find(c => c.id === data.targetAccountId);
                if (!cuentaOrigen || !cuentaDestino) {
                    toast.error("Cuentas inválidas.");
                    setLoading(false);
                    return;
                }

                const comisionUSD = data.hasCommission && data.commissionAmount ? parseNumeroFlexible(data.commissionAmount) : 0;
                const comisionVES = data.hasCommission && data.vesCommissionAmount ? parseNumeroFlexible(data.vesCommissionAmount) : 0;

                await runTransaction(db, async (transaction) => {
                    const cuentaOrigenRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", data.accountId);
                    const cuentaDestinoRef = doc(db, "users", auth.currentUser!.uid, "bank_accounts", data.targetAccountId!);
                    
                    const cuentaOrigenDoc = await transaction.get(cuentaOrigenRef);
                    const cuentaDestinoDoc = await transaction.get(cuentaDestinoRef);

                    if (cuentaOrigenDoc.exists() && cuentaDestinoDoc.exists()) {
                        const origenData = cuentaOrigenDoc.data();
                        const destinoData = cuentaDestinoDoc.data();

                        const saldoOrigen = origenData?.saldo || 0;
                        const saldoDestino = destinoData?.saldo || 0;
                        const cuentaOrigenMoneda = origenData?.moneda || "USD";
                        const cuentaDestinoMoneda = destinoData?.moneda || "USD";

                        // Determinar montos según la moneda de la cuenta
                        const montoOrigen = convertirMontoParaCuenta(montoUSD, data.currency, cuentaOrigenMoneda, parseNumeroFlexible(data.exchangeRate), parseNumeroFlexible(data.vesAmount), tasasEnBs);
                        
                        const tasaCambioUsuario = parseNumeroFlexible(data.tasaCambio || "0");
                        let montoDestino: number;
                        if (cuentaOrigenMoneda !== cuentaDestinoMoneda && tasaCambioUsuario > 0) {
                            montoDestino = montoOrigen * tasaCambioUsuario;
                        } else {
                            montoDestino = convertirMontoParaCuenta(montoUSD, data.currency, cuentaDestinoMoneda, parseNumeroFlexible(data.exchangeRate), parseNumeroFlexible(data.vesAmount), tasasEnBs);
                        }

                        const comisionParaOrigen = cuentaOrigenMoneda === "BS" ? comisionVES : comisionUSD;

                        // Validar saldo suficiente
                        if (saldoOrigen < montoOrigen + comisionParaOrigen) {
                            throw new Error("Saldo insuficiente");
                        }

                        transaction.update(cuentaOrigenRef, { saldo: saldoOrigen - montoOrigen - comisionParaOrigen, actualizadoEn: serverTimestamp() });
                        transaction.update(cuentaDestinoRef, { saldo: saldoDestino + montoDestino, actualizadoEn: serverTimestamp() });
                    }

                    // Unica transaccion de transferencia
                    const newTransRef = doc(collection(db, "transactions"));
                    transaction.set(newTransRef, {
                        ...transactionData,
                        userId: auth.currentUser!.uid,
                        type: "transferencia",
                        category: "Transferencias",
                        subcategory: "",
                        description: data.description || `Transferencia a ${cuentaDestino.nombre}`,
                        targetAccountId: data.targetAccountId,
                        period: "mensual",
                        createdAt: serverTimestamp(),
                    });

                    // Comision (origen)
                    if (comisionUSD > 0) {
                        const comisionRef = doc(collection(db, "transactions"));
                        transaction.set(comisionRef, {
                            userId: auth.currentUser!.uid,
                            amount: comisionUSD,
                            type: "gasto",
                            category: "Comisiones",
                            subcategory: "",
                            description: `Comisión de transferencia`,
                            date: data.date,
                            currency: data.currency,
                            originalAmount: data.currency === "VES" ? comisionVES : comisionUSD,
                            exchangeRate: parseNumeroFlexible(data.exchangeRate) || rate || 1,
                            accountId: data.accountId,
                            period: "mensual",
                            createdAt: serverTimestamp(),
                        });
                    }
                });
                toast.success("Transferencia registrada exitosamente.");
                reset({
                    amount: "", description: "", category: "", subcategory: "", customCategory: "",
                    date: createVenezuelaDate(), type: "gasto", currency: "VES",
                    exchangeRate: rate.toFixed(2), vesAmount: "", accountId: data.accountId,
                    targetAccountId: "", hasCommission: false, commissionAmount: "", vesCommissionAmount: "",
                    tasaCambio: "", montoDestino: "",
                });
            } else if (transactionToEdit) {
                // Al editar, ajustar saldo: revertir el anterior y aplicar el nuevo
                const cuentaRef = doc(db, "users", auth.currentUser.uid, "bank_accounts", data.accountId);
                await runTransaction(db, async (transaction) => {
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        let saldo = cuentaDoc.data().saldo || 0;
                        const cuentaMoneda = cuentaDoc.data().moneda || "USD";
                        const tasa = parseNumeroFlexible(data.exchangeRate || "1");

                        // Determinar montos actuales
                        const montoActualParaCuenta = convertirMontoParaCuenta(montoUSD, data.currency, cuentaMoneda, tasa, parseNumeroFlexible(data.vesAmount));

                        // Revertir movimiento anterior si era de la misma cuenta
                        if (transactionToEdit.accountId === data.accountId) {
                            const realMontoAnteriorParaCuenta = convertirMontoParaCuenta(transactionToEdit.amount, transactionToEdit.currency || 'USD', cuentaMoneda, transactionToEdit.exchangeRate, transactionToEdit.originalAmount);

                            if (transactionToEdit.type === "ingreso") saldo -= realMontoAnteriorParaCuenta;
                            else saldo += realMontoAnteriorParaCuenta;
                        }

                        // Aplicar nuevo movimiento
                        if (data.type === "ingreso") saldo += montoActualParaCuenta;
                        else saldo -= montoActualParaCuenta;
                        
                        transaction.update(cuentaRef, { saldo, actualizadoEn: serverTimestamp() });
                    }
                    transaction.update(doc(db, "transactions", transactionToEdit.id), transactionData);
                });
                toast.success("El movimiento ha sido modificado.");
                clearEditing();
            } else {
                // Crear transacción y actualizar saldo de la cuenta en una transacción atómica
                const cuentaRef = doc(db, "users", auth.currentUser.uid, "bank_accounts", data.accountId);
                
                const comisionUSD = data.hasCommission && data.commissionAmount ? parseNumeroFlexible(data.commissionAmount) : 0;
                const comisionVES = data.hasCommission && data.vesCommissionAmount ? parseNumeroFlexible(data.vesCommissionAmount) : 0;

                await runTransaction(db, async (transaction) => {
                    const cuentaDoc = await transaction.get(cuentaRef);
                    if (cuentaDoc.exists()) {
                        const saldo = cuentaDoc.data().saldo || 0;
                        const cuentaMoneda = cuentaDoc.data().moneda || "USD";
                        const tasa = parseNumeroFlexible(data.exchangeRate || "1");

                        const montoParaCuenta = convertirMontoParaCuenta(montoUSD, data.currency, cuentaMoneda, tasa, parseNumeroFlexible(data.vesAmount));
                        
                        const comisionParaCuenta = cuentaMoneda === "BS" ? comisionVES : comisionUSD;

                        const nuevoSaldo = data.type === "ingreso" 
                            ? saldo + montoParaCuenta - comisionParaCuenta 
                            : saldo - montoParaCuenta - comisionParaCuenta;
                        
                        transaction.update(cuentaRef, { saldo: nuevoSaldo, actualizadoEn: serverTimestamp() });
                    }
                    
                    const newTransRef = doc(collection(db, "transactions"));
                    transaction.set(newTransRef, {
                        userId: auth.currentUser!.uid,
                        ...transactionData,
                        period: "mensual",
                        createdAt: serverTimestamp(),
                    });

                    if (comisionUSD > 0) {
                        const comisionRef = doc(collection(db, "transactions"));
                        transaction.set(comisionRef, {
                            userId: auth.currentUser!.uid,
                            amount: comisionUSD,
                            type: "gasto",
                            category: "Comisiones",
                            subcategory: "",
                            description: `Comisión de: ${data.description || data.category}`,
                            date: data.date,
                            currency: data.currency,
                            originalAmount: data.currency === "VES" ? comisionVES : comisionUSD,
                            exchangeRate: parseNumeroFlexible(data.exchangeRate) || rate || 1,
                            accountId: data.accountId,
                            period: "mensual",
                            createdAt: serverTimestamp(),
                        });
                    }
                });
                toast.success("El movimiento se ha registrado correctamente.");

                // Reset form but keep some defaults
                reset({
                    amount: "", description: "", category: "", subcategory: "", customCategory: "",
                    date: createVenezuelaDate(), type: "gasto", currency: "VES",
                    exchangeRate: rate.toFixed(2), vesAmount: "", accountId: data.accountId,
                    targetAccountId: "", hasCommission: false, commissionAmount: "", vesCommissionAmount: "",
                    tasaCambio: "", montoDestino: "",
                });
            }
        } catch (error) {
            console.error(error);
            toast.error("No se pudo guardar el movimiento.");
        } finally {
            setLoading(false);
        }
    };

    // Categorías del usuario filtradas por el tipo (gasto o ingreso)
    const categoriasFiltradas = categoriasUsuario.filter(c => {
        if (type === "gasto") return c.tipo === "gasto" || c.tipo === "ambas";
        if (type === "ingreso") return c.tipo === "ingreso" || c.tipo === "ambas";
        return false;
    });

    const opcionesCategorias = categoriasFiltradas.map(c => {
        const Icono = MAPA_ICONOS[c.icono] || FiCircle;
        return {
            id: c.nombre,
            name: c.nombre,
            value: c.nombre,
            icono: Icono,
            color: c.color
        };
    });

    // Subcategorías de la categoría seleccionada
    const categoriaActiva = categoriasUsuario.find(c => c.nombre === category);
    const tieneSubcategorias = !!(categoriaActiva && categoriaActiva.subcategorias && categoriaActiva.subcategorias.length > 0);
    const opcionesSubcategorias = (categoriaActiva?.subcategorias || []).map(sub => ({
        id: sub,
        name: sub,
        value: sub
    }));

    return (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-4 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="hidden md:flex items-center justify-between mb-8 relative z-10">
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
                                amount: "", description: "", category: "", subcategory: "", customCategory: "",
                                date: createVenezuelaDate(), type: "gasto", currency: "VES",
                                exchangeRate: rate.toFixed(2), vesAmount: "", accountId: "",
                                targetAccountId: "", hasCommission: false, commissionAmount: "", vesCommissionAmount: "",
                                tasaCambio: "", montoDestino: "",
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
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-sm shadow-inner relative z-10">
                    <Controller
                        control={control}
                        name="type"
                        render={({ field }) => (
                            <>
                                <motion.div
                                    layout
                                    className={`absolute top-1 h-[calc(100%-8px)] rounded-xl border shadow-[0_0_15px_rgba(0,0,0,0.25)] ${
                                        field.value === "ingreso"
                                            ? "left-[4px] w-[calc(33.333%-6px)] bg-emerald-500/15 border-emerald-500/30"
                                            : field.value === "gasto"
                                            ? "left-[calc(33.333%+2px)] w-[calc(33.333%-6px)] bg-red-500/15 border-red-500/30"
                                            : "left-[calc(66.666%+0px)] w-[calc(33.333%-6px)] bg-blue-500/15 border-blue-500/30"
                                    }`}
                                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => field.onChange("ingreso")}
                                    className={`relative z-10 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all duration-300 text-xs md:text-sm ${
                                        field.value === "ingreso"
                                            ? "text-emerald-300 font-extrabold"
                                            : "text-slate-500 hover:text-slate-300"
                                    }`}
                                >
                                    <FiTrendingUp className={field.value === "ingreso" ? "text-emerald-300" : ""} /> Ingreso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => field.onChange("gasto")}
                                    className={`relative z-10 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all duration-300 text-xs md:text-sm ${
                                        field.value === "gasto"
                                            ? "text-red-300 font-extrabold"
                                            : "text-slate-500 hover:text-slate-300"
                                    }`}
                                >
                                    <FiTrendingDown className={field.value === "gasto" ? "text-red-300" : ""} /> Gasto
                                </button>
                                <button
                                    type="button"
                                    onClick={() => field.onChange("transferencia")}
                                    className={`relative z-10 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all duration-300 text-xs md:text-sm ${
                                        field.value === "transferencia"
                                            ? "text-blue-300 font-extrabold"
                                            : "text-slate-500 hover:text-slate-300"
                                    }`}
                                >
                                    <FiRefreshCw className={field.value === "transferencia" ? "text-blue-300" : ""} /> Transf.
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
                <div className="z-30 relative flex flex-col gap-3">
                    <Controller
                        control={control}
                        name="accountId"
                        render={({ field }) => (
                            <Select<string>
                                label={type === "transferencia" ? "Cuenta Origen" : "Cuenta"}
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
                                                    {obtenerSimboloMoneda(opcionCuenta.moneda as any)} {opcionCuenta.saldo.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                    {type === "transferencia" && (
                        <Controller
                            control={control}
                            name="targetAccountId"
                            render={({ field }) => (
                                <Select<string>
                                    label="Cuenta Destino"
                                    icon={<FiCreditCard size={14} />}
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    error={errors.targetAccountId}
                                    placeholder="Seleccionar destino..."
                                    options={cuentas.filter(c => c.id !== currentAccountId).map((c): OpcionCuenta => ({
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
                                                        {obtenerSimboloMoneda(opcionCuenta.moneda as any)} {opcionCuenta.saldo.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    )}
                </div>

                {/* Amount & Currency Section (Compact) */}
                <div className="grid grid-cols-12 gap-3 items-end">
                    {/* Currency Toggle */}
                    <div className={currency === "VES" ? "col-span-6" : "col-span-12"}>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Moneda</label>
                        <Controller
                            control={control}
                            name="currency"
                            render={({ field }) => (
                                <div className="flex p-1 bg-slate-900/60 rounded-xl border border-slate-700/50 shadow-inner">
                                    {(["USD", "VES"] as const).map((curr) => (
                                        <button
                                            key={curr}
                                            type="button"
                                            onClick={() => {
                                                field.onChange(curr);
                                                setValue("amount", "");
                                                setValue("vesAmount", "");
                                            }}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${field.value === curr
                                                ? curr === "USD" 
                                                    ? "bg-slate-800 text-emerald-400 border border-emerald-500/20 shadow-md" 
                                                    : "bg-slate-800 text-cyan-400 border border-cyan-500/20 shadow-md"
                                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/10 border border-transparent"
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
                                 initial={{ opacity: 0, scale: 0.95 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 exit={{ opacity: 0, scale: 0.95 }}
                                 className="col-span-6 overflow-hidden"
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
                                             className="text-center py-2 min-h-[40px] text-xs font-semibold"
                                         />
                                     )}
                                 />
                             </motion.div>
                         )}
                    </AnimatePresence>
                    {/* Amount Input */}
                    <div className="col-span-12 relative">
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
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-8.5 right-3 pointer-events-none"
                            >
                                <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                                    ≈ ${amount}
                                </span>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Sección de Transferencia: tasa de cambio y monto destino */}
                <AnimatePresence>
                    {monedasDiferentes && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden"
                        >
                            <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl space-y-3 backdrop-blur-md relative">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl -mr-4 -mt-4 pointer-events-none"></div>

                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                                        <FiRepeat size={14} />
                                    </div>
                                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Conversión de Moneda</span>
                                </div>

                                {/* Tasa de Cambio */}
                                <div>
                                    <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        <span className="flex items-center gap-1">
                                            <FiInfo size={10} />
                                            Tasa de Cambio
                                        </span>
                                        <span className="text-[10px] text-blue-400/70 font-medium">
                                            1 {cuentaOrigen!.moneda} → {cuentaDestino!.moneda}
                                        </span>
                                    </label>
                                    <Controller
                                        control={control}
                                        name="tasaCambio"
                                        render={({ field }) => (
                                            <CustomCurrencyInput
                                                placeholder="0.00"
                                                decimalsLimit={4}
                                                onValueChange={(value) => {
                                                    field.onChange(value || "");
                                                }}
                                                value={field.value || ""}
                                                className="py-2 text-xs font-bold"
                                            />
                                        )}
                                    />
                                </div>

                                {/* Monto que recibe la cuenta destino */}
                                <div>
                                    <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                                        <FiTrendingUp size={12} />
                                        Recibirá {cuentaDestino!.nombre}
                                    </label>
                                    <Controller
                                        control={control}
                                        name="montoDestino"
                                        render={({ field }) => (
                                            <CustomCurrencyInput
                                                placeholder="0.00"
                                                prefix={`${obtenerSimboloMoneda(cuentaDestino!.moneda)} `}
                                                decimalsLimit={2}
                                                onValueChange={(value) => {
                                                    field.onChange(value || "");
                                                    sincronizandoDestino.current = true;
                                                    const montoDest = parseNumeroFlexible(value || "0");
                                                    const tasa = parseNumeroFlexible(tasaCambio || "1");
                                                    if (!isNaN(montoDest) && !isNaN(tasa) && tasa > 0) {
                                                        const montoUSD = montoDest / tasa;
                                                        setValue("amount", montoUSD.toFixed(4));
                                                        if (currency === "VES" && exchangeRate) {
                                                            setValue("vesAmount", (montoUSD * parseNumeroFlexible(exchangeRate)).toFixed(4));
                                                        }
                                                    }
                                                }}
                                                value={field.value || ""}
                                                className="py-2 text-xs font-bold border-emerald-500/20 focus:ring-emerald-500/20"
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Category & Date (Grid) */}
                <div className="grid grid-cols-12 gap-3 items-start">
                    {type !== "transferencia" ? (
                        <>
                            {/* Categoría Principal */}
                            <div className="col-span-6">
                                <Controller
                                    control={control}
                                    name="category"
                                    render={({ field }) => (
                                        <Select
                                            label="Categoría"
                                            options={opcionesCategorias}
                                            value={field.value}
                                            onChange={(val) => {
                                                field.onChange(val);
                                                setValue("subcategory", "");
                                            }}
                                            error={errors.category}
                                            icon={<FiTag size={12} />}
                                            renderOption={(opt) => {
                                                const Icono = opt.icono as IconType;
                                                const color = (opt as any).color || "#8b5cf6";
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40`, borderWidth: 1 }}>
                                                            <Icono size={12} />
                                                        </span>
                                                        <span className="font-semibold text-xs text-slate-100">{opt.name}</span>
                                                    </div>
                                                );
                                            }}
                                            renderValue={(opt) => {
                                                const Icono = opt.icono as IconType;
                                                const color = (opt as any).color || "#8b5cf6";
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40`, borderWidth: 1 }}>
                                                            <Icono size={12} />
                                                        </span>
                                                        <span className="font-semibold text-xs text-slate-100">{opt.name}</span>
                                                    </div>
                                                );
                                            }}
                                        />
                                    )}
                                />
                            </div>

                            {/* Subcategoría (Condicional) */}
                            {tieneSubcategorias && (
                                <div className="col-span-6">
                                    <Controller
                                        control={control}
                                        name="subcategory"
                                        render={({ field }) => (
                                            <Select
                                                label="Subcategoría"
                                                options={opcionesSubcategorias}
                                                value={field.value || ""}
                                                onChange={field.onChange}
                                                error={errors.subcategory}
                                                icon={<FiTag size={12} className="text-violet-400" />}
                                            />
                                        )}
                                    />
                                </div>
                            )}

                            {/* Fecha */}
                            <div className={tieneSubcategorias ? "col-span-12" : "col-span-6"}>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Fecha</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 transition-colors">
                                        <FiCalendar className="text-slate-400 group-focus-within:text-amber-400 transition-colors duration-300" size={14} />
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
                                                className="w-full bg-slate-800/40 backdrop-blur-md border border-slate-700/50 text-white text-sm font-bold rounded-2xl py-4 pl-9 pr-3 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all duration-300 cursor-pointer hover:border-amber-500/30 hover:bg-slate-800/60 shadow-lg"
                                                wrapperClassName="w-full"
                                                calendarClassName="!bg-slate-800 !border-slate-700 !text-white !font-sans !shadow-xl !rounded-2xl overflow-hidden"
                                                dayClassName={() => "hover:!bg-emerald-500 hover:!text-white !text-slate-300 !rounded-lg transition-all"}
                                                weekDayClassName={() => "!text-slate-500 !uppercase !text-[10px] !tracking-wider"}
                                                popperClassName="!z-50"
                                            />
                                        )}
                                    />
                                </div>
                            </div>

                            {category === "Otra" && (
                                <div className="col-span-12 mt-1">
                                    <Controller
                                        control={control}
                                        name="customCategory"
                                        render={({ field }) => (
                                            <Input
                                                placeholder="Especifica la categoría..."
                                                icon={<FiTag className="text-violet-400" size={12} />}
                                                {...field}
                                                error={errors.customCategory}
                                                className="py-2 text-xs"
                                            />
                                        )}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="col-span-12">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Fecha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 transition-colors">
                                    <FiCalendar className="text-slate-400 group-focus-within:text-amber-400 transition-colors duration-300" size={14} />
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
                                            className="w-full bg-slate-800/40 backdrop-blur-md border border-slate-700/50 text-white text-sm font-bold rounded-2xl py-4 pl-9 pr-3 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all duration-300 cursor-pointer hover:border-amber-500/30 hover:bg-slate-800/60 shadow-lg"
                                            wrapperClassName="w-full"
                                            calendarClassName="!bg-slate-800 !border-slate-700 !text-white !font-sans !shadow-xl !rounded-2xl overflow-hidden"
                                            dayClassName={() => "hover:!bg-emerald-500 hover:!text-white !text-slate-300 !rounded-lg transition-all"}
                                            weekDayClassName={() => "!text-slate-500 !uppercase !text-[10px] !tracking-wider"}
                                            popperClassName="!z-50"
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Descripción</label>
                    <Controller
                        control={control}
                        name="description"
                        render={({ field }) => (
                            <Textarea
                                rows={2}
                                {...field}
                                icon={<FiFileText size={14} />}
                                className="min-h-[64px]"
                                placeholder="Detalles opcionales..."
                            />
                        )}
                    />
                </div>

                {/* Commission Section */}
                {!transactionToEdit && (
                    <div className="pt-1">
                        <div className="bg-slate-950/20 border border-slate-800/50 p-4 rounded-3xl space-y-3.5 backdrop-blur-md">
                            <label className="flex items-center gap-3 cursor-pointer group w-fit">
                                <div className="relative flex items-center">
                                    <Controller
                                        control={control}
                                        name="hasCommission"
                                        render={({ field }) => (
                                            <input
                                                type="checkbox"
                                                className="peer sr-only"
                                                checked={field.value}
                                                onChange={(e) => {
                                                    field.onChange(e.target.checked);
                                                    if (!e.target.checked) {
                                                        setValue("commissionAmount", "");
                                                        setValue("vesCommissionAmount", "");
                                                        setValue("commissionType", "custom");
                                                    }
                                                }}
                                            />
                                        )}
                                    />
                                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500 border border-slate-600/50"></div>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-300 transition-colors">¿Incluye comisión?</span>
                            </label>

                            <AnimatePresence>
                                {hasCommission && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-3 overflow-hidden"
                                    >
                                        {/* Botones de Selección Rápida de Comisión */}
                                        <div className="pt-1">
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
                                                Tipo de Comisión (Automática)
                                            </label>
                                            <Controller
                                                control={control}
                                                name="commissionType"
                                                render={({ field }) => (
                                                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/40 rounded-2xl border border-slate-800/60 shadow-inner">
                                                        {[
                                                            { id: "p2p", label: "P2P (0.3%)", desc: "Pago Móvil", icono: FiSmartphone, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                                                            { id: "p2c", label: "P2C (1.5%)", desc: "Comercio", icono: FiShoppingBag, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
                                                            { id: "interbancaria", label: "Interban. (0.3%)", desc: "Otros Bancos", icono: FiRepeat, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
                                                            { id: "custom", label: "Personalizada", desc: "Monto libre", icono: FiEdit2, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" }
                                                        ].map((opt) => {
                                                            const IconoOpt = opt.icono;
                                                            const esActivo = field.value === opt.id;
                                                            return (
                                                                <button
                                                                    key={opt.id}
                                                                    type="button"
                                                                    onClick={() => field.onChange(opt.id)}
                                                                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-300 min-h-[48px] ${
                                                                        esActivo
                                                                            ? "bg-slate-800 border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-2 ring-violet-500/10"
                                                                            : "bg-slate-900/30 border-slate-800/80 hover:bg-slate-800/20 text-slate-400 hover:text-slate-300"
                                                                    }`}
                                                                >
                                                                    <div className={`p-1.5 rounded-lg shrink-0 transition-colors duration-300 ${
                                                                        esActivo ? opt.color : "bg-slate-950/60 text-slate-500 border border-slate-800/40"
                                                                    }`}>
                                                                        <IconoOpt size={14} />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <span className={`text-[10px] sm:text-xs block truncate font-black tracking-tight ${
                                                                            esActivo ? "text-white" : "text-slate-400"
                                                                        }`}>{opt.label}</span>
                                                                        <span className="text-[8px] sm:text-[9px] text-slate-500 font-bold block mt-0.5 truncate">{opt.desc}</span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            />
                                        </div>

                                        {/* Input de la comisión */}
                                        <div className="relative">
                                            <Controller
                                                control={control}
                                                name={currency === "VES" ? "vesCommissionAmount" : "commissionAmount"}
                                                render={({ field }) => (
                                                    <CustomCurrencyInput
                                                        label={
                                                            commissionType !== "custom"
                                                                ? `Comisión Calculada (${currency === "VES" ? "Bs. con mínimo 2.00 Bs." : "Dólares"})`
                                                                : `Comisión Personalizada ${currency === "VES" ? "(Bolívares)" : "(Dólares)"}`
                                                        }
                                                        placeholder="0.00"
                                                        prefix={currency === "VES" ? "Bs. " : "$ "}
                                                        decimalsLimit={2}
                                                        onValueChange={(value) => {
                                                            if (commissionType === "custom") {
                                                                field.onChange(value || "");
                                                            }
                                                        }}
                                                        value={field.value}
                                                        disabled={commissionType !== "custom"}
                                                        error={currency === "VES" ? errors.vesCommissionAmount : errors.commissionAmount}
                                                        className={commissionType !== "custom" ? "bg-slate-800/20 border-slate-700/30 text-slate-400 cursor-not-allowed select-none py-2 text-xs" : "py-2 text-xs"}
                                                    />
                                                )}
                                            />
                                            {currency === "VES" && commissionAmount && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="absolute top-8 right-3 pointer-events-none"
                                                >
                                                    <span className="text-red-400 font-bold text-xs bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/20">
                                                        ≈ ${commissionAmount}
                                                    </span>
                                                </motion.div>
                                            )}
                                        </div>

                                        {/* Indicador informativo de cálculo con mínimos */}
                                        {commissionType !== "custom" && (
                                            <motion.p 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-[9px] text-slate-500 italic ml-1 mt-0.5 flex items-center gap-1"
                                            >
                                                <span>✨</span>
                                                <span>
                                                    Calculado: {commissionType === "p2c" ? "1.50%" : "0.30%"} del monto (mínimo de Bs. 2.00).
                                                </span>
                                            </motion.p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

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
