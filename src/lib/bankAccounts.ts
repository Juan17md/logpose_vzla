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
 * Convierte un monto a la moneda de una cuenta bancaria.
 * Si la cuenta es "BS", transforma el monto usando exchangeRate/originalAmount.
 * Si la cuenta está en USD/USDT/EUR y la transacción es VES, convierte usando la tasa.
 * Para conversiones entre monedas no-BS, usa tasasEnBs como intermediario.
 */
export function convertirMontoParaCuenta(
    monto: number,
    monedaTransaccion: string,
    monedaCuenta: MonedaSoportada,
    exchangeRate?: number,
    originalAmount?: number,
    tasasEnBs?: Record<string, number>
): number {
    if (monedaCuenta === "BS") {
        if (monedaTransaccion === "VES") return originalAmount || monto;
        return monto * (exchangeRate || 1);
    }
    if (monedaTransaccion === "VES" && monedaCuenta !== "BS") {
        return (originalAmount || monto) / (exchangeRate || 1);
    }
    if (tasasEnBs && monedaTransaccion !== "VES" && monedaCuenta !== "BS") {
        const tasaTransaccionEnBs = tasasEnBs[monedaTransaccion] || 1;
        const tasaCuentaEnBs = tasasEnBs[monedaCuenta] || 1;
        if (tasaTransaccionEnBs > 0 && tasaCuentaEnBs > 0) {
            return monto * (tasaTransaccionEnBs / tasaCuentaEnBs);
        }
    }
    return monto;
}

/**
 * Calcula la tasa de conversión entre dos monedas usando tasasEnBs como intermediario.
 * Retorna cuántas unidades de monedaDestino equivalen a 1 unidad de monedaOrigen.
 */
export function calcularTasaConversion(
    monedaOrigen: MonedaSoportada,
    monedaDestino: MonedaSoportada,
    tasasEnBs: Record<string, number>
): number {
    if (monedaOrigen === monedaDestino) return 1;
    const tasaOrigen = monedaOrigen === "BS" ? 1 : (tasasEnBs[monedaOrigen] || 0);
    const tasaDestino = monedaDestino === "BS" ? 1 : (tasasEnBs[monedaDestino] || 0);
    if (tasaOrigen === 0 || tasaDestino === 0) return 0;
    return tasaOrigen / tasaDestino;
}

/**
 * Genera un color aleatorio de la paleta para una nueva cuenta
 */
export function obtenerColorAleatorio(): string {
    return COLORES_CUENTA[Math.floor(Math.random() * COLORES_CUENTA.length)];
}

/** Normaliza texto para comparaciones insensibles a acentos y mayúsculas */
function normalizarTextoCuenta(texto: string): string {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/** Limpia frases habituales al elegir cuenta por chat ("en mi cuenta mercantil") */
function limpiarReferenciaCuenta(referencia: string): string {
    return normalizarTextoCuenta(referencia)
        .replace(/^(en(\s+(la|mi))?\s+)?(cuenta\s+)?/, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Resuelve el ID de Firestore de una cuenta a partir de una referencia del usuario o la IA.
 * Usa puntuación por coincidencia para tolerar nombres parciales ("venezuela" → Banco de Venezuela).
 */
export function resolverIdCuenta(
    referencia: string,
    cuentas: Array<{ id: string; nombre: string; banco: string }>
): string | null {
    if (!referencia?.trim() || cuentas.length === 0) return null;

    const refOriginal = referencia.trim();
    const ref = limpiarReferenciaCuenta(referencia);
    if (!ref) return null;

    const porId = cuentas.find((c) => c.id === refOriginal);
    if (porId) return porId.id;

    const porNombreExacto = cuentas.find(
        (c) => normalizarTextoCuenta(c.nombre) === ref
    );
    if (porNombreExacto) return porNombreExacto.id;

    const predefinido = BANCOS_PREDEFINIDOS.find(
        (b) =>
            b.id === ref ||
            normalizarTextoCuenta(b.nombre) === ref ||
            normalizarTextoCuenta(b.nombre).includes(ref) ||
            ref.includes(normalizarTextoCuenta(b.nombre))
    );

    let mejorCuenta: { id: string } | null = null;
    let mejorPuntaje = 0;
    let segundoPuntaje = 0;

    for (const cuenta of cuentas) {
        const nombre = normalizarTextoCuenta(cuenta.nombre);
        const banco = normalizarTextoCuenta(cuenta.banco);
        let puntaje = 0;

        if (nombre === ref || banco === ref) puntaje += 120;
        if (nombre.includes(ref)) puntaje += 80;
        if (banco.includes(ref)) puntaje += 70;
        if (ref.length >= 4 && nombre.includes(ref)) puntaje += 10;

        if (predefinido) {
            const nombrePredef = normalizarTextoCuenta(predefinido.nombre);
            if (
                banco.includes(nombrePredef) ||
                nombre.includes(nombrePredef) ||
                banco.includes(predefinido.id) ||
                nombre.includes(predefinido.id)
            ) {
                puntaje += 90;
            }
        }

        const palabras = ref.split(" ").filter((p) => p.length >= 3);
        for (const palabra of palabras) {
            if (nombre.includes(palabra)) puntaje += 25;
            if (banco.includes(palabra)) puntaje += 20;
        }

        if (puntaje > mejorPuntaje) {
            segundoPuntaje = mejorPuntaje;
            mejorPuntaje = puntaje;
            mejorCuenta = cuenta;
        } else if (puntaje > segundoPuntaje) {
            segundoPuntaje = puntaje;
        }
    }

    const umbralMinimo = 50;
    if (mejorCuenta && mejorPuntaje >= umbralMinimo && mejorPuntaje > segundoPuntaje) {
        return mejorCuenta.id;
    }

    return null;
}

/**
 * Tasa Bs por unidad de moneda extranjera para impactar saldos de cuentas en BS.
 */
export function obtenerTasaParaMoneda(
    moneda: string,
    tasasEnBs: Record<string, number>
): number {
    const clave = moneda.toUpperCase();
    if (clave === "EUR") return tasasEnBs.EUR || tasasEnBs.USD || 1;
    if (clave === "USDT") return tasasEnBs.USDT || tasasEnBs.USD || 1;
    return tasasEnBs.USD || 1;
}
