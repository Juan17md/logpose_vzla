"use client";

import { useState, useEffect } from "react";
import { useFixedExpenses, FixedExpense } from "@/hooks/useFixedExpenses";
import { FiCalendar, FiPlus, FiTrash2, FiCheckCircle, FiDollarSign, FiEdit2, FiInfo, FiActivity, FiSearch, FiList, FiGrid } from "react-icons/fi";
import PaginationControls from "@/components/ui/PaginationControls";
import Swal from "sweetalert2";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getBCVRate } from "@/lib/currency";
import FixedExpensesCalendar from "@/components/ui/FixedExpensesCalendar";

export default function FixedExpensesPage() {
    const { fixedExpenses, loadingFixedExpenses, addFixedExpense, deleteFixedExpense, updateFixedExpense } = useFixedExpenses();
    const [bcvRate, setBcvRate] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const itemsPerPage = 8;

    useEffect(() => {
        getBCVRate().then(setBcvRate);
    }, []);

    const handleAddExpense = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Nuevo Gasto Fijo',
            html:
                '<div class="flex flex-col gap-3 text-left">' +
                '<label class="text-xs text-slate-400 font-bold uppercase">Nombre</label>' +
                '<input id="swal-name" class="swal2-input m-0 w-full" placeholder="Ej: Internet" style="background-color: #1e293b; color: white; border: 1px solid #475569;">' +

                '<label class="text-xs text-slate-400 font-bold uppercase">Monto ($)</label>' +
                '<input id="swal-amount" type="number" step="0.01" class="swal2-input m-0 w-full" placeholder="0.00" style="background-color: #1e293b; color: white; border: 1px solid #475569;">' +

                '<label class="text-xs text-slate-400 font-bold uppercase">Día de pago (1-31)</label>' +
                '<input id="swal-day" type="number" min="1" max="31" class="swal2-input m-0 w-full" placeholder="15" style="background-color: #1e293b; color: white; border: 1px solid #475569;">' +

                '<label class="text-xs text-slate-400 font-bold uppercase">Categoría</label>' +
                '<select id="swal-category" class="swal2-input m-0 w-full" style="background-color: #1e293b; color: white; border: 1px solid #475569;">' +
                '<option value="Servicios" style="background-color: #1e293b; color: white;">Servicios</option>' +
                '<option value="Hogar" style="background-color: #1e293b; color: white;">Hogar</option>' +
                '<option value="Suscripciones" style="background-color: #1e293b; color: white;">Suscripciones</option>' +
                '<option value="Deudas" style="background-color: #1e293b; color: white;">Deudas</option>' +
                '<option value="Educación" style="background-color: #1e293b; color: white;">Educación</option>' +
                '<option value="Otros" style="background-color: #1e293b; color: white;">Otros (Especificar)</option>' +
                '</select>' +

                '<input id="swal-custom-category" class="swal2-input m-0 w-full mt-2 hidden" placeholder="Escribe la categoría" style="display: none; background-color: #1e293b; color: white; border: 1px solid #475569;">' +

                '<label class="text-xs text-slate-400 font-bold uppercase mt-2">Descripción (Opcional)</label>' +
                '<input id="swal-desc" class="swal2-input m-0 w-full" placeholder="Ej: Plan de 100MB" style="background-color: #1e293b; color: white; border: 1px solid #475569;">' +
                '</div>',
            focusConfirm: false,
            background: "#1f2937",
            color: "#fff",
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            confirmButtonColor: '#10b981',
            didOpen: () => {
                const selectElement = document.getElementById('swal-category') as HTMLSelectElement;
                const customInput = document.getElementById('swal-custom-category') as HTMLInputElement;

                selectElement.addEventListener('change', () => {
                    if (selectElement.value === 'Otros') {
                        customInput.style.display = 'block';
                        customInput.focus();
                    } else {
                        customInput.style.display = 'none';
                    }
                });
            },
            preConfirm: () => {
                const name = (document.getElementById('swal-name') as HTMLInputElement).value;
                const amount = (document.getElementById('swal-amount') as HTMLInputElement).value;
                const day = (document.getElementById('swal-day') as HTMLInputElement).value;
                const categorySelect = (document.getElementById('swal-category') as HTMLSelectElement).value;
                const customCategory = (document.getElementById('swal-custom-category') as HTMLInputElement).value;
                const description = (document.getElementById('swal-desc') as HTMLInputElement).value;

                return [
                    name,
                    amount,
                    day,
                    categorySelect === 'Otros' ? customCategory : categorySelect,
                    description
                ];
            }
        });

        if (formValues) {
            const [title, amount, dueDay, category, description] = formValues;

            if (!category) {
                Swal.fire({ icon: 'error', title: 'Categoría vacía', text: 'Por favor especifica una categoría.' });
                return;
            }

            if (!title || !amount || !dueDay) {
                Swal.fire({ icon: 'error', title: 'Faltan campos', text: 'Por favor completa nombre, monto y día.' });
                return;
            }

            await addFixedExpense({
                title,
                amount: parseFloat(amount),
                dueDay: parseInt(dueDay),
                category,
                description: description || "Gasto fijo mensual"
            });

            Swal.fire({
                icon: "success",
                title: "Gasto agregado",
                timer: 1500,
                showConfirmButton: false,
                background: "#1f2937",
                color: "#fff",
            });
        }
    };

    const handlePayExpense = async (expense: FixedExpense) => {
        const isPaidThisMonth = expense.lastPaidDate &&
            new Date(expense.lastPaidDate).getMonth() === new Date().getMonth() &&
            new Date(expense.lastPaidDate).getFullYear() === new Date().getFullYear();

        if (isPaidThisMonth) {
            const result = await Swal.fire({
                title: '¿Ya pagaste este gasto?',
                text: "Este gasto ya aparece como pagado este mes. ¿Quieres registrar otro pago?",
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, registrar de nuevo',
                cancelButtonText: 'Cancelar',
                background: "#1f2937",
                color: "#fff",
            });
            if (!result.isConfirmed) return;
        }

        const result = await Swal.fire({
            title: `Pagar ${expense.title}`,
            html: `
                <div class="text-left">
                    <p class="mb-4 text-slate-300">Vas a registrar el pago de <strong class="text-emerald-400">$${expense.amount}</strong>.</p>
                    <p class="text-sm text-slate-400">Elige cómo quieres procesarlo:</p>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Registrar Gasto y Pagar',
            denyButtonText: 'Solo marcar como Pagado',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981',
            denyButtonColor: '#3b82f6',
            cancelButtonColor: '#64748b',
            background: "#1f2937",
            color: "#fff",
            width: '600px'
        });

        if (result.isDismissed) return;

        try {
            if (!auth.currentUser) return;

            // Option 1: Create transaction AND update status (Confirmed)
            if (result.isConfirmed) {
                await addDoc(collection(db, "transactions"), {
                    userId: auth.currentUser.uid,
                    amount: expense.amount,
                    type: "gasto",
                    category: expense.category,
                    description: `Pago mensual: ${expense.title}`,
                    date: Timestamp.now(),
                    currency: "USD",
                    originalAmount: expense.amount,
                    exchangeRate: bcvRate,
                });

                Swal.fire({
                    icon: "success",
                    title: "Pago y Gasto registrados",
                    text: "Se ha descontado de tu saldo.",
                    timer: 2000,
                    showConfirmButton: false,
                    background: "#1f2937",
                    color: "#fff",
                });
            } else if (result.isDenied) {
                // Option 2: Only update status (Denied but not specialized cancel)
                Swal.fire({
                    icon: "success",
                    title: "Marcado como Pagado",
                    text: "No se generó transacción de gasto.",
                    timer: 2000,
                    showConfirmButton: false,
                    background: "#1f2937",
                    color: "#fff",
                });
            }

            // Common action: Update Fixed Expense Last Paid Date
            await updateFixedExpense(expense.id, {
                lastPaidDate: new Date()
            });

        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo actualizar el estado.",
                background: "#1f2937",
                color: "#fff",
            });
        }
    };

    const handleEditExpense = async (expense: FixedExpense) => {
        const { value: formValues } = await Swal.fire({
            title: 'Editar Gasto Fijo',
            html:
                '<div class="flex flex-col gap-3 text-left">' +
                '<label class="text-xs text-slate-400 font-bold uppercase">Nombre</label>' +
                `<input id="swal-edit-name" class="swal2-input m-0 w-full" value="${expense.title}" placeholder="Ej: Internet" style="background-color: #1e293b; color: white; border: 1px solid #475569;">` +

                '<label class="text-xs text-slate-400 font-bold uppercase">Monto ($)</label>' +
                `<input id="swal-edit-amount" type="number" step="0.01" value="${expense.amount}" class="swal2-input m-0 w-full" placeholder="0.00" style="background-color: #1e293b; color: white; border: 1px solid #475569;">` +

                '<label class="text-xs text-slate-400 font-bold uppercase">Día de pago (1-31)</label>' +
                `<input id="swal-edit-day" type="number" min="1" max="31" value="${expense.dueDay}" class="swal2-input m-0 w-full" placeholder="15" style="background-color: #1e293b; color: white; border: 1px solid #475569;">` +

                '<label class="text-xs text-slate-400 font-bold uppercase">Categoría</label>' +
                `<select id="swal-edit-category" class="swal2-input m-0 w-full" style="background-color: #1e293b; color: white; border: 1px solid #475569;">` +
                `<option value="Servicios" ${expense.category === 'Servicios' ? 'selected' : ''}>Servicios</option>` +
                `<option value="Hogar" ${expense.category === 'Hogar' ? 'selected' : ''}>Hogar</option>` +
                `<option value="Suscripciones" ${expense.category === 'Suscripciones' ? 'selected' : ''}>Suscripciones</option>` +
                `<option value="Deudas" ${expense.category === 'Deudas' ? 'selected' : ''}>Deudas</option>` +
                `<option value="Educación" ${expense.category === 'Educación' ? 'selected' : ''}>Educación</option>` +
                `<option value="Otros" ${!['Servicios', 'Hogar', 'Suscripciones', 'Deudas', 'Educación'].includes(expense.category) ? 'selected' : ''}>Otros (Especificar)</option>` +
                '</select>' +

                `<input id="swal-edit-custom-category" class="swal2-input m-0 w-full mt-2 ${!['Servicios', 'Hogar', 'Suscripciones', 'Deudas', 'Educación'].includes(expense.category) ? '' : 'hidden'}" value="${!['Servicios', 'Hogar', 'Suscripciones', 'Deudas', 'Educación'].includes(expense.category) ? expense.category : ''}" placeholder="Escribe la categoría" style="background-color: #1e293b; color: white; border: 1px solid #475569;">` +

                '<label class="text-xs text-slate-400 font-bold uppercase mt-2">Descripción (Opcional)</label>' +
                `<input id="swal-edit-desc" class="swal2-input m-0 w-full" value="${expense.description || ''}" placeholder="Ej: Plan de 100MB" style="background-color: #1e293b; color: white; border: 1px solid #475569;">` +
                '</div>',
            focusConfirm: false,
            background: "#1f2937",
            color: "#fff",
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            confirmButtonColor: '#3b82f6',
            didOpen: () => {
                const selectElement = document.getElementById('swal-edit-category') as HTMLSelectElement;
                const customInput = document.getElementById('swal-edit-custom-category') as HTMLInputElement;

                selectElement.addEventListener('change', () => {
                    if (selectElement.value === 'Otros') {
                        customInput.style.display = 'block';
                        customInput.classList.remove('hidden');
                        customInput.focus();
                    } else {
                        customInput.style.display = 'none';
                        customInput.classList.add('hidden');
                    }
                });
            },
            preConfirm: () => {
                const name = (document.getElementById('swal-edit-name') as HTMLInputElement).value;
                const amount = (document.getElementById('swal-edit-amount') as HTMLInputElement).value;
                const day = (document.getElementById('swal-edit-day') as HTMLInputElement).value;
                const categorySelect = (document.getElementById('swal-edit-category') as HTMLSelectElement).value;
                const customCategory = (document.getElementById('swal-edit-custom-category') as HTMLInputElement).value;
                const description = (document.getElementById('swal-edit-desc') as HTMLInputElement).value;

                return [
                    name,
                    amount,
                    day,
                    categorySelect === 'Otros' && customCategory ? customCategory : categorySelect,
                    description
                ];
            }
        });

        if (formValues) {
            const [title, amount, dueDay, category, description] = formValues;

            if (!title || !amount || !dueDay) {
                Swal.fire({ icon: 'error', title: 'Faltan campos', text: 'Por favor completa nombre, monto y día.' });
                return;
            }

            try {
                await updateFixedExpense(expense.id, {
                    title,
                    amount: parseFloat(amount),
                    dueDay: parseInt(dueDay),
                    category,
                    description
                });

                Swal.fire({
                    icon: "success",
                    title: "Gasto actualizado",
                    timer: 1500,
                    showConfirmButton: false,
                    background: "#1f2937",
                    color: "#fff",
                });
            } catch (error) {
                console.error("Error updating expense:", error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el gasto.' });
            }
        }
    };

    const handleDelete = async (id: string) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#374151',
            confirmButtonText: 'Sí, borrar',
            background: "#1f2937",
            color: "#fff"
        }).then(async (result) => {
            if (result.isConfirmed) {
                await deleteFixedExpense(id);
                Swal.fire({
                    title: 'Borrado!',
                    text: 'El gasto fijo ha sido eliminado.',
                    icon: 'success',
                    background: "#1f2937",
                    color: "#fff",
                    timer: 1500,
                    showConfirmButton: false
                })
            }
        })
    };

    const isPaidCurrentMonth = (date?: Date) => {
        if (!date) return false;
        const now = new Date();
        const paidDate = new Date(date);
        return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
    };

    // Calculate derived values but don't render until we are sure we are not loading.
    // Actually, we can just calculate them; they will be empty if fixedExpenses is empty.

    const totalMonthly = fixedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPaid = fixedExpenses.filter(e => isPaidCurrentMonth(e.lastPaidDate)).reduce((acc, curr) => acc + curr.amount, 0);
    const progress = totalMonthly > 0 ? (totalPaid / totalMonthly) * 100 : 0;

    const filteredExpenses = fixedExpenses.filter(e =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
    const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loadingFixedExpenses) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 md:p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiCalendar className="text-7xl md:text-9xl text-emerald-400" />
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-end">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">Gastos Fijos</h1>
                        <p className="text-slate-400 text-sm md:text-lg">
                            Gestiona tus pagos recurrentes mensuales.
                        </p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Progreso del Mes</p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    ${totalPaid.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-slate-500 text-sm font-normal">/ ${totalMonthly.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-emerald-400 font-bold text-xl">{progress.toFixed(0)}%</p>
                            </div>
                        </div>
                        <div className="w-full bg-slate-700/50 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            title="Vista Lista"
                        >
                            <FiList />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            title="Vista Calendario"
                        >
                            <FiCalendar />
                        </button>
                    </div>

                    <div className="relative w-full md:w-80">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar gasto..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-all"
                        />
                    </div>
                </div>

                <button
                    onClick={handleAddExpense}
                    className="flex items-center gap-2 px-6 py-2 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/5 w-full md:w-auto justify-center"
                >
                    <FiPlus /> Nuevo Gasto
                </button>
            </div>

            {/* Content: List or Calendar */}
            {viewMode === 'calendar' ? (
                <FixedExpensesCalendar expenses={filteredExpenses} onPayExpense={handlePayExpense} />
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {paginatedExpenses.length === 0 && (
                            <div className="col-span-full py-12 text-center border border-dashed border-slate-700 rounded-3xl bg-slate-900/30">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiInfo className="text-2xl text-slate-500" />
                                </div>
                                <p className="text-slate-400">
                                    {searchTerm ? "No se encontraron gastos." : "No hay gastos fijos registrados."}
                                </p>
                            </div>
                        )}

                        {/* Expense Cards */}
                        {paginatedExpenses.map((expense) => {
                            const isPaid = isPaidCurrentMonth(expense.lastPaidDate);
                            return (
                                <div
                                    key={expense.id}
                                    className={`lg:col-span-1 bg-slate-900/50 backdrop-blur-md border rounded-3xl p-6 relative group overflow-hidden transition-all hover:-translate-y-1 ${isPaid ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'border-slate-700/50 hover:border-slate-600'
                                        }`}
                                >
                                    {isPaid && (
                                        <div className="absolute top-0 right-0 p-4">
                                            <div className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-emerald-500/30">
                                                <FiCheckCircle /> PAGADO
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-slate-800 rounded-2xl">
                                            <FiActivity className="text-2xl text-slate-400" />
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEditExpense(expense)}
                                                className="p-2 text-slate-600 hover:text-blue-400 transition-colors"
                                                title="Editar"
                                            >
                                                <FiEdit2 />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(expense.id)}
                                                className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                                                title="Eliminar"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-1">{expense.title}</h3>
                                    <p className="text-slate-500 text-sm mb-4">{expense.category} • Día {expense.dueDay}</p>

                                    <div className="flex items-end justify-between mt-auto">
                                        <div>
                                            <p className="text-2xl font-bold text-white">${expense.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                                            <p className="text-xs text-slate-500">
                                                ≈ Bs. {(expense.amount * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handlePayExpense(expense)}
                                            disabled={isPaid}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${isPaid
                                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                                : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20"
                                                }`}
                                        >
                                            <FiDollarSign /> {isPaid ? "Pagado" : "Pagar"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}
        </div>
    );
}
