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
import { esAdmin, DIAS_PRUEBA } from "@/types/rbac";
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
    plan: string;
    status: string;
    createdAt: string | null;
    trialExpiresAt: string | null;
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
      plan: d.plan || "free",
      status: d.status || "active",
      createdAt: d.createdAt || null,
      trialExpiresAt: d.trialExpiresAt || null,
    }));
  } catch (e) {
    throw e;
  }
}

export async function aprobarUsuario(uid: string): Promise<ActionResult> {
  try {
    await verificarAdmin();
    const userData = await leerUsuario(uid);
    if (!userData) return { exito: false, error: "Usuario no encontrado" };

    await actualizarUsuario(uid, {
      role: "usuario",
      status: "active",
      trialExpiresAt: null,
    });

    registrarLogAdmin("aprobar_usuario", uid, userData.email as string, "Usuario aprobado");

    return { exito: true };
  } catch (e) {
    return {
      exito: false,
      error: (e as Error).message || "Error al aprobar usuario",
    };
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { role: nuevoRol, plan: "free" };

    if (nuevoRol === "usuario") {
      updates.trialExpiresAt = null;
    }

    await actualizarUsuario(uid, updates);

    registrarLogAdmin("cambiar_rol", uid, userData.email as string, `Rol cambiado a ${nuevoRol}`);

    return { exito: true };
  } catch (e) {
    return {
      exito: false,
      error: (e as Error).message || "Error al cambiar rol",
    };
  }
}

export async function actualizarExpiracion(
  uid: string,
  fecha: string | null
): Promise<ActionResult> {
  try {
    await verificarAdmin();
    const userData = await leerUsuario(uid);
    if (!userData) return { exito: false, error: "Usuario no encontrado" };

    await actualizarUsuario(uid, {
      trialExpiresAt: fecha,
      status: fecha && new Date(fecha) < new Date() ? "expired" : userData.status || "active",
    });

    registrarLogAdmin("actualizar_expiracion", uid, userData.email as string, fecha ? `Expiración establecida: ${fecha}` : "Expiración removida");

    return { exito: true };
  } catch (e) {
    return {
      exito: false,
      error: (e as Error).message || "Error al actualizar expiración",
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
