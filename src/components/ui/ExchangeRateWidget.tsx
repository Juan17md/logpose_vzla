"use client";

import { useEffect, useState, useCallback } from "react";
import { getBCVRate } from "@/lib/currency";
import { FiRefreshCw } from "react-icons/fi";

export default function ExchangeRateWidget() {
    const [rate, setRate] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRate = useCallback(async () => {
        setLoading(true);
        const val = await getBCVRate();
        setRate(val);
        setLoading(false);
    }, []);

    useEffect(() => {
        void fetchRate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="bg-gradient-to-br from-emerald-900/50 to-slate-900 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-sm">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 rounded-full">
                    <span className="text-xl">🇻🇪</span>
                </div>
                <div>
                    <p className="text-xs text-emerald-300 font-medium uppercase tracking-wider">Tasa BCV</p>
                    <div className="flex items-baseline space-x-1">
                        {loading ? (
                            <div className="h-6 w-20 bg-slate-700/50 animate-pulse rounded"></div>
                        ) : (
                            <>
                                <span className="text-2xl font-bold text-white">{rate?.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                <span className="text-sm text-slate-400">Bs/USD</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <button
                onClick={fetchRate}
                disabled={loading}
                className="p-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-all disabled:opacity-50"
                title="Actualizar Tasa"
            >
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
            </button>
        </div>
    );
}
