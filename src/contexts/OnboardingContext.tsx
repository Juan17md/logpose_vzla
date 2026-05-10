"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface PerfilFinanciero {
  monthlySalary: number;
  monthlyBudget: number;
  monedaBase: "USD" | "VES";
  savingsPhysical: number;
  savingsUSDT: number;
}

export interface CuentaOnboarding {
  nombre: string;
  banco: string;
  moneda: "USD" | "EUR" | "USDT" | "BS";
  saldoInicial: number;
}

export interface MetaOnboarding {
  name: string;
  targetAmount: number;
  currentAmount: number;
}

export interface DeudaOnboarding {
  personName: string;
  type: "por_cobrar" | "por_pagar";
  amount: number;
  currency: "USD" | "VES";
  description?: string;
}

export interface GastoFijoOnboarding {
  title: string;
  amount: number;
  currency: "USD" | "BS";
  category: string;
  dueDay: number;
}

interface OnboardingContextType {
  pasoActual: number;
  totalPasos: number;
  perfil: PerfilFinanciero | null;
  cuentas: CuentaOnboarding[];
  metas: MetaOnboarding[];
  deudas: DeudaOnboarding[];
  gastosFijos: GastoFijoOnboarding[];
  finalizando: boolean;
  siguientePaso: () => void;
  pasoAnterior: () => void;
  irAlPaso: (paso: number) => void;
  guardarPerfil: (data: PerfilFinanciero) => void;
  agregarCuenta: (data: CuentaOnboarding) => void;
  eliminarCuenta: (index: number) => void;
  agregarMeta: (data: MetaOnboarding) => void;
  eliminarMeta: (index: number) => void;
  agregarDeuda: (data: DeudaOnboarding) => void;
  eliminarDeuda: (index: number) => void;
  agregarGastoFijo: (data: GastoFijoOnboarding) => void;
  eliminarGastoFijo: (index: number) => void;
  setFinalizando: (v: boolean) => void;
  reiniciarOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [pasoActual, setPasoActual] = useState(1);
  const [perfil, setPerfil] = useState<PerfilFinanciero | null>(null);
  const [cuentas, setCuentas] = useState<CuentaOnboarding[]>([]);
  const [metas, setMetas] = useState<MetaOnboarding[]>([]);
  const [deudas, setDeudas] = useState<DeudaOnboarding[]>([]);
  const [gastosFijos, setGastosFijos] = useState<GastoFijoOnboarding[]>([]);
  const [finalizando, setFinalizando] = useState(false);
  const totalPasos = 6;

  const siguientePaso = useCallback(() => {
    setPasoActual(p => Math.min(p + 1, totalPasos));
  }, []);

  const pasoAnterior = useCallback(() => {
    setPasoActual(p => Math.max(p - 1, 1));
  }, []);

  const irAlPaso = useCallback((paso: number) => {
    if (paso >= 1 && paso <= totalPasos) setPasoActual(paso);
  }, []);

  const guardarPerfil = useCallback((data: PerfilFinanciero) => setPerfil(data), []);
  const agregarCuenta = useCallback((data: CuentaOnboarding) => setCuentas(prev => [...prev, data]), []);
  const eliminarCuenta = useCallback((index: number) => setCuentas(prev => prev.filter((_, i) => i !== index)), []);
  const agregarMeta = useCallback((data: MetaOnboarding) => setMetas(prev => [...prev, data]), []);
  const eliminarMeta = useCallback((index: number) => setMetas(prev => prev.filter((_, i) => i !== index)), []);
  const agregarDeuda = useCallback((data: DeudaOnboarding) => setDeudas(prev => [...prev, data]), []);
  const eliminarDeuda = useCallback((index: number) => setDeudas(prev => prev.filter((_, i) => i !== index)), []);
  const agregarGastoFijo = useCallback((data: GastoFijoOnboarding) => setGastosFijos(prev => [...prev, data]), []);
  const eliminarGastoFijo = useCallback((index: number) => setGastosFijos(prev => prev.filter((_, i) => i !== index)), []);
  const reiniciarOnboarding = useCallback(() => {
    setPasoActual(1);
    setPerfil(null);
    setCuentas([]);
    setMetas([]);
    setDeudas([]);
    setGastosFijos([]);
    setFinalizando(false);
  }, []);

  return (
    <OnboardingContext.Provider value={{
      pasoActual, totalPasos, perfil, cuentas, metas, deudas, gastosFijos, finalizando,
      siguientePaso, pasoAnterior, irAlPaso,
      guardarPerfil, agregarCuenta, eliminarCuenta,
      agregarMeta, eliminarMeta, agregarDeuda, eliminarDeuda,
      agregarGastoFijo, eliminarGastoFijo, setFinalizando, reiniciarOnboarding,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useOnboarding debe usarse dentro de OnboardingProvider");
  return context;
}
