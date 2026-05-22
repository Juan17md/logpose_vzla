import { parseNumeroFlexible } from "./number";

export interface TransaccionInferida {
    intent: "transaction";
    amount: number;
    type: "ingreso" | "gasto";
    category: string;
    description: string;
    currency: "USD" | "VES" | "EUR" | "USDT";
}

const PALABRAS_GASTO = /(gast[eé]|pagu[eé]|pagué|gaste|compre|di\b|salio|salió)/i;
const PALABRAS_INGRESO = /(recib[ií]|cobr[eé]|ingres[oó]|gan[eé]|me pagaron|sueldo|salario|nomina|nómina)/i;

const CATEGORIAS_POR_PALABRA: Record<string, string[]> = {
    Comida: ["comida", "restaurante", "almuerzo", "cena", "super", "mercado", "pizza", "cafe", "café"],
    Transporte: ["uber", "taxi", "gasolina", "transporte", "pasaje", "metro"],
    Salud: ["farmacia", "medicina", "doctor", "hospital"],
    Entretenimiento: ["cine", "netflix", "fiesta", "bar"],
    Servicios: ["luz", "agua", "internet", "telefono", "teléfono"],
    Salario: ["salario", "sueldo", "nomina", "nómina"],
};

/** Detecta si el mensaje de Nami está pidiendo seleccionar una cuenta */
export function mensajePideCuenta(texto: string): boolean {
    return /(de qu[eé] cuenta|cu[aá]l(es)?\s+(de\s+)?(tus\s+)?cuentas?|qu[eé] cuenta|en qu[eé] cuenta|necesito saber.*cuenta|selecciona.*cuenta|cuenta salieron|cuenta fue)/i.test(
        texto
    );
}

function normalizar(texto: string): string {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function inferirCategoria(texto: string): string {
    const t = normalizar(texto);
    for (const [categoria, palabras] of Object.entries(CATEGORIAS_POR_PALABRA)) {
        if (palabras.some((p) => t.includes(p))) return categoria;
    }
    return "Otra";
}

function inferirMoneda(texto: string, sufijoMoneda?: string): "USD" | "VES" | "EUR" | "USDT" {
    const moneda = (sufijoMoneda || "").toLowerCase();
    if (/bs|bolivar/.test(moneda)) return "VES";
    if (/€|eur/.test(moneda)) return "EUR";
    if (/usdt|₮/.test(moneda)) return "USDT";
    if (/\$|usd|dolar/.test(moneda)) return "USD";

    const t = normalizar(texto);
    if (/\d+\s*bs|bolivar/.test(t)) return "VES";
    if (/\d+\s*€|euro/.test(t)) return "EUR";
    if (/\d+\s*usdt|₮/.test(t)) return "USDT";
    return "USD";
}

/**
 * Extrae una transacción pendiente del mensaje del usuario cuando la IA
 * respondió solo con texto pidiendo la cuenta (sin operations en JSON).
 */
export function inferirTransaccionDesdeTexto(texto: string): TransaccionInferida | null {
    if (!texto?.trim()) return null;

    const esGasto = PALABRAS_GASTO.test(texto);
    const esIngreso = PALABRAS_INGRESO.test(texto);
    if (!esGasto && !esIngreso) return null;

    const matchMonto = texto.match(
        /(\d+(?:[.,]\d+)?)\s*(bs\.?|bolivar(?:es)?|\$|usd|dolar(?:es)?|€|eur|usdt|₮)?/i
    );
    if (!matchMonto) return null;

    const amount = parseNumeroFlexible(matchMonto[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const currency = inferirMoneda(texto, matchMonto[2]);

    return {
        intent: "transaction",
        amount,
        type: esIngreso && !esGasto ? "ingreso" : "gasto",
        category: inferirCategoria(texto),
        description: texto.trim(),
        currency,
    };
}
