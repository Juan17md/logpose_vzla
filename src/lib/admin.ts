"use server";

import { cookies } from "next/headers";
import {
  leerUsuario,
  listarUsuarios,
  actualizarUsuario,
  eliminarColeccion,
  eliminarDocumentosWhere,
  eliminarUsuarioDoc,
  eliminarAuthUser,
} from "./firebaseAdmin";
import { verificarCookieSesion } from "./authCookie";
import { esAdmin } from "@/types/rbac";

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
    status: string;
    createdAt: string | null;
    trialExpiresAt: string | null;
  }>
> {
  try {
    await verificarAdmin();
    const docs = await listarUsuarios();
    return docs.map((d) => ({
      uid: d.uid || "",
      email: d.email || "",
      displayName: d.displayName || "",
      role: d.role || "usuario",
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

    return { exito: true };
  } catch (e) {
    return {
      exito: false,
      error: (e as Error).message || "Error al aprobar usuario",
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

    return { exito: true };
  } catch (e) {
    return {
      exito: false,
      error: (e as Error).message || "Error al eliminar usuario",
    };
  }
}
