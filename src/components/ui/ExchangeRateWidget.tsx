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
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-4 rounded-3xl flex items-center justify-between shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center space-x-4 relative z-10">
                <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-inner">
                    <span className="text-xl">🇻🇪</span>
                </div>
                <div>
                    <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest mb-0.5">Tasa BCV</p>
                    <div className="flex items-baseline space-x-1.5">
                        {loading ? (
                            <div className="h-7 w-24 bg-slate-800 animate-pulse rounded-lg"></div>
                        ) : (
                            <>
                                <span className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-200">
                                    {rate?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-xs text-amber-500/70 font-semibold uppercase tracking-wider">Bs/USD</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <button
                onClick={fetchRate}
                disabled={loading}
                className="p-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-full transition-all disabled:opacity-50"
                title="Actualizar Tasa"
            >
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
            </button>
        </div>
    );
}
