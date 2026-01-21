"use client";

import { useState, useEffect } from "react";
import { useDebts, Debt, Payment } from "@/hooks/useDebts";
import { FiPlus, FiTrash2, FiCheckCircle, FiDollarSign, FiUser, FiInfo, FiArrowUpRight, FiArrowDownLeft, FiClock, FiActivity, FiSearch, FiEdit2, FiChevronRight, FiCreditCard } from "react-icons/fi";
import PaginationControls from "@/components/ui/PaginationControls";
import Swal from "sweetalert2";
import { getBCVRate } from "@/lib/currency";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export default function DebtsPage() {
    const { debts, loadingDebts, addDebt, deleteDebt, updateDebt, addPayment } = useDebts();
    const [bcvRate, setBcvRate] = useState(0);
    const [activeTab, setActiveTab] = useState<"por_cobrar" | "por_pagar">("por_cobrar");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    useEffect(() => {
        getBCVRate().then(setBcvRate);
    }, []);

    const filteredDebts = debts.filter(d => {
        const matchesType = d.type === activeTab;
        const matchesSearch = d.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesType && matchesSearch;
    });

    // Pagination
    const totalPages = Math.ceil(filteredDebts.length / itemsPerPage);
    const paginatedDebts = filteredDebts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


    // Calculate totals (should align with search or raw? Usually totals at top align with TAB, regardless of search? 
    // The user code previously calculated totals based on 'debts.filter(type)'. Let's keep totals global for the tab, not affected by search.)
    const totalReceivable = debts.filter(d => d.type === "por_cobrar").reduce((acc, d) => acc + (d.amount - d.payments.reduce((pAcc, p) => pAcc + p.amount, 0)), 0);
    const totalPayable = debts.filter(d => d.type === "por_pagar").reduce((acc, d) => acc + (d.amount - d.payments.reduce((pAcc, p) => pAcc + p.amount, 0)), 0);

    const handleAddDebt = async () => {
        const { value: formValues } = await Swal.fire({
            title: activeTab === "por_cobrar" ? 'Nueva Deuda a mi favor' : 'Nueva Deuda a pagar',
            html: `
                <div class="flex flex-col gap-4 text-left">
                    <div>
                        <label class="text-xs text-slate-400 font-bold uppercase block mb-1">
                            ${activeTab === "por_cobrar" ? 'Deudor (¿Quién me debe?)' : 'Acreedor (¿A quién le debo?)'}
                        </label>
                        <input id="swal-person" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors" placeholder="Nombre de la persona">
                    </div>

                    <div>
                        <label class="text-xs text-slate-400 font-bold uppercase block mb-1">Monto</label>
                        <div class="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl p-1.5 focus-within:border-emerald-500 transition-colors">
                            <input id="swal-amount" type="number" step="0.01" class="w-full bg-transparent border-none text-white text-lg px-2 focus:ring-0 focus:outline-none placeholder-slate-600" placeholder="0.00">
                            <div class="flex bg-slate-700/50 rounded-lg p-1 shrink-0 gap-1">
                                <button type="button" id="btn-usd" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-lg transition-all">USD</button>
                                <button type="button" id="btn-bs" class="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-600 transition-all">Bs</button>
                            </div>
                        </div>
                        <div id="conversion-text" class="text-right text-xs text-slate-500 mt-2 font-mono">≈ Bs. 0.00</div>
                    </div>

                    <div>
                        <label class="text-xs text-slate-400 font-bold uppercase block mb-1">Fecha Límite (Opcional)</label>
                        <input id="swal-date" type="date" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors">
                    </div>

                    <div>
                        <label class="text-xs text-slate-400 font-bold uppercase block mb-1">Nota / Descripción</label>
                        <input id="swal-desc" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors" placeholder="Ej: Préstamo personal">
                    </div>
                </div>
            `,
            focusConfirm: false,
            background: "#1f2937",
            color: "#fff",
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            confirmButtonColor: '#10b981',
            cancelButtonText: 'Cancelar',
            cancelButtonColor: '#374151',
            customClass: {
                popup: 'rounded-3xl border border-slate-700 shadow-2xl',
                input: 'text-white'
            },
            didOpen: () => {
                const inputAmount = document.getElementById('swal-amount') as HTMLInputElement;
                const btnUsd = document.getElementById('btn-usd') as HTMLButtonElement;
                const btnBs = document.getElementById('btn-bs') as HTMLButtonElement;
                const conversionText = document.getElementById('conversion-text') as HTMLDivElement;

                let isUsd = true;

                const updateConversion = () => {
                    const val = parseFloat(inputAmount.value);
                    if (isNaN(val) || bcvRate <= 0) {
                        conversionText.innerText = '≈ 0.00';
                        return;
                    }

                    if (isUsd) {
                        const bsVal = val * bcvRate;
                        conversionText.innerText = `≈ Bs. ${bsVal.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                    } else {
                        const usdVal = val / bcvRate;
                        conversionText.innerText = `≈ $${usdVal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                    }
                };

                const setMode = (mode: 'USD' | 'Bs') => {
                    if (mode === 'USD') {
                        isUsd = true;
                        btnUsd.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-lg transition-all";
                        btnBs.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-600 transition-all";

                        // Convert currently displayed value from Bs to USD
                        const currentVal = parseFloat(inputAmount.value);
                        if (!isNaN(currentVal) && bcvRate > 0) {
                            inputAmount.value = (currentVal / bcvRate).toFixed(2);
                        }
                    } else {
                        isUsd = false;
                        btnBs.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-lg transition-all";
                        btnUsd.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-600 transition-all";

                        // Convert currently displayed value from USD to Bs
                        const currentVal = parseFloat(inputAmount.value);
                        if (!isNaN(currentVal) && bcvRate > 0) {
                            inputAmount.value = (currentVal * bcvRate).toFixed(2);
                        }
                    }
                    updateConversion();
                };

                btnUsd.addEventListener('click', () => setMode('USD'));
                btnBs.addEventListener('click', () => setMode('Bs'));
                inputAmount.addEventListener('input', updateConversion);
            },
            preConfirm: () => {
                const person = (document.getElementById('swal-person') as HTMLInputElement).value;
                const amountVal = parseFloat((document.getElementById('swal-amount') as HTMLInputElement).value);
                const date = (document.getElementById('swal-date') as HTMLInputElement).value;
                const desc = (document.getElementById('swal-desc') as HTMLInputElement).value;
                const btnUsd = document.getElementById('btn-usd') as HTMLButtonElement;

                const isUsd = btnUsd.classList.contains('bg-emerald-500');

                let finalAmount = amountVal;
                if (!isUsd && bcvRate > 0) {
                    finalAmount = amountVal / bcvRate;
                }

                return [person, finalAmount, date, desc];
            }
        });

        if (formValues) {
            const [person, amount, date, desc] = formValues;

            if (!person || !amount) {
                Swal.fire({ icon: 'error', title: 'Faltan datos', text: 'Nombre y monto son obligatorios.', background: "#1f2937", color: "#fff" });
                return;
            }

            const debtAmount = parseFloat(amount);

            await addDebt({
                personName: person,
                amount: debtAmount,
                type: activeTab,
                description: desc,
                dueDate: date ? new Date(date) : undefined,
            });

            Swal.fire({
                icon: "success",
                title: "Registrado",
                text: "Se ha registrado la deuda exitosamente.",
                timer: 2000,
                showConfirmButton: false,
                background: "#1f2937",
                color: "#fff",
            });
        }
    };

    const handleAddPayment = async (debt: Debt) => {
        const totalPaid = debt.payments.reduce((a, b) => a + b.amount, 0);
        const remaining = debt.amount - totalPaid;

        const { value: formValues } = await Swal.fire({
            title: 'Registrar Abono',
            html: `
                <div class="text-left mb-4 text-sm text-slate-400 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div class="flex justify-between items-center mb-1">
                        <span>Total deuda:</span>
                        <span class="text-white font-bold">$${debt.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span>Restante:</span>
                        <div>
                            <span class="text-emerald-400 font-bold text-lg">$${remaining.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                            <span class="text-xs text-slate-500 ml-1">(${remaining * bcvRate > 0 ? '≈ Bs. ' + (remaining * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''})</span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-4 text-left">
                     <div>
                        <label class="text-xs text-slate-400 font-bold uppercase block mb-1">Monto del Abono</label>
                        <div class="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl p-1.5 focus-within:border-emerald-500 transition-colors">
                             <input id="swal-payment-amount" type="number" step="0.01" max="${remaining}" class="w-full bg-transparent border-none text-white text-lg px-2 focus:ring-0 focus:outline-none placeholder-slate-600" placeholder="0.00">
                            <div class="flex bg-slate-700/50 rounded-lg p-1 shrink-0 gap-1">
                                <button type="button" id="btn-pay-usd" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-lg transition-all">USD</button>
                                <button type="button" id="btn-pay-bs" class="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-600 transition-all">Bs</button>
                            </div>
                        </div>
                        <div id="payment-conversion-text" class="text-right text-xs text-slate-500 mt-2 font-mono">≈ Bs. 0.00</div>
                    </div>

                    <div>
                        <label class="text-xs text-slate-400 font-bold uppercase block mb-1">Fecha del Pago</label>
                        <input id="swal-payment-date" type="date" value="${new Date().toISOString().split('T')[0]}" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors">
                    </div>

                    <div class="mt-2 border-t border-slate-700 pt-4">
                        <p class="text-xs font-bold text-slate-400 mb-2 uppercase">Últimos Pagos</p>
                        <div class="space-y-2">
                        ${debt.payments.length > 0 ?
                    debt.payments.slice(-3).reverse().map(p =>
                        `<div class="flex justify-between items-center bg-slate-800/30 p-2 rounded-lg text-xs text-slate-300">
                                    <div class="flex items-center gap-2">
                                        <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <span>${new Date(p.date).toLocaleDateString()}</span>
                                    </div>
                                    <span class="font-bold text-white">$${p.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                 </div>`
                    ).join('')
                    : '<p class="text-xs text-slate-500 italic text-center py-2">No hay pagos registrados</p>'
                }
                        </div>
                    </div>
                </div>
            `,
            focusConfirm: false,
            background: "#1f2937",
            color: "#fff",
            showCancelButton: true,
            confirmButtonText: 'Registrar Pago',
            confirmButtonColor: '#10b981',
            cancelButtonText: 'Cancelar',
            cancelButtonColor: '#374151',
            customClass: {
                popup: 'rounded-3xl border border-slate-700 shadow-2xl',
                input: 'text-white'
            },
            didOpen: () => {
                const inputAmount = document.getElementById('swal-payment-amount') as HTMLInputElement;
                const btnUsd = document.getElementById('btn-pay-usd') as HTMLButtonElement;
                const btnBs = document.getElementById('btn-pay-bs') as HTMLButtonElement;
                const conversionText = document.getElementById('payment-conversion-text') as HTMLDivElement;

                let isUsd = true;

                const updateConversion = () => {
                    const val = parseFloat(inputAmount.value);
                    if (isNaN(val) || bcvRate <= 0) {
                        conversionText.innerText = '≈ 0.00';
                        return;
                    }

                    if (isUsd) {
                        const bsVal = val * bcvRate;
                        conversionText.innerText = `≈ Bs. ${bsVal.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                    } else {
                        const usdVal = val / bcvRate;
                        conversionText.innerText = `≈ $${usdVal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                    }
                };

                const setMode = (mode: 'USD' | 'Bs') => {
                    if (mode === 'USD') {
                        isUsd = true;
                        btnUsd.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-lg transition-all";
                        btnBs.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-600 transition-all";

                        // Convert value in input from BS to USD
                        const currentVal = parseFloat(inputAmount.value);
                        if (!isNaN(currentVal) && bcvRate > 0) {
                            inputAmount.value = (currentVal / bcvRate).toFixed(2);
                        }
                    } else {
                        isUsd = false;
                        btnBs.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-lg transition-all";
                        btnUsd.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-600 transition-all";

                        // Convert value in input from USD to BS
                        const currentVal = parseFloat(inputAmount.value);
                        if (!isNaN(currentVal) && bcvRate > 0) {
                            inputAmount.value = (currentVal * bcvRate).toFixed(2);
                        }
                    }
                    updateConversion();
                };

                btnUsd.addEventListener('click', () => setMode('USD'));
                btnBs.addEventListener('click', () => setMode('Bs'));
                inputAmount.addEventListener('input', updateConversion);
            },
            preConfirm: () => {
                const amountVal = parseFloat((document.getElementById('swal-payment-amount') as HTMLInputElement).value);
                const date = (document.getElementById('swal-payment-date') as HTMLInputElement).value;
                const btnUsd = document.getElementById('btn-pay-usd') as HTMLButtonElement;

                const isUsd = btnUsd.classList.contains('bg-emerald-500');

                let finalAmount = amountVal;
                if (!isUsd && bcvRate > 0) {
                    finalAmount = amountVal / bcvRate;
                }

                return [finalAmount.toString(), date, isUsd.toString(), amountVal.toString()];
            }
        });

        if (formValues) {
            const [amountStr, dateStr, isUsdStr, rawAmountStr] = formValues;
            const amount = parseFloat(amountStr);
            const isUsd = isUsdStr === 'true';
            const rawAmount = parseFloat(rawAmountStr);

            if (!amount || amount <= 0) {
                Swal.fire({ icon: 'error', title: 'Monto inválido', background: "#1f2937", color: "#fff" });
                return;
            }
            if (amount > remaining + 0.01) { // small epsilon for float precision
                Swal.fire({ icon: 'error', title: 'El monto excede la deuda restante', background: "#1f2937", color: "#fff" });
                return;
            }

            await addPayment(debt.id, {
                amount: amount,
                date: new Date(dateStr),
                currency: isUsd ? 'USD' : 'VES',
                originalAmount: isUsd ? amount : rawAmount,
                exchangeRate: isUsd ? 1 : bcvRate
            });

            // Create Transaction Record
            try {
                if (auth.currentUser) {
                    await addDoc(collection(db, "transactions"), {
                        userId: auth.currentUser.uid,
                        amount: amount,
                        type: debt.type === 'por_cobrar' ? 'ingreso' : 'gasto',
                        category: 'Deudas',
                        description: `Abono: ${debt.personName} (${debt.description || 'Deuda'})`,
                        date: Timestamp.fromDate(new Date(dateStr)),
                        currency: isUsd ? "USD" : "VES",
                        originalAmount: isUsd ? amount : rawAmount,
                        exchangeRate: isUsd ? 1 : bcvRate,
                    });
                }
            } catch (error) {
                console.error("Error creating transaction for debt payment:", error);
                // We don't stop the flow here, as the debt update was successful, but we log it.
            }

            Swal.fire({
                icon: "success",
                title: "Abono registrado",
                text: "Se ha actualizado la deuda y registrado el movimiento.",
                timer: 2000,
                showConfirmButton: false,
                background: "#1f2937",
                color: "#fff",
            });
        }
    };

    const handleEditDebt = async (debt: Debt) => {
        const { value: formValues } = await Swal.fire({
            title: 'Editar Registro',
            html: `
                <div class="flex flex-col gap-4 text-left">
                    <div>
                        <label class="text-xs text-slate-400 font-bold uppercase block mb-1">
                            ${debt.type === "por_cobrar" ? 'Deudor (¿Quién me debe?)' : 'Acreedor (¿A quién le debo?)'}
                        </label>
                        <input id="swal-person" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors" placeholder="Nombre de la persona" value="${debt.personName}">
                    </div>

                    <div>
                        <label class="text-xs text-slate-400 font-bold uppercase block mb-1">Monto</label>
                        <div class="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl p-1.5 focus-within:border-emerald-500 transition-colors">
                            <input id="swal-amount" type="number" step="0.01" class="w-full bg-transparent border-none text-white text-lg px-2 focus:ring-0 focus:outline-none placeholder-slate-600" placeholder="0.00" value="${debt.amount}">
                            <div class="flex bg-slate-700/50 rounded-lg p-1 shrink-0 gap-1">
                                <button type="button" id="btn-usd" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-lg transition-all">USD</button>
                                <button type="button" id="btn-bs" class="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-600 transition-all">Bs</button>
                            </div>
                        </div>
                        <div id="conversion-text" class="text-right text-xs text-slate-500 mt-2 font-mono">≈ Bs. 0.00</div>
                    </div>

                    <div>
                        <label class="text-xs text-slate-400 font-bold uppercase block mb-1">Fecha Límite (Opcional)</label>
                        <input id="swal-date" type="date" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors" value="${debt.dueDate ? new Date(debt.dueDate).toISOString().split('T')[0] : ''}">
                    </div>

                    <div>
                        <label class="text-xs text-slate-400 font-bold uppercase block mb-1">Nota / Descripción</label>
                        <input id="swal-desc" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors" placeholder="Ej: Préstamo personal" value="${debt.description || ''}">
                    </div>
                </div>
            `,
            focusConfirm: false,
            background: "#1f2937",
            color: "#fff",
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            confirmButtonColor: '#10b981',
            cancelButtonText: 'Cancelar',
            cancelButtonColor: '#374151',
            customClass: {
                popup: 'rounded-3xl border border-slate-700 shadow-2xl',
                input: 'text-white'
            },
            didOpen: () => {
                const inputAmount = document.getElementById('swal-amount') as HTMLInputElement;
                const btnUsd = document.getElementById('btn-usd') as HTMLButtonElement;
                const btnBs = document.getElementById('btn-bs') as HTMLButtonElement;
                const conversionText = document.getElementById('conversion-text') as HTMLDivElement;

                let isUsd = true;

                const updateConversion = () => {
                    const val = parseFloat(inputAmount.value);
                    if (isNaN(val) || bcvRate <= 0) {
                        conversionText.innerText = '≈ 0.00';
                        return;
                    }

                    if (isUsd) {
                        const bsVal = val * bcvRate;
                        conversionText.innerText = `≈ Bs. ${bsVal.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                    } else {
                        const usdVal = val / bcvRate;
                        conversionText.innerText = `≈ $${usdVal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                    }
                };

                const setMode = (mode: 'USD' | 'Bs') => {
                    if (mode === 'USD') {
                        isUsd = true;
                        btnUsd.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-lg transition-all";
                        btnBs.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-600 transition-all";

                        // Convert currently displayed value from Bs to USD
                        const currentVal = parseFloat(inputAmount.value);
                        if (!isNaN(currentVal) && bcvRate > 0) {
                            inputAmount.value = (currentVal / bcvRate).toFixed(2);
                        }
                    } else {
                        isUsd = false;
                        btnBs.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-lg transition-all";
                        btnUsd.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-600 transition-all";

                        // Convert currently displayed value from USD to Bs
                        const currentVal = parseFloat(inputAmount.value);
                        if (!isNaN(currentVal) && bcvRate > 0) {
                            inputAmount.value = (currentVal * bcvRate).toFixed(2);
                        }
                    }
                    updateConversion();
                };

                btnUsd.addEventListener('click', () => setMode('USD'));
                btnBs.addEventListener('click', () => setMode('Bs'));
                inputAmount.addEventListener('input', updateConversion);
                updateConversion(); // Initial call
            },
            preConfirm: () => {
                const person = (document.getElementById('swal-person') as HTMLInputElement).value;
                const amountVal = parseFloat((document.getElementById('swal-amount') as HTMLInputElement).value);
                const date = (document.getElementById('swal-date') as HTMLInputElement).value;
                const desc = (document.getElementById('swal-desc') as HTMLInputElement).value;
                const btnUsd = document.getElementById('btn-usd') as HTMLButtonElement;

                const isUsd = btnUsd.classList.contains('bg-emerald-500');

                let finalAmount = amountVal;
                if (!isUsd && bcvRate > 0) {
                    finalAmount = amountVal / bcvRate;
                }

                return [person, finalAmount, date, desc];
            }
        });

        if (formValues) {
            const [person, amount, date, desc] = formValues;

            if (!person || !amount) {
                Swal.fire({ icon: 'error', title: 'Faltan datos', text: 'Nombre y monto son obligatorios.', background: "#1f2937", color: "#fff" });
                return;
            }

            await updateDebt(debt.id, {
                personName: person,
                amount: parseFloat(amount),
                description: desc,
                dueDate: date ? new Date(date) : undefined,
            });

            Swal.fire({
                icon: "success",
                title: "Actualizado",
                text: "Se ha actualizado el registro exitosamente.",
                timer: 2000,
                showConfirmButton: false,
                background: "#1f2937",
                color: "#fff",
            });
        }
    };

    const handleDelete = async (id: string) => {
        Swal.fire({
            title: '¿Eliminar registro?',
            text: "Se borrará todo el historial de pagos de esta deuda.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#374151',
            confirmButtonText: 'Sí, borrar',
            background: "#1f2937",
            color: "#fff"
        }).then(async (result) => {
            if (result.isConfirmed) {
                await deleteDebt(id);
                Swal.fire({
                    title: 'Borrado!',
                    icon: 'success',
                    background: "#1f2937",
                    color: "#fff",
                    timer: 1500,
                    showConfirmButton: false
                })
            }
        })
    };

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0, scale: 0.95 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 10
            } as const
        }
    };

    if (loadingDebts) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            {/* MOBILE VIEW */}
            <motion.div
                className="md:hidden flex flex-col gap-6 pb-20"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Mobile Header */}
                <motion.div variants={itemVariants} className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-white">Deudas</h1>
                    <p className="text-slate-400 text-sm">Gestiona tus préstamos y cobros</p>
                </motion.div>

                {/* Mobile Tabs / Stats Horizontal Scroll */}
                <motion.div variants={itemVariants} className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                    {/* Card: Por Cobrar */}
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveTab('por_cobrar')}
                        className={`flex-none w-40 p-4 rounded-2xl border transition-all relative overflow-hidden ${activeTab === 'por_cobrar'
                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                            : 'bg-slate-900/50 border-slate-700/50'
                            }`}
                    >
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <div className={`p-2 rounded-full w-fit ${activeTab === 'por_cobrar' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                <FiArrowUpRight size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mt-2">${totalReceivable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                                <p className="text-xs text-slate-400">Por Cobrar</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Card: Por Pagar */}
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveTab('por_pagar')}
                        className={`flex-none w-40 p-4 rounded-2xl border transition-all relative overflow-hidden ${activeTab === 'por_pagar'
                            ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-500/10'
                            : 'bg-slate-900/50 border-slate-700/50'
                            }`}
                    >
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <div className={`p-2 rounded-full w-fit ${activeTab === 'por_pagar' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                                <FiArrowDownLeft size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mt-2">${totalPayable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                                <p className="text-xs text-slate-400">Por Pagar</p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Mobile Actions: Add Button */}
                <motion.div variants={itemVariants} className="px-1">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddDebt}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold text-white shadow-lg shadow-emerald-500/20"
                    >
                        <FiPlus className="text-xl" />
                        <span>Nuevo Registro</span>
                    </motion.button>
                </motion.div>

                {/* Mobile List */}
                <motion.div variants={itemVariants} className="flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-lg font-bold text-white">
                            {activeTab === 'por_cobrar' ? 'Pendientes de Cobro' : 'Pendientes de Pago'}
                        </h2>
                        <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-lg">
                            {paginatedDebts.length} reg.
                        </span>
                    </div>

                    <div className="space-y-3">
                        {paginatedDebts.length === 0 ? (
                            <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-dashed border-slate-700">
                                <p className="text-slate-500 text-sm">No hay deudas registradas aquí.</p>
                            </div>
                        ) : (
                            paginatedDebts.map((debt) => {
                                const totalPaid = debt.payments.reduce((a, b) => a + b.amount, 0);
                                const remaining = debt.amount - totalPaid;
                                const progress = (totalPaid / debt.amount) * 100;
                                const isFullyPaid = remaining <= 0.01;

                                return (
                                    <motion.div
                                        key={debt.id}
                                        variants={itemVariants}
                                        className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 relative overflow-hidden"
                                    >
                                        {/* Status Badge */}
                                        {isFullyPaid && (
                                            <div className="absolute top-0 right-0 p-2">
                                                <div className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-bl-xl rounded-tr-xl flex items-center gap-1">
                                                    <FiCheckCircle /> PAGADO
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${debt.type === 'por_cobrar' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                    <FiUser />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-base leading-tight">{debt.personName}</h3>
                                                    <p className="text-xs text-slate-400 truncate max-w-[150px]">{debt.description || "Sin descripción"}</p>
                                                    {debt.dueDate && (
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                                            <FiClock size={10} />
                                                            <span>Vence: {new Date(debt.dueDate).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`block text-lg font-bold ${remaining > 0 ? (debt.type === 'por_cobrar' ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-400'}`}>
                                                    ${remaining.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </span>
                                                <span className="text-[10px] text-slate-500">
                                                    de ${debt.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar Compact */}
                                        <div className="h-1.5 w-full bg-slate-700/50 rounded-full mb-3 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isFullyPaid ? 'bg-emerald-500' : (debt.type === 'por_cobrar' ? 'bg-emerald-500' : 'bg-rose-500')}`}
                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                            />
                                        </div>

                                        {/* Actions Bar */}
                                        <div className="flex items-center gap-2 mt-2">
                                            {!isFullyPaid && (
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleAddPayment(debt)}
                                                    className="flex-1 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <FiDollarSign /> Abonar
                                                </motion.button>
                                            )}
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleEditDebt(debt)}
                                                className="p-1.5 text-slate-400 bg-slate-800 rounded-lg hover:text-white"
                                            >
                                                <FiEdit2 size={14} />
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleDelete(debt.id)}
                                                className="p-1.5 text-slate-400 bg-slate-800 rounded-lg hover:text-rose-400"
                                            >
                                                <FiTrash2 size={14} />
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    {/* Compact Pagination for Mobile */}
                    <div className="flex justify-center gap-4 mt-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="text-xs text-slate-400 disabled:opacity-30"
                        >
                            Anterior
                        </button>
                        <span className="text-xs text-slate-500">
                            Página {currentPage} de {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="text-xs text-slate-400 disabled:opacity-30"
                        >
                            Siguiente
                        </button>
                    </div>
                </motion.div>
            </motion.div>


            {/* DESKTOP VIEW */}
            <div className="hidden md:block space-y-8 pb-10">
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                        <FiDollarSign className="text-7xl md:text-9xl text-emerald-400" />
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>

                    <div className="relative z-10">
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">Deudas y Préstamos</h1>
                        <p className="text-slate-400 text-sm md:text-lg">
                            Controla lo que debes y lo que te deben.
                        </p>
                    </div>
                </div>

                {/* Stats Cards - Horizontal scroll en móvil */}
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 scrollbar-hide">
                    <div
                        className={`flex-none w-56 md:w-auto p-5 md:p-6 rounded-2xl md:rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${activeTab === 'por_cobrar' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'bg-slate-900/50 border-slate-700/50 hover:border-emerald-500/30'}`}
                        onClick={() => setActiveTab('por_cobrar')}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FiArrowUpRight className="text-6xl md:text-8xl text-emerald-500" />
                        </div>
                        <div className="relative z-10">
                            <p className={`text-xs md:text-sm font-bold uppercase tracking-wider mb-1 ${activeTab === 'por_cobrar' ? 'text-emerald-400' : 'text-slate-400'}`}>Por Cobrar</p>
                            <h2 className="text-2xl md:text-3xl font-bold text-white">${totalReceivable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</h2>
                            <p className="text-[10px] md:text-xs text-slate-500 mt-1">Gente que te debe</p>
                        </div>
                    </div>

                    <div
                        className={`flex-none w-56 md:w-auto p-5 md:p-6 rounded-2xl md:rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${activeTab === 'por_pagar' ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-500/10' : 'bg-slate-900/50 border-slate-700/50 hover:border-rose-500/30'}`}
                        onClick={() => setActiveTab('por_pagar')}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FiArrowDownLeft className="text-6xl md:text-8xl text-rose-500" />
                        </div>
                        <div className="relative z-10">
                            <p className={`text-xs md:text-sm font-bold uppercase tracking-wider mb-1 ${activeTab === 'por_pagar' ? 'text-rose-400' : 'text-slate-400'}`}>Por Pagar</p>
                            <h2 className="text-2xl md:text-3xl font-bold text-white">${totalPayable.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</h2>
                            <p className="text-[10px] md:text-xs text-slate-500 mt-1">Dinero que debes</p>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30">
                    <div className="relative w-full md:w-80">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder={activeTab === "por_cobrar" ? "Buscar deudor..." : "Buscar acreedor..."}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-all"
                        />
                    </div>

                    <button
                        onClick={handleAddDebt}
                        className="flex items-center gap-2 px-6 py-2 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/5 w-full md:w-auto justify-center"
                    >
                        <FiPlus /> Nuevo Registro
                    </button>
                </div>

                {/* List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {paginatedDebts.length === 0 && (
                        <div className="col-span-full py-12 text-center border border-dashed border-slate-700 rounded-3xl bg-slate-900/30">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiInfo className="text-2xl text-slate-500" />
                            </div>
                            <p className="text-slate-400">
                                {searchTerm ? "No se encontraron resultados." : "No hay registros en esta sección."}
                            </p>
                        </div>
                    )}

                    {paginatedDebts.map((debt) => {
                        const totalPaid = debt.payments.reduce((a, b) => a + b.amount, 0);
                        const remaining = debt.amount - totalPaid;
                        const progress = (totalPaid / debt.amount) * 100;
                        const isFullyPaid = remaining <= 0.01;

                        return (
                            <div key={debt.id} className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6 relative group hover:border-slate-600 transition-all">
                                {isFullyPaid && (
                                    <div className="absolute top-4 right-4">
                                        <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                                            <FiCheckCircle /> PAGADO
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${debt.type === 'por_cobrar' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        <FiUser />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{debt.personName}</h3>
                                        <p className="text-sm text-slate-500">{debt.description || "Sin descripción"}</p>
                                    </div>
                                </div>

                                {/* Amount Display */}
                                <div className="mb-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/30">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-xs text-slate-400 uppercase font-bold">Total</span>
                                        <span className="text-xl font-bold text-white">${debt.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-slate-400 uppercase font-bold">Restante</span>
                                        <span className={`text-lg font-bold ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            ${remaining.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-right">
                                        <span className="text-xs text-slate-500">
                                            ≈ Bs. {(remaining * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-1 text-slate-400">
                                        <span>Progreso de pago</span>
                                        <span>{progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Payments History (Collapsible or just minimal info?) - Let's show last payment or count */}
                                {debt.payments.length > 0 && (
                                    <div className="mb-4 text-xs text-slate-500 bg-slate-800/30 p-3 rounded-xl">
                                        <p className="font-bold text-slate-400 mb-1">Historial del Pagos ({debt.payments.length}):</p>
                                        <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar">
                                            {debt.payments.slice().reverse().map((pay, i) => (
                                                <div key={i} className="flex justify-between items-center">
                                                    <span>{new Date(pay.date).toLocaleDateString()}</span>
                                                    <div className="text-right">
                                                        <div className="text-white font-bold">
                                                            {pay.currency === 'VES' && pay.originalAmount
                                                                ? `Bs. ${pay.originalAmount.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                                                                : `$${pay.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                                                            }
                                                        </div>
                                                        {pay.currency === 'VES' && (
                                                            <div className="text-xs text-slate-500">
                                                                ≈ ${pay.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 mt-auto">
                                    {!isFullyPaid && (
                                        <button
                                            onClick={() => handleAddPayment(debt)}
                                            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20"
                                        >
                                            Registrar Abono
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEditDebt(debt)}
                                        className="p-2 text-slate-500 hover:text-emerald-400 transition-colors bg-slate-800 hover:bg-slate-700 rounded-xl"
                                        title="Editar"
                                    >
                                        <FiEdit2 />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(debt.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 transition-colors bg-slate-800 hover:bg-slate-700 rounded-xl"
                                        title="Eliminar"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>

                                {/* Due Date Indicator */}
                                {debt.dueDate && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 justify-center">
                                        <FiClock /> Vence: {new Date(debt.dueDate).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </>
    );
}
