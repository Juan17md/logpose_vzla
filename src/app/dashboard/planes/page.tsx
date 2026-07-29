"use client";

import { usePlanLimits } from "@/hooks/usePlanLimits";
import { LIMITES_FREE, LIMITES_PREMIUM } from "@/lib/planLimits";
import { FiCheck, FiX, FiStar, FiArrowRight } from "react-icons/fi";

function PlanCard({
  name,
  price,
  description,
  features,
  isPremium,
  isCurrent,
  cta,
}: {
  name: string;
  price: string;
  description: string;
  features: { label: string; included: boolean }[];
  isPremium: boolean;
  isCurrent: boolean;
  cta: string;
}) {
  return (
    <div
      className={`relative rounded-[2.5rem] border p-6 md:p-8 flex flex-col ${
        isPremium
          ? "border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent shadow-[0_20px_50px_-12px_rgba(245,158,11,0.25)]"
          : "border-slate-700/50 bg-slate-900/50 backdrop-blur-xl"
      }`}
    >
      {isPremium && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-[#07090F] text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
          <FiStar size={12} />
          RECOMENDADO
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-white">{name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-black text-white">{price}</span>
          {isPremium && <span className="text-slate-400 text-sm">/mes</span>}
        </div>
        <p className="text-slate-400 text-sm mt-2">{description}</p>
      </div>

      <ul className="space-y-3 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            {f.included ? (
              <FiCheck className="text-emerald-400 shrink-0" size={16} />
            ) : (
              <FiX className="text-slate-600 shrink-0" size={16} />
            )}
            <span className={f.included ? "text-slate-200" : "text-slate-500"}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        disabled={isCurrent}
        className={`mt-8 w-full py-3 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
          isCurrent
            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
            : isPremium
              ? "bg-amber-500 text-[#07090F] hover:bg-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:-translate-y-0.5 active:scale-[0.98]"
              : "border border-slate-600 text-slate-300 hover:bg-slate-800 hover:-translate-y-0.5 active:scale-[0.98]"
        }`}
      >
        {isCurrent ? "Plan actual" : cta}
        {!isCurrent && <FiArrowRight size={16} />}
      </button>
    </div>
  );
}

export default function PlanesPage() {
  const { plan, isTrialActive, limites } = usePlanLimits();
  const esPremium = plan === "premium";

  const featuresBase = [
    { label: "Cuentas bancarias", free: `${LIMITES_FREE.maxAccounts}`, premium: "Ilimitadas" },
    { label: "Transacciones por mes", free: `${LIMITES_FREE.maxTransactionsPerMonth}`, premium: "Ilimitadas" },
    { label: "Metas de ahorro", free: `${LIMITES_FREE.maxGoals}`, premium: "Ilimitadas" },
    { label: "Deudas", free: `${LIMITES_FREE.maxDebts}`, premium: "Ilimitadas" },
    { label: "Gastos fijos", free: `${LIMITES_FREE.maxFixedExpenses}`, premium: "Ilimitados" },
    { label: "Listas de compras", free: `${LIMITES_FREE.maxShoppingLists}`, premium: "Ilimitadas" },
    { label: "Consultas Nami IA por día", free: `${LIMITES_FREE.namiDailyQueries}`, premium: "Ilimitadas" },
    { label: "Multi-moneda (USD, VES, USDT, EUR)", free: false, premium: true },
    { label: "Categorías personalizadas", free: false, premium: true },
    { label: "Reportes avanzados (Cash Flow, Balance, MoM)", free: false, premium: true },
    { label: "Cálculo automático de comisiones VE", free: false, premium: true },
    { label: "Exportar datos (CSV / PDF)", free: false, premium: true },
  ];

  const featuresFree = featuresBase.map((f) => ({
    label: typeof f.free === "string" ? `${f.free} ${f.label}` : f.label,
    included: f.free !== false,
  }));

  const featuresPremium = featuresBase.map((f) => ({
    label: typeof f.premium === "string" ? `${f.premium} ${f.label.replace(/^\d+ /, "")}` : f.label,
    included: f.premium === true,
  }));

  return (
    <div className="pb-32 md:pb-10 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/[0.06] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400/80 text-xs font-medium tracking-wider uppercase">
            {esPremium ? "Plan Premium" : "Plan Gratuito"}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          Elige tu plan
        </h1>
        <p className="text-slate-400 mt-2 max-w-md mx-auto">
          {esPremium
            ? "Disfrutas de todas las funciones premium. Gracias por confiar en LogPose."
            : isTrialActive
              ? "Estás en período de prueba. Actualiza cuando quieras para seguir disfrutando de todas las funciones."
              : "Comienza gratis y actualiza cuando necesites más."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <PlanCard
          name="Gratuito"
          price="$0"
          description="Para empezar a organizar tus finanzas"
          features={featuresFree}
          isPremium={false}
          isCurrent={!esPremium}
          cta="Comenzar gratis"
        />

        <PlanCard
          name="Premium"
          price="$3.99"
          description="Todo lo que necesitas sin límites"
          features={featuresPremium}
          isPremium={true}
          isCurrent={esPremium}
          cta="Actualizar a Premium"
        />
      </div>

      <div className="mt-8 bg-slate-900/30 border border-slate-700/50 rounded-[2.5rem] p-6 text-center">
        <p className="text-slate-400 text-sm">
          ¿Preguntas? Escríbenos a{" "}
          <a href="mailto:soporte@logpose.com" className="text-amber-400 hover:text-amber-300 transition-colors">
            soporte@logpose.com
          </a>
        </p>
      </div>
    </div>
  );
}
