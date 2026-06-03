"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import { scaleLinear, line as d3line, area as d3area, max, curveMonotoneX } from 'd3';

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
    const [isMounted, setIsMounted] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

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

        // 2. Llenar con datos (ignorando transferencias según directivas de arquitectura financiera)
        transactions.forEach(t => {
            if (t.type === 'transferencia') return;

            const tDate = new Date(t.date instanceof Date ? t.date : t.date.seconds * 1000);

            // Filtrar solo mes actual
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                const dayIndex = tDate.getDate() - 1;
                if (t.type === 'ingreso') {
                    days[dayIndex].ingresos += Number(t.amount);
                } else if (t.type === 'gasto') {
                    days[dayIndex].gastos += Number(t.amount);
                }
            }
        });

        // 3. Filtrar días futuros para que el gráfico no se vea plano al final
        const today = now.getDate();
        return days.filter(d => d.day <= today);
    }, [transactions]);

    // Matemáticas D3 para escalas y paths
    const xScale = useMemo(() => {
        if (data.length <= 1) {
            return scaleLinear().domain([1, 31]).range([0, 100]);
        }
        return scaleLinear()
            .domain([data[0].day, data[data.length - 1].day])
            .range([0, 100]);
    }, [data]);

    const yScale = useMemo(() => {
        const maxVal = max(data, (d) => Math.max(d.ingresos, d.gastos)) || 100;
        // Margen superior del 15% para que las líneas no toquen el borde superior del SVG
        return scaleLinear()
            .domain([0, maxVal * 1.15])
            .range([100, 0]);
    }, [data]);

    const lineGeneratorIngresos = useMemo(() => {
        return d3line<(typeof data)[number]>()
            .x((d) => xScale(d.day))
            .y((d) => yScale(d.ingresos))
            .curve(curveMonotoneX);
    }, [xScale, yScale]);

    const areaGeneratorIngresos = useMemo(() => {
        return d3area<(typeof data)[number]>()
            .x((d) => xScale(d.day))
            .y0(yScale(0))
            .y1((d) => yScale(d.ingresos))
            .curve(curveMonotoneX);
    }, [xScale, yScale]);

    const lineGeneratorGastos = useMemo(() => {
        return d3line<(typeof data)[number]>()
            .x((d) => xScale(d.day))
            .y((d) => yScale(d.gastos))
            .curve(curveMonotoneX);
    }, [xScale, yScale]);

    const areaGeneratorGastos = useMemo(() => {
        return d3area<(typeof data)[number]>()
            .x((d) => xScale(d.day))
            .y0(yScale(0))
            .y1((d) => yScale(d.gastos))
            .curve(curveMonotoneX);
    }, [xScale, yScale]);

    const paths = useMemo(() => {
        if (data.length === 0) return { lineIngresos: '', areaIngresos: '', lineGastos: '', areaGastos: '' };
        return {
            lineIngresos: lineGeneratorIngresos(data) || '',
            areaIngresos: areaGeneratorIngresos(data) || '',
            lineGastos: lineGeneratorGastos(data) || '',
            areaGastos: areaGeneratorGastos(data) || '',
        };
    }, [data, lineGeneratorIngresos, areaGeneratorIngresos, lineGeneratorGastos, areaGeneratorGastos]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current || data.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calcular porcentaje X
        const percentX = (x / rect.width) * 100;
        
        // Mapear de regreso al día o índice más cercano
        const itemWidthPercent = 100 / (data.length - 1 || 1);
        const index = Math.round(percentX / itemWidthPercent);

        if (index >= 0 && index < data.length) {
            setHoveredIndex(index);
            // Posicionar tooltip con límites
            const tooltipWidth = 150;
            let tx = x + 15;
            let ty = y - 60;

            if (tx + tooltipWidth > rect.width) {
                tx = x - tooltipWidth - 15;
            }
            if (ty < 10) {
                ty = 10;
            }
            setTooltipPos({ x: tx, y: ty });
        }
    };

    const handleMouseLeave = () => {
        setHoveredIndex(null);
        setTooltipPos(null);
    };

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

    const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

    return (
        <div 
            ref={containerRef}
            className="w-full h-full min-h-[160px] relative select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                </defs>

                {/* Líneas de cuadrícula horizontal sutiles (D3 ticks equivalentes) */}
                {yScale.ticks(4).map((tick, i) => (
                    <line
                        key={`grid-${i}`}
                        x1="0"
                        y1={yScale(tick)}
                        x2="100"
                        y2={yScale(tick)}
                        className="stroke-slate-800"
                        strokeWidth="0.5"
                        vectorEffect="non-scaling-stroke"
                    />
                ))}

                {/* Áreas degradadas */}
                <path
                    d={paths.areaIngresos}
                    fill="url(#colorIngresos)"
                    className="transition-all duration-300"
                />
                <path
                    d={paths.areaGastos}
                    fill="url(#colorGastos)"
                    className="transition-all duration-300"
                />

                {/* Líneas de contorno */}
                <path
                    d={paths.lineIngresos}
                    fill="none"
                    className="text-emerald-500 transition-all duration-300"
                    stroke="currentColor"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />
                <path
                    d={paths.lineGastos}
                    fill="none"
                    className="text-red-500 transition-all duration-300"
                    stroke="currentColor"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />

                {/* Crosshair (Línea de guía vertical en Hover) */}
                {hoveredData && (
                    <>
                        <line
                            x1={xScale(hoveredData.day)}
                            y1="0"
                            x2={xScale(hoveredData.day)}
                            y2="100"
                            className="stroke-slate-600/70"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                            vectorEffect="non-scaling-stroke"
                        />
                        {/* Marcadores de puntos */}
                        <circle
                            cx={xScale(hoveredData.day)}
                            cy={yScale(hoveredData.ingresos)}
                            r="4"
                            className="fill-emerald-500 stroke-slate-950"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                        />
                        <circle
                            cx={xScale(hoveredData.day)}
                            cy={yScale(hoveredData.gastos)}
                            r="4"
                            className="fill-red-500 stroke-slate-950"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                        />
                    </>
                )}
            </svg>

            {/* X-Axis etiquetas flotantes */}
            <div className="absolute left-0 bottom-0 right-0 h-4 flex justify-between text-[10px] text-slate-500 px-1 pointer-events-none translate-y-4">
                <span>Día 1</span>
                <span>Día {Math.round(data.length / 2)}</span>
                <span>Día {data.length}</span>
            </div>

            {/* Tooltip Interactivo Flotante */}
            {hoveredData && tooltipPos && (
                <div
                    style={{
                        left: `${tooltipPos.x}px`,
                        top: `${tooltipPos.y}px`,
                    }}
                    className="absolute bg-slate-900/95 border border-slate-700/80 backdrop-blur-md text-white p-2.5 rounded-xl shadow-xl flex flex-col gap-1 pointer-events-none transition-all duration-75 z-55"
                >
                    <p className="text-[10px] font-bold text-slate-400">Día {hoveredData.day}</p>
                    <div className="flex items-center gap-4 justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] text-slate-300">Ingresos</span>
                        </div>
                        <span className="text-xs font-bold text-white">${hoveredData.ingresos.toLocaleString('es-ES', { minimumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex items-center gap-4 justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-[10px] text-slate-300">Gastos</span>
                        </div>
                        <span className="text-xs font-bold text-white">${hoveredData.gastos.toLocaleString('es-ES', { minimumFractionDigits: 0 })}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
