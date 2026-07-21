"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { obtenerLogsAdmin } from "@/lib/adminLogs";
import { esAdmin } from "@/types/rbac";
import type { AdminLogEntry, AdminLogAction } from "@/types/adminLogs";
import { FiShield, FiClock, FiRefreshCw, FiUser, FiActivity } from "react-icons/fi";

const ETIQUETAS_ACCION: Record<AdminLogAction, string> = {
  aprobar_usuario: "Aprobación",
  cambiar_rol: "Cambio de Rol",
  cambiar_password: "Cambio de Contraseña",
  eliminar_usuario: "Eliminación",
  actualizar_expiracion: "Expiración",
};

const COLORES_ACCION: Record<AdminLogAction, string> = {
  aprobar_usuario: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cambiar_rol: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  cambiar_password: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  eliminar_usuario: "bg-red-500/20 text-red-300 border-red-500/30",
  actualizar_expiracion: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

function formatearFecha(ts: string) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LogsAdminPage() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.data()?.role;
        if (!esAdmin(role)) {
          router.replace("/dashboard");
          return;
        }
        setAutorizado(true);
      } catch {
        router.replace("/dashboard");
      }
    });
    return () => unsub();
  }, [router]);

  const cargarLogs = useCallback(async () => {
    setCargando(true);
    try {
      const data = await obtenerLogsAdmin();
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (autorizado) cargarLogs();
  }, [autorizado, cargarLogs]);

  if (autorizado === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 md:pb-10">
      <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <FiActivity className="text-8xl text-violet-400" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-violet-500/20 rounded-2xl border border-violet-500/30">
            <FiClock className="text-2xl text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Registro de Actividad
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Auditoría de acciones realizadas por administradores
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-700/50 overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <FiActivity className="text-slate-400" size={18} />
            <h2 className="text-lg font-bold text-white">Actividad Reciente</h2>
          </div>
          <button
            onClick={cargarLogs}
            disabled={cargando}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={cargando ? "animate-spin" : ""} size={16} />
            Recargar
          </button>
        </div>

        {cargando ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm mt-4">Cargando logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FiActivity className="mx-auto mb-3 opacity-50" size={32} />
            <p>No hay actividad registrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/30 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left p-4 font-medium">Fecha</th>
                  <th className="text-left p-4 font-medium">Acción</th>
                  <th className="text-left p-4 font-medium">Administrador</th>
                  <th className="text-left p-4 font-medium hidden md:table-cell">Usuario</th>
                  <th className="text-left p-4 font-medium hidden lg:table-cell">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-4 text-slate-400 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <FiClock size={11} className="shrink-0" />
                        {formatearFecha(log.timestamp)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${COLORES_ACCION[log.action] || "bg-slate-500/20 text-slate-300"}`}
                      >
                        {ETIQUETAS_ACCION[log.action] || log.action}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center border border-violet-500/20 shrink-0">
                          <FiShield size={12} className="text-violet-400" />
                        </div>
                        <span className="text-white text-xs">{log.adminEmail}</span>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-700/30 flex items-center justify-center border border-slate-600/30 shrink-0">
                          <FiUser size={12} className="text-slate-400" />
                        </div>
                        <span className="text-slate-300 text-xs">{log.targetEmail}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 text-xs hidden lg:table-cell max-w-[200px] truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
