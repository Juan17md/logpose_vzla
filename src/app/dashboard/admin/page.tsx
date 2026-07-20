"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { obtenerUsuarios, aprobarUsuario, eliminarUsuario } from "@/lib/admin";
import { esAdmin } from "@/types/rbac";
import { toast } from "sonner";
import {
  FiShield,
  FiTrash2,
  FiCheckCircle,
  FiUsers,
  FiRefreshCw,
  FiAlertTriangle,
  FiMail,
  FiCalendar,
  FiClock,
} from "react-icons/fi";

type UsuarioRow = {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  createdAt: string | null;
  trialExpiresAt: string | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
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

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const data = await obtenerUsuarios();
      setUsuarios(data);
    } catch {
      toast.error("Error al cargar usuarios");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (autorizado) cargarUsuarios();
  }, [autorizado, cargarUsuarios]);

  const handleAprobar = async (uid: string) => {
    const res = await aprobarUsuario(uid);
    if (res.exito) {
      toast.success("Usuario aprobado correctamente");
      cargarUsuarios();
    } else {
      toast.error(res.error);
    }
  };

  const handleEliminar = async (uid: string) => {
    if (!confirm("¿Eliminar este usuario permanentemente? Esta acción no se puede deshacer."))
      return;
    const res = await eliminarUsuario(uid);
    if (res.exito) {
      toast.success("Usuario eliminado");
      cargarUsuarios();
    } else {
      toast.error(res.error);
    }
  };

  const formatearFecha = (ts: string | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const badgeRole = (role: string) => {
    const estilos: Record<string, string> = {
      admin: "bg-violet-500/20 text-violet-300 border-violet-500/30",
      usuario: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      prueba: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    };
    return estilos[role] || "bg-slate-500/20 text-slate-300 border-slate-500/30";
  };

  const badgeStatus = (status: string) => {
    const estilos: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-400",
      pending: "bg-amber-500/15 text-amber-400",
      expired: "bg-red-500/15 text-red-400",
    };
    return estilos[status] || "bg-slate-500/15 text-slate-400";
  };

  if (autorizado === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 md:pb-10">
      {/* Header */}
      <div className="bg-linear-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <FiShield className="text-8xl text-violet-400" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-violet-500/20 rounded-2xl border border-violet-500/30">
            <FiShield className="text-2xl text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Panel de Administración
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gestiona usuarios, roles y expiraciones del sistema
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Usuarios",
            value: usuarios.length,
            icon: FiUsers,
            color: "text-blue-400 bg-blue-500/20 border-blue-500/30",
          },
          {
            label: "Administradores",
            value: usuarios.filter((u) => u.role === "admin").length,
            icon: FiShield,
            color: "text-violet-400 bg-violet-500/20 border-violet-500/30",
          },
          {
            label: "Usuarios Activos",
            value: usuarios.filter((u) => u.role === "usuario").length,
            icon: FiCheckCircle,
            color: "text-emerald-400 bg-emerald-500/20 border-emerald-500/30",
          },
          {
            label: "En Prueba",
            value: usuarios.filter((u) => u.role === "prueba").length,
            icon: FiClock,
            color: "text-amber-400 bg-amber-500/20 border-amber-500/30",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${stat.color}`}
              >
                <stat.icon size={16} />
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-700/50 overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <FiUsers className="text-slate-400" size={18} />
            <h2 className="text-lg font-bold text-white">Usuarios Registrados</h2>
          </div>
          <button
            onClick={cargarUsuarios}
            disabled={cargando}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <FiRefreshCw
              className={`${cargando ? "animate-spin" : ""}`}
              size={16}
            />
            Recargar
          </button>
        </div>

        {cargando ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm mt-4">Cargando usuarios...</p>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FiUsers className="mx-auto mb-3 opacity-50" size={32} />
            <p>No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/30 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left p-4 font-medium">Usuario</th>
                  <th className="text-left p-4 font-medium hidden md:table-cell">Email</th>
                  <th className="text-center p-4 font-medium">Rol</th>
                  <th className="text-center p-4 font-medium">Estado</th>
                  <th className="text-left p-4 font-medium hidden lg:table-cell">Registro</th>
                  <th className="text-left p-4 font-medium hidden lg:table-cell">Expira</th>
                  <th className="text-right p-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {usuarios.map((u) => (
                  <tr
                    key={u.uid}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-4">
                      <span className="text-white font-medium">
                        {u.displayName || "Sin nombre"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <FiMail size={12} />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeRole(u.role)}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badgeStatus(u.status)}`}
                      >
                        {u.status === "expired" && (
                          <FiAlertTriangle size={10} />
                        )}
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-xs hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <FiCalendar size={11} />
                        {formatearFecha(u.createdAt)}
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 text-xs hidden lg:table-cell">
                      {u.trialExpiresAt
                        ? formatearFecha(u.trialExpiresAt)
                        : "—"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.role === "prueba" && (
                          <button
                            onClick={() => handleAprobar(u.uid)}
                            className="p-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-xl transition-all border border-emerald-500/20"
                            title="Aprobar usuario"
                          >
                            <FiCheckCircle size={16} />
                          </button>
                        )}
                        {u.role !== "admin" && (
                          <button
                            onClick={() => handleEliminar(u.uid)}
                            className="p-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-xl transition-all border border-red-500/20"
                            title="Eliminar usuario"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
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
