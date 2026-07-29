"use client";

import { useState } from "react";
import Link from "next/link";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { FiX, FiStar, FiTrendingUp } from "react-icons/fi";

export default function UpgradeBanner() {
  const { esPremium, isTrialActive, plan } = usePlanLimits();
  const [dismissed, setDismissed] = useState(false);

  if (esPremium || dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.08),transparent_70%)]" />
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
        aria-label="Cerrar banner"
      >
        <FiX size={16} />
      </button>
      <div className="relative z-10 flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 rounded-xl shrink-0">
          <FiStar className="text-amber-400" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">
            {isTrialActive
              ? "Disfrutando la prueba gratuita"
              : "Actualiza a Premium"}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            {isTrialActive
              ? "Explora todas las funciones durante 14 días. Al finalizar, continúa con el plan gratuito."
              : "Desbloquea cuentas ilimitadas, reportes avanzados, exportación de datos y más."}
          </p>
          <Link
            href="/dashboard/planes"
            className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs font-semibold mt-2 transition-colors"
          >
            <FiTrendingUp size={14} />
            {isTrialActive ? "Ver planes" : "Ver planes premium"}
          </Link>
        </div>
      </div>
    </div>
  );
}
