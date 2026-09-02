"use client";
/* eslint-disable @typescript-eslint/no-explicit-any -- AI data handling requires dynamic typing */

import { useState, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiMic, FiSend, FiX, FiCpu } from "react-icons/fi";
import { useTransactions } from "@/contexts/TransactionsContext";
import { useDebts } from "@/hooks/useDebts";
import { useGoals } from "@/hooks/useGoals";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useFixedExpenses } from "@/hooks/useFixedExpenses";
import { useUserData } from "@/contexts/UserDataContext";
import { createVenezuelaDate } from "@/lib/timezone";
import { obtenerSimboloMoneda, resolverIdCuenta, obtenerTasaParaMoneda } from "@/lib/bankAccounts";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { parseNumeroFlexible } from "@/lib/number";
import { inferirTransaccionDesdeTexto, mensajePideCuenta } from "@/lib/inferirTransaccionNami";
import { ejecutarConsultaNami } from "@/lib/consultasNami";
import { aplicarCuentaAPendiente, filtrarCuentasParaBotones, esMensajeCorrectivo } from "@/lib/namiPendiente";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";

// ExpensePieChart usa Recharts (~40KB). Lo cargamos de forma diferida dentro del Chatbot
// para que no arrastre ese bundle cuando el componente se monta por primera vez.
const ExpensePieChart = dynamic(() => import("./ExpensePieChart"), {
    ssr: false,
    loading: () => (
        <div className="bg-slate-800/50 rounded-2xl animate-pulse h-48 w-full" aria-hidden="true" />
    ),
});

// Types for Chat
interface SpeechRecognitionResult {
    [index: number]: { transcript: string };
    length: number;
    isFinal: boolean;
}

interface SpeechRecognitionEvent {
    resultIndex: number;
    results: {
        [index: number]: SpeechRecognitionResult;
        length: number;
    };
}

interface SpeechRecognitionError {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionError) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface WindowWithSpeech extends Window {
    SpeechRecognition?: { new(): SpeechRecognition };
    webkitSpeechRecognition?: { new(): SpeechRecognition };
}

type Message = {
    role: "user" | "ai";
    content: string;
    isTransaction?: boolean;
    chartType?: "pie" | "bar";
    pendingTransaction?: any;
};


export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
    const [indicadorTexto, setIndicadorTexto] = useState("Analizando...");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const inputRef = useRef("");
    const isListeningRef = useRef(false);

    const pendingOperationsRef = useRef(false); // Track if operations are in progress
    const isMountedRef = useRef(true);

    // Lifecycle: Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Mantener inputRef sincronizado con input state para acceso en closures de reconocimiento voz
    useEffect(() => {
        inputRef.current = input;
    }, [input]);

    // Hooks
    const { transactions, addTransaction, deleteTransaction, updateTransaction } = useTransactions();
    const { debts, addDebt, deleteDebt, updateDebt, addPayment } = useDebts();
    const { goals, addGoal, addContribution, updateGoal, deleteGoal } = useGoals();
    const { lists, createList, addItem, deleteList, updateListName } = useShoppingLists();
    const { fixedExpenses, addFixedExpense, deleteFixedExpense, updateFixedExpense } = useFixedExpenses();
    const { userData, updateUserData } = useUserData();
    const { apiRates, tasasEnBs, cuentas, calcularSaldoTotal, realizarOperacion } = useBankAccounts();

    // Calcular contexto financiero del usuario
    const userContext = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Transacciones del mes actual
        const monthlyTransactions = transactions.filter(t => {
            const transDate = t.date instanceof Date ? t.date : new Date(t.date);
            return transDate >= startOfMonth;
        });

        // Calcular gastos e ingresos del mes
        const monthlyExpenses = monthlyTransactions
            .filter(t => t.type === 'gasto')
            .reduce((sum, t) => sum + t.amount, 0);

        const monthlyIncome = monthlyTransactions
            .filter(t => t.type === 'ingreso')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = calcularSaldoTotal();

        // Gasto promedio diario
        const daysInMonth = now.getDate();
        const averageDailyExpense = daysInMonth > 0 ? monthlyExpenses / daysInMonth : 0;

        // Última transacción
        const lastTransaction = transactions.length > 0 ? {
            type: transactions[0].type,
            amount: transactions[0].amount,
            category: transactions[0].category,
            id: transactions[0].id
        } : null;

        return {
            balance: parseFloat(balance.toFixed(2)),
            monthlyExpense: parseFloat(monthlyExpenses.toFixed(2)),
            monthlyIncome: parseFloat(monthlyIncome.toFixed(2)),
            averageDailyExpense: parseFloat(averageDailyExpense.toFixed(2)),
            goals: goals.map(g => ({
                name: g.name,
                current: g.currentAmount,
                target: g.targetAmount
            })),
            debts: debts
                .filter(d => !d.isPaid)
                .map(d => {
                    const paid = d.payments?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;
                    return {
                        person: d.personName,
                        amount: parseFloat((d.amount - paid).toFixed(2))
                    };
                }),
            fixedExpenses: fixedExpenses.map((e) => ({
                name: e.title || e.description,
                amount: e.amount,
                dueDay: e.dueDay
            })),
            shoppingLists: lists.map((l) => ({
                name: l.name,
                totalItems: l.items.length,
                pendingItems: l.items.filter((i) => !i.completed).length
            })),
            monthlyBudget: userData.monthlyBudget || 0,
            monthlySalary: userData.monthlySalary || 0,
            topCategories: Object.entries(
                monthlyTransactions
                    .filter(t => t.type === 'gasto')
                    .reduce((acc: Record<string, number>, t) => {
                        acc[t.category] = (acc[t.category] || 0) + t.amount;
                        return acc;
                    }, {})
            )
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .slice(0, 3)
                .map(([category, amount]) => ({ category, amount: parseFloat((amount as number).toFixed(2)) })),

            lastTransaction,
            // 🆕 Análisis Avanzado: Mes Anterior
            previousMonthlyExpense: transactions
                .filter(t => {
                    const tDate = new Date(t.date);
                    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                    return t.type === 'gasto' && tDate >= prevMonthStart && tDate <= prevMonthEnd;
                })
                .reduce((sum, t) => sum + t.amount, 0),
            // 🆕 Capacidad Proactiva: Gastos Próximos (7 días) - Lógica Robusta para Cruce de Mes
            upcomingFixedExpenses: fixedExpenses
                .filter(e => {
                    const today = now.getDate();
                    const dueDay = e.dueDay;
                    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

                    let daysUntilDue = dueDay - today;
                    if (daysUntilDue < 0) {
                        // Si el día de pago es menor a hoy (ej: hoy 28, pago el 2), asumimos mes siguiente
                        daysUntilDue += daysInMonth;
                    }

                    return daysUntilDue >= 0 && daysUntilDue <= 7;
                })
                .map(e => ({
                    name: e.title || e.description,
                    amount: e.amount,
                    dueDay: e.dueDay
                })),
            // 🆕 Cuentas Bancarias
            bankAccounts: cuentas.map(c => ({
                id: c.id,
                nombre: c.nombre,
                banco: c.banco,
                moneda: c.moneda,
                saldo: c.saldo
            })),
            // 🆕 Análisis Avanzado: Tendencias por categoría (mes anterior)
            previousTopCategories: (() => {
                const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                return Object.entries(
                    transactions
                        .filter(t => {
                            const tDate = t.date instanceof Date ? t.date : new Date(t.date);
                            return t.type === 'gasto' && tDate >= prevMonthStart && tDate <= prevMonthEnd;
                        })
                        .reduce((acc: Record<string, number>, t) => {
                            acc[t.category] = (acc[t.category] || 0) + t.amount;
                            return acc;
                        }, {})
                )
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .slice(0, 5)
                    .map(([category, amount]) => ({ category, amount: parseFloat((amount as number).toFixed(2)) }));
            })(),
            // 🆕 Ratio de ahorro (ingreso - gasto / ingreso)
            savingsRatio: monthlyIncome > 0
                ? parseFloat(((monthlyIncome - monthlyExpenses) / monthlyIncome * 100).toFixed(1))
                : 0,
            // 🆕 Proyección de gasto a fin de mes
            projectedMonthlyExpense: daysInMonth > 0
                ? parseFloat(((monthlyExpenses / daysInMonth) * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).toFixed(2))
                : 0
        };
    }, [transactions, userData, goals, debts, fixedExpenses, lists, cuentas]);

    // Debug eliminado: el console.log del userContext generaba overhead
    // de serialización en cada actualización de transacciones/metas/deudas.

    // 🕐 Saludo contextual por hora del día
    const saludoHora = useMemo(() => {
        const hora = new Date().getHours();
        if (hora >= 5 && hora < 12) return "☀️ Buenos días";
        if (hora >= 12 && hora < 18) return "🌤️ Buenas tardes";
        return "🌙 Buenas noches";
    }, []);

    // 🔔 Alertas proactivas para badge y bienvenida
    const alertasProactivas = useMemo(() => {
        const alertas: { tipo: "warning" | "info" | "success"; mensaje: string }[] = [];

        // 1. Presupuesto al límite
        if (userContext.monthlyBudget > 0) {
            const porcentaje = (userContext.monthlyExpense / userContext.monthlyBudget) * 100;
            if (porcentaje >= 100) {
                alertas.push({ tipo: "warning", mensaje: `🚨 Has **superado** tu presupuesto mensual (${porcentaje.toFixed(0)}%).` });
            } else if (porcentaje >= 80) {
                alertas.push({ tipo: "warning", mensaje: `⚠️ Has consumido el **${porcentaje.toFixed(0)}%** de tu presupuesto mensual.` });
            }
        }

        // 2. Pagos fijos próximos
        if (userContext.upcomingFixedExpenses && userContext.upcomingFixedExpenses.length > 0) {
            const cantidad = userContext.upcomingFixedExpenses.length;
            const proximo = userContext.upcomingFixedExpenses[0];
            if (cantidad === 1) {
                alertas.push({ tipo: "info", mensaje: `📅 Tienes un pago próximo: **${proximo.name}** ($${proximo.amount}) para el día ${proximo.dueDay}.` });
            } else {
                alertas.push({ tipo: "info", mensaje: `📅 Tienes **${cantidad} pagos** próximos. El más cercano: **${proximo.name}** ($${proximo.amount}) el día ${proximo.dueDay}.` });
            }
        }

        // 3. Metas cerca de completarse (90%+)
        const metasCercanas = userContext.goals.filter(g => g.target > 0 && (g.current / g.target) >= 0.9 && (g.current / g.target) < 1);
        if (metasCercanas.length > 0) {
            const meta = metasCercanas[0];
            const pct = ((meta.current / meta.target) * 100).toFixed(0);
            alertas.push({ tipo: "success", mensaje: `🎯 ¡Tu meta "**${meta.name}**" está al **${pct}%**! Falta poco para completarla.` });
        }

        // 4. Metas completadas
        const metasCompletadas = userContext.goals.filter(g => g.target > 0 && g.current >= g.target);
        if (metasCompletadas.length > 0) {
            alertas.push({ tipo: "success", mensaje: `🏆 ¡Felicidades! Completaste la meta "**${metasCompletadas[0].name}**".` });
        }

        // 5. Comparación mes anterior
        if (userContext.previousMonthlyExpense > 0 && userContext.monthlyExpense > 0) {
            const diff = ((userContext.monthlyExpense - userContext.previousMonthlyExpense) / userContext.previousMonthlyExpense) * 100;
            if (diff > 20) {
                alertas.push({ tipo: "warning", mensaje: `📈 Llevas un **${diff.toFixed(0)}% más** de gasto que el mes pasado.` });
            } else if (diff < -10) {
                alertas.push({ tipo: "success", mensaje: `📉 ¡Bien! Llevas **${Math.abs(diff).toFixed(0)}% menos** gasto que el mes pasado.` });
            }
        }

        return alertas;
    }, [userContext]);

    // 🤖 Mensaje Proactivo de Bienvenida
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            let bienvenida: string;

            if (alertasProactivas.length > 0) {
                const listaAlertas = alertasProactivas.map(a => a.mensaje).join('\n\n');
                bienvenida = `${saludoHora}, aquí Nami al reporte. 🧭\n\n${listaAlertas}\n\n¿Te ayudo a registrar algo o revisar tus números?`;
            } else {
                bienvenida = `${saludoHora}! Soy Nami, tu asistente financiero. 🧭\n\nTodo parece en orden por ahora. ¿En qué puedo ayudarte?`;
            }

            setMessages([{ role: "ai", content: bienvenida }]);
        }
    }, [isOpen, messages.length, alertasProactivas, saludoHora]);

    // ⏳ Mensajes rotativos del indicador de escritura
    useEffect(() => {
        if (!isLoading) return;
        const frases = [
            "Analizando tus datos...",
            "Consultando el LogPose...",
            "Preparando respuesta...",
            "Nami está pensando...",
            "Revisando tus finanzas...",
        ];
        let idx = 0;
        setIndicadorTexto(frases[0]);
        const interval = setInterval(() => {
            idx = (idx + 1) % frases.length;
            setIndicadorTexto(frases[idx]);
        }, 2200);
        return () => clearInterval(interval);
    }, [isLoading]);

    // 📱 Quick Actions contextuales
    const accionesRapidas = useMemo(() => {
        const acciones: { icon: string; text: string; query: string }[] = [];

        // Siempre disponibles
        acciones.push({ icon: "💰", text: "Balance", query: "¿Cuál es mi saldo actual?" });
        acciones.push({ icon: "📊", text: "Gastos", query: "¿Cuánto he gastado este mes y en qué?" });

        // Contextuales
        if (userContext.upcomingFixedExpenses && userContext.upcomingFixedExpenses.length > 0) {
            acciones.push({ icon: "📅", text: "Pagos", query: "¿Qué pagos tengo próximos?" });
        }

        if (userContext.debts.length > 0) {
            acciones.push({ icon: "🤝", text: "Deudas", query: "¿Cómo están mis deudas?" });
        }

        if (userContext.goals.length > 0) {
            acciones.push({ icon: "🎯", text: "Metas", query: "¿Cómo van mis metas de ahorro?" });
        }

        if (userContext.monthlyBudget > 0) {
            acciones.push({ icon: "📋", text: "Presupuesto", query: "¿Cómo va mi presupuesto este mes?" });
        }

        // Si hay poco contexto, agregar genéricos
        if (acciones.length < 5) {
            acciones.push({ icon: "📈", text: "Análisis", query: "Analiza mis finanzas este mes" });
        }
        if (acciones.length < 5) {
            acciones.push({ icon: "💡", text: "Tips", query: "Dame un consejo financiero breve" });
        }

        return acciones.slice(0, 6); // Máximo 6
    }, [userContext]);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Cleanup: detener reconocimiento al desmontar o cerrar
    useEffect(() => {
        // Copiar refs a variables locales para el cleanup
        const recognition = recognitionRef.current;
        const silenceTimeout = silenceTimeoutRef.current;

        return () => {
            if (recognition) {
                recognition.stop();
            }
            if (silenceTimeout) {
                clearTimeout(silenceTimeout);
            }
        };
    }, []);

    // Detener reconocimiento al cerrar el modal
    useEffect(() => {
        if (!isOpen && recognitionRef.current) {
            isListeningRef.current = false;
            recognitionRef.current.stop();
            setIsListening(false);
            setInterimTranscript("");
        }
    }, [isOpen]);

    const mensajeSinCuentasBancarias =
        "Primero debes crear al menos una **cuenta bancaria** en la sección Cuentas para registrar movimientos con saldo.";

    const marcarPendienteCuenta = (
        datos: Record<string, unknown>,
        campo: "accountId" | "targetAccountId",
        mensaje: string
    ) => {
        const { campoFaltante: _c, ...resto } = datos;
        return {
            pendiente: { ...resto, campoFaltante: campo },
            mensaje,
        };
    };

    const processOperation = async (data: any) => {
        let success = false;
        let aiResponse = "";
        let chartType: "pie" | "bar" | undefined = undefined;
        let pendingTransaction: any = undefined;

        switch (data.intent) {
            case "transaction": {
                if (cuentas.length === 0) {
                    aiResponse = mensajeSinCuentasBancarias;
                    success = false;
                    break;
                }

                // Auto-selección si solo hay una cuenta
                if (!data.accountId && cuentas.length === 1) {
                    data.accountId = cuentas[0].id;
                }

                // Resolver ID real si la IA envió nombre de banco/cuenta en lugar del ID
                if (data.accountId) {
                    const idResuelto = resolverIdCuenta(String(data.accountId), cuentas);
                    if (idResuelto) data.accountId = idResuelto;
                }

                const cuentaDestino = data.accountId
                    ? cuentas.find((c) => c.id === data.accountId)
                    : undefined;

                if (!data.accountId || !cuentaDestino) {
                    const exactAmount = typeof data.amount === 'string' ? parseNumeroFlexible(data.amount) : data.amount;
                    const isVes = data.currency === "VES";
                    const formattedAmount = isVes ? `Bs. ${exactAmount.toFixed(2)}` : `${obtenerSimboloMoneda(data.currency || "USD")}${exactAmount.toFixed(2)}`;
                    const actionWord = data.type === "ingreso" ? "guardar tu ingreso" : "registrar tu gasto";
                    const questionWord = data.type === "ingreso" ? "deseas guardar el dinero" : "salió el dinero";
                    
                    aiResponse = `Entendido, quiero ${actionWord} de **${formattedAmount}** en **${data.category || "General"}**. ¿En qué cuenta ${questionWord}? 🤔`;
                    success = false;
                    const marcado = marcarPendienteCuenta(
                        { intent: "transaction", ...data },
                        "accountId",
                        aiResponse
                    );
                    pendingTransaction = marcado.pendiente;
                    break;
                }

                if (data.type === "transferencia" && data.targetAccountId) {
                    const idDestino = resolverIdCuenta(String(data.targetAccountId), cuentas);
                    if (idDestino) data.targetAccountId = idDestino;
                }

                if (data.type === "transferencia") {
                    const cuentaDestinoTransfer = data.targetAccountId
                        ? cuentas.find((c) => c.id === data.targetAccountId)
                        : undefined;
                    if (!data.targetAccountId || !cuentaDestinoTransfer) {
                        aiResponse = `Para la transferencia desde **${cuentaDestino.nombre}**, ¿a qué cuenta va el dinero?`;
                        success = false;
                        pendingTransaction = marcarPendienteCuenta(
                            { intent: "transaction", ...data },
                            "targetAccountId",
                            aiResponse
                        ).pendiente;
                        break;
                    }
                    if (data.targetAccountId === data.accountId) {
                        aiResponse = "La cuenta origen y destino no pueden ser la misma.";
                        success = false;
                        break;
                    }
                }

                let amountUSD = typeof data.amount === 'string' ? parseNumeroFlexible(data.amount) : data.amount;
                if (typeof amountUSD !== "number" || isNaN(amountUSD) || amountUSD <= 0) {
                    aiResponse = "El monto de la transacción debe ser un número válido mayor a 0.";
                    success = false;
                    break;
                }

                let exchangeRate = 1;
                let originalAmount = undefined;
                const monedaTransaccion = (data.currency || "USD").toUpperCase();

                // Caso especial: "Gasté 5$ en bolívares"
                if (data.currency === "VES" && data.amountInUSD) {
                    const rate = tasasEnBs.USD;
                    exchangeRate = rate;
                    const usdAmount = parseNumeroFlexible(data.amountInUSD);
                    originalAmount = amountUSD;
                    amountUSD = usdAmount;
                } else if (data.currency === "VES") {
                    let rate = tasasEnBs.USD;
                    if (data.currency_type === "EUR") rate = tasasEnBs.EUR;
                    if (data.currency_type === "USDT") rate = tasasEnBs.USDT;
                    
                    exchangeRate = rate;
                    const exactBsAmount = amountUSD;
                    originalAmount = exactBsAmount;
                    amountUSD = parseFloat((exactBsAmount / rate).toFixed(2));
                } else if (cuentaDestino.moneda === "BS") {
                    // USD/EUR/USDT en cuenta bolívares: aplicar tasa para actualizar saldo correctamente
                    exchangeRate = obtenerTasaParaMoneda(monedaTransaccion, tasasEnBs);
                }


                // ✅ Validar y procesar la fecha usando hora de Venezuela (UTC-4)
                let transactionDate = createVenezuelaDate(); // Default: fecha actual en Venezuela
                if (data.date) {
                    const parsedDate = new Date(data.date);
                    // Validar que la fecha sea válida y no sea futura
                    if (!isNaN(parsedDate.getTime()) && parsedDate <= createVenezuelaDate()) {
                        transactionDate = parsedDate;
                    } else {
                        console.warn('⚠️ Fecha inválida o futura recibida de la IA, usando fecha actual de Venezuela:', data.date);
                    }
                }

                const transactionId = await addTransaction({
                    amount: amountUSD,
                    type: (data.type as "ingreso" | "gasto" | "transferencia") || "gasto",
                    category: data.category || "Transferencia",
                    description: data.description || "Transacción rápida con IA",
                    date: transactionDate, // ✅ Usar fecha validada
                    currency: data.currency as "USD" | "VES" || "USD",
                    originalAmount: originalAmount,
                    exchangeRate: exchangeRate,
                    accountId: data.accountId, // Pasamos el ID de la cuenta inferido o solicitado por Nami
                    targetAccountId: data.targetAccountId
                } as any);

                success = !!transactionId;
                if (success && transactionId) {
                    // ✅ FIX: Guardar el ID de la transacción que ACABAMOS de crear
                    setLastTransactionId(transactionId);
                }

                const amountDisplay = data.currency === "VES" && originalAmount
                    ? `Bs. ${originalAmount.toFixed(2)}`
                    : `${obtenerSimboloMoneda(data.currency as any || "USD")}${parseFloat(amountUSD.toFixed(2))}`;
                aiResponse = `Registré el ${data.type} de ${amountDisplay} (${data.category}) en **${cuentaDestino.nombre}**.`;
                break;
            }

            case "new_debt": {
                let debtOriginalAmount = undefined;
                let debtExchangeRate = 1;
                let debtAmount = parseNumeroFlexible(data.amount);

                if (isNaN(debtAmount) || debtAmount <= 0) {
                    aiResponse = "El monto de la deuda debe ser un número mayor a 0.";
                    success = false;
                    break;
                }
                if (!data.person || typeof data.person !== "string" || !data.person.trim()) {
                    aiResponse = "Debes indicar el nombre de la persona asociada a la deuda.";
                    success = false;
                    break;
                }

                if (data.currency === "VES") {
                    const rate = tasasEnBs.USD;
                    debtExchangeRate = rate;
                    debtOriginalAmount = parseNumeroFlexible(data.amount); // Monto en Bs
                    debtAmount = parseFloat((debtOriginalAmount / rate).toFixed(2)); // Guardar en USD
                }

                success = (await addDebt({
                    personName: data.person.trim(),
                    amount: debtAmount,
                    type: data.type === "por_pagar" ? "por_pagar" : "por_cobrar",
                    description: data.description || "Deuda registrada por Nami",
                    currency: data.currency || "USD",
                    originalAmount: debtOriginalAmount,
                    exchangeRate: debtExchangeRate
                } as any)) || false;

                const debtDisplay = data.currency === "VES"
                    ? `Bs. ${debtOriginalAmount?.toFixed(2)} (${obtenerSimboloMoneda("USD")}${debtAmount})`
                    : `${obtenerSimboloMoneda(data.currency as any || "USD")}${parseFloat(debtAmount.toFixed(2))}`;

                aiResponse = `Creé la deuda de ${data.person} por ${debtDisplay}.`;
                break;
            }

            case "new_fixed_expense": {
                const fixedAmount = parseNumeroFlexible(data.amount);
                const diaVencimiento = parseInt(data.dueDay, 10);

                if (isNaN(fixedAmount) || fixedAmount <= 0) {
                    aiResponse = "El monto del gasto fijo debe ser mayor a 0.";
                    success = false;
                    break;
                }
                if (isNaN(diaVencimiento) || diaVencimiento < 1 || diaVencimiento > 31) {
                    aiResponse = "El día de cobro debe ser un número de día válido entre 1 y 31.";
                    success = false;
                    break;
                }

                success = (await addFixedExpense({
                    title: data.name || "Gasto fijo",
                    amount: fixedAmount,
                    dueDay: diaVencimiento,
                    category: data.category || "Servicios",
                    description: data.description || "Gasto fijo registrado por Nami"
                } as any)) || false;

                aiResponse = `He programado el gasto fijo "${data.name || "Gasto fijo"}" por $${parseFloat(fixedAmount.toFixed(2))} para el día ${diaVencimiento} de cada mes.`;
                break;
            }

            case "account_operation": {
                if (cuentas.length === 0) {
                    aiResponse = mensajeSinCuentasBancarias;
                    success = false;
                    break;
                }

                if (!data.accountId && cuentas.length === 1) {
                    data.accountId = cuentas[0].id;
                }

                if (data.accountId) {
                    const idOrigen = resolverIdCuenta(String(data.accountId), cuentas);
                    if (idOrigen) data.accountId = idOrigen;
                }
                if (data.targetAccountId) {
                    const idDestinoOp = resolverIdCuenta(String(data.targetAccountId), cuentas);
                    if (idDestinoOp) data.targetAccountId = idDestinoOp;
                }

                const cuentaOp = data.accountId
                    ? cuentas.find((c) => c.id === data.accountId)
                    : undefined;

                if (!data.accountId || !cuentaOp) {
                    aiResponse = "¿En qué cuenta quieres realizar esta operación?";
                    success = false;
                    pendingTransaction = marcarPendienteCuenta(
                        { intent: "account_operation", ...data },
                        "accountId",
                        aiResponse
                    ).pendiente;
                    break;
                }
                if (data.operation === "transferencia" && !data.targetAccountId) {
                    aiResponse = "Para la transferencia, ¿a qué cuenta destino va el dinero?";
                    success = false;
                    pendingTransaction = marcarPendienteCuenta(
                        { intent: "account_operation", ...data },
                        "targetAccountId",
                        aiResponse
                    ).pendiente;
                    break;
                }
                try {
                    const montoOperacion = parseNumeroFlexible(data.amount);
                    if (isNaN(montoOperacion) || montoOperacion <= 0) {
                        return "El monto de la operación debe ser un número positivo.";
                    }
                    await realizarOperacion({
                        cuentaOrigenId: data.accountId,
                        tipo: data.operation,
                        monto: montoOperacion,
                        descripcion: data.description || "Operación desde Nami",
                        cuentaDestinoId: data.targetAccountId,
                        comision: data.commission ? parseNumeroFlexible(data.commission) : undefined,
                        tasaCambio: data.exchangeRate ? parseNumeroFlexible(data.exchangeRate) : undefined,
                    });
                    const cuenta = cuentas.find(c => c.id === data.accountId);
                    const nombreCuenta = cuenta?.nombre || data.accountId;
                    const etiquetas: Record<string, string> = {
                        deposito: "Depósito",
                        retiro: "Retiro",
                        transferencia: "Transferencia",
                        pago: "Pago",
                    };
                    const etiqueta = etiquetas[data.operation] || "Operación";
                    const simbolo = cuenta ? obtenerSimboloMoneda(cuenta.moneda) : "$";
                    aiResponse = `✅ ${etiqueta} de ${simbolo}${montoOperacion} registrado en ${nombreCuenta}.`;
                    success = true;
                } catch (error: unknown) {
                    const mensaje = error instanceof Error ? error.message : "Error en la operación";
                    aiResponse = `No pude completar la operación: ${mensaje}`;
                    success = false;
                }
                break;
            }

            case "delete_item":
                // 🗑️ Lógica genérica de eliminación
                if (data.itemType === 'transaction' && lastTransactionId) {
                    await deleteTransaction(lastTransactionId);
                    setLastTransactionId(null);
                    aiResponse = "Eliminé la última transacción.";
                    success = true;
                } else if (data.itemType === 'debt') {
                    const target = debts.find(d => d.personName.toLowerCase().includes(data.name.toLowerCase()));
                    if (target) {
                        await deleteDebt(target.id);
                        aiResponse = `Eliminé la deuda de ${target.personName}.`;
                        success = true;
                    } else aiResponse = `No encontré ninguna deuda con "${data.name}".`;
                } else if (data.itemType === 'goal') {
                    const target = goals.find(g => g.name.toLowerCase().includes(data.name.toLowerCase()));
                    if (target) {
                        await deleteGoal(target.id);
                        aiResponse = `Eliminé la meta "${target.name}".`;
                        success = true;
                    } else aiResponse = `No encontré la meta "${data.name}".`;
                } else if (data.itemType === 'fixed_expense') {
                    const target = fixedExpenses.find(f => (f.title || f.description || "").toLowerCase().includes(data.name.toLowerCase()));
                    if (target) {
                        await deleteFixedExpense(target.id);
                        aiResponse = `Eliminé el gasto fijo "${target.title || target.description}".`;
                        success = true;
                    } else aiResponse = `No encontré el gasto fijo "${data.name}".`;
                } else if (data.itemType === 'shopping_list') {
                    const target = lists.find(l => l.name.toLowerCase().includes(data.name.toLowerCase()));
                    if (target) {
                        await deleteList(target.id);
                        aiResponse = `Eliminé la lista de compras "${target.name}".`;
                        success = true;
                    } else aiResponse = `No encontré la lista "${data.name}".`;
                } else {
                    aiResponse = "No pude encontrar lo que querías eliminar.";
                    success = false;
                }
                break;

            case "update_item":
                // ✏️ Lógica genérica de actualización
                if (data.itemType === 'debt') {
                    const target = debts.find(d => d.personName.toLowerCase().includes(data.name.toLowerCase()));
                    if (target) {
                        // Construir updates
                        const updates: any = {};
                        if (data.field === 'amount') updates.amount = parseNumeroFlexible(data.value);
                        if (data.field === 'name') updates.personName = data.value;
                        if (data.field === 'description') updates.description = data.value;
                        if (data.field === 'date') updates.dueDate = new Date(data.value);
                        if (data.field === 'type') updates.type = data.value; // "por_cobrar" | "por_pagar"

                        await updateDebt(target.id, updates);
                        aiResponse = `Actualicé la deuda de ${target.personName}.`;
                        success = true;
                    } else aiResponse = `No encontré la deuda de "${data.name}".`;
                } else if (data.itemType === 'goal') {
                    const target = goals.find(g => g.name.toLowerCase().includes(data.name.toLowerCase()));
                    if (target) {
                        const updates: any = {};
                        if (data.field === 'amount') updates.targetAmount = parseNumeroFlexible(data.value);
                        if (data.field === 'name') updates.name = data.value;
                        await updateGoal(target.id, updates);
                        aiResponse = `Actualicé la meta "${target.name}".`;
                        success = true;
                    } else aiResponse = `No encontré la meta "${data.name}".`;
                } else if (data.itemType === 'fixed_expense') {
                    const target = fixedExpenses.find(f => (f.title || f.description || "").toLowerCase().includes(data.name.toLowerCase()));
                    if (target) {
                        const updates: any = {};
                        if (data.field === 'amount') updates.amount = parseNumeroFlexible(data.value);
                        if (data.field === 'day') {
                            const diaActualizado = parseInt(data.value, 10);
                            if (isNaN(diaActualizado) || diaActualizado < 1 || diaActualizado > 31) {
                                return "El día de vencimiento debe estar entre 1 y 31.";
                            }
                            updates.dueDay = diaActualizado;
                        }
                        if (data.field === 'name') updates.title = data.value;
                        if (data.field === 'category') updates.category = data.value;
                        if (data.field === 'description') updates.description = data.value;
                        await updateFixedExpense(target.id, updates);
                        aiResponse = `Actualicé el gasto fijo "${target.title}".`;
                        success = true;
                    } else aiResponse = `No encontré el gasto fijo "${data.name}".`;
                } else if (data.itemType === 'shopping_list') {
                    const target = lists.find(l => l.name.toLowerCase().includes(data.name.toLowerCase()));
                    if (target) {
                        if (data.field === 'name') {
                            await updateListName(target.id, data.value);
                            aiResponse = `Renombré la lista "${target.name}" a "${data.value}".`;
                            success = true;
                        } else {
                            aiResponse = "Solo puedo cambiar el nombre de las listas por ahora.";
                            success = false;
                        }
                    } else aiResponse = `No encontré la lista "${data.name}".`;
                }
                break;

            case "update_savings":
                const updates: any = {};
                let confirmMsg = "";

                if (data.type === 'physical') {
                    updates.savingsPhysical = parseNumeroFlexible(data.amount);
                    confirmMsg = `Actualicé tus ahorros físicos a $${parseFloat(Number(data.amount).toFixed(2))}.`;
                } else if (data.type === 'digital') {
                    updates.savingsUSDT = parseNumeroFlexible(data.amount);
                    confirmMsg = `Actualicé tus ahorros digitales a $${parseFloat(Number(data.amount).toFixed(2))}.`;
                } else if (data.type === 'budget') {
                    updates.monthlyBudget = parseNumeroFlexible(data.amount);
                    confirmMsg = `Fijé tu presupuesto mensual en $${parseFloat(Number(data.amount).toFixed(2))}.`;
                }

                if (confirmMsg) {
                    await updateUserData(updates);
                    aiResponse = confirmMsg;
                    success = true;
                } else {
                    aiResponse = "No entendí qué tipo de ahorro o presupuesto quieres actualizar.";
                    success = false;
                }
                break;

            case "pay_fixed_expense":
                const fixedExpense = fixedExpenses.find(f => (f.title || f.description || "").toLowerCase().includes(data.name.toLowerCase()));

                if (!fixedExpense) {
                    aiResponse = `No encontré el gasto fijo "${data.name}".`;
                    success = false;
                    break;
                }

                // Actualizar lastPaidDate
                await updateFixedExpense(fixedExpense.id, {
                    lastPaidDate: createVenezuelaDate()
                });

                // Opcionalmente crear transacción de gasto
                if (data.createTransaction) {
                    if (cuentas.length === 0) {
                        aiResponse = mensajeSinCuentasBancarias;
                        success = false;
                        break;
                    }

                    let cuentaPagoId = data.accountId as string | undefined;
                    if (!cuentaPagoId && cuentas.length === 1) {
                        cuentaPagoId = cuentas[0].id;
                    }
                    if (cuentaPagoId) {
                        const resuelta = resolverIdCuenta(String(cuentaPagoId), cuentas);
                        if (resuelta) cuentaPagoId = resuelta;
                    }

                    if (!cuentaPagoId || !cuentas.find((c) => c.id === cuentaPagoId)) {
                        aiResponse = `Marqué "${fixedExpense.title}" como pendiente de pago. ¿De qué cuenta salió el dinero?`;
                        success = false;
                        pendingTransaction = marcarPendienteCuenta(
                            {
                                intent: "pay_fixed_expense",
                                name: data.name,
                                createTransaction: true,
                            },
                            "accountId",
                            aiResponse
                        ).pendiente;
                        break;
                    }

                    const rate = tasasEnBs.USD;
                    await addTransaction({
                        amount: fixedExpense.amount,
                        type: "gasto",
                        category: fixedExpense.category,
                        description: `Pago mensual: ${fixedExpense.title || fixedExpense.description}`,
                        date: createVenezuelaDate(),
                        currency: "USD",
                        originalAmount: fixedExpense.amount,
                        exchangeRate: rate,
                        accountId: cuentaPagoId,
                    } as any);
                    aiResponse = `Marqué "${fixedExpense.title}" como pagado y registré el gasto de $${parseFloat(fixedExpense.amount.toFixed(2))}.`;
                } else {
                    aiResponse = `Marqué "${fixedExpense.title}" como pagado.`;
                }

                success = true;
                break;

            case "correct_transaction":
                if (!lastTransactionId) {
                    aiResponse = "No encuentro una transacción reciente para corregir.";
                    success = false;
                    break;
                }

                if (data.action === 'delete') {
                    await deleteTransaction(lastTransactionId);
                    setLastTransactionId(null);
                    aiResponse = "Entendido, he eliminado la última transacción.";
                    success = true;
                } else if (data.newValue) {
                    const updates: any = {};
                    if (data.action === 'update_amount') updates.amount = parseNumeroFlexible(data.newValue);
                    if (data.action === 'update_category') updates.category = data.newValue;
                    if (data.action === 'update_description') updates.description = data.newValue;

                    const updateSuccess = await updateTransaction(lastTransactionId, updates);
                    if (updateSuccess) {
                        aiResponse = `Listo, he actualizado el ${data.action.replace('update_', '')} a "${data.newValue}".`;
                        success = true;
                    } else {
                        aiResponse = "Hubo un error al intentar actualizar la transacción.";
                        success = false;
                    }
                }
                break;

            case "query":
                aiResponse = ejecutarConsultaNami(data, {
                    balance: userContext.balance,
                    monthlyExpense: userContext.monthlyExpense,
                    monthlyIncome: userContext.monthlyIncome,
                    monthlyBudget: userContext.monthlyBudget,
                    topCategories: userContext.topCategories,
                    debts: userContext.debts,
                    goals: userContext.goals,
                });
                success = true;
                break;

            case "warning":
                aiResponse = data.message || "Ten en cuenta este aviso sobre tus finanzas.";
                success = true;
                break;

            case "new_goal":
                try {
                    const targetAmount = parseNumeroFlexible(data.targetAmount);
                    if (isNaN(targetAmount) || targetAmount <= 0) {
                        return "El monto objetivo de la meta debe ser un número positivo.";
                    }
                    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
                        return "Debes indicar un nombre para la meta de ahorro.";
                    }
                    await addGoal(data.name, targetAmount, data.deadline);
                    aiResponse = `Creé la meta de ahorro "${data.name}" con un objetivo de $${parseFloat(targetAmount.toFixed(2))}${data.deadline ? ` para el ${new Date(data.deadline).toLocaleDateString()}` : ""}.`;
                    success = true;
                } catch (error) {
                    console.error("Error creating goal via Nami:", error);
                    aiResponse = `No pude crear la meta de ahorro "${data.name}".`;
                    success = false;
                }
                break;

            case "contribute_goal":
                try {
                    const goalToContribute = goals.find(g => g.name.toLowerCase().includes(data.name.toLowerCase()));
                    if (goalToContribute) {
                        const contributionAmount = parseNumeroFlexible(data.amount);
                        if (isNaN(contributionAmount) || contributionAmount <= 0) {
                            return "El monto del aporte debe ser un número positivo.";
                        }
                        const method = (data.currency === "USDT" || String(data.name).toLowerCase().includes("usdt") || String(data.name).toLowerCase().includes("cripto")) ? "usdt" : "physical";
                        await addContribution(goalToContribute.id, goalToContribute.name, contributionAmount, method);
                        aiResponse = `Aporté $${parseFloat(contributionAmount.toFixed(2))} a tu meta "${goalToContribute.name}".`;
                        success = true;
                    } else {
                        aiResponse = `No encontré la meta de ahorro "${data.name}".`;
                        success = false;
                    }
                } catch (error) {
                    console.error("Error contributing to goal via Nami:", error);
                    aiResponse = `No pude registrar el aporte a tu meta "${data.name}".`;
                    success = false;
                }
                break;

            case "shopping_item":
                if (!data.item || typeof data.item !== "string" || !data.item.trim()) {
                    return "Debes indicar el nombre del artículo.";
                }
                try {
                    const listName = data.listName || "Lista de compras";
                    const listToAddTo = lists.find(l => l.name.toLowerCase().includes(listName.toLowerCase()));
                    let targetListId = "";
                    
                    if (listToAddTo) {
                        targetListId = listToAddTo.id;
                    } else {
                        const newListRef = await createList(listName);
                        if (newListRef) {
                            targetListId = newListRef.id;
                        }
                    }
                    
                    if (targetListId) {
                        const itemQuantity = typeof data.quantity === 'number' ? data.quantity : parseInt(data.quantity) || 1;
                        await addItem(targetListId, {
                            name: data.item,
                            quantity: itemQuantity,
                            price: 0
                        });
                        aiResponse = `Agregué **${data.item}** (x${itemQuantity}) a la lista "${listName}".`;
                        success = true;
                    } else {
                        aiResponse = `No pude encontrar ni crear la lista de compras "${listName}".`;
                        success = false;
                    }
                } catch (error) {
                    console.error("Error adding shopping item via Nami:", error);
                    aiResponse = `No pude agregar el elemento a la lista de compras.`;
                    success = false;
                }
                break;

            case "pay_debt":
                if (!data.person || typeof data.person !== "string" || !data.person.trim()) {
                    return "Debes indicar a quién se le abona la deuda.";
                }
                const paymentAmount = parseNumeroFlexible(data.amount);
                if (isNaN(paymentAmount) || paymentAmount <= 0) {
                    return "El monto del abono debe ser un número positivo.";
                }
                try {
                    const debtToPay = debts.find(d => !d.isPaid && d.personName.toLowerCase().includes(data.person.toLowerCase()));
                    if (debtToPay) {
                        const isVes = data.currency === "VES" || debtToPay.currency === "VES";
                        const rate = tasasEnBs.USD;
                        
                        let payAmountUSD = paymentAmount;
                        let payOriginalAmount = undefined;
                        let payExchangeRate = 1;
                        
                        if (isVes) {
                            payExchangeRate = rate;
                            payOriginalAmount = paymentAmount;
                            payAmountUSD = parseFloat((paymentAmount / rate).toFixed(2));
                        }
                        
                        success = await addPayment(debtToPay.id, {
                            amount: payAmountUSD,
                            date: createVenezuelaDate(),
                            note: "Abono registrado por Nami",
                            currency: isVes ? "VES" : "USD",
                            originalAmount: payOriginalAmount,
                            exchangeRate: payExchangeRate
                        }) || false;
                        
                        if (success) {
                            const payDisplay = isVes 
                                ? `Bs. ${paymentAmount.toFixed(2)} (${obtenerSimboloMoneda("USD")}${payAmountUSD})`
                                : `${obtenerSimboloMoneda("USD")}${parseFloat(paymentAmount.toFixed(2))}`;
                            aiResponse = `Registré el pago de ${payDisplay} para la deuda con ${debtToPay.personName}.`;
                        } else {
                            aiResponse = `Hubo un error al registrar el pago de la deuda con ${debtToPay.personName}.`;
                        }
                    } else {
                        aiResponse = `No encontré ninguna deuda pendiente con "${data.person}".`;
                        success = false;
                    }
                } catch (error) {
                    console.error("Error paying debt via Nami:", error);
                    aiResponse = `No pude registrar el pago de la deuda.`;
                    success = false;
                }
                break;

            case "analysis_chart":
                aiResponse = data.message || "Aquí tienes el gráfico de tus gastos este mes:";
                success = true;
                chartType = data.chartType || "pie";
                break;

            case "suggestion":
                aiResponse = data.message || data.response || "Aquí tienes una sugerencia para tus finanzas.";
                success = true;
                break;

            default:
                // Fallback legacy: redirigir al flujo de transacción con validación de cuenta
                if (data.amount && data.category) {
                    return processOperation({
                        intent: "transaction",
                        amount: data.amount,
                        type: data.type || "gasto",
                        category: data.category,
                        description: data.description,
                        currency: data.currency || "USD",
                        accountId: data.accountId,
                    });
                }
                aiResponse = "No entendí muy bien esta operación.";
        }
        return { success, response: aiResponse, chartType, pendingTransaction };
    };

    const handleSelectPendingAccount = async (messageIndex: number, accountId: string, accountName: string) => {
        const msg = messages[messageIndex];
        if (!msg || !msg.pendingTransaction) return;

        const pendingData = aplicarCuentaAPendiente(
            msg.pendingTransaction as Record<string, unknown>,
            accountId
        );

        setIsLoading(true);
        setIndicadorTexto("Registrando transacción...");

        try {
            // Eliminar los botones inline del mensaje origen
            setMessages(prev => {
                const updated = [...prev];
                if (updated[messageIndex]) {
                    const newMsg = { ...updated[messageIndex] };
                    delete newMsg.pendingTransaction;
                    updated[messageIndex] = newMsg;
                }
                return updated;
            });

            // Agregar un mensaje del usuario simulando la respuesta
            setMessages(prev => [...prev, {
                role: "user",
                content: `En mi cuenta **${accountName}**`
            }]);

            const result = await processOperation(pendingData);

            if (typeof result === "string") {
                setMessages(prev => [...prev, {
                    role: "ai",
                    content: result
                }]);
                toast.error(result);
            } else if (result.success) {
                setMessages(prev => [...prev, {
                    role: "ai",
                    content: `✅ ¡Listo! Registré tu transacción en **${accountName}** de forma exitosa.`,
                    isTransaction: true
                }]);
                toast.success("Transacción registrada");
            } else {
                setMessages(prev => [...prev, {
                    role: "ai",
                    content: `Hubo un problema al registrar la transacción en **${accountName}**: ${result.response}`
                }]);
                toast.error("Error al completar transacción");
            }
        } catch (error) {
            console.error("Error al completar la transacción pendiente:", error);
            toast.error("Error técnico al registrar");
        } finally {
            setIsLoading(false);
        }
    };

    // Retry logic para peticiones a la API
    const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok || i === retries - 1) {
                    return response;
                }
                // Esperar antes de reintentar (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
        throw new Error("Max retries reached");
    };

    const handleSend = async (text?: string) => {
        const userMsg = typeof text === 'string' ? text : inputRef.current; // Usar ref o texto directo
        if (!userMsg.trim()) return;

        // Prevent sending while operations are pending
        if (pendingOperationsRef.current) {
            toast.warning("Espera a que termine la operación anterior");
            return;
        }

        setInput("");
        setInterimTranscript("");
        const newMessages = [...messages, { role: "user" as const, content: userMsg }];
        setMessages(newMessages);
        setIsLoading(true);
        pendingOperationsRef.current = true;

        // Completar transacción pendiente localmente (sin depender del LLM en el follow-up)
        // Completar transacción pendiente localmente (sin depender del LLM en el follow-up)
        const mensajePendiente = [...messages].reverse().find(
            (m) => m.role === "ai" && m.pendingTransaction
        );
        if (mensajePendiente?.pendingTransaction) {
            const esCorrectivo = esMensajeCorrectivo(
                userMsg,
                mensajePendiente.pendingTransaction.amount,
                cuentas
            );

            if (esCorrectivo) {
                // Borrar la transacción pendiente anterior porque se procesará una corrección en el backend
                const indicePendiente = messages.lastIndexOf(mensajePendiente);
                setMessages((prev) => {
                    const actualizado = [...prev];
                    if (actualizado[indicePendiente]) {
                        const copia = { ...actualizado[indicePendiente] };
                        delete copia.pendingTransaction;
                        actualizado[indicePendiente] = copia;
                    }
                    return actualizado;
                });
                // No retornamos aquí, dejamos que continúe el flujo normal de la API
            } else {
                const idCuenta =
                    resolverIdCuenta(userMsg, cuentas) ||
                    (mensajePendiente.pendingTransaction.accountId
                        ? resolverIdCuenta(String(mensajePendiente.pendingTransaction.accountId), cuentas)
                        : null);

                if (idCuenta) {
                    const cuenta = cuentas.find((c) => c.id === idCuenta);
                    const indicePendiente = messages.lastIndexOf(mensajePendiente);
                    const datosPendientes = aplicarCuentaAPendiente(
                        mensajePendiente.pendingTransaction as Record<string, unknown>,
                        idCuenta
                    );

                    setMessages((prev) => {
                        const actualizado = [...prev];
                        if (actualizado[indicePendiente]) {
                            const copia = { ...actualizado[indicePendiente] };
                            delete copia.pendingTransaction;
                            actualizado[indicePendiente] = copia;
                        }
                        return actualizado;
                    });

                    try {
                        const resultado = await processOperation(datosPendientes);
                        if (isMountedRef.current) {
                            if (typeof resultado === "string") {
                                setMessages((prev) => [
                                    ...prev,
                                    { role: "ai", content: resultado },
                                ]);
                                toast.error(resultado);
                            } else {
                                setMessages((prev) => [
                                    ...prev,
                                    {
                                        role: "ai",
                                        content: resultado.success
                                            ? `✅ Registré tu transacción en **${cuenta?.nombre || "tu cuenta"}**.`
                                            : resultado.response,
                                        isTransaction: resultado.success,
                                    },
                                ]);
                                if (resultado.success) toast.success("Transacción registrada");
                                else toast.error("No se pudo registrar la transacción");
                            }
                        }
                    } catch (error) {
                        console.error("Error al completar transacción pendiente por texto:", error);
                        if (isMountedRef.current) {
                            setMessages((prev) => [
                                ...prev,
                                { role: "ai", content: "Hubo un error técnico al registrar el movimiento." },
                            ]);
                        }
                        toast.error("Error técnico al registrar");
                    } finally {
                        if (isMountedRef.current) setIsLoading(false);
                        pendingOperationsRef.current = false;
                    }
                    return;
                }

                // Hay transacción pendiente pero no se reconoció la cuenta y no es correctivo: no llamar a la API
                if (isMountedRef.current) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "ai",
                            content: `No reconocí **"${userMsg}"** como una de tus cuentas. Toca uno de los botones de arriba (ej. Banco Venezuela) para confirmar el movimiento.`,
                        },
                    ]);
                    setIsLoading(false);
                }
                pendingOperationsRef.current = false;
                return;
            }
        }

        // Normalizar texto para pre-ruteo local
        const textNormalizado = userMsg
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        // 1. Balance
        const esBalance = ["balance", "saldo", "cuanto dinero tengo", "mis cuentas", "ver cuentas", "ver saldo"].some(palabra => textNormalizado.includes(palabra));
        // 2. Gastos
        const esGastos = ["gastos", "que he gastado", "ver mis gastos", "en que gaste", "cuanto he gastado"].some(palabra => textNormalizado.includes(palabra));
        // 3. Metas
        const esMetas = ["metas", "mis metas", "ver metas", "ahorros", "mi meta"].some(palabra => textNormalizado.includes(palabra));
        // 4. Compras
        const esCompras = ["lista de compras", "compras", "lista del super", "mi lista", "ver lista"].some(palabra => textNormalizado.includes(palabra));
        // 5. Pagos / Gastos fijos
        const esPagos = ["gastos fijos", "pagos", "servicios", "suscripciones", "mi suscripcion"].some(palabra => textNormalizado.includes(palabra));
        // 6. Deudas
        const esDeudas = ["deudas", "mis deudas", "quien me debe", "a quien le debo", "ver deudas"].some(palabra => textNormalizado.includes(palabra));

        let respuestaLocal = "";

        if (esBalance) {
            const saldosStr = cuentas.map(c => `- **${c.nombre}**: ${obtenerSimboloMoneda(c.moneda)}${c.saldo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join('\n');
            respuestaLocal = `💰 **Tus Saldos Actuales:**\n\n${saldosStr}\n\n**Saldo Total**: $${calcularSaldoTotal().toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (esGastos) {
            const categoriesStr = userContext.topCategories.length > 0
                ? userContext.topCategories.map(c => `- **${c.category}**: $${c.amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join('\n')
                : "No hay gastos registrados en este mes.";
            respuestaLocal = `📊 **Gasto Mensual:**\n\n- Total gastado este mes: **$${userContext.monthlyExpense.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n- Promedio diario: **$${userContext.averageDailyExpense.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n\n**Top Categorías:**\n${categoriesStr}`;
        } else if (esMetas) {
            const metasStr = goals.length > 0
                ? goals.map(g => {
                    const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
                    return `- **${g.name}**: $${g.currentAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de $${g.targetAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (**${pct}%**)`;
                  }).join('\n')
                : "No tienes metas de ahorro activas.";
            respuestaLocal = `🎯 **Metas de Ahorro:**\n\n${metasStr}`;
        } else if (esCompras) {
            const listasStr = lists.length > 0
                ? lists.map(l => {
                    const pending = l.items.filter(i => !i.completed).length;
                    return `- **${l.name}**: ${pending} pendientes de ${l.items.length} ítems`;
                  }).join('\n')
                : "No tienes listas de compras activas.";
            respuestaLocal = `📋 **Listas de Compras:**\n\n${listasStr}`;
        } else if (esPagos) {
            const fijosStr = fixedExpenses.length > 0
                ? fixedExpenses.map(e => `- **${e.title || e.description}**: $${e.amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Día ${e.dueDay} de cada mes)`).join('\n')
                : "No tienes gastos fijos registrados.";
            respuestaLocal = `📅 **Gastos Fijos y Suscripciones:**\n\n${fijosStr}`;
        } else if (esDeudas) {
            const deudasActivas = debts.filter(d => !d.isPaid);
            const deudasStr = deudasActivas.length > 0
                ? deudasActivas.map(d => {
                    const pagado = d.payments?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;
                    const restante = d.amount - pagado;
                    const tipo = d.type === "por_cobrar" ? "Por cobrar a" : "Por pagar a";
                    return `- ${tipo} **${d.personName}**: $${restante.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Original: $${d.amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
                  }).join('\n')
                : "No tienes deudas pendientes.";
            respuestaLocal = `🤝 **Deudas Pendientes:**\n\n${deudasStr}`;
        }

        if (respuestaLocal) {
            setTimeout(() => {
                if (isMountedRef.current) {
                    setMessages(prev => [...prev, { role: "ai", content: respuestaLocal }]);
                    setIsLoading(false);
                }
                pendingOperationsRef.current = false;
            }, 400);
            return;
        }

        try {
            // Preparar historial de conversación para contexto (excluir mensaje actual)
            const conversationHistory = messages.slice(-10).map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : msg.role,  // Mapear 'ai' a 'assistant' para Groq
                content: msg.content
            }));

            const token = auth.currentUser
                ? await auth.currentUser.getIdToken()
                : null;

            const operacionPendienteActiva = [...messages]
                .reverse()
                .find((m) => m.role === "ai" && m.pendingTransaction)?.pendingTransaction;

            const res = await fetchWithRetry("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    message: userMsg,
                    conversationHistory,
                    operacionPendiente: operacionPendienteActiva || null,
                    userContext: {
                        ...userContext,
                        apiRates
                    }
                }),
            });

            if (res.status === 401) {
                if (isMountedRef.current) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "ai",
                            content: "Tu sesión expiró. Inicia sesión de nuevo para continuar con Nami.",
                        },
                    ]);
                    setIsLoading(false);
                }
                pendingOperationsRef.current = false;
                return;
            }

            const rawData = await res.json();

            if (rawData.error) {
                if (isMountedRef.current) {
                    setMessages(prev => [...prev, { role: "ai", content: `Algo no salió bien: ${rawData.error}` }]);
                    setIsLoading(false);
                }
                return;
            }

            // Normalize input: Ensure we have an array of operations
            let operations: any[] = [];
            if (rawData.operations && Array.isArray(rawData.operations)) {
                operations = rawData.operations;
            } else if (Array.isArray(rawData)) {
                operations = rawData;
            } else if (rawData.intent || rawData.amount) {
                operations = [rawData];
            } else {
                operations = [];
            }

            const inferirPendienteSiPideCuenta = (textoRespuesta: string) => {
                if (!mensajePideCuenta(textoRespuesta)) return undefined;
                return inferirTransaccionDesdeTexto(userMsg) ?? undefined;
            };

            // Process each operation
            if (operations.length === 0) {
                const mensajeLlm = rawData.message || "No pude identificar ninguna operación.";
                const pareceConfirmacion = /registr[eé]|guard[eé]|listo|hecho|✅/i.test(mensajeLlm);
                const habiaPendiente = messages.some((m) => m.pendingTransaction);
                const aiMessage = pareceConfirmacion && habiaPendiente
                    ? "Entendí tu respuesta, pero no pude registrar el movimiento. Selecciona la cuenta con los botones de arriba o repite el gasto/ingreso completo indicando la cuenta."
                    : mensajeLlm;
                const pendingTx = inferirPendienteSiPideCuenta(mensajeLlm);
                setMessages(prev => [...prev, {
                    role: "ai",
                    content: aiMessage,
                    pendingTransaction: pendingTx,
                }]);
            } else {
                const results: { success: boolean; response: string; chartType?: "pie" | "bar"; pendingTransaction?: any }[] = [];
                for (const op of operations) {
                    const result = await processOperation(op);
                    if (typeof result === "string") {
                        results.push({ success: false, response: result });
                    } else {
                        results.push(result);
                    }
                }

                // ✅ FIX: Esperar un tick para que React actualice el contexto
                await new Promise(resolve => setTimeout(resolve, 100));

                // ✅ FIX: Verificar si TODAS las operaciones fallaron
                const allFailed = results.every(r => !r.success);
                const someSucceeded = results.some(r => r.success);
                const algunFallo = results.some(r => !r.success);
                let pendingTx = results.find(r => r.pendingTransaction)?.pendingTransaction;

                let aiMessage: string;
                if (someSucceeded && algunFallo) {
                    aiMessage = results
                        .map((r) => `${r.success ? "✅" : "⚠️"} ${r.response}`)
                        .join("\n");
                    if (!pendingTx) {
                        pendingTx = inferirPendienteSiPideCuenta(aiMessage)
                            ?? inferirPendienteSiPideCuenta(rawData.message || "");
                    }
                } else if (allFailed) {
                    aiMessage = results.length === 1
                        ? results[0].response
                        : `Hubo problemas con las operaciones:\n${results.map(r => `• ${r.response}`).join("\n")}`;
                    if (!pendingTx) {
                        pendingTx = inferirPendienteSiPideCuenta(aiMessage)
                            ?? inferirPendienteSiPideCuenta(rawData.message || "");
                    }
                } else {
                    aiMessage =
                        results.length === 1
                            ? results[0].response
                            : results.map((r) => `✅ ${r.response}`).join("\n");
                    if (rawData.message && results.every((r) => r.success)) {
                        aiMessage = rawData.message;
                    }
                }

                if (isMountedRef.current) {
                    setMessages(prev => [...prev, {
                        role: "ai",
                        content: aiMessage,
                        isTransaction: someSucceeded,
                        chartType: results.find(r => r.chartType)?.chartType,
                        pendingTransaction: pendingTx
                    }]);
                }

                // Toast de éxito
                const successCount = results.filter(r => r.success).length;
                if (successCount > 0) {
                    toast.success(successCount === 1 ? "Operación realizada con éxito" : `${successCount} operaciones realizadas`);
                }
            }

        } catch (error) {
            console.error(error)
            if (isMountedRef.current) {
                setMessages(prev => [...prev, { role: "ai", content: "Lo siento, hubo un error técnico. Por favor intenta de nuevo." }]);
            }
            toast.error("Error al procesar tu mensaje");
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
            pendingOperationsRef.current = false; // Reset pending flag
        }
    };

    const toggleListening = () => {
        // Si ya está escuchando, detener Y enviar
        if (isListeningRef.current && recognitionRef.current) {
            isListeningRef.current = false;
            setIsListening(false);
            recognitionRef.current.stop();
            
            // Enviar el mensaje acumulado después de un breve delay
            // para permitir que el 'onresult' final sea procesado por el navegador
            setTimeout(() => {
                const textToSend = inputRef.current || interimTranscript;
                if (textToSend.trim()) {
                    handleSend(textToSend.trim());
                } else {
                    setInterimTranscript("");
                }
            }, 400);
            return;
        }

        // Detectar iOS
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        // Chrome en iOS usa "CriOS", Firefox usa "FxiOS", Edge usa "EdgiOS"
        const isThirdPartyBrowserIOS = isIOS && (/CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent));

        if (isThirdPartyBrowserIOS) {
            toast.error("⚠️ En iPhone/iPad, el micrófono solo funciona en Safari. Abre esta página en Safari para usar el dictado.", {
                duration: 6000
            });
            return;
        }

        // Verificación de Contexto Seguro (HTTPS)
        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
            toast.error("El micrófono requiere HTTPS.");
            return;
        }

        const win = window as unknown as WindowWithSpeech;
        const SpeechRecognitionConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;

        if (!SpeechRecognitionConstructor) {
            toast.error("Navegador no compatible.");
            return;
        }

        // Crear nueva instancia
        const recognition = new SpeechRecognitionConstructor();
        recognitionRef.current = recognition;

        // Configuración móvil
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        recognition.lang = "es-ES";
        // IMPORTANTE: En móviles, 'continuous: true' causa 'service-not-allowed' o cortes.
        // Lo desactivamos en móviles para máxima compatibilidad.
        recognition.continuous = !isMobile;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        isListeningRef.current = true;
        setIsListening(true);

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (final) {
                // Actualizar input con el texto reconocido
                setInput(prev => prev ? prev + ' ' + final : final);
            }

            // Mostrar transcripción temporal en tiempo real
            setInterimTranscript(interim);
        };

        recognition.onerror = (event: SpeechRecognitionError) => {
            console.error("Speech Recognition Error:", event.error);

            if (event.error === 'not-allowed') {
                toast.error("Permiso de micrófono denegado. Revisa la configuración de tu navegador.");
            } else if (event.error === 'service-not-allowed') {
                toast.error("Error de servicio: Intenta usar Chrome/Safari nativo o verifica la app de Google.");
            } else if (event.error === 'network') {
                toast.error("Error de red. Verifica tu conexión.");
            } else if (event.error === 'no-speech') {
                // Ignorar no-speech, es normal
                return;
            } else if (event.error === 'aborted') {
                // Ignorar aborted puramente
                return;
            } else {
                toast.error(`Error de voz: ${event.error}`);
            }

            isListeningRef.current = false;
            setIsListening(false);
            setInterimTranscript("");
        };

        recognition.onend = () => {
            if (isListeningRef.current) {
                // Si el usuario no lo detuvo manualmente, reiniciar (muy común en móviles)
                try {
                    recognition.start();
                } catch (error) {
                    console.error("No se pudo reiniciar el micrófono:", error);
                    isListeningRef.current = false;
                    setIsListening(false);
                    setInterimTranscript("");
                }
            } else {
                setInterimTranscript("");
            }
        };

        try {
            recognition.start();
            toast.info("Escuchando... 🎙️");
        } catch (error) {
            console.error("Error al iniciar reconocimiento:", error);
            isListeningRef.current = false;
            setIsListening(false);
            toast.error("No se pudo iniciar el micrófono.");
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Cerrar asistente Nami" : "Abrir asistente Nami"}
                className={`fixed right-4 md:right-8 bottom-safe-fab bg-gradient-to-r from-violet-600 to-violet-500 text-white p-4 rounded-full shadow-lg z-[60] border border-violet-400/30 items-center justify-center transition-colors duration-300 ${isOpen ? 'hidden md:flex' : 'flex'}`}
            >
                <FiCpu size={26} />
                {/* Badge de alertas */}
                {alertasProactivas.length > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
                        {alertasProactivas.length}
                    </span>
                )}
            </button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="fixed bottom-0 right-0 md:bottom-24 md:right-8 w-full md:w-96 h-[80vh] md:h-[600px] bg-slate-900 border border-slate-700/50 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-lg z-50 flex flex-col overflow-hidden backdrop-blur-xl pb-safe"
                    >
                        {/* Header */}
                        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center backdrop-blur-md">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400">
                                    <FiCpu size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white leading-none">Nami</h3>
                                    <span className="text-xs text-slate-400">Asistente Financiero</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
{messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-tr from-violet-600 to-violet-600 text-white rounded-tr-sm'
                                            : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50'
                                            }`}>
                                            <div className="text-sm prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:rounded-lg prose-pre:p-2">
                                                <ReactMarkdown
                                                    components={{
                                                        ul: ({ ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                        ol: ({ ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                                        li: ({ ...props }) => <li className="mb-0.5" {...props} />,
                                                        p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                        strong: ({ ...props }) => <strong className="font-bold text-violet-300" {...props} />,
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>

                                                {/* Inline Chart */}
                                                {msg.chartType === 'pie' && (
                                                    <div className="mt-4 bg-slate-900/50 rounded-xl p-2 border border-slate-700/50">
                                                        <ExpensePieChart transactions={transactions} />
                                                    </div>
                                                )}

                                                {/* Cuentas sugeridas cuando la transacción está pendiente de cuenta */}
                                                {msg.pendingTransaction && cuentas && cuentas.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-700/30">
                                                        {filtrarCuentasParaBotones(cuentas, msg.pendingTransaction).map((cuenta) => (
                                                            <button
                                                                key={cuenta.id}
                                                                onClick={() => handleSelectPendingAccount(i, cuenta.id, cuenta.nombre)}
                                                                disabled={isLoading}
                                                                className="px-3 py-1.5 bg-slate-700 hover:bg-violet-600/30 active:scale-[0.97] border border-slate-600/50 rounded-xl text-xs font-semibold text-slate-200 hover:text-violet-300 hover:border-violet-500/30 transition-[transform,color] flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                                            >
                                                                <span>{obtenerSimboloMoneda(cuenta.moneda)}</span>
                                                                <span>{cuenta.nombre}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
{isLoading && (
                                <div
                                    className="flex justify-start"
                                >
                                    <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-sm border border-slate-700/50 flex gap-2 items-center">
                                        <div className="p-1.5 bg-violet-500/20 rounded-lg">
                                            <FiCpu size={14} className="text-violet-400 animate-spin" style={{ animationDuration: '3s' }} />
                                        </div>
                                        <span
                                            key={indicadorTexto}
                                            className="text-xs text-slate-400"
                                        >
                                            {indicadorTexto}
                                        </span>
                                        <span className="flex gap-1 ml-1">
                                            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions — Contextuales */}
                        <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700/30 flex gap-2 overflow-x-auto no-scrollbar mask-grad-right">
                            {accionesRapidas.map((action, i) => (
                                <button
                                    key={`${action.text}-${i}`}
                                    onClick={() => handleSend(action.query)}
                                    disabled={isLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-full text-xs text-slate-300 hover:bg-violet-600/20 hover:text-violet-300 hover:border-violet-500/30 transition-colors whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <span>{action.icon}</span>
                                    <span>{action.text}</span>
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-slate-800/80 border-t border-slate-700 backdrop-blur-md">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                                    placeholder={isListening && interimTranscript ? interimTranscript : "Escribe un gasto..."}
                                    disabled={isLoading}
                                    className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-violet-500/50 focus:bg-slate-900 transition-colors placeholder:text-slate-500 disabled:opacity-50"
                                />
                                <button
                                    onClick={toggleListening}
                                    className={`p-3 rounded-xl transition-colors shadow-lg ${isListening
                                        ? 'bg-red-500 text-white animate-pulse '
                                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/50'
                                        }`}
                                >
                                    <FiMic size={20} />
                                </button>
                                <button
                                    onClick={() => handleSend()}
                                    disabled={isLoading || !input.trim()}
                                    className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg "
                                >
                                    <FiSend size={20} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
