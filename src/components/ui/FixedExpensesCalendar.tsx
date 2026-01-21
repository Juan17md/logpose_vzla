"use client";

import { useState, useMemo } from "react";
import { FixedExpense } from "@/hooks/useFixedExpenses";
import { FiChevronLeft, FiChevronRight, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { motion } from "framer-motion";

interface FixedExpensesCalendarProps {
    expenses: FixedExpense[];
    onPayExpense: (expense: FixedExpense) => void;
}

export default function FixedExpensesCalendar({ expenses, onPayExpense }: FixedExpensesCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

    // Adjust for Monday start if preferred, but Sunday start is standard JS Date.day
    // Let's use Sunday start for simplicity or adjust to Monday if needed.
    // Standard calendar usually starts on Sunday in many views, but Monday is common in stats.
    // Let's stick to standard 0-6 (Sun-Sat).

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const isPaidCurrentMonth = (expense: FixedExpense) => {
        if (!expense.lastPaidDate) return false;
        const paidDate = new Date(expense.lastPaidDate);
        // Compare with the CALENDAR'S current displayed month, or strictly the real current month?
        // Usually, "Fixed Expenses" are monthly. If I view previous months, I might want to see history?
        // But the data model `FixedExpense` likely only stores the *last* paid date.
        // So we can only truly know if it was paid in the *current real time* month (or the last time it was touched).
        // If we look at a past month in the calendar, we can't accurately know if it was paid THEN if we only store `lastPaidDate`.
        // However, for the purpose of "Managing" current expenses, we usually look at the current month.
        // Let's stick to comparing against the REAL current date for "Paid" status,
        // or effectively the `lastPaidDate` month.

        // If I view next month, it shouldn't show as paid unless I paid in advance (which would result in matching dates).
        // Let's just check if the lastPaidDate falls in the displayed month and year.
        return paidDate.getMonth() === month && paidDate.getFullYear() === year;
    };

    // Memoize expenses indexed by day for O(1) lookup
    const expensesByDay = useMemo(() => {
        const map: Record<number, FixedExpense[]> = {};
        expenses.forEach(e => {
            if (!map[e.dueDay]) map[e.dueDay] = [];
            map[e.dueDay].push(e);
        });
        return map;
    }, [expenses]);

    const getExpensesForDay = (day: number) => {
        return expensesByDay[day] || [];
    };

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    // Generate calendar grid
    const blanks = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalSlots = [...blanks, ...days];

    return (
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                        {monthNames[month]}
                    </span>
                    <span className="text-slate-500">{year}</span>
                </h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <FiChevronLeft size={24} />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <FiChevronRight size={24} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                    <div key={d} className="text-xs font-bold text-slate-500 uppercase tracking-wider">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {totalSlots.map((day, index) => {
                    const dayExpenses = day ? getExpensesForDay(day) : [];
                    const isDayToday = day ? isToday(day) : false;

                    return (
                        <div
                            key={index}
                            className={`
                                min-h-[100px] rounded-xl border p-2 relative flex flex-col gap-1 transition-all
                                ${!day ? 'bg-transparent border-transparent' : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600 hover:bg-slate-800/50'}
                                ${isDayToday ? 'ring-2 ring-emerald-500/50 bg-emerald-500/5' : ''}
                            `}
                        >
                            {day && (
                                <>
                                    <span className={`
                                        text-sm font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full
                                        ${isDayToday ? 'bg-emerald-500 text-white' : 'text-slate-400'}
                                    `}>
                                        {day}
                                    </span>

                                    <div className="flex flex-col gap-1 mt-auto overflow-y-auto max-h-[80px] custom-scrollbar">
                                        {dayExpenses.map(expense => {
                                            const paid = isPaidCurrentMonth(expense);
                                            return (
                                                <motion.button
                                                    key={expense.id}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => onPayExpense(expense)}
                                                    className={`
                                                        text-[10px] px-2 py-1 rounded-md text-left truncate flex items-center gap-1 w-full
                                                        ${paid
                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                            : 'bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20'}
                                                    `}
                                                    title={`${expense.title} - $${expense.amount} ${paid ? '(Pagado)' : '(Pendiente)'}`}
                                                >
                                                    {paid ? <FiCheckCircle className="shrink-0" /> : <FiAlertCircle className="shrink-0" />}
                                                    <span className="truncate">{expense.title}</span>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400 px-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/30"></div>
                    <span>Pagado en este mes</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/10 border border-red-500/20"></div>
                    <span>Pendiente</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span>Día Actual</span>
                </div>
            </div>
        </div>
    );
}
