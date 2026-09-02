"use client";

import { useOnboarding } from "@/contexts/OnboardingContext";

const ETIQUETAS = [
  "Perfil",
  "Cuentas",
  "Metas",
  "Deudas",
  "Gastos Fijos",
  "Resumen",
];

export default function ProgressBar() {
  const { pasoActual, totalPasos, irAlPaso, perfil, cuentas, metas } = useOnboarding();

  const pasosCompletados = [!!perfil, cuentas.length > 0, metas.length > 0, true, true, false];
  const puedeNavegar = (paso: number) => {
    for (let i = 0; i < paso - 1; i++) {
      if (!pasosCompletados[i]) return false;
    }
    return true;
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {ETIQUETAS.map((label, idx) => {
          const numPaso = idx + 1;
          const activo = numPaso === pasoActual;
          const completado = numPaso < pasoActual;

          return (
            <div key={idx} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => puedeNavegar(numPaso) && irAlPaso(numPaso)}
                disabled={!puedeNavegar(numPaso)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                    activo
                      ? "bg-amber-500 text-slate-950 shadow-lg scale-110"
                      : completado
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-800/50 text-slate-500 border border-slate-700/30"
                  }`}
                >
                  {completado ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    numPaso
                  )}
                </div>
                <span
                  className={`hidden sm:block text-[10px] font-medium transition-colors duration-300 whitespace-nowrap ${
                    activo
                      ? "text-amber-400"
                      : completado
                      ? "text-emerald-400/70"
                      : "text-slate-600"
                  }`}
                >
                  {label}
                </span>
              </button>

              {idx < totalPasos - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-2 rounded-full transition-colors duration-300 ${
                    completado ? "bg-emerald-500/40" : "bg-slate-700/30"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
