"use client";

import { useState, useMemo, useEffect } from "react";
import { pie, arc, PieArcDatum } from "d3";

interface ChartData {
    name: string;
    value: number;
    color?: string;
    [key: string]: string | number | undefined;
}

const GRADIENTS = [
    { id: 'rep-grad-emerald', from: '#10B981', to: '#047857' }, // Emerald
    { id: 'rep-grad-red', from: '#EF4444', to: '#B91C1C' },     // Red
    { id: 'rep-grad-cyan', from: '#06B6D4', to: '#0891B2' },    // Cyan
    { id: 'rep-grad-amber', from: '#F59E0B', to: '#B45309' },   // Amber
    { id: 'rep-grad-violet', from: '#8B5CF6', to: '#5B21B6' },  // Violet
    { id: 'rep-grad-pink', from: '#EC4899', to: '#9D174D' },    // Pink
];

// ==========================================
// 1. EXPENSE CATEGORY CHART (Donut Chart)
// ==========================================
export function ExpenseCategoryChart({ data }: { data: ChartData[] }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const totalVal = useMemo(() => {
        return data.reduce((acc, curr) => acc + curr.value, 0);
    }, [data]);

    // Configuración del Donut con D3
    const radius = 100;
    const pieLayout = useMemo(() => {
        return pie<ChartData>()
            .value((d) => d.value)
            .padAngle(0.03)
            .sort(null);
    }, []);

    const arcGenerator = useMemo(() => {
        return arc<PieArcDatum<ChartData>>()
            .innerRadius(64)
            .outerRadius((d) => (d.index === activeIndex ? 92 : 84)) // Hover zoom
            .cornerRadius(5);
    }, [activeIndex]);

    const arcs = useMemo(() => {
        return pieLayout(data);
    }, [data, pieLayout]);

    if (data.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-slate-900/40 rounded-[2.5rem] border border-slate-700/50 border-dashed backdrop-blur-sm">
                <p className="font-semibold text-sm">Sin datos para mostrar 📊</p>
                <p className="text-[10px] opacity-60 mt-1">Registra gastos para ver el gráfico</p>
            </div>
        );
    }

    const activeItem = data[activeIndex] || data[0] || { name: '', value: 0 };
    const percentage = totalVal > 0 ? ((activeItem.value / totalVal) * 100).toFixed(0) : '0';

    return (
        <div className="h-72 w-full flex items-center justify-center relative">
            {isMounted ? (
                <div className="w-52 h-52 relative">
                    <svg
                        viewBox={`-${radius} -${radius} ${radius * 2} ${radius * 2}`}
                        className="w-full h-full overflow-visible"
                    >
                        <defs>
                            {GRADIENTS.map((g) => (
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
                                        className="transition-all duration-300 cursor-pointer focus:outline-none"
                                        style={{
                                            filter: isActive ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' : 'none',
                                            transform: isActive ? 'scale(1.03)' : 'scale(1)',
                                            transformOrigin: 'center'
                                        }}
                                        onMouseEnter={() => setActiveIndex(i)}
                                    />
                                );
                            })}
                        </g>
                    </svg>

                    {/* Central Data Card */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-3">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest truncate max-w-[130px]">
                            {activeItem.name}
                        </p>
                        <p className="text-xl font-black text-white leading-none mt-1">
                            ${Number(activeItem.value).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                            {percentage}% del total
                        </p>
                    </div>
                </div>
            ) : (
                <div className="w-52 h-52 rounded-full border-4 border-slate-800 animate-pulse" />
            )}
        </div>
    );
}

// ==========================================
// 2. BALANCE CHART (Custom Bar Chart)
// ==========================================
export function BalanceChart({ data }: { data: ChartData[] }) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const maxValue = useMemo(() => {
        return Math.max(...data.map(d => d.value), 100);
    }, [data]);

    if (data.every(d => d.value === 0)) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-slate-900/40 rounded-[2.5rem] border border-slate-700/50 border-dashed backdrop-blur-sm">
                <p className="font-semibold text-sm">Sin movimientos en este periodo 📉</p>
            </div>
        );
    }

    return (
        <div className="h-72 w-full flex flex-col justify-between pt-4">
            {/* Bars Container */}
            <div className="flex-1 flex justify-around items-end px-4 gap-4 md:gap-8 h-48">
                {data.map((item, i) => {
                    const heightPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                    const isHovered = hoveredIdx === i;
                    const color = item.color || '#10b981';

                    return (
                        <div
                            key={item.name}
                            className="flex-1 flex flex-col justify-end items-center h-full relative"
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                        >
                            {/* Value tooltip above bar */}
                            <div
                                className={`absolute -top-6 text-xs font-black transition-all duration-300 ${isHovered ? 'text-white scale-110' : 'text-slate-400'
                                    }`}
                            >
                                ${Number(item.value).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>

                            {/* The Bar */}
                            <div
                                className="w-12 sm:w-16 rounded-t-2xl transition-all duration-500 ease-out cursor-pointer relative group overflow-hidden"
                                style={{
                                    height: `${Math.max(heightPercent, 4)}%`,
                                    backgroundColor: color,
                                    boxShadow: isHovered ? `0 0 20px ${color}80` : 'none',
                                    filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
                                }}
                            >
                                {/* Inner glow / glass effect */}
                                <div className="absolute inset-0 bg-linear-to-b from-white/20 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Labels/Legend at the bottom */}
            <div className="flex justify-around items-center border-t border-slate-800 pt-4 mt-2">
                {data.map((item, i) => {
                    const isHovered = hoveredIdx === i;
                    const color = item.color || '#10b981';
                    return (
                        <div
                            key={item.name}
                            className="flex flex-col items-center gap-1 cursor-pointer"
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                        >
                            <div className="flex items-center gap-1.5">
                                <span
                                    className="w-2.5 h-2.5 rounded-full transition-transform"
                                    style={{
                                        backgroundColor: color,
                                        transform: isHovered ? 'scale(1.25)' : 'scale(1)'
                                    }}
                                />
                                <span className={`text-xs font-bold transition-colors ${isHovered ? 'text-white' : 'text-slate-400'}`}>
                                    {item.name}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
