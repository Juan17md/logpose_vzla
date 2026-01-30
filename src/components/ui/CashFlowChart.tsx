"use client";

import { useMemo, useSyncExternalStore } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TransactionInput {
    id: string;
    amount: number;
    type: string;
    category: string;
    description: string;
    date: Date | { seconds: number };
}

interface CashFlowChartProps {
    transactions: TransactionInput[];
}

export default function CashFlowChart({ transactions }: CashFlowChartProps) {
    const data = useMemo(() => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // 1. Crear array base con todos los días del mes
        const days = Array.from({ length: daysInMonth }, (_, i) => ({
            day: i + 1,
            ingresos: 0,
            gastos: 0
        }));

        // 2. Llenar con datos
        transactions.forEach(t => {
            const tDate = new Date(t.date instanceof Date ? t.date : t.date.seconds * 1000);

            // Filtrar solo mes actual
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                const dayIndex = tDate.getDate() - 1;
                if (t.type === 'ingreso') {
                    days[dayIndex].ingresos += Number(t.amount);
                } else {
                    days[dayIndex].gastos += Number(t.amount);
                }
            }
        });

        // 3. Filtrar días futuros para que el gráfico no se vea plano al final
        const today = now.getDate();
        return days.filter(d => d.day <= today);
    }, [transactions]);

    // Use useSyncExternalStore to safely detect client-side mounting
    const isMounted = useSyncExternalStore(
        () => () => { },
        () => true,
        () => false
    );

    if (transactions.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-slate-800/20 rounded-xl border border-slate-700 border-dashed">
                <p>Sin transacciones recientes 📉</p>
            </div>
        );
    }

    if (!isMounted) {
        return <div className="w-full h-full min-h-[160px] animate-pulse bg-slate-800/30 rounded-xl" />;
    }

    return (
        <div className="w-full h-full min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                        dataKey="day"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value) => [`$${Number(value).toFixed(2)}`, '']}
                        labelFormatter={(day) => `Día ${day}`}
                    />
                    <Legend iconType="circle" />
                    <Area
                        type="monotone"
                        dataKey="ingresos"
                        stroke="#10B981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorIngresos)"
                        name="Ingresos"
                    />
                    <Area
                        type="monotone"
                        dataKey="gastos"
                        stroke="#EF4444"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorGastos)"
                        name="Gastos"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
