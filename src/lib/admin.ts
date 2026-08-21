"use server";
import 'server-only';

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
import { verificarAdmin } from "./verificarAdmin";
import { registrarLogAdmin } from "./adminLogs";

type ActionResult = { exito: true } | { exito: false; error: string };

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

/**
 * Política de contraseñas del panel admin, alineada con el registro de la app
 * (mínimo 6) y endurecida con límite superior (72, límite de Identity Toolkit)
 * y rechazo de contraseñas en blanco / solo espacios.
 */
export async function validarContraseñaAdmin(password: string): Promise<string | null> {
  if (!password || typeof password !== "string") {
    return "La contraseña es obligatoria";
  }
  if (password.trim().length < 6) {
    return "La contraseña debe tener al menos 6 caracteres";
  }
  if (password.length > 72) {
    return "La contraseña no puede superar 72 caracteres";
  }
  if (password.trim() !== password || !password.trim()) {
    return "La contraseña no puede contener solo espacios";
  }
  return null;
}

export async function cambiarPasswordUsuario(
  uid: string,
  nuevaPassword: string
): Promise<ActionResult> {
  try {
    await verificarAdmin();
    const userData = await leerUsuario(uid);
    if (!userData) return { exito: false, error: "Usuario no encontrado" };

    const errorPassword = await validarContraseñaAdmin(nuevaPassword);
    if (errorPassword) return { exito: false, error: errorPassword };

    if (userData.role === "admin") {
      return {
        exito: false,
        error: "No puedes cambiar la contraseña de administradores",
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
    const sesion = await verificarAdmin();
    const userData = await leerUsuario(uid);
    if (!userData) return { exito: false, error: "Usuario no encontrado" };

    if (userData.role === "admin") {
      return {
        exito: false,
        error: "No puedes eliminar administradores",
      };
    }

    if (sesion.uid === uid) {
      return {
        exito: false,
        error: "No puedes eliminar tu propia cuenta desde el panel",
      };
    }

    const subColecciones = [
      "bank_accounts",
      "account_transactions",
      "debts",
      "fixed_expenses",
      "saving_goals",
      "savings_transactions",
      "categories",
    ];

    const errores: string[] = [];

    for (const sub of subColecciones) {
      try {
        await eliminarColeccion(uid, sub);
      } catch (e) {
        errores.push(`Subcolección "${sub}": ${(e as Error).message}`);
      }
    }

    try {
      await eliminarDocumentosWhere("transactions", "userId", uid);
    } catch (e) {
      errores.push(`Transacciones: ${(e as Error).message}`);
    }

    try {
      await eliminarDocumentosWhere("shopping_lists", "userId", uid);
    } catch (e) {
      errores.push(`Listas de compras: ${(e as Error).message}`);
    }

    try {
      await eliminarUsuarioDoc(uid);
    } catch (e) {
      errores.push(`Documento de usuario: ${(e as Error).message}`);
    }

    try {
      await eliminarAuthUser(uid);
    } catch (e) {
      errores.push(`Cuenta de autenticación: ${(e as Error).message}`);
    }

    if (errores.length > 0) {
      return {
        exito: false,
        error: `Eliminación incompleta: ${errores.join(" | ")}`,
      };
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
