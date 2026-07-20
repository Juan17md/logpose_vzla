"use server";

import { cookies } from "next/headers";
import { getAdminDb, getAdminAuth } from "./firebaseAdmin";
import { verificarCookieSesion } from "./authCookie";
import { esAdmin } from "@/types/rbac";

type ActionResult = { exito: true } | { exito: false; error: string };

async function verificarAdmin(): Promise<string> {
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get("session")?.value;
  if (!cookieVal) throw new Error("No autorizado");

  const sesion = await verificarCookieSesion(cookieVal);
  if (!sesion) throw new Error("Sesión inválida");

  const db = await getAdminDb();
  const callerDoc = await db.collection("users").doc(sesion.uid).get();
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
    const db = await getAdminDb();
    const snapshot = await db.collection("users").orderBy("createdAt", "desc").get();
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
    const db = await getAdminDb();

    const ref = db.collection("users").doc(uid);
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
    const db = await getAdminDb();

    const ref = db.collection("users").doc(uid);
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
      const snap = await db
        .collection("users")
        .doc(uid)
        .collection(sub)
        .get();

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    const transSnap = await db
      .collection("transactions")
      .where("userId", "==", uid)
      .get();
    const batch2 = db.batch();
    transSnap.docs.forEach((d) => batch2.delete(d.ref));
    await batch2.commit();

    const listasSnap = await db
      .collection("shopping_lists")
      .where("userId", "==", uid)
      .get();
    const batch3 = db.batch();
    listasSnap.docs.forEach((d) => batch3.delete(d.ref));
    await batch3.commit();

    await ref.delete();

    try {
      const auth = await getAdminAuth();
      await auth.deleteUser(uid);
    } catch {
      // Si falla eliminar el auth user, continuamos
    }

    return { exito: true };
  } catch (e) {
    return { exito: false, error: (e as Error).message || "Error al eliminar usuario" };
  }
}
