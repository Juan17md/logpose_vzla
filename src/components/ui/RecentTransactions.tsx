"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTransactions } from "@/hooks/useTransactions";
import { FiTrendingUp, FiTrendingDown, FiTrash2, FiClock, FiEdit2, FiSearch, FiCopy } from "react-icons/fi";
import Swal from "sweetalert2";
import { useEditTransaction } from "@/contexts/EditTransactionContext";
import PaginationControls from "./PaginationControls";

export default function RecentTransactions() {
    const router = useRouter();
    const pathname = usePathname();
    const { transactions, loading, deleteTransaction, duplicateTransaction } = useTransactions();
    const { startEditing } = useEditTransaction();

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const itemsPerPage = 8;

    const handleDelete = (id: string) => {
        Swal.fire({
            title: "¿Estás seguro?",
            text: "No podrás revertir esto.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#374151",
            confirmButtonText: "Sí, borrar",
            cancelButtonText: "Cancelar",
            background: "#1f2937",
            color: "#fff",
        }).then(async (result) => {
            if (result.isConfirmed) {
                const success = await deleteTransaction(id);
                if (success) {
                    Swal.fire({
                        title: "¡Borrado!",
                        text: "El registro ha sido eliminado.",
                        icon: "success",
                        background: "#1f2937",
                        color: "#fff",
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            }
        });
    };

    // Filter transactions
    const filteredTransactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.amount.toString().includes(searchTerm)
    );

    // Calculate pagination
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

    // Reset page on search
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(1);
    }

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-700/50 overflow-hidden shadow-xl flex flex-col h-full">
            <div className="p-6 border-b border-slate-700/50 bg-slate-800/30 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                    <FiClock className="mr-2 text-emerald-400" />
                    Historial Reciente
                </h3>

                <div className="relative w-full md:w-64">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-all"
                    />
                </div>
            </div>

            {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500 border-b border-slate-700/30">
                    <FiSearch className="text-4xl mb-3 opacity-50" />
                    <p>No se encontraron movimientos.</p>
                </div>
            ) : (
                <div className="overflow-x-auto flex-1">
                    <table className="w-full">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4 text-left tracking-wider">Categoría / Detalle</th>
                                <th className="px-6 py-4 text-left tracking-wider">Fecha</th>
                                <th className="px-6 py-4 text-right tracking-wider">Monto</th>
                                <th className="px-6 py-4 text-right tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {paginatedTransactions.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className={`p-2 rounded-lg mr-3 ${t.type === 'ingreso' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                                }`}>
                                                {t.type === 'ingreso' ? <FiTrendingUp /> : <FiTrendingDown />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">{t.category}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-[150px]">{t.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                        {t.date.toLocaleDateString("es-ES", { day: 'numeric', month: 'short' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {t.currency === 'VES' && t.originalAmount ? (
                                            <div className="flex flex-col items-end">
                                                <span className={`text-sm font-bold ${t.type === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {t.type === 'ingreso' ? '+' : '-'}Bs. {t.originalAmount.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    ≈ ${t.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className={`text-sm font-bold ${t.type === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {t.type === 'ingreso' ? '+' : '-'}${t.amount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => {
                                                    startEditing(t);
                                                    if (pathname !== "/dashboard/movimientos") {
                                                        router.push("/dashboard/movimientos");
                                                    } else {
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }
                                                }}
                                                className="text-slate-500 hover:text-blue-400 transition-colors p-2 hover:bg-blue-500/10 rounded-lg"
                                                title="Editar"
                                            >
                                                <FiEdit2 />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    Swal.fire({
                                                        title: "¿Duplicar movimiento?",
                                                        text: `Se creará una copia de "${t.description}" con fecha de hoy.`,
                                                        icon: "question",
                                                        showCancelButton: true,
                                                        confirmButtonText: "Sí, duplicar",
                                                        cancelButtonText: "Cancelar",
                                                        background: "#1f2937",
                                                        color: "#fff",
                                                    }).then(async (res) => {
                                                        if (res.isConfirmed) {
                                                            const success = await duplicateTransaction(t.id);
                                                            if (success) {
                                                                Swal.fire({
                                                                    icon: "success", title: "Duplicado", text: "Movimiento registrado hoy.",
                                                                    timer: 1500, showConfirmButton: false, background: "#1f2937", color: "#fff"
                                                                });
                                                            }
                                                        }
                                                    });
                                                }}
                                                className="text-slate-500 hover:text-emerald-400 transition-colors p-2 hover:bg-emerald-500/10 rounded-lg"
                                                title="Duplicar hoy"
                                            >
                                                <FiCopy />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="text-slate-500 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                                                title="Eliminar"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="p-4 border-t border-slate-700/50">
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}
