"use client";

import { useMemo, useState, useEffect } from 'react';
import { pie, arc, PieArcDatum } from 'd3';
import { FiPieChart } from 'react-icons/fi';

interface ChartDataItem {
    name: string;
    value: number;
}

interface CategoryEntry {
    name: string;
    value: number;
}

interface ExpensePieChartProps {
    transactions?: Array<{
        id: string;
        amount: number;
        type: string;
        category: string;
        description: string;
        date: Date | { seconds: number };
    }>;
    data?: CategoryEntry[];
}

const GRADIENTS = [
    { id: 'grad-amber', from: '#F59E0B', to: '#B45309' },   // Amber
    { id: 'grad-red', from: '#EF4444', to: '#B91C1C' },     // Red
    { id: 'grad-emerald', from: '#10B981', to: '#047857' }, // Emerald
    { id: 'grad-violet', from: '#8B5CF6', to: '#5B21B6' },  // Violet
    { id: 'grad-orange', from: '#F97316', to: '#C2410C' },  // Orange
    { id: 'grad-sky', from: '#0EA5E9', to: '#0369A1' },     // Sky
    { id: 'grad-indigo', from: '#6366F1', to: '#3730A3' },  // Indigo
    { id: 'grad-blue', from: '#3B82F6', to: '#1D4ED8' },    // Blue
    { id: 'grad-pink', from: '#EC4899', to: '#9D174D' },    // Pink
    { id: 'grad-teal', from: '#14B8A6', to: '#0F766E' },    // Teal
];

export default function ExpensePieChart({ transactions, data: propData }: ExpensePieChartProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration guard
        setIsMounted(true);
    }, []);

    const data = useMemo(() => {
        if (propData) {
            return propData.sort((a, b) => b.value - a.value);
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyExpenses = (transactions || []).filter(t => {
            const tDate = new Date(t.date instanceof Date ? t.date : t.date.seconds * 1000);
            return t.type === 'gasto' &&
                tDate.getMonth() === currentMonth &&
                tDate.getFullYear() === currentYear;
        });

        const grouped = monthlyExpenses.reduce((acc, curr) => {
            const category = curr.category || 'Otros';
            acc[category] = (acc[category] || 0) + Number(curr.amount);
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions, propData]);

    const totalExpense = useMemo(() => {
        return data.reduce((acc, curr) => acc + curr.value, 0);
    }, [data]);

    // Configuración del Donut con D3
    const radius = 100;
    const pieLayout = useMemo(() => {
        return pie<ChartDataItem>()
            .value((d) => d.value)
            .padAngle(0.035) // Ángulo de espacio entre rebanadas
            .sort(null);
    }, []);

    const arcGenerator = useMemo(() => {
        return arc<PieArcDatum<ChartDataItem>>()
            .innerRadius(64)
            .outerRadius((d) => (d.index === activeIndex ? 92 : 84)) // Efecto de pop-out dinámico al hover
            .cornerRadius(6);
    }, [activeIndex]);

    const arcs = useMemo(() => {
        return pieLayout(data);
    }, [data, pieLayout]);

    if (data.length === 0) {
        return (
            <div className="min-h-52 flex flex-col items-center justify-center text-slate-500 bg-slate-800/30 rounded-[2.5rem] border border-slate-700/50 border-dashed backdrop-blur-sm">
                <FiPieChart className="text-4xl mb-3 opacity-50" />
                <p className="font-medium">Sin gastos este mes</p>
                <p className="text-xs opacity-60">Tus movimientos aparecerán aquí</p>
            </div>
        );
    }

    const activeItem = data[activeIndex] || data[0] || { name: '', value: 0 };
    const activePercentage = totalExpense > 0 ? ((activeItem.value / totalExpense) * 100).toFixed(0) : '0';

    return (
        <div className="flex items-center gap-4 h-full">
            {/* SVG Donut Chart */}
            <div className="flex-none w-28 h-28 md:w-44 md:h-44 relative">
                {isMounted ? (
                    <>
                        <svg
                            viewBox={`-${radius} -${radius} ${radius * 2} ${radius * 2}`}
                            className="w-full h-full overflow-visible"
                        >
                            <defs>
                                {GRADIENTS.map((g, idx) => (
                                    <linearGradient id={g.id} key={g.id} x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor={g.from} />
                                        <stop offset="100%" stopColor={g.to} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <g>
                                {arcs.map((d, i) => {
                                    const grad = GRADIENTS[i % GRADIENTS.length];
                                    const isActive = i === activeIndex;
                                    return (
                                        <path
                                            key={d.data.name}
                                            d={arcGenerator(d) || undefined}
                                            fill={`url(#${grad.id})`}
                                            className="transition-colors duration-300 cursor-pointer focus:outline-none"
                                            style={{
                                                filter: isActive ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' : 'none',
                                                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                                transformOrigin: 'center'
                                            }}
                                            onMouseEnter={() => setActiveIndex(i)}
                                        />
                                    );
                                })}
                            </g>
                        </svg>

                        {/* Centro del Donut con Información */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                            <p className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider truncate max-w-[80px] md:max-w-[110px]">
                                {activeItem.name}
                            </p>
                            <p className="text-xs md:text-lg font-black text-white leading-none mt-1">
                                ${Number(activeItem.value).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-[8px] md:text-[10px] text-slate-500 font-medium">
                                {activePercentage}%
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full rounded-full border-4 border-slate-700/50 animate-pulse"></div>
                )}
            </div>

            {/* Custom Legend Section */}
            <div className="flex-1 flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                {data.map((entry, index) => {
                    const grad = GRADIENTS[index % GRADIENTS.length];
                    const isActive = index === activeIndex;
                    return (
                        <div
                            key={entry.name}
                            className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${isActive
                                ? 'bg-slate-800/60 border border-slate-700/50 shadow-md'
                                : 'hover:bg-slate-800/30 border border-transparent'
                                }`}
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: grad.from }}
                                />
                                <span className={`text-xs font-semibold truncate max-w-[80px] ${isActive ? 'text-white font-bold' : 'text-slate-300'}`}>
                                    {entry.name}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className={`text-xs font-black ${isActive ? 'text-white' : 'text-slate-400'}`}>
                                    ${Number(entry.value).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-[9px] text-slate-500 font-bold">
                                    {((entry.value / totalExpense) * 100).toFixed(0)}%
                                </div>
                            </div>
                        </div>
                    );
                })}
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
