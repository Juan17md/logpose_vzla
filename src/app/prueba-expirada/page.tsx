"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { FiClock, FiAlertTriangle, FiPhone, FiMail } from "react-icons/fi";
import Logo from "@/components/layout/Logo";
import { motion } from "framer-motion";

export default function PruebaExpiradaPage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { status: "expired" });
      } catch {
        // El doc podría no existir o no tener status
      }
      setVerificando(false);
    });
    return () => unsub();
  }, [router]);

  if (verificando) {
    return (
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-red-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/10 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-[#0B0F1A] rounded-[1.75rem] p-8 sm:p-10 shadow-[0_30px_80px_-10px_rgba(0,0,0,.8),0_0_0_1px_rgba(255,255,255,.06)] overflow-hidden border border-red-500/20">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-red-500/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-amber-500/20 to-transparent" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
              <FiAlertTriangle className="text-red-400" size={36} />
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Logo variant="icon" width={32} height={32} />
              <h1 className="text-2xl font-bold text-white">
                LogPose <span className="text-amber-400">Vzla</span>
              </h1>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Prueba Expirada
            </h2>

            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Tu período de prueba de 7 días ha finalizado. Para seguir
              disfrutando de todas las funcionalidades de LogPose Vzla,
              adquiere una suscripción o contacta con el administrador.
            </p>

            <div className="w-full bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <FiClock className="text-amber-400" size={16} />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">
                    Período de prueba
                  </p>
                  <p className="text-slate-500 text-xs">7 días de acceso completo</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-500/20 rounded-xl flex items-center justify-center">
                  <FiMail className="text-violet-400" size={16} />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">
                    Contacto
                  </p>
                  <p className="text-slate-500 text-xs">
                    admin@logposevzla.com
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Link
                href="/login"
                className="w-full text-center py-4 px-6 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 mt-5">
          © {new Date().getFullYear()} LogPose Vzla Project
        </p>
      </motion.div>
    </div>
  );
}
