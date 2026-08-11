"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  obtenerUsuarios,
  cambiarRolUsuario,
  cambiarPasswordUsuario,
  eliminarUsuario,
  actualizarNombreUsuario,
} from "@/lib/admin";
import { esAdmin } from "@/types/rbac";
import { toast } from "sonner";
import {
  FiShield,
  FiTrash2,
  FiUsers,
  FiRefreshCw,
  FiKey,
  FiEdit2,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import Select from "@/components/ui/forms/Select";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type UsuarioRow = {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string | null;
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
    const usuarios = await obtenerUsuarios();
    setUsuarios(usuarios);
    setCargando(false);
  }, []);

  useEffect(() => {
    if (autorizado) cargarUsuarios();
  }, [autorizado, cargarUsuarios]);

  const [busqueda, setBusqueda] = useState("");

  const filtrarUsuarios = useCallback(() => {
    return usuarios.filter(
      (u) =>
        u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.displayName.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [usuarios, busqueda]);

  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioRow | null>(null);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);

  const [nombreLocal, setNombreLocal] = useState("");
  const [rolLocal, setRolLocal] = useState("usuario");

  const [passwordNueva, setPasswordNueva] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  const abrirEdicion = (usuario: UsuarioRow) => {
    setUsuarioSeleccionado(usuario);
    setNombreLocal(usuario.displayName);
    setRolLocal(usuario.role);
    setModalEditar(true);
  };

  const abrirPassword = (usuario: UsuarioRow) => {
    setUsuarioSeleccionado(usuario);
    setPasswordNueva("");
    setModalPassword(true);
  };

  const abrirEliminar = (usuario: UsuarioRow) => {
    setUsuarioSeleccionado(usuario);
    setModalEliminar(true);
  };

  const guardarEdicion = async () => {
    if (!usuarioSeleccionado) return;
    const uid = usuarioSeleccionado.uid;

    if (nombreLocal.trim() !== usuarioSeleccionado.displayName) {
      const res = await actualizarNombreUsuario(uid, nombreLocal.trim());
      if (!res.exito) {
        toast.error(res.error || "Error al actualizar el nombre");
        return;
      }
      toast.success("Nombre actualizado");
    }

    if (rolLocal !== usuarioSeleccionado.role) {
      const res = await cambiarRolUsuario(uid, rolLocal);
      if (res.exito) {
        toast.success("Rol actualizado");
      } else {
        toast.error(res.error || "Error al actualizar rol");
        setModalEditar(false);
        return;
      }
    }

    setModalEditar(false);
    await cargarUsuarios();
  };

  const guardarPassword = async () => {
    if (!usuarioSeleccionado) return;
    if (passwordNueva.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setGuardandoPassword(true);
    try {
      const res = await cambiarPasswordUsuario(usuarioSeleccionado.uid, passwordNueva);
      if (res.exito) {
        toast.success("Contraseña actualizada");
        setModalPassword(false);
      } else {
        toast.error(res.error || "Error al cambiar la contraseña");
      }
    } finally {
      setGuardandoPassword(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!usuarioSeleccionado) return;
    const uid = usuarioSeleccionado.uid;
    const nombre = usuarioSeleccionado.displayName;
    setModalEliminar(false);
    const res = await eliminarUsuario(uid);
    if (res.exito) {
      toast.success(`Usuario ${nombre} eliminado`);
      await cargarUsuarios();
    } else {
      toast.error(res.error || "Error al eliminar usuario");
    }
  };

  const cambiarRol = async (usuario: UsuarioRow, nuevoRol: string) => {
    if (usuario.uid === auth.currentUser?.uid) {
      toast.error("No puedes cambiar tu propio rol");
      return;
    }
    const res = await cambiarRolUsuario(usuario.uid, nuevoRol);
    if (res.exito) {
      toast.success("Rol actualizado");
      await cargarUsuarios();
    } else {
      toast.error(res.error || "Error al actualizar rol");
      await cargarUsuarios();
    }
  };

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return "—";
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-VE");
  };

  const usuariosFiltrados = filtrarUsuarios();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-400">
              <FiShield className="text-xl" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Panel de Administración</h1>
              <p className="mt-1 text-sm text-slate-400">Gestiona los usuarios de la plataforma</p>
            </div>
          </div>
        </div>
        <button
          onClick={cargarUsuarios}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700/60 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/60"
        >
          <FiRefreshCw /> Refrescar
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-xl">
          <p className="text-sm text-slate-400">Total de usuarios</p>
          <p className="mt-1 text-3xl font-bold text-white">{usuarios.length}</p>
        </div>
        <div className="rounded-[2rem] border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-xl">
          <p className="text-sm text-slate-400">Administradores</p>
          <p className="mt-1 text-3xl font-bold text-amber-500">
            {usuarios.filter((u) => u.role === "admin").length}
          </p>
        </div>
        <div className="rounded-[2rem] border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-xl">
          <p className="text-sm text-slate-400">Usuarios</p>
          <p className="mt-1 text-3xl font-bold text-violet-400">
            {usuarios.filter((u) => u.role !== "admin").length}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FiUsers className="text-amber-500" />
          <h2 className="text-lg font-semibold text-white">Usuarios ({usuariosFiltrados.length})</h2>
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          className="w-full rounded-xl border border-slate-700/60 bg-[#0A0E1A]/80 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60 sm:w-64"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  Cargando usuarios...
                </td>
              </tr>
            ) : usuariosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  No se encontraron usuarios
                </td>
              </tr>
            ) : (
              usuariosFiltrados.map((usuario) => (
                <tr key={usuario.uid} className="border-b border-slate-700/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{usuario.displayName}</p>
                      <p className="text-xs text-slate-400">{usuario.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {usuario.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                        <FiShield /> Admin
                      </span>
                    ) : (
                      <Select
                        value={usuario.role}
                        onChange={(value) => cambiarRol(usuario, value)}
                        options={[
                          { id: "usuario", name: "Usuario", value: "usuario" },
                          { id: "admin", name: "Admin", value: "admin" },
                        ]}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatearFecha(usuario.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirEdicion(usuario)}
                        className="rounded-lg border border-slate-700/60 p-2 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white"
                        title="Editar usuario"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => abrirPassword(usuario)}
                        className="rounded-lg border border-slate-700/60 p-2 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white"
                        title="Cambiar contraseña"
                      >
                        <FiKey />
                      </button>
                      <button
                        onClick={() => abrirEliminar(usuario)}
                        className="rounded-lg border border-slate-700/60 p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Eliminar usuario"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Link href="/dashboard/admin/logs" className="text-sm font-medium text-amber-400 hover:text-amber-300">
          Ver logs de actividad →
        </Link>
      </div>

      <Modal
        isOpen={modalEditar}
        onClose={() => setModalEditar(false)}
        title={`Editar a ${usuarioSeleccionado?.displayName ?? "usuario"}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400">Nombre</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-700/60 bg-[#0A0E1A]/80 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60"
              value={nombreLocal}
              onChange={(e) => setNombreLocal(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Rol</label>
            <Select
              value={rolLocal}
              onChange={setRolLocal}
              options={[
                { id: "usuario", name: "Usuario", value: "usuario" },
                { id: "admin", name: "Admin", value: "admin" },
              ]}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={guardarEdicion}
              className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-400"
            >
              Guardar cambios
            </button>
            <button
              onClick={() => setModalEditar(false)}
              className="flex-1 rounded-xl border border-slate-700/60 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/60"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalPassword}
        onClose={() => setModalPassword(false)}
        title={`Cambiar contraseña de ${usuarioSeleccionado?.displayName ?? "usuario"}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400">Nueva contraseña</label>
            <div className="relative">
              <input
                type={mostrarPassword ? "text" : "password"}
                className="w-full rounded-xl border border-slate-700/60 bg-[#0A0E1A]/80 px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white"
              >
                {mostrarPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={guardarPassword}
              disabled={guardandoPassword}
              className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              {guardandoPassword ? "Guardando..." : "Guardar contraseña"}
            </button>
            <button
              onClick={() => setModalPassword(false)}
              className="flex-1 rounded-xl border border-slate-700/60 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/60"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={modalEliminar}
        onClose={() => setModalEliminar(false)}
        onConfirm={confirmarEliminar}
        title="Eliminar usuario"
        message={`¿Seguro que deseas eliminar a ${usuarioSeleccionado?.displayName ?? "este usuario"}? Se eliminarán todos sus datos y su cuenta de forma permanente.`}
        confirmText="Eliminar definitivamente"
        type="danger"
      />
    </div>
  );
}
