"use server";
import 'server-only';

import { crearLog, listarLogs } from "./firebaseAdmin";
import { verificarAdmin } from "./verificarAdmin";
import type { AdminLogAction, AdminLogEntry } from "@/types/adminLogs";

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
