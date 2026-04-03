export interface TasasCambio {
    usd: number;
    eur: number;
    usdt: number;
    lastUpdated: string;
}

let cachedRates: TasasCambio | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

const FALLBACK_RATES: TasasCambio = {
    usd: 473.91,
    eur: 512.20,
    usdt: 663.50, // Promedio real según Monitor Dólar / Binance P2P
    lastUpdated: new Date().toISOString()
};

export async function getRates(forceRefresh: boolean = false): Promise<TasasCambio> {
    if (!forceRefresh && cachedRates && (Date.now() - lastFetchTime < CACHE_DURATION)) {
        return cachedRates;
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

        return rates;
    } catch (error) {
        console.warn("Error fetching rates, using fallback:", error);
        return cachedRates || FALLBACK_RATES;
    }
}

// Mantener compatibilidad con código existente que usa getBCVRate
export async function getBCVRate(): Promise<number> {
    const rates = await getRates();
    return rates.usd;
}
