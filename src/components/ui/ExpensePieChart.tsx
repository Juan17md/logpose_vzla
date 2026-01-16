"use client";

import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { FiPieChart } from 'react-icons/fi';

const COLORS = [
    '#10B981', // Emerald Note
    '#3B82F6', // Blue Note
    '#F59E0B', // Amber Note
    '#EF4444', // Red Note
    '#8B5CF6', // Violet Note
    '#EC4899', // Pink Note
    '#06B6D4', // Cyan Note
    '#F97316', // Orange Note
    '#6366F1', // Indigo Note
    '#14B8A6', // Teal Note
];

const RADIAN = Math.PI / 180;

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

    return (
        <g>
            <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#fff" className="text-sm font-bold opacity-80">
                {payload.name}
            </text>
            <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#fff" className="text-xs">
                {`${(percent * 100).toFixed(1)}%`}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 8}
                outerRadius={outerRadius + 12}
                fill={fill}
            />
        </g>
    );
};

interface ExpensePieChartProps {
    transactions: any[];
}

export default function ExpensePieChart({ transactions }: ExpensePieChartProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    const data = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // 1. Filtrar gastos del mes
        const monthlyExpenses = transactions.filter(t => {
            const tDate = new Date(t.date instanceof Date ? t.date : t.date.seconds * 1000);
            return t.type === 'gasto' &&
                tDate.getMonth() === currentMonth &&
                tDate.getFullYear() === currentYear;
        });

        // 2. Agrupar por categoría
        const grouped = monthlyExpenses.reduce((acc, curr) => {
            const category = curr.category || 'Otros';
            acc[category] = (acc[category] || 0) + Number(curr.amount);
            return acc;
        }, {} as Record<string, number>);

        // 3. Formatear para Recharts
        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a: any, b: any) => b.value - a.value); // Ordenar mayor a menor
    }, [transactions]);

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    if (data.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-slate-800/30 rounded-3xl border border-slate-700/50 border-dashed backdrop-blur-sm">
                <FiPieChart className="text-4xl mb-3 opacity-50" />
                <p className="font-medium">Sin gastos este mes</p>
                <p className="text-xs opacity-60">Tus movimientos aparecerán aquí</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row items-center gap-6 h-full min-h-[250px]">
            {/* Chart Section */}
            <div className="w-full md:w-1/2 h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            // @ts-ignore
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            dataKey="value"
                            onMouseEnter={onPieEnter}
                            paddingAngle={4}
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    className="transition-all duration-300 focus:outline-none"
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                                borderColor: 'rgba(51, 65, 85, 0.5)',
                                borderRadius: '16px',
                                color: '#fff',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                padding: '12px'
                            }}
                            itemStyle={{ color: '#fff', fontSize: '0.875rem' }}
                            formatter={(value: any) => [`$${Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, '']}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Custom Legend Section */}
            <div className="w-full md:w-1/2 flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {data.map((entry, index) => (
                    <div
                        key={entry.name}
                        className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${index === activeIndex
                            ? 'bg-slate-700/50 border border-slate-600/50 shadow-sm scale-[1.02]'
                            : 'hover:bg-slate-800/30 border border-transparent hover:border-slate-700/30'
                            }`}
                        onMouseEnter={() => setActiveIndex(index)}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)] transition-transform duration-300"
                                style={{
                                    backgroundColor: COLORS[index % COLORS.length],
                                    transform: index === activeIndex ? 'scale(1.25)' : 'scale(1)'
                                }}
                            />
                            <span className={`text-sm font-medium transition-colors ${index === activeIndex ? 'text-white' : 'text-slate-300'}`}>
                                {entry.name}
                            </span>
                        </div>
                        <div className="text-right">
                            <div className={`text-sm font-bold transition-colors ${index === activeIndex ? 'text-white' : 'text-slate-400'}`}>
                                ${Number(entry.value).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-[10px] text-slate-500">
                                {((Number(entry.value) / data.reduce((acc: any, curr: any) => acc + Number(curr.value), 0)) * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(30, 41, 59, 0.5); 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(71, 85, 105, 0.8); 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 0.8); 
                }
            `}</style>
        </div>
    );
}
