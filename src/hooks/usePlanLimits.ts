import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { obtenerLimitesPlan, type PlanLimits } from "@/lib/planLimits";
import { esTrialActivo, PLANES } from "@/types/rbac";

interface PlanInfo {
  plan: "free" | "premium";
  isTrialActive: boolean;
  trialExpiresAt: Date | null;
  loading: boolean;
  limites: PlanLimits;
  esPremium: boolean;
}

export function usePlanLimits(): PlanInfo {
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [trialExpiresAt, setTrialExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (user) {
        unsubscribeDoc = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const planVal = data.plan === PLANES.PREMIUM ? "premium" : "free";
            setPlan(planVal);
            const trial = data.trialExpiresAt;
            if (trial?.toMillis) {
              setTrialExpiresAt(new Date(trial.toMillis()));
            } else {
              setTrialExpiresAt(null);
            }
          }
          setLoading(false);
        }, () => {
          setLoading(false);
        });
      } else {
        setPlan("free");
        setTrialExpiresAt(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const isTrialActive = esTrialActivo(trialExpiresAt, plan);
  const limites = obtenerLimitesPlan(plan);
  const esPremium = plan === PLANES.PREMIUM;

  return { plan, isTrialActive, trialExpiresAt, loading, limites, esPremium };
}
