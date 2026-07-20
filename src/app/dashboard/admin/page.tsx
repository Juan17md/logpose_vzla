"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  obtenerUsuarios,
  aprobarUsuario,
  cambiarRolUsuario,
  cambiarPasswordUsuario,
  eliminarUsuario,
  actualizarExpiracion,
} from "@/lib/admin";
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
  FiKey,
  FiCheck,
  FiEdit2,
} from "react-icons/fi";
import Select from "@/components/ui/forms/Select";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

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

  const [cambiandoRol, setCambiandoRol] = useState<string | null>(null);
  const [eliminarUid, setEliminarUid] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [cambiarPasswordUid, setCambiarPasswordUid] = useState<string | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [expiracionUid, setExpiracionUid] = useState<string | null>(null);
  const [expiracionFecha, setExpiracionFecha] = useState("");
  const [guardandoExpiracion, setGuardandoExpiracion] = useState(false);

  const handleAprobar = async (uid: string) => {
    const res = await aprobarUsuario(uid);
    if (res.exito) {
      toast.success("Usuario aprobado correctamente");
      cargarUsuarios();
    } else {
      toast.error(res.error);
    }
  };

  const handleCambiarRol = async (uid: string, nuevoRol: string) => {
    setCambiandoRol(uid);
    const res = await cambiarRolUsuario(uid, nuevoRol);
    if (res.exito) {
      toast.success(`Rol cambiado a ${nuevoRol}`);
      cargarUsuarios();
    } else {
      toast.error(res.error);
    }
    setCambiandoRol(null);
  };

  const handleCambiarPasswordConfirm = async () => {
    if (!cambiarPasswordUid || nuevaPassword.length < 6) return;
    setCambiandoPassword(true);
    const res = await cambiarPasswordUsuario(cambiarPasswordUid, nuevaPassword);
    if (res.exito) {
      toast.success("Contraseña cambiada exitosamente");
    } else {
      toast.error(res.error);
    }
    setCambiandoPassword(false);
    setCambiarPasswordUid(null);
    setNuevaPassword("");
  };

  const abrirCambiarPassword = (uid: string) => {
    setCambiarPasswordUid(uid);
    setNuevaPassword("");
  };

  const abrirExpiracion = (uid: string, fechaActual: string | null) => {
    setExpiracionUid(uid);
    if (fechaActual) {
      setExpiracionFecha(fechaActual.split("T")[0]);
    } else {
      const defecto = new Date();
      defecto.setDate(defecto.getDate() + 7);
      setExpiracionFecha(defecto.toISOString().split("T")[0]);
    }
  };

  const handleGuardarExpiracion = async () => {
    if (!expiracionUid) return;
    setGuardandoExpiracion(true);
    const fechaISO = expiracionFecha ? new Date(expiracionFecha + "T23:59:59").toISOString() : null;
    const res = await actualizarExpiracion(expiracionUid, fechaISO);
    if (res.exito) {
      toast.success("Fecha de expiración actualizada");
      cargarUsuarios();
    } else {
      toast.error(res.error);
    }
    setGuardandoExpiracion(false);
    setExpiracionUid(null);
    setExpiracionFecha("");
  };

  const handleEliminarConfirm = async () => {
    if (!eliminarUid) return;
    setEliminando(true);
    const res = await eliminarUsuario(eliminarUid);
    if (res.exito) {
      toast.success("Usuario eliminado");
      cargarUsuarios();
    } else {
      toast.error(res.error);
    }
    setEliminando(false);
    setEliminarUid(null);
  };

  const opcionesRol = [
    { id: "prueba", name: "Prueba", value: "prueba" },
    { id: "usuario", name: "Usuario", value: "usuario" },
  ];

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

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        isOpen={eliminarUid !== null}
        onClose={() => setEliminarUid(null)}
        onConfirm={handleEliminarConfirm}
        title="Eliminar usuario"
        message="¿Eliminar este usuario permanentemente? Esta acción no se puede deshacer. Se eliminarán todos sus datos financieros, cuentas, transacciones y su autenticación."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        isLoading={eliminando}
      />

      {/* Modal cambiar contraseña */}
      <Modal
        isOpen={cambiarPasswordUid !== null}
        onClose={() => {
          setCambiarPasswordUid(null);
          setNuevaPassword("");
        }}
        title="Cambiar contraseña"
        maxWidth="sm"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400/80 mb-2.5 ml-0.5">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              placeholder="Escribe la nueva contraseña"
              autoFocus
              className="w-full bg-slate-800/40 backdrop-blur-md border border-slate-700/50 text-white text-sm font-bold rounded-2xl py-4 pl-5 pr-5 outline-none transition-all duration-300 placeholder:text-slate-600 hover:border-amber-500/30 hover:bg-slate-800/60 shadow-lg focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 focus:bg-slate-800/80 focus:shadow-[0_0_20px_rgba(202,138,4,0.08)]"
            />
          </div>

          <div className="space-y-2.5">
            {[
              { cumple: nuevaPassword.length > 6, texto: "Más de 6 caracteres" },
              { cumple: /[A-Z]/.test(nuevaPassword), texto: "Al menos una mayúscula" },
              { cumple: /\d/.test(nuevaPassword), texto: "Al menos un número" },
              { cumple: /[!@#$%^&*(),.?":{}|<>`~\-_=+\\\/\[\];']/.test(nuevaPassword), texto: "Al menos un símbolo" },
            ].map((req) => (
              <div
                key={req.texto}
                className={`flex items-center gap-2.5 transition-all duration-300 ${
                  req.cumple ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                    req.cumple
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-700/50 text-slate-500"
                  }`}
                >
                  <FiCheck size={12} strokeWidth={3} />
                </div>
                <span className="text-sm font-medium">{req.texto}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button
              onClick={() => {
                setCambiarPasswordUid(null);
                setNuevaPassword("");
              }}
              disabled={cambiandoPassword}
              className="px-6 py-3 font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCambiarPasswordConfirm}
              disabled={cambiandoPassword || nuevaPassword.length <= 6 || !/[A-Z]/.test(nuevaPassword) || !/\d/.test(nuevaPassword) || !/[!@#$%^&*(),.?":{}|<>`~\-_=+\\\/\[\];']/.test(nuevaPassword)}
              className="px-6 py-3 font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-lg shadow-violet-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
            >
              {cambiandoPassword ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal cambiar expiración */}
      <Modal
        isOpen={expiracionUid !== null}
        onClose={() => {
          setExpiracionUid(null);
          setExpiracionFecha("");
        }}
        title="Fecha de expiración"
        maxWidth="sm"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400/80 mb-2.5 ml-0.5">
              Fecha límite
            </label>
            <input
              type="date"
              value={expiracionFecha}
              onChange={(e) => setExpiracionFecha(e.target.value)}
              className="w-full bg-slate-800/40 backdrop-blur-md border border-slate-700/50 text-white text-sm font-bold rounded-2xl py-4 pl-5 pr-5 outline-none transition-all duration-300 [color-scheme:dark] hover:border-amber-500/30 hover:bg-slate-800/60 shadow-lg focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 focus:bg-slate-800/80 focus:shadow-[0_0_20px_rgba(202,138,4,0.08)]"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button
              onClick={() => {
                setExpiracionUid(null);
                setExpiracionFecha("");
              }}
              disabled={guardandoExpiracion}
              className="px-6 py-3 font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setExpiracionFecha("");
              }}
              disabled={guardandoExpiracion}
              className="px-6 py-3 font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all disabled:opacity-50"
            >
              Sin expiración
            </button>
            <button
              onClick={handleGuardarExpiracion}
              disabled={guardandoExpiracion || !expiracionFecha}
              className="px-6 py-3 font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-lg shadow-violet-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
            >
              {guardandoExpiracion ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </div>
      </Modal>

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
                      {u.role !== "admin" ? (
                        <Select<string>
                          options={opcionesRol}
                          value={u.role}
                          onChange={(val) => handleCambiarRol(u.uid, val)}
                          disabled={cambiandoRol === u.uid}
                          className="w-[150px] mx-auto"
                        />
                      ) : (
                        <div className="w-[150px] flex items-center justify-center gap-2 mx-auto bg-slate-800/40 backdrop-blur-md border border-violet-500/30 text-white text-sm font-bold rounded-2xl py-4 px-5 shadow-lg select-none">
                          <span>admin</span>
                          <FiShield size={16} className="text-violet-500/60 shrink-0" />
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badgeStatus(u.status)}`}
                      >
                        {u.status === "expired" && (
                          <FiAlertTriangle size={10} />
                        )}
                        {{
                          active: "Activo",
                          pending: "Pendiente",
                          expired: "Expirado",
                        }[u.status] || u.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-xs hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <FiCalendar size={11} />
                        {formatearFecha(u.createdAt)}
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 text-xs hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <span>
                          {u.trialExpiresAt
                            ? formatearFecha(u.trialExpiresAt)
                            : "—"}
                        </span>
                        {u.role !== "admin" && (
                          <button
                            onClick={() => abrirExpiracion(u.uid, u.trialExpiresAt)}
                            className="p-1.5 bg-slate-800/60 hover:bg-violet-500/20 text-slate-500 hover:text-violet-400 rounded-lg transition-all border border-slate-700/30 hover:border-violet-500/30"
                            title="Establecer expiración"
                          >
                            <FiEdit2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.role !== "admin" && (
                          <>
                            <button
                              onClick={() => abrirCambiarPassword(u.uid)}
                              className="p-2 bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 rounded-xl transition-all border border-violet-500/20"
                              title="Cambiar contraseña"
                            >
                              <FiKey size={16} />
                            </button>
                            <button
                              onClick={() => setEliminarUid(u.uid)}
                              className="p-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-xl transition-all border border-red-500/20"
                              title="Eliminar usuario"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </>
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
