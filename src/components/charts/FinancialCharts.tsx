"use client";

import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ComposedChart, Line
} from "recharts";

interface ChartData {
    name: string;
    value: number;
    color?: string;
    [key: string]: string | number | undefined;
}

interface TrendChartData {
    name: string;
    ingresos: number;
    gastos: number;
    balance: number;
}

const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

export function ExpenseCategoryChart({ data }: { data: ChartData[] }) {
    if (data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-slate-500">Sin datos para mostrar</div>;
    }

    return (
        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#fff" }}
                        itemStyle={{ color: "#fff" }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function BalanceChart({ data }: { data: ChartData[] }) {
    if (data.every(d => d.value === 0)) {
        return <div className="h-64 flex items-center justify-center text-slate-500">Sin movimientos en este periodo</div>;
    }

    // Formateador para mostrar solo 2 decimales
    const formatValue = (value: number) => {
        return value.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    return (
        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis
                        stroke="#9ca3af"
                        tickFormatter={formatValue}
                    />
                    <Tooltip
                        cursor={{ fill: '#374151', opacity: 0.2 }}
                        contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#fff" }}
                        formatter={(value: number | undefined) => value !== undefined ? `$${formatValue(value)}` : '$0'}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ==============================================
// 🏴‍☠️ NUEVOS GRÁFICOS: ESTILO RADAR Y TENDENCIAS
// ==============================================

export function ExpenseRadarChart({ data }: { data: ChartData[] }) {
    if (data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-slate-500">Sin datos para el Radar</div>;
    }

    return (
        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis 
                        dataKey="name" 
                        tick={{ fill: '#9ca3af', fontSize: 12, className: 'capitalize' }} 
                    />
                    <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 'auto']} 
                        tick={{ fill: '#4b5563', fontSize: 10 }}
                        axisLine={false}
                    />
                    <Radar
                        name="Gastos"
                        dataKey="value"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.4}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", borderColor: "#8b5cf6", color: "#fff", borderRadius: "8px" }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, 'Presupuesto Usado']}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function TrendComposedChart({ data }: { data: TrendChartData[] }) {
    if (data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-slate-500">Navegando en aguas en calma... Sin historial.</div>;
    }

    // Formateador
    const formatValue = (value: number) => {
        return value.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    return (
        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        stroke="#9ca3af" 
                        scale="band" 
                        fontSize={12}
                        tickMargin={10}
                    />
                    <YAxis 
                        stroke="#9ca3af" 
                        fontSize={12}
                        tickFormatter={(value) => `$${formatValue(value)}`}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: '#374151', opacity: 0.2 }}
                        contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#fff", borderRadius: "8px" }}
                        formatter={(value: number | undefined, name: string | undefined) => [
                            `$${(value ?? 0).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, 
                            name === 'ingresos' ? 'Ingresos' : name === 'gastos' ? 'Gastos' : 'Balance Neto'
                        ]}
                        labelFormatter={(label) => `Mes: ${label}`}
                    />
                    <Bar dataKey="ingresos" barSize={20} fill="#10b981" radius={[4, 4, 0, 0]} name="Ingresos" />
                    <Bar dataKey="gastos" barSize={20} fill="#ef4444" radius={[4, 4, 0, 0]} name="Gastos" />
                    <Line type="monotone" dataKey="balance" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#1e293b", stroke: "#f59e0b" }} name="Balance" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
