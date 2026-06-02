"use client";

import React from "react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950">
      {/* Glow de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-20 bg-amber-500" />
      
      {/* Isotipo animado */}
      <div className="relative z-10 flex flex-col items-center gap-6 animate-pulse">
        <svg 
          width="96" 
          height="96" 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_20px_rgba(245,158,11,0.25)]"
        >
          <circle cx="50" cy="50" r="35" stroke="#FBBF24" strokeWidth="6" />
          <path d="M50 25L58 50L50 75L42 50L50 25Z" fill="white" />
          <circle cx="50" cy="50" r="6" fill="#EF4444" />
        </svg>

        {/* Texto de carga */}
        <div className="text-center">
          <h2 className="text-white font-extrabold text-sm tracking-[0.25em] uppercase select-none opacity-80">
            LogPose <span className="text-amber-400">Vzla</span>
          </h2>
        </div>
      </div>
    </div>
  );
}
