"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { motion } from "framer-motion";
import { FiAlertTriangle, FiRefreshCw, FiHome } from "react-icons/fi";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error capturado:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 text-center">
        {/* Animated Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
            <div className="relative bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
              <motion.div
                animate={{ rotate: [0, -3, 3, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="text-red-400"
              >
                <FiAlertTriangle size={64} />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="space-y-4"
        >
          <h1 className="text-6xl md:text-7xl font-black text-white font-bungee tracking-tighter">
            ¡UPS!
          </h1>
          <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
            Algo salió mal
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-[320px] mx-auto">
            Ocurrió un error inesperado. Ya registramos el incidente para resolverlo cuanto antes.
          </p>
          {error.digest && (
            <p className="text-xs text-slate-600 font-mono mt-2">
              Código: <span className="text-slate-500">{error.digest}</span>
            </p>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mt-12 grid grid-cols-1 gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={reset}
            className="w-full bg-linear-to-r from-red-600 to-orange-600 text-white font-black py-4 px-6 rounded-2xl shadow-xl border border-white/10 flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            <FiRefreshCw size={20} />
            <span>INTENTAR DE NUEVO</span>
          </motion.button>

          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-slate-900/50 backdrop-blur-md text-slate-300 font-bold py-4 px-6 rounded-2xl border border-white/5 flex items-center justify-center gap-3 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              <FiHome size={20} />
              <span>IR AL DASHBOARD</span>
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="absolute bottom-8 left-0 right-0 text-center"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
          LogPose VZLA • Premium Financial Hub
        </span>
      </motion.div>
    </div>
  );
}
