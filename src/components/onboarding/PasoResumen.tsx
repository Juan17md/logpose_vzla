"use client";

import { useRouter } from "next/navigation";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useBankAccounts } from "@/contexts/BankAccountsContext";
import { useUserData } from "@/contexts/UserDataContext";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  FiTrendingUp, FiTarget, FiCreditCard, FiUsers, FiCalendar, FiCheckCircle,
} from "react-icons/fi";
import { obtenerColorAleatorio } from "@/lib/bankAccounts";

interface PasoResumenProps {
  onAnterior: () => void;
}

export default function PasoResumen({ onAnterior }: PasoResumenProps) {
  const router = useRouter();
  const { perfil, cuentas, metas, deudas, gastosFijos, setFinalizando, finalizando } = useOnboarding();
  const { crearCuenta, refreshRates, actualizarMonedaBase } = useBankAccounts();
  const { updateUserData } = useUserData();

  const finalizar = async () => {
    if (!auth.currentUser || finalizando) return;
    setFinalizando(true);

    try {
      const uid = auth.currentUser.uid;

      // 1. Perfil financiero
      if (perfil) {
        await updateUserData({
          monthlySalary: perfil.monthlySalary,
          monthlyBudget: perfil.monthlyBudget,
          savingsPhysical: perfil.savingsPhysical,
          savingsUSDT: perfil.savingsUSDT,
        });
      }

      // 2. Moneda base
      if (perfil?.monedaBase) {
        actualizarMonedaBase(perfil.monedaBase === "USD" ? "USD" : "BS");
      }

      // 3. Cuentas bancarias
      const cuentasPromises = cuentas.map(c =>
        crearCuenta({
          nombre: c.nombre,
          banco: c.banco,
          moneda: c.moneda,
          saldoInicial: c.saldoInicial,
          color: obtenerColorAleatorio(),
        })
      );
      await Promise.all(cuentasPromises);

      // 4. Metas de ahorro
      if (metas.length > 0) {
        const metasPromises = metas.map(m =>
          addDoc(collection(db, "users", uid, "saving_goals"), {
            userId: uid,
            name: m.name,
            targetAmount: m.targetAmount,
            currentAmount: m.currentAmount,
            color: "#10b981",
            createdAt: serverTimestamp(),
          })
        );
        await Promise.all(metasPromises);
      }

      // 5. Deudas
      if (deudas.length > 0) {
        const deudasPromises = deudas.map(d =>
          addDoc(collection(db, "users", uid, "debts"), {
            personName: d.personName,
            type: d.type,
            amount: d.amount,
            currency: d.currency,
            payments: [],
            isPaid: false,
            createdAt: new Date(),
          })
        );
        await Promise.all(deudasPromises);
      }

      // 6. Gastos fijos
      if (gastosFijos.length > 0) {
        const gastosPromises = gastosFijos.map(g =>
          addDoc(collection(db, "users", uid, "fixed_expenses"), {
            title: g.title,
            amount: g.amount,
            currency: g.currency,
            category: g.category,
            dueDay: g.dueDay,
            createdAt: new Date(),
          })
        );
        await Promise.all(gastosPromises);
      }

      // 7. Marcar onboarding como completado
      await updateDoc(doc(db, "users", uid), {
        onboardingCompleted: true,
      });

      await refreshRates();

      toast.success("¡Todo listo!", {
        description: "Tu perfil financiero ha sido configurado.",
      });

      router.replace("/dashboard");
    } catch (error) {
      console.error("Error al finalizar onboarding:", error);
      toast.error("Error al guardar datos", {
        description: "Hubo un problema. Intenta de nuevo.",
      });
      setFinalizando(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/[.06] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400/80 text-xs font-medium tracking-wider uppercase">Paso 6 de 6</span>
        </div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-outfit)" }}>
          Revisa tu Configuración
        </h2>
        <p className="text-slate-400 text-sm mt-1">Todo listo para empezar a controlar tus finanzas</p>
      </div>

      <div className="space-y-3 mb-8">
        {perfil && (
          <ResumenCard
            icon={<FiTrendingUp className="text-amber-400" />}
            titulo="Perfil Financiero"
            bg="bg-amber-500/5 border-amber-500/10"
          >
            <p className="text-xs text-slate-300">
              Salario: ${perfil.monthlySalary.toLocaleString()} &middot;
              Presupuesto: ${perfil.monthlyBudget.toLocaleString()} &middot;
              Base: {perfil.monedaBase === "USD" ? "$ USD" : "Bs. VES"}
            </p>
            {(perfil.savingsPhysical > 0 || perfil.savingsUSDT > 0) && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ahorros: {perfil.savingsPhysical > 0 ? `$${perfil.savingsPhysical.toLocaleString()} fís` : ""}
                {perfil.savingsPhysical > 0 && perfil.savingsUSDT > 0 ? " + " : ""}
                {perfil.savingsUSDT > 0 ? `₮${perfil.savingsUSDT.toLocaleString()} USDT` : ""}
              </p>
            )}
          </ResumenCard>
        )}

        <ResumenCard
          icon={<FiCreditCard className="text-amber-400" />}
          titulo={`Cuentas bancarias (${cuentas.length})`}
          bg="bg-amber-500/5 border-amber-500/10"
        >
          <div className="flex flex-wrap gap-1.5 mt-1">
            {cuentas.map((c, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/50 text-slate-300 border border-slate-700/30">
                {c.nombre}
              </span>
            ))}
          </div>
        </ResumenCard>

        {metas.length > 0 && (
          <ResumenCard
            icon={<FiTarget className="text-violet-400" />}
            titulo={`Metas de ahorro (${metas.length})`}
            bg="bg-violet-500/5 border-violet-500/10"
          >
            <div className="flex flex-wrap gap-1.5 mt-1">
              {metas.map((m, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/50 text-slate-300 border border-slate-700/30">
                  {m.name}: ${m.targetAmount.toLocaleString()}
                </span>
              ))}
            </div>
          </ResumenCard>
        )}

        {deudas.length > 0 && (
          <ResumenCard
            icon={<FiUsers className="text-emerald-400" />}
            titulo={`Deudas (${deudas.length})`}
            bg="bg-emerald-500/5 border-emerald-500/10"
          >
            <div className="flex flex-wrap gap-1.5 mt-1">
              {deudas.map((d, i) => (
                <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full bg-slate-800/50 border ${
                  d.type === "por_cobrar" ? "text-emerald-300 border-emerald-500/20" : "text-red-300 border-red-500/20"
                }`}>
                  {d.personName}
                </span>
              ))}
            </div>
          </ResumenCard>
        )}

        {gastosFijos.length > 0 && (
          <ResumenCard
            icon={<FiCalendar className="text-sky-400" />}
            titulo={`Gastos fijos (${gastosFijos.length})`}
            bg="bg-sky-500/5 border-sky-500/10"
          >
            <div className="flex flex-wrap gap-1.5 mt-1">
              {gastosFijos.map((g, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/50 text-slate-300 border border-slate-700/30">
                  {g.title}: Día {g.dueDay}
                </span>
              ))}
            </div>
          </ResumenCard>
        )}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={finalizar}
          disabled={finalizando}
          className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {finalizando ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando configuración...
            </>
          ) : (
            <>
              <FiCheckCircle size={18} />
              Comenzar a usar LogPose
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onAnterior}
          disabled={finalizando}
          className="w-full py-3 rounded-2xl border border-slate-700/50 text-slate-300 hover:bg-slate-800/50 transition-all duration-300 text-sm font-medium disabled:opacity-40"
        >
          Volver atrás
        </button>
      </div>
    </motion.div>
  );
}

function ResumenCard({
  icon, titulo, children, bg,
}: {
  icon: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-4 border`}>
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-7 h-7 rounded-xl bg-slate-800/80 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-sm font-semibold text-white">{titulo}</span>
      </div>
      {children}
    </div>
  );
}
