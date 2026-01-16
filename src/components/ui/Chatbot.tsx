"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { FiMessageSquare, FiMic, FiSend, FiX, FiCpu } from "react-icons/fi";
import { useTransactions } from "@/contexts/TransactionsContext";
import { useDebts } from "@/hooks/useDebts";
import { useGoals } from "@/hooks/useGoals";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useFixedExpenses } from "@/hooks/useFixedExpenses";
import { useUserData } from "@/contexts/UserDataContext";
import { getBCVRate } from "@/lib/currency";
import { createVenezuelaDate } from "@/lib/timezone";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import ExpensePieChart from "./ExpensePieChart";

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
};

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const inputRef = useRef("");

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
    const { debts, addDebt, addPayment, deleteDebt, updateDebt } = useDebts();
    const { goals, addGoal, addContribution, updateGoal, deleteGoal } = useGoals();
    const { lists, createList, addItem, deleteList, updateItem, deleteItem, updateListName } = useShoppingLists();
    const { fixedExpenses, addFixedExpense, deleteFixedExpense, updateFixedExpense } = useFixedExpenses();
    const { userData, updateUserData } = useUserData();

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

        // Balance total = (ahorros + todos los ingresos) - todos los gastos
        const totalIncome = transactions
            .filter(t => t.type === 'ingreso')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'gasto')
            .reduce((sum, t) => sum + t.amount, 0);

        const savingsBalance = userData.savingsPhysical + userData.savingsUSDT;
        const balance = savingsBalance + totalIncome - totalExpenses;

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
            fixedExpenses: fixedExpenses.map((e: any) => ({
                name: e.title || e.description,
                amount: e.amount,
                dueDay: e.dueDay
            })),
            shoppingLists: lists.map((l: any) => ({
                name: l.name,
                totalItems: l.items.length,
                pendingItems: l.items.filter((i: any) => !i.completed).length
            })),
            monthlyBudget: userData.monthlyBudget || 0,
            monthlySalary: userData.monthlySalary || 0,
            topCategories: Object.entries(
                monthlyTransactions
                    .filter(t => t.type === 'gasto')
                    .reduce((acc: any, t) => {
                        acc[t.category] = (acc[t.category] || 0) + t.amount;
                        return acc;
                    }, {})
            )
                .sort((a: any, b: any) => b[1] - a[1])
                .slice(0, 3)
                .map(([category, amount]: any) => ({ category, amount: parseFloat(amount.toFixed(2)) })),

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
                }))
        };
    }, [transactions, userData, goals, debts, fixedExpenses, lists]);

    // 🔍 Debug: Log cuando el contexto cambia
    useEffect(() => {
        console.log('📊 UserContext actualizado:', {
            balance: userContext.balance,
            monthlyExpense: userContext.monthlyExpense,
            lastTransaction: userContext.lastTransaction,
            transactionsCount: transactions.length,
            goalsCount: goals.length,
            debtsCount: debts.length
        });
    }, [userContext, transactions.length, goals.length, debts.length]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Cleanup: detener reconocimiento al desmontar o cerrar
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
        };
    }, []);

    // Detener reconocimiento al cerrar el modal
    useEffect(() => {
        if (!isOpen && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            setInterimTranscript("");
        }
    }, [isOpen]);

    const processOperation = async (data: any) => {
        let success = false;
        let aiResponse = "";

        switch (data.intent) {
            case "transaction":
                let amountUSD = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
                let exchangeRate = 1;
                let originalAmount = undefined;

                // Caso especial: "Recibí 5$ pero en bolívares"
                if (data.currency === "VES" && data.amountInUSD) {
                    // El usuario dijo "5 dólares en bolívares"
                    const rate = await getBCVRate();
                    exchangeRate = rate;
                    const usdAmount = parseFloat(data.amountInUSD);
                    originalAmount = usdAmount * rate; // Convertir USD a VES
                    amountUSD = usdAmount; // Guardar en USD
                } else if (data.currency === "VES") {
                    // Caso normal: "100 bolívares"
                    const rate = await getBCVRate();
                    exchangeRate = rate;
                    originalAmount = amountUSD;
                    amountUSD = parseFloat((amountUSD / rate).toFixed(2));
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
                    type: (data.type as "ingreso" | "gasto") || "gasto",
                    category: data.category,
                    description: data.description || "Transacción rápida con IA",
                    date: transactionDate, // ✅ Usar fecha validada
                    currency: data.currency as "USD" | "VES" || "USD",
                    originalAmount: originalAmount,
                    exchangeRate: exchangeRate
                } as any);

                success = !!transactionId;
                if (success && transactionId) {
                    // ✅ FIX: Guardar el ID de la transacción que ACABAMOS de crear
                    setLastTransactionId(transactionId);
                }

                const amountDisplay = data.currency === "VES" && originalAmount
                    ? `Bs. ${originalAmount.toFixed(2)}`
                    : `$${amountUSD}`;
                aiResponse = `Registré el ${data.type} de ${amountDisplay} (${data.category}).`;
                break;

            case "new_debt":
                let debtOriginalAmount = undefined;
                let debtExchangeRate = 1;
                let debtAmount = parseFloat(data.amount);

                if (data.currency === "VES") {
                    const rate = await getBCVRate();
                    debtExchangeRate = rate;
                    debtOriginalAmount = parseFloat(data.amount); // Monto en Bs
                    debtAmount = parseFloat((debtOriginalAmount / rate).toFixed(2)); // Guardar en USD
                }

                success = (await addDebt({
                    personName: data.person,
                    amount: debtAmount,
                    type: data.type,
                    description: data.description || "Deuda registrada por Nami",
                    currency: data.currency || "USD",
                    originalAmount: debtOriginalAmount,
                    exchangeRate: debtExchangeRate
                } as any)) || false;

                const debtDisplay = data.currency === "VES"
                    ? `Bs. ${debtOriginalAmount?.toFixed(2)} ($${debtAmount})`
                    : `$${debtAmount}`;

                aiResponse = `Creé la deuda de ${data.person} por ${debtDisplay}.`;
                break;

            case "new_fixed_expense":
                success = (await addFixedExpense({
                    title: data.name,
                    amount: parseFloat(data.amount),
                    dueDay: parseInt(data.dueDay),
                    category: "Servicios",
                    description: data.description || "Gasto fijo registrado por Nami"
                } as any)) || false;

                aiResponse = `He programado el gasto fijo "${data.name}" por $${data.amount} para el día ${data.dueDay} de cada mes.`;
                break;

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
                        if (data.field === 'amount') updates.amount = parseFloat(data.value);
                        await updateDebt(target.id, updates);
                        aiResponse = `Actualicé la deuda de ${target.personName}.`;
                        success = true;
                    } else aiResponse = `No encontré la deuda de "${data.name}".`;
                } else if (data.itemType === 'goal') {
                    const target = goals.find(g => g.name.toLowerCase().includes(data.name.toLowerCase()));
                    if (target) {
                        const updates: any = {};
                        if (data.field === 'amount') updates.targetAmount = parseFloat(data.value);
                        if (data.field === 'name') updates.name = data.value;
                        await updateGoal(target.id, updates);
                        aiResponse = `Actualicé la meta "${target.name}".`;
                        success = true;
                    } else aiResponse = `No encontré la meta "${data.name}".`;
                } else if (data.itemType === 'fixed_expense') {
                    const target = fixedExpenses.find(f => (f.title || f.description || "").toLowerCase().includes(data.name.toLowerCase()));
                    if (target) {
                        const updates: any = {};
                        if (data.field === 'amount') updates.amount = parseFloat(data.value);
                        if (data.field === 'day') updates.dueDay = parseInt(data.value);
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
                    updates.savingsPhysical = parseFloat(data.amount);
                    confirmMsg = `Actualicé tus ahorros físicos a $${data.amount}.`;
                } else if (data.type === 'digital') {
                    updates.savingsUSDT = parseFloat(data.amount);
                    confirmMsg = `Actualicé tus ahorros digitales a $${data.amount}.`;
                } else if (data.type === 'budget') {
                    updates.monthlyBudget = parseFloat(data.amount);
                    confirmMsg = `Fijé tu presupuesto mensual en $${data.amount}.`;
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
                    if (data.action === 'update_amount') updates.amount = parseFloat(data.newValue);
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
            case "warning":
            case "suggestion":
                aiResponse = data.response;
                success = true;
                break;

            default:
                // Fallback legacy support
                if (data.amount && data.category) {
                    const legacyTransactionId = await addTransaction({
                        amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
                        type: (data.type as "ingreso" | "gasto") || "gasto",
                        category: data.category,
                        description: data.description || "Transacción rápida con IA",
                        date: createVenezuelaDate(),
                        currency: "USD"
                    } as any);
                    success = !!legacyTransactionId; // ✅ Check if ID was returned
                    aiResponse = "Transacción registrada.";
                } else {
                    aiResponse = "No entendí muy bien esta operación.";
                }
        }
        return { success, response: aiResponse };
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

        try {
            // Preparar historial de conversación para contexto (excluir mensaje actual)
            const conversationHistory = messages.slice(-6).map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : msg.role,  // Mapear 'ai' a 'assistant' para Groq
                content: msg.content
            }));

            // ✅ Obtener tasa BCV actual para el contexto
            let bcvRate = 56; // Valor por defecto
            try {
                bcvRate = await getBCVRate();
            } catch (error) {
                console.warn('No se pudo obtener tasa BCV, usando valor por defecto:', error);
            }

            // ✅ Añadir tasa BCV al contexto
            const enrichedContext = {
                ...userContext,
                bcvRate: parseFloat(bcvRate.toFixed(2))
            };

            const res = await fetchWithRetry("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    conversationHistory,
                    userContext: enrichedContext  // ✨ Enviar contexto enriquecido con tasa BCV
                }),
            });

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
            } else {
                operations = [rawData]; // Single object fallback
            }

            // Process each operation
            if (operations.length === 0) {
                // Si no hay operaciones pero hay mensaje, mostrarlo
                const aiMessage = rawData.message || "No pude identificar ninguna operación.";
                setMessages(prev => [...prev, { role: "ai", content: aiMessage }]);
            } else {
                const results: { success: boolean; response: string; chartType?: "pie" | "bar" }[] = [];
                for (const op of operations) {
                    const result = await processOperation(op);
                    results.push(result as any);
                }

                // ✅ FIX: Esperar un tick para que React actualice el contexto
                await new Promise(resolve => setTimeout(resolve, 100));

                // Usar el mensaje natural de la IA si está disponible
                const aiMessage = rawData.message ||
                    (results.length === 1
                        ? results[0].response
                        : `Procesé ${results.length} operaciones:\n${results.map(r => `• ${r.response}`).join("\n")}`
                    );

                if (isMountedRef.current) {
                    setMessages(prev => [...prev, {
                        role: "ai",
                        content: aiMessage,
                        isTransaction: results.some(r => r.success),
                        chartType: results.find(r => r.chartType)?.chartType
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
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            setInterimTranscript("");
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
            // Enviar el mensaje acumulado
            setTimeout(() => handleSend(), 100);
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

            setIsListening(false);
            setInterimTranscript("");
        };

        recognition.onend = () => {
            // Solo desactivar si no se reinicia automáticamente (lógica de continuous loop si fuese necesario)
            setIsListening(false);
            setInterimTranscript("");
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
        };

        try {
            recognition.start();
            toast.info("Escuchando... 🎙️");
        } catch (error) {
            console.error("Error al iniciar reconocimiento:", error);
            setIsListening(false);
            toast.error("No se pudo iniciar el micrófono.");
        }
    };

    return (
        <>
            {/* Floating Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 md:bottom-8 md:right-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 rounded-full shadow-2xl z-50 border border-violet-400/30 flex items-center justify-center"
            >
                <FiCpu size={28} />
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        className="fixed bottom-0 right-0 md:bottom-24 md:right-8 w-full md:w-96 h-[80vh] md:h-[600px] bg-slate-900 border border-slate-700/50 rounded-t-3xl md:rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-xl"
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
                            {messages.length === 0 && (
                                <div className="text-center text-slate-500 mt-10 px-6">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-500">
                                        <FiCpu size={32} />
                                    </div>
                                    <p className="text-white font-medium mb-2">¡Hola! Soy Nami.</p>
                                    <p className="text-sm mb-6">¿En qué puedo ayudarte hoy?</p>

                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            "📊 ¿Cuánto he gastado este mes?",
                                            "💰 Registrar gasto en comida",
                                            "🎯 Ver estado de mis metas",
                                            "💵 Agregar ingreso de salario"
                                        ].map((suggestion, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSend(suggestion)}
                                                className="text-xs bg-slate-800 hover:bg-slate-700 text-violet-300 py-3 px-4 rounded-xl border border-slate-700/50 transition-all text-left flex items-center gap-2"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <AnimatePresence mode="popLayout">
                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-tr-sm'
                                            : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50'
                                            }`}>
                                            <div className="text-sm prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:rounded-lg prose-pre:p-2">
                                                <ReactMarkdown
                                                    components={{
                                                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                                        li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
                                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="font-bold text-violet-300" {...props} />,
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
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-sm border border-slate-700/50 flex gap-1.5 items-center">
                                        <span className="text-xs text-slate-400 mr-2">Pensando...</span>
                                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions */}
                        <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700/30 flex gap-2 overflow-x-auto no-scrollbar mask-grad-right">
                            {[
                                { icon: "💰", text: "Balance", query: "¿Cuál es mi saldo actual?" },
                                { icon: "📊", text: "Gastos", query: "¿Cuánto he gastado este mes y en qué?" },
                                { icon: "📅", text: "Pagos", query: "¿Tengo pagos próximos?" },
                                { icon: "💡", text: "Tips", query: "Dame un consejo financiero breve" },
                                { icon: "📈", text: "Análisis", query: "Analiza mis finanzas este mes" }
                            ].map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(action.query)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-full text-xs text-slate-300 hover:bg-violet-600/20 hover:text-violet-300 hover:border-violet-500/30 transition-all whitespace-nowrap"
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
                                    className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-500 disabled:opacity-50"
                                />
                                <button
                                    onClick={toggleListening}
                                    className={`p-3 rounded-xl transition-all shadow-lg ${isListening
                                        ? 'bg-red-500 text-white animate-pulse shadow-red-500/20'
                                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/50'
                                        }`}
                                >
                                    <FiMic size={20} />
                                </button>
                                <button
                                    onClick={() => handleSend()}
                                    disabled={isLoading || !input.trim()}
                                    className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-violet-500/20"
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
