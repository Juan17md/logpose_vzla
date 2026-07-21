"use server";
import 'server-only';

import { crearLog, listarLogs, leerUsuario } from "./firebaseAdmin";
import { verificarCookieSesion } from "./authCookie";
import { cookies } from "next/headers";
import { esAdmin } from "@/types/rbac";
import type { AdminLogAction, AdminLogEntry } from "@/types/adminLogs";

async function verificarAdmin(): Promise<{ uid: string; email: string }> {
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

export async function registrarLogAdmin(
  action: AdminLogAction,
  targetUid: string,
  targetEmail: string,
  details: string
): Promise<void> {
  try {
    const admin = await verificarAdmin();
    await crearLog({
      action,
      adminUid: admin.uid,
      adminEmail: admin.email,
      targetUid,
      targetEmail,
      details,
    });
  } catch {
    // Los logs no deben romper la operación principal
  }
}

export async function obtenerLogsAdmin(): Promise<AdminLogEntry[]> {
  try {
    await verificarAdmin();
    const docs = await listarLogs();
    return docs.map((d) => ({
      id: (d.id as string) || "",
      action: d.action as AdminLogAction,
      adminUid: (d.adminUid as string) || "",
      adminEmail: (d.adminEmail as string) || "",
      targetUid: (d.targetUid as string) || "",
      targetEmail: (d.targetEmail as string) || "",
      details: (d.details as string) || "",
      timestamp: (d.timestamp as string) || "",
    }));
  } catch (e) {
    throw e;
  }
}
