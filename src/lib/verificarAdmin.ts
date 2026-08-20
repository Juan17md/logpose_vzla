"use server";
import 'server-only';

import { cookies } from "next/headers";
import { verificarCookieSesion } from "./authCookie";
import { leerUsuario } from "./firebaseAdmin";
import { esAdmin } from "@/types/rbac";

export interface SesionAdmin {
  uid: string;
  email: string;
}

/**
 * Verificación única de permisos de administrador para Server Actions y
 * route handlers: valida la cookie de sesión firmada y que el usuario tenga
 * rol "admin" en Firestore. Lanza Error con mensaje en español si no aplica.
 */
export async function verificarAdmin(): Promise<SesionAdmin> {
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

  return { uid: sesion.uid, email: (userData.email as string) || "" };
}