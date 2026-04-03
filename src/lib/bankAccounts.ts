// ============================================================
// 🏦 CUENTAS BANCARIAS — Tipos, Constantes y Helpers
// ============================================================

import { Timestamp } from "firebase/firestore";

// ─── Tipos ────────────────────────────────────────────────────

export type MonedaSoportada = "USD" | "EUR" | "USDT" | "BS";

export type TipoBanco = "banco" | "billetera" | "efectivo" | "otro";

export type TipoOperacion = "deposito" | "retiro" | "transferencia" | "pago";

export interface BancoPredefinido {
    id: string;
    nombre: string;
    tipo: TipoBanco;
}

export interface CuentaBancaria {
    id: string;
    nombre: string;
    banco: string;
    moneda: MonedaSoportada;
    saldo: number;
    color: string;
    activa: boolean;
    excluirDelTotal?: boolean;
    creadoEn: Timestamp | Date;
    actualizadoEn: Timestamp | Date;
}

export interface TransaccionCuenta {
    id: string;
    cuentaOrigenId: string;
    cuentaDestinoId?: string;
    tipo: TipoOperacion;
    monto: number;
    moneda: MonedaSoportada;
    comision?: number;
    tasaCambio?: number;
    descripcion: string;
    fecha: Timestamp | Date;
    creadoEn: Timestamp | Date;
}

// ─── Constantes ───────────────────────────────────────────────

export const BANCOS_PREDEFINIDOS: BancoPredefinido[] = [
    // Bancos venezolanos
    { id: "banesco", nombre: "Banesco", tipo: "banco" },
    { id: "mercantil", nombre: "Mercantil", tipo: "banco" },
    { id: "provincial", nombre: "Provincial (BBVA)", tipo: "banco" },
    { id: "bnc", nombre: "BNC", tipo: "banco" },
    { id: "venezuela", nombre: "Banco de Venezuela", tipo: "banco" },
    { id: "bicentenario", nombre: "Bicentenario", tipo: "banco" },
    { id: "bancaribe", nombre: "Bancaribe", tipo: "banco" },
    { id: "bod", nombre: "BOD", tipo: "banco" },
    { id: "banplus", nombre: "Banplus", tipo: "banco" },
    { id: "bancamiga", nombre: "Bancamiga", tipo: "banco" },
    { id: "fondo-comun", nombre: "Fondo Común", tipo: "banco" },
    // Billeteras digitales
    { id: "binance", nombre: "Binance", tipo: "billetera" },
    { id: "zinli", nombre: "Zinli", tipo: "billetera" },
    { id: "paypal", nombre: "PayPal", tipo: "billetera" },
    { id: "zelle", nombre: "Zelle", tipo: "billetera" },
    { id: "reserve", nombre: "Reserve", tipo: "billetera" },
    // Efectivo
    { id: "efectivo", nombre: "Efectivo", tipo: "efectivo" },
    // Opción personalizada
    { id: "otro", nombre: "Otro (personalizado)", tipo: "otro" },
];

export const MONEDAS_SOPORTADAS: { id: MonedaSoportada; nombre: string; simbolo: string; }[] = [
    { id: "USD", nombre: "Dólares", simbolo: "$" },
    { id: "EUR", nombre: "Euros", simbolo: "€" },
    { id: "USDT", nombre: "USDT", simbolo: "₮" },
    { id: "BS", nombre: "Bolívares", simbolo: "Bs." },
];

// Colores por defecto para las tarjetas de cuenta
export const COLORES_CUENTA: string[] = [
    "#10b981", // emerald-500
    "#3b82f6", // blue-500
    "#8b5cf6", // violet-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#06b6d4", // cyan-500
    "#ec4899", // pink-500
    "#14b8a6", // teal-500
    "#f97316", // orange-500
    "#6366f1", // indigo-500
];

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Obtiene el símbolo de una moneda
 */
export function obtenerSimboloMoneda(moneda: MonedaSoportada): string {
    return MONEDAS_SOPORTADAS.find(m => m.id === moneda)?.simbolo ?? "$";
}

/**
 * Obtiene el ícono de react-icons según el tipo de banco
 */
export function obtenerTipoBanco(bancoId: string): TipoBanco {
    const banco = BANCOS_PREDEFINIDOS.find(b => b.id === bancoId);
    return banco?.tipo ?? "otro";
}

/**
 * Obtiene el color temático según la moneda
 */
export function obtenerColorMoneda(moneda: MonedaSoportada): {
    bg: string;
    text: string;
    border: string;
    gradient: string;
} {
    const colores: Record<MonedaSoportada, { bg: string; text: string; border: string; gradient: string }> = {
        USD: {
            bg: "bg-emerald-500/15",
            text: "text-emerald-400",
            border: "border-emerald-500/25",
            gradient: "from-emerald-600/20 to-emerald-900/10",
        },
        EUR: {
            bg: "bg-blue-500/15",
            text: "text-blue-400",
            border: "border-blue-500/25",
            gradient: "from-blue-600/20 to-blue-900/10",
        },
        USDT: {
            bg: "bg-teal-500/15",
            text: "text-teal-400",
            border: "border-teal-500/25",
            gradient: "from-teal-600/20 to-teal-900/10",
        },
        BS: {
            bg: "bg-amber-500/15",
            text: "text-amber-400",
            border: "border-amber-500/25",
            gradient: "from-amber-600/20 to-amber-900/10",
        },
    };
    return colores[moneda];
}

/**
 * Formatea un saldo con separador de miles y símbolo de moneda
 */
export function formatearSaldo(monto: number, moneda: MonedaSoportada): string {
    const simbolo = obtenerSimboloMoneda(moneda);
    const opciones: Intl.NumberFormatOptions = {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    };

    if (moneda === "BS") {
        return `${simbolo} ${monto.toLocaleString("es-VE", opciones)}`;
    }
    return `${simbolo} ${monto.toLocaleString("es-ES", opciones)}`;
}

/**
 * Obtiene una etiqueta descriptiva para el tipo de operación
 */
export function obtenerEtiquetaOperacion(tipo: TipoOperacion): {
    label: string;
    color: string;
    bgColor: string;
} {
    const etiquetas: Record<TipoOperacion, { label: string; color: string; bgColor: string }> = {
        deposito: { label: "Depósito", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
        retiro: { label: "Retiro", color: "text-red-400", bgColor: "bg-red-500/10" },
        transferencia: { label: "Transferencia", color: "text-blue-400", bgColor: "bg-blue-500/10" },
        pago: { label: "Pago", color: "text-amber-400", bgColor: "bg-amber-500/10" },
    };
    return etiquetas[tipo];
}

/**
 * Genera un color aleatorio de la paleta para una nueva cuenta
 */
export function obtenerColorAleatorio(): string {
    return COLORES_CUENTA[Math.floor(Math.random() * COLORES_CUENTA.length)];
}
