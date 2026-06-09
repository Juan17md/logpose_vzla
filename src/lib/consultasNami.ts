export interface ContextoConsultaNami {
    balance: number;
    monthlyExpense: number;
    monthlyIncome: number;
    monthlyBudget: number;
    topCategories: Array<{ category: string; amount: number }>;
    debts: Array<{ person: string; amount: number }>;
    goals: Array<{ name: string; current: number; target: number }>;
}

export function ejecutarConsultaNami(
    consulta: {
        queryType?: string;
        category?: string;
        period?: string;
        message?: string;
    },
    ctx: ContextoConsultaNami
): string {
    const tipo = consulta.queryType || "summary";

    switch (tipo) {
        case "balance":
            return `💰 Tu **saldo total** consolidado es **$${ctx.balance.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.`;

        case "expenses":
            return `📊 Llevas **$${ctx.monthlyExpense.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** en gastos este mes.`;

        case "income":
            return `📈 Tus **ingresos del mes** suman **$${ctx.monthlyIncome.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.`;

        case "debts": {
            if (ctx.debts.length === 0) return "🤝 No tienes deudas pendientes registradas.";
            const lineas = ctx.debts
                .map((d) => `- **${d.person}**: $${d.amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
                .join("\n");
            return `🤝 **Deudas pendientes:**\n\n${lineas}`;
        }

        case "goals": {
            if (ctx.goals.length === 0) return "🎯 No tienes metas de ahorro activas.";
            const lineas = ctx.goals
                .map((g) => {
                    const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
                    return `- **${g.name}**: $${g.current.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de $${g.target.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pct}%)`;
                })
                .join("\n");
            return `🎯 **Tus metas:**\n\n${lineas}`;
        }

        case "category_breakdown": {
            const cat = consulta.category;
            const filtradas = cat
                ? ctx.topCategories.filter(
                      (c) => c.category.toLowerCase() === cat.toLowerCase()
                  )
                : ctx.topCategories;
            if (filtradas.length === 0) {
                return cat
                    ? `No hay gastos en **${cat}** este mes.`
                    : "No hay gastos categorizados este mes.";
            }
            const lineas = filtradas
                .map(
                    (c) =>
                        `- **${c.category}**: $${c.amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                )
                .join("\n");
            return cat
                ? `📂 Gasto en **${cat}** este mes: **$${filtradas[0].amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**`
                : `📂 **Gastos por categoría (mes):**\n\n${lineas}`;
        }

        case "summary":
        default: {
            const ahorro =
                ctx.monthlyIncome > 0
                    ? Math.round(
                          ((ctx.monthlyIncome - ctx.monthlyExpense) / ctx.monthlyIncome) * 100
                      )
                    : 0;
            return (
                `📋 **Resumen del mes:**\n\n` +
                `- Ingresos: **$${ctx.monthlyIncome.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n` +
                `- Gastos: **$${ctx.monthlyExpense.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n` +
                `- Balance total: **$${ctx.balance.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n` +
                `- Ratio de ahorro: **${ahorro}%**` +
                (ctx.monthlyBudget > 0
                    ? `\n- Presupuesto: **$${ctx.monthlyBudget.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**`
                    : "")
            );
        }
    }
}
