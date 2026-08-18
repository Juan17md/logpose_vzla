"use client";

import Link from "next/link";

export default function PaginaOffline() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg">
        <p className="text-amber-300 font-semibold text-sm">Modo sin conexion</p>
        <h1 className="mt-2 text-2xl font-bold">No pudimos cargar internet</h1>
        <p className="mt-3 text-sm text-slate-300">
          Revisa tu conexion e intenta de nuevo. Cuando recuperes internet, podras continuar con todas
          las funciones de LogPose.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Reintentar
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
          >
            Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
