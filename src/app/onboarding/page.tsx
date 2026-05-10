"use client";

import { useOnboarding } from "@/contexts/OnboardingContext";
import ProgressBar from "@/components/onboarding/ProgressBar";
import PasoPerfilFinanciero from "@/components/onboarding/PasoPerfilFinanciero";
import PasoCuentas from "@/components/onboarding/PasoCuentas";
import PasoMetas from "@/components/onboarding/PasoMetas";
import PasoDeudas from "@/components/onboarding/PasoDeudas";
import PasoGastosFijos from "@/components/onboarding/PasoGastosFijos";
import PasoResumen from "@/components/onboarding/PasoResumen";
import { AnimatePresence } from "framer-motion";

export default function OnboardingPage() {
  const { pasoActual, siguientePaso, pasoAnterior } = useOnboarding();

  return (
    <div>
      <ProgressBar />
      <AnimatePresence mode="wait">
        {pasoActual === 1 && (
          <PasoPerfilFinanciero key="paso1" onSiguiente={siguientePaso} />
        )}
        {pasoActual === 2 && (
          <PasoCuentas key="paso2" onSiguiente={siguientePaso} onAnterior={pasoAnterior} />
        )}
        {pasoActual === 3 && (
          <PasoMetas key="paso3" onSiguiente={siguientePaso} onAnterior={pasoAnterior} />
        )}
        {pasoActual === 4 && (
          <PasoDeudas key="paso4" onSiguiente={siguientePaso} onAnterior={pasoAnterior} />
        )}
        {pasoActual === 5 && (
          <PasoGastosFijos key="paso5" onSiguiente={siguientePaso} onAnterior={pasoAnterior} />
        )}
        {pasoActual === 6 && (
          <PasoResumen key="paso6" onAnterior={pasoAnterior} />
        )}
      </AnimatePresence>
    </div>
  );
}
