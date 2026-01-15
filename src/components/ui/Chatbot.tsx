"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { FiMessageSquare, FiMic, FiSend, FiX, FiCpu } from "react-icons/fi";
import { useTransactions } from "@/contexts/TransactionsContext";
import { useDebts } from "@/hooks/useDebts";
import { useGoals } from "@/hooks/useGoals";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useUserData } from "@/contexts/UserDataContext";
import { getBCVRate } from "@/lib/currency";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

    // Mantener inputRef sincronizado con input state para acceso en closures de reconocimiento voz
    useEffect(() => {
        inputRef.current = input;
    }, [input]);

    // Hooks
    const { transactions, addTransaction, deleteTransaction } = useTransactions();
    const { debts, addDebt, addPayment } = useDebts();
    const { goals, addGoal, addContribution } = useGoals();
    const { lists, createList, addItem } = useShoppingLists();
    const { userData } = useUserData();

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

        // Balance total
        const balance = userData.savingsPhysical + userData.savingsUSDT;

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
            debts: debts.map(d => ({
                person: d.personName,
                amount: d.amount
            })),
            lastTransaction
        };
    }, [transactions, userData, goals, debts]);

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

                const transactionId = await addTransaction({
                    amount: amountUSD,
                    type: (data.type as "ingreso" | "gasto") || "gasto",
                    category: data.category,
                    description: data.description || "Transacción rápida con IA",
                    date: data.date ? new Date(data.date) : new Date(),
                    currency: data.currency as "USD" | "VES" || "USD",
                    originalAmount: originalAmount,
                    exchangeRate: exchangeRate
                } as any);

                success = !!transactionId;
                if (success) {
                    // Guardar referencia de la última transacción para correcciones
                    if (userContext.lastTransaction) {
                        setLastTransactionId(userContext.lastTransaction.id);
                    }
                }

                const amountDisplay = data.currency === "VES" && originalAmount
                    ? `Bs. ${originalAmount.toFixed(2)}`
                    : `$${amountUSD}`;
                aiResponse = `Registré el ${data.type} de ${amountDisplay} (${data.category}).`;
                break;

            case "new_debt":
                success = (await addDebt({
                    personName: data.person,
                    amount: parseFloat(data.amount),
                    type: data.type,
                    description: data.description || "Deuda registrada por Nami",
                } as any)) || false;
                aiResponse = `Creé la deuda de ${data.person} por ${data.amount}.`;
                break;

            case "pay_debt":
                const debtTarget = debts.find(d => d.personName.toLowerCase().includes(data.person.toLowerCase()));
                if (debtTarget) {
                    success = (await addPayment(debtTarget.id, {
                        amount: parseFloat(data.amount),
                        date: new Date(),
                        note: "Pago registrado por Nami"
                    })) || false;
                    aiResponse = `Registré el pago a ${debtTarget.personName}.`;
                } else {
                    aiResponse = `No encontré ninguna deuda asociada a "${data.person}".`;
                    success = false;
                }
                break;

            case "new_goal":
                await addGoal(data.name, parseFloat(data.targetAmount), data.deadline);
                success = true;
                aiResponse = `Creada la meta "${data.name}" por ${data.targetAmount}.`;
                break;

            case "contribute_goal":
                const goalTarget = goals.find(g => g.name.toLowerCase().includes(data.name.toLowerCase()));
                if (goalTarget) {
                    try {
                        await addContribution(goalTarget.id, goalTarget.name, parseFloat(data.amount), "physical");
                        success = true;
                        aiResponse = `Añadí ${data.amount} a la meta "${goalTarget.name}".`;
                    } catch (e) { success = false; console.error(e); }
                } else {
                    aiResponse = `No encontré la meta "${data.name}".`;
                    success = false;
                }
                break;

            case "shopping_item":
                let listId = "";
                const targetList = data.listName
                    ? lists.find(l => l.name.toLowerCase().includes(data.listName.toLowerCase()))
                    : lists[0];

                if (targetList) {
                    listId = targetList.id;
                } else {
                    await createList(data.listName || "Lista General");
                    aiResponse = "Creé una nueva lista. Por favor repite el ítem.";
                    success = false;
                    return { success, response: aiResponse };
                }

                if (listId) {
                    await addItem(listId, {
                        name: data.item,
                        quantity: data.quantity || 1,
                        price: 0
                    });
                    success = true;
                    aiResponse = `Agregué ${data.quantity || 1} ${data.item} a la lista.`;
                }
                break;

            case "query":
            case "correct_transaction":
            case "warning":
            case "suggestion":
                aiResponse = data.response;
                success = true;
                break;

            default:
                // Fallback legacy support
                if (data.amount && data.category) {
                    success = (await addTransaction({
                        amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
                        type: (data.type as "ingreso" | "gasto") || "gasto",
                        category: data.category,
                        description: data.description || "Transacción rápida con IA",
                        date: new Date(),
                        currency: "USD"
                    } as any)) || false;
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

    const handleSend = async () => {
        const userMsg = inputRef.current; // Usar ref para evitar stale closures en reconocimiento de voz
        if (!userMsg.trim()) return;

        // const userMsg = input; // Ya obtenido del ref
        setInput("");
        setInterimTranscript("");
        const newMessages = [...messages, { role: "user" as const, content: userMsg }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            // Preparar historial de conversación para contexto
            const conversationHistory = newMessages.slice(-6).map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const res = await fetchWithRetry("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    conversationHistory,
                    userContext  // ✨ Enviar contexto del usuario
                }),
            });

            const rawData = await res.json();

            if (rawData.error) {
                setMessages(prev => [...prev, { role: "ai", content: `Algo no salió bien: ${rawData.error}` }]);
                setIsLoading(false);
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
                const results: { success: boolean; response: string }[] = [];
                for (const op of operations) {
                    const result = await processOperation(op);
                    results.push(result);
                }

                // Usar el mensaje natural de la IA si está disponible
                const aiMessage = rawData.message ||
                    (results.length === 1
                        ? results[0].response
                        : `Procesé ${results.length} operaciones:\n${results.map(r => `• ${r.response}`).join("\n")}`
                    );

                setMessages(prev => [...prev, {
                    role: "ai",
                    content: aiMessage,
                    isTransaction: results.some(r => r.success)
                }]);

                // Toast de éxito
                const successCount = results.filter(r => r.success).length;
                if (successCount > 0) {
                    toast.success(successCount === 1 ? "Operación realizada con éxito" : `${successCount} operaciones realizadas`);
                }
            }

        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, { role: "ai", content: "Lo siento, hubo un error técnico. Por favor intenta de nuevo." }]);
            toast.error("Error al procesar tu mensaje");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleListening = () => {
        // Si ya está escuchando, detener
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            setInterimTranscript("");
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
            return;
        }

        const win = window as unknown as WindowWithSpeech;
        const SpeechRecognitionConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;

        if (!SpeechRecognitionConstructor) {
            toast.error("Tu navegador no soporta reconocimiento de voz.");
            return;
        }

        // Crear nueva instancia y guardar referencia
        recognitionRef.current = new SpeechRecognitionConstructor();
        const recognition = recognitionRef.current;

        recognition.lang = "es-ES";
        recognition.continuous = true; // Modo continuo
        recognition.interimResults = true; // Resultados en tiempo real
        recognition.maxAlternatives = 1;

        setIsListening(true);

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';

            // Procesar todos los resultados
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            // Actualizar input con texto final
            if (final) {
                setInput(prev => prev ? prev + ' ' + final : final);

                // Reiniciar timer de silencio
                if (silenceTimeoutRef.current) {
                    clearTimeout(silenceTimeoutRef.current);
                }

                // Auto-send después de 2 segundos de silencio
                silenceTimeoutRef.current = setTimeout(() => {
                    if (recognitionRef.current) {
                        recognitionRef.current.stop();
                    }
                    // Pequeño delay para asegurar que el input se actualizó
                    setTimeout(() => {
                        handleSend();
                    }, 100);
                }, 2000);
            }

            // Mostrar transcripción temporal
            setInterimTranscript(interim);
        };

        recognition.onerror = (event: SpeechRecognitionError) => {
            console.error(event.error);
            if (event.error !== 'aborted' && event.error !== 'no-speech') {
                toast.error("Error al escuchar: " + event.error);
            }
            setIsListening(false);
            setInterimTranscript("");
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimTranscript("");
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
        };

        try {
            recognition.start();
            toast.info("Escuchando... Habla ahora");
        } catch (error) {
            console.error("Error al iniciar reconocimiento:", error);
            setIsListening(false);
            toast.error("No se pudo iniciar el reconocimiento de voz");
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
                                <div className="text-center text-slate-500 mt-20 px-6">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-500">
                                        <FiCpu size={32} />
                                    </div>
                                    <p className="text-white font-medium mb-2">¡Hola! Soy Nami.</p>
                                    <p className="text-sm">Puedo ayudarte a registrar tus gastos. Prueba diciendo:</p>
                                    <p className="text-xs mt-3 italic text-violet-400 bg-violet-500/10 p-2 rounded-lg">"Gasté 5 dólares en comida"</p>
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${msg.role === 'user'
                                        ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-tr-sm'
                                        : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-sm border border-slate-700/50 flex gap-1.5 items-center">
                                        <span className="text-xs text-slate-400 mr-2">Pensando...</span>
                                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
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
                                    onClick={handleSend}
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
