"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FiHome, FiMap, FiArrowLeft } from "react-icons/fi";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 text-center">
        {/* Animated Icon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full" />
            <div className="relative bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 0.95, 1]
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-violet-400"
              >
                <FiMap size={64} />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="space-y-4"
        >
          <h1 className="text-6xl md:text-8xl font-black text-white font-bungee tracking-tighter">
            404
          </h1>
          <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
            Parece que te has perdido...
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-[280px] mx-auto">
            La ruta que buscas no existe o ha sido movida a otra dimensión financiera.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="mt-12 grid grid-cols-1 gap-4"
        >
          <Link href="/dashboard" className="w-full">
            <motion.button
              whileHover={{ scale: 1.02, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-linear-to-r from-violet-600 to-indigo-600 text-white font-black py-4 px-6 rounded-2xl shadow-xl border border-white/10 flex items-center justify-center gap-3 transition-all"
            >
              <FiHome size={20} />
              <span>IR AL DASHBOARD</span>
            </motion.button>
          </Link>

          <Link href="/" className="w-full">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-slate-900/50 backdrop-blur-md text-slate-300 font-bold py-4 px-6 rounded-2xl border border-white/5 flex items-center justify-center gap-3 hover:bg-slate-800 hover:text-white transition-all"
            >
              <FiArrowLeft size={20} />
              <span>VOLVER AL INICIO</span>
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-0 right-0 text-center"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
          LogPose VZLA • Premium Financial Hub
        </span>
      </motion.div>
    </div>
  );
}
