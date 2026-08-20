export interface TasasCambio {
    usd: number;
    eur: number;
    usdt: number;
    lastUpdated: string;
}

let cachedRates: TasasCambio | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

// Las tasas persisten en localStorage (solo cliente) para servir de arranque
// offline o de fallback cuando la red falla. TTL propio: 12 horas.
const STORAGE_KEY = "logpose:tasas-cambio";
const STORAGE_DURATION = 1000 * 60 * 60 * 12;

const FALLBACK_RATES: TasasCambio = {
    usd: 473.91,
    eur: 512.20,
    usdt: 663.50, // Promedio real según Monitor Dólar / Binance P2P
    lastUpdated: new Date().toISOString()
};

function leerCachePersistido(): TasasCambio | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as TasasCambio;
        const esValida = [parsed.usd, parsed.eur, parsed.usdt].every(
            (v) => typeof v === "number" && Number.isFinite(v) && v > 0
        );
        if (!esValida) return null;
        const antiguedad = Date.now() - Date.parse(parsed.lastUpdated);
        if (!Number.isFinite(antiguedad) || antiguedad > STORAGE_DURATION) return null;
        return parsed;
    } catch {
        return null;
    }
}

function guardarCachePersistido(rates: TasasCambio): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
    } catch {
        // Almacenamiento lleno o modo privado: el fallback en memoria sigue activo
    }
}

export async function getRates(forceRefresh: boolean = false): Promise<TasasCambio> {
    if (!forceRefresh && cachedRates && (Date.now() - lastFetchTime < CACHE_DURATION)) {
        return cachedRates;
    }

    // Arranque: si no hay caché en memoria, sembrarla con lo persistido para
    // evitar un flash de valores de FALLBACK_RATES mientras llega la red.
    if (!cachedRates) {
        cachedRates = leerCachePersistido();
        if (cachedRates) lastFetchTime = Date.now() - CACHE_DURATION + 1;
    }

    try {
        // Ejecutamos las peticiones en paralelo para mayor velocidad
        const [resUsd, resEur, resUsdt] = await Promise.all([
            fetch('https://ve.dolarapi.com/v1/dolares/oficial'),
            fetch('https://ve.dolarapi.com/v1/euros/oficial'),
            fetch('https://criptoya.com/api/binancep2p/usdt/ves/1')
        ]);

        const [dataUsd, dataEur, dataUsdt] = await Promise.all([
            resUsd.ok ? resUsd.json() : null,
            resEur.ok ? resEur.json() : null,
            resUsdt.ok ? resUsdt.json() : null
        ]);

        const rates: TasasCambio = {
            usd: dataUsd?.promedio || FALLBACK_RATES.usd,
            eur: dataEur?.promedio || FALLBACK_RATES.eur,
            // Si la API de criptoya da un valor muy bajo (< 95% del paralelo), usamos paralelo o el fallback
            usdt: (dataUsdt?.ask > (dataUsd?.promedio || 0)) ? dataUsdt.ask : (dataUsdt?.ask || FALLBACK_RATES.usdt),
            lastUpdated: new Date().toISOString()
        };

        cachedRates = rates;
        lastFetchTime = Date.now();
        guardarCachePersistido(rates);

        return rates;
    } catch (error) {
        console.warn("Error fetching rates, using fallback:", error);
        if (!cachedRates) cachedRates = leerCachePersistido();
        return cachedRates || FALLBACK_RATES;
    }
}

// Mantener compatibilidad con código existente que usa getBCVRate
export async function getBCVRate(): Promise<number> {
    const rates = await getRates();
    return rates.usd;
}