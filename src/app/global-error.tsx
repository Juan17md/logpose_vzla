"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error global capturado:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="antialiased font-sans bg-slate-950">
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
          {/* Background Orbs */}
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-md w-full relative z-10 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
                <div className="relative bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-[2.5rem] shadow-lg">
                  <div className="text-red-400">
                    <FiAlertTriangle size={64} />
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="space-y-4">
              <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter" style={{ fontFamily: "'Bungee', sans-serif" }}>
                ¡UPS!
              </h1>
              <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
                Error crítico
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed max-w-[320px] mx-auto">
                Ocurrió un error grave en la aplicación. Recarga para intentar de nuevo.
              </p>
              {error.digest && (
                <p className="text-xs text-slate-600 font-mono mt-2">
                  Código: <span className="text-slate-500">{error.digest}</span>
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-12 grid grid-cols-1 gap-4">
              <button
                onClick={reset}
                className="bg-gradient-to-r from-red-600 to-amber-600 text-white font-black py-3 px-6 rounded-2xl hover:from-red-500 hover:to-amber-500 hover:scale-[1.02] active:scale-[0.98] shadow-lg transition-[transform,color] duration-200 flex items-center justify-center gap-2 w-full"
              >
                <FiRefreshCw size={20} />
                <span>INTENTAR DE NUEVO</span>
              </button>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="absolute bottom-8 left-0 right-0 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
              LogPose VZLA • Tu sistema financiero personal
            </span>
          </div>
        </div>
      </body>
    </html>
  );
}