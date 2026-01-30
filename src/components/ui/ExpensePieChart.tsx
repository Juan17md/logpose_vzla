"use client";

import { useMemo, useState, useSyncExternalStore } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { FiPieChart } from 'react-icons/fi';

interface ChartDataItem {
    name: string;
    value: number;
}

interface ActiveShapeProps {
    cx: number;
    cy: number;
    innerRadius: number;
    outerRadius: number;
    startAngle: number;
    endAngle: number;
    fill: string;
    payload: ChartDataItem;
    percent: number;
}

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

const RADIAN = Math.PI / 180; // eslint-disable-line @typescript-eslint/no-unused-vars

const renderActiveShape = (props: ActiveShapeProps) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
    // Detectar si es versión móvil basándonos en el radio (45 en móvil vs 85 en desktop)
    const isCompact = outerRadius < 60;

    return (
        <g>
            {/* Solo mostrar texto en centro si NO es compacto */}
            {!isCompact && (
                <>
                    <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#fff" className="text-sm font-bold opacity-80">
                        {payload.name}
                    </text>
                    <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#fff" className="text-xs">
                        {`${(percent * 100).toFixed(1)}%`}
                    </text>
                </>
            )}
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + (isCompact ? 3 : 6)}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + (isCompact ? 5 : 8)}
                outerRadius={outerRadius + (isCompact ? 8 : 12)}
                fill={fill}
            />
        </g>
    );
};

interface ExpensePieChartProps {
    transactions: Array<{
        id: string;
        amount: number;
        type: string;
        category: string;
        description: string;
        date: Date | { seconds: number };
    }>;
}

export default function ExpensePieChart({ transactions }: ExpensePieChartProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    // Use useSyncExternalStore to safely detect client-side mounting
    const isMounted = useSyncExternalStore(
        () => () => { },
        () => true,
        () => false
    );

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
            .sort((a, b) => b.value - a.value); // Ordenar mayor a menor
    }, [transactions]);

    const onPieEnter = (_: unknown, index: number) => {
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
        <div className="flex items-start gap-4 h-full">
            {/* Chart Section - Más compacto */}
            <div className="flex-none w-28 h-28 md:w-48 md:h-48 relative">
                {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                activeIndex={activeIndex}
                                // @ts-expect-error Recharts types incomplete for activeShape
                                activeShape={renderActiveShape}
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={45}
                                dataKey="value"
                                onMouseEnter={onPieEnter}
                                paddingAngle={3}
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
                                    borderRadius: '12px',
                                    color: '#fff',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    padding: '8px',
                                    fontSize: '12px'
                                }}
                                itemStyle={{ color: '#fff', fontSize: '0.75rem' }}
                                formatter={(value) => [`$${Number(value).toLocaleString('es-ES', { minimumFractionDigits: 0 })}`, '']}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full rounded-full border-4 border-slate-700/50 animate-pulse"></div>
                )}
            </div>

            {/* Custom Legend Section - Compacta */}
            <div className="flex-1 flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                {data.map((entry, index) => (
                    <div
                        key={entry.name}
                        className={`flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${index === activeIndex
                            ? 'bg-slate-700/50 border border-slate-600/50'
                            : 'hover:bg-slate-800/30 border border-transparent'
                            }`}
                        onMouseEnter={() => setActiveIndex(index)}
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className={`text-xs font-medium truncate max-w-[80px] ${index === activeIndex ? 'text-white' : 'text-slate-300'}`}>
                                {entry.name}
                            </span>
                        </div>
                        <div className="text-right">
                            <div className={`text-xs font-bold ${index === activeIndex ? 'text-white' : 'text-slate-400'}`}>
                                ${Number(entry.value).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-[9px] text-slate-500">
                                {((Number(entry.value) / data.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(0)}%
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
