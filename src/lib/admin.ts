"use server";
import 'server-only';

import { cookies } from "next/headers";
import {
  leerUsuario,
  listarUsuarios,
  actualizarUsuario,
  actualizarAuthUser,
  eliminarColeccion,
  eliminarDocumentosWhere,
  eliminarUsuarioDoc,
  eliminarAuthUser,
} from "./firebaseAdmin";
import { verificarCookieSesion } from "./authCookie";
import { esAdmin } from "@/types/rbac";
import { registrarLogAdmin } from "./adminLogs";

type ActionResult = { exito: true } | { exito: false; error: string };

async function verificarAdmin(): Promise<string> {
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get("session")?.value;
  if (!cookieVal) throw new Error("No autorizado");

  const sesion = await verificarCookieSesion(cookieVal);
  if (!sesion) throw new Error("Sesión inválida");

  const userData = await leerUsuario(sesion.uid);
  if (!userData) throw new Error("Usuario no encontrado");

  if (!esAdmin(userData.role)) {
    throw new Error("Se requieren permisos de administrador");
  }

  return sesion.uid;
}

export async function obtenerUsuarios(): Promise<
  Array<{
    uid: string;
    email: string;
    displayName: string;
    role: string;
    createdAt: string | null;
  }>
> {
  try {
    await verificarAdmin();
    const docs = await listarUsuarios();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return docs.map((d: any) => ({
      uid: d.uid || "",
      email: d.email || "",
      displayName: d.displayName || "",
      role: d.role || "usuario",
      createdAt: d.createdAt || null,
    }));
  } catch (e) {
    throw e;
  }
}

export async function cambiarRolUsuario(
  uid: string,
  nuevoRol: string
): Promise<ActionResult> {
  try {
    await verificarAdmin();
    const userData = await leerUsuario(uid);
    if (!userData) return { exito: false, error: "Usuario no encontrado" };

    if (userData.role === "admin" || nuevoRol === "admin")
      return { exito: false, error: "No puedes cambiar el rol de administradores" };

    await actualizarUsuario(uid, { role: nuevoRol });

    registrarLogAdmin("cambiar_rol", uid, userData.email as string, `Rol cambiado a ${nuevoRol}`);

    return { exito: true };
  } catch (e) {
    return {
      exito: false,
      error: (e as Error).message || "Error al cambiar rol",
    };
  }
}

export async function actualizarNombreUsuario(
  uid: string,
  nuevoNombre: string
): Promise<ActionResult> {
  try {
    await verificarAdmin();
    const userData = await leerUsuario(uid);
    if (!userData) return { exito: false, error: "Usuario no encontrado" };

    const nombre = nuevoNombre?.trim();
    if (!nombre || nombre.length < 2) {
      return { exito: false, error: "El nombre debe tener al menos 2 caracteres" };
    }

    await actualizarUsuario(uid, { displayName: nombre });

    registrarLogAdmin("actualizar_nombre", uid, userData.email as string, `Nombre actualizado a "${nombre}"`);

    return { exito: true };
  } catch (e) {
    return {
      exito: false,
      error: (e as Error).message || "Error al actualizar el nombre",
    };
  }
}

export async function cambiarPasswordUsuario(
  uid: string,
  nuevaPassword: string
): Promise<ActionResult> {
  try {
    await verificarAdmin();
    const userData = await leerUsuario(uid);
    if (!userData) return { exito: false, error: "Usuario no encontrado" };

    if (!nuevaPassword || nuevaPassword.length < 6) {
      return {
        exito: false,
        error: "La contraseña debe tener al menos 6 caracteres",
      };
    }

    await actualizarAuthUser(uid, { password: nuevaPassword });

    registrarLogAdmin("cambiar_password", uid, userData.email as string, "Contraseña cambiada por administrador");

    return { exito: true };
  } catch (e) {
    return {
      exito: false,
      error: (e as Error).message || "Error al cambiar contraseña",
    };
  }
}

export async function eliminarUsuario(uid: string): Promise<ActionResult> {
  try {
    await verificarAdmin();
    const userData = await leerUsuario(uid);
    if (!userData) return { exito: false, error: "Usuario no encontrado" };

    const subColecciones = [
      "bank_accounts",
      "account_transactions",
      "debts",
      "fixed_expenses",
      "saving_goals",
      "savings_transactions",
      "categories",
    ];

    for (const sub of subColecciones) {
      try {
        await eliminarColeccion(uid, sub);
      } catch {
        // continuar si la subcolección no existe
      }
    }

    try {
      await eliminarDocumentosWhere("transactions", "userId", uid);
    } catch {
      // continuar
    }

    try {
      await eliminarDocumentosWhere("shopping_lists", "userId", uid);
    } catch {
      // continuar
    }

    try {
      await eliminarUsuarioDoc(uid);
    } catch {
      // continuar
    }

    try {
      await eliminarAuthUser(uid);
    } catch {
      // Si falla eliminar auth user, continuamos
    }

    registrarLogAdmin("eliminar_usuario", uid, userData.email as string, "Usuario eliminado permanentemente");

    return { exito: true };
  } catch (e) {
    return {
      exito: false,
      error: (e as Error).message || "Error al eliminar usuario",
    };
  }
}
