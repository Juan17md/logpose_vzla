"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface ChartData {
    name: string;
    value: number;
    color?: string;
    [key: string]: any;
}

const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];
const COLORS_EXPENSE = ["#ef4444", "#f87171", "#fca5a5", "#b91c1c", "#991b1b", "#7f1d1d"];

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

    return (
        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip cursor={{ fill: '#374151', opacity: 0.2 }} contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#fff" }} />
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
