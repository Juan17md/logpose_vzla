"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { FiAlertTriangle, FiRefreshCw, FiHome } from "react-icons/fi";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Registrar el error en Sentry para diagnóstico en producción
    Sentry.captureException(error);
    console.error("Error en Dashboard:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-400">
          <FiAlertTriangle className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          Ocurrió un error inesperado
        </h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          No pudimos cargar esta sección correctamente. Puedes intentar recargarla o regresar al inicio del panel.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 cursor-pointer text-sm"
          >
            <FiRefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white font-medium rounded-xl border border-slate-700/50 transition-all duration-200 text-sm cursor-pointer"
          >
            <FiHome className="w-4 h-4" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
