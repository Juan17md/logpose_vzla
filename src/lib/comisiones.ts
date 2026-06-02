import { parseNumeroFlexible } from "./number";

export type TipoComision = "p2p" | "p2c" | "interbancaria" | "custom";

interface ResultadoComision {
    vesAmount: number;
    usdAmount: number;
}

/**
 * Calcula la comisión bancaria de forma automática según la regulación venezolana (SUDEBAN/BCV).
 * Aplica el porcentaje correspondiente o la comisión mínima de Bs. 2.00 (el que sea mayor).
 * 
 * @param monto Principal de la transacción
 * @param moneda Moneda de la transacción ("USD" | "VES")
 * @param tipo Tipo de comisión ("p2p" | "p2c" | "interbancaria" | "custom")
 * @param tasa Tasa de cambio oficial del BCV (VES/USD)
 */
export function calcularComision(
    monto: number | string,
    moneda: "USD" | "VES",
    tipo: TipoComision,
    tasa: number | string
): ResultadoComision {
    const montoNum = typeof monto === "number" ? monto : parseNumeroFlexible(monto || "0") || 0;
    const tasaNum = typeof tasa === "number" ? tasa : parseNumeroFlexible(tasa || "1") || 1;

    if (tipo === "custom" || montoNum <= 0) {
        return { vesAmount: 0, usdAmount: 0 };
    }

    let porcentaje = 0;
    if (tipo === "p2p" || tipo === "interbancaria") {
        porcentaje = 0.3; // 0.30%
    } else if (tipo === "p2c") {
        porcentaje = 1.5; // 1.50%
    }

    let comisionBs = 0;

    if (moneda === "VES") {
        comisionBs = montoNum * (porcentaje / 100);
        if (comisionBs < 2.00) {
            comisionBs = 2.00;
        }
    } else {
        const montoBs = montoNum * tasaNum;
        comisionBs = montoBs * (porcentaje / 100);
        if (comisionBs < 2.00) {
            comisionBs = 2.00;
        }
    }

    const comisionUSD = comisionBs / tasaNum;

    return {
        vesAmount: parseFloat(comisionBs.toFixed(2)),
        usdAmount: parseFloat(comisionUSD.toFixed(2))
    };
}
