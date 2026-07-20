"use server";

import { cookies } from "next/headers";
import { adminDb } from "./firebaseAdmin";
import { verificarCookieSesion } from "./authCookie";
import { esAdmin } from "@/types/rbac";

type ActionResult = { exito: true } | { exito: false; error: string };

async function verificarAdmin(): Promise<string> {
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get("session")?.value;
  if (!cookieVal) throw new Error("No autorizado");

  const sesion = await verificarCookieSesion(cookieVal);
  if (!sesion) throw new Error("Sesión inválida");

  const callerDoc = await adminDb.collection("users").doc(sesion.uid).get();
  if (!callerDoc.exists) throw new Error("Usuario no encontrado");

  const role = callerDoc.data()?.role;
  if (!esAdmin(role)) throw new Error("Se requieren permisos de administrador");

  return sesion.uid;
}

export async function obtenerUsuarios(): Promise<
  Array<{
    uid: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    createdAt: { seconds: number; nanoseconds: number } | null;
    trialExpiresAt: { seconds: number; nanoseconds: number } | null;
  }>
> {
  try {
    await verificarAdmin();
    const snapshot = await adminDb.collection("users").orderBy("createdAt", "desc").get();
    return snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        uid: doc.id,
        email: d.email || "",
        displayName: d.displayName || "",
        role: d.role || "usuario",
        status: d.status || "active",
        createdAt: d.createdAt || null,
        trialExpiresAt: d.trialExpiresAt || null,
      };
    });
  } catch (e) {
    throw e;
  }
}

export async function aprobarUsuario(uid: string): Promise<ActionResult> {
  try {
    await verificarAdmin();

    const ref = adminDb.collection("users").doc(uid);
    const doc = await ref.get();
    if (!doc.exists) return { exito: false, error: "Usuario no encontrado" };

    await ref.update({
      role: "usuario",
      status: "active",
      trialExpiresAt: null,
    });

    return { exito: true };
  } catch (e) {
    return { exito: false, error: (e as Error).message || "Error al aprobar usuario" };
  }
}

export async function eliminarUsuario(uid: string): Promise<ActionResult> {
  try {
    await verificarAdmin();

    const ref = adminDb.collection("users").doc(uid);
    const doc = await ref.get();
    if (!doc.exists) return { exito: false, error: "Usuario no encontrado" };

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
      const snap = await adminDb
        .collection("users")
        .doc(uid)
        .collection(sub)
        .get();

      const batch = adminDb.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    const transSnap = await adminDb
      .collection("transactions")
      .where("userId", "==", uid)
      .get();
    const batch2 = adminDb.batch();
    transSnap.docs.forEach((d) => batch2.delete(d.ref));
    await batch2.commit();

    const listasSnap = await adminDb
      .collection("shopping_lists")
      .where("userId", "==", uid)
      .get();
    const batch3 = adminDb.batch();
    listasSnap.docs.forEach((d) => batch3.delete(d.ref));
    await batch3.commit();

    await ref.delete();

    try {
      await (await import("./firebaseAdmin")).adminAuth.deleteUser(uid);
    } catch {
      // Si falla eliminar el auth user, continuamos
    }

    return { exito: true };
  } catch (e) {
    return { exito: false, error: (e as Error).message || "Error al eliminar usuario" };
  }
}
