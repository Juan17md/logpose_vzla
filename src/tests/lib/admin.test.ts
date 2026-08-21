import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  verificarAdmin: vi.fn(),
  leerUsuario: vi.fn(),
  listarUsuarios: vi.fn(),
  actualizarUsuario: vi.fn(),
  actualizarAuthUser: vi.fn(),
  eliminarColeccion: vi.fn(),
  eliminarDocumentosWhere: vi.fn(),
  eliminarUsuarioDoc: vi.fn(),
  eliminarAuthUser: vi.fn(),
  registrarLogAdmin: vi.fn(),
}));

vi.mock("@/lib/verificarAdmin", () => ({
  verificarAdmin: mocks.verificarAdmin,
}));

vi.mock("@/lib/firebaseAdmin", () => ({
  leerUsuario: mocks.leerUsuario,
  listarUsuarios: mocks.listarUsuarios,
  actualizarUsuario: mocks.actualizarUsuario,
  actualizarAuthUser: mocks.actualizarAuthUser,
  eliminarColeccion: mocks.eliminarColeccion,
  eliminarDocumentosWhere: mocks.eliminarDocumentosWhere,
  eliminarUsuarioDoc: mocks.eliminarUsuarioDoc,
  eliminarAuthUser: mocks.eliminarAuthUser,
}));

vi.mock("@/lib/adminLogs", () => ({
  registrarLogAdmin: mocks.registrarLogAdmin,
}));

import {
  cambiarPasswordUsuario,
  eliminarUsuario,
  validarContraseñaAdmin,
} from "@/lib/admin";

const SESION_ADMIN = { uid: "admin-1", email: "admin@test.com" };

beforeEach(() => {
  mocks.verificarAdmin.mockReset();
  mocks.leerUsuario.mockReset();
  mocks.listarUsuarios.mockReset();
  mocks.actualizarUsuario.mockReset();
  mocks.actualizarAuthUser.mockReset();
  mocks.eliminarColeccion.mockReset();
  mocks.eliminarDocumentosWhere.mockReset();
  mocks.eliminarUsuarioDoc.mockReset();
  mocks.eliminarAuthUser.mockReset();
  mocks.registrarLogAdmin.mockReset();

  mocks.verificarAdmin.mockResolvedValue(SESION_ADMIN);
  mocks.leerUsuario.mockResolvedValue({
    email: "objetivo@test.com",
    role: "usuario",
    displayName: "Usuario Objetivo",
  });
  mocks.eliminarColeccion.mockResolvedValue(undefined);
  mocks.eliminarDocumentosWhere.mockResolvedValue(undefined);
  mocks.eliminarUsuarioDoc.mockResolvedValue(undefined);
  mocks.eliminarAuthUser.mockResolvedValue(undefined);
  mocks.actualizarAuthUser.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("validarContraseñaAdmin", () => {
  it("acepta una contraseña válida", async () => {
    expect(await validarContraseñaAdmin("hola123")).toBeNull();
  });

  it("rechaza vacía", async () => {
    expect(await validarContraseñaAdmin("")).toContain("obligatoria");
  });

  it("rechaza menor a 6 caracteres", async () => {
    expect(await validarContraseñaAdmin("abc")).toContain("al menos 6");
  });

  it("rechaza mayor a 72 caracteres", async () => {
    expect(await validarContraseñaAdmin("x".repeat(73))).toContain("72");
  });

  it("rechaza contraseñas con espacios al inicio o final", async () => {
    expect(await validarContraseñaAdmin("  abcdef")).toContain("espacios");
    expect(await validarContraseñaAdmin("abcdef  ")).toContain("espacios");
  });
});

describe("cambiarPasswordUsuario (T2)", () => {
  it("rechaza si verificarAdmin lanza (no autorizado)", async () => {
    mocks.verificarAdmin.mockRejectedValue(new Error("No autorizado"));
    const res = await cambiarPasswordUsuario("uid-1", "nueva123");
    expect(res).toEqual({ exito: false, error: "No autorizado" });
    expect(mocks.actualizarAuthUser).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario no existe", async () => {
    mocks.leerUsuario.mockResolvedValue(null);
    const res = await cambiarPasswordUsuario("uid-1", "nueva123");
    expect(res).toEqual({ exito: false, error: "Usuario no encontrado" });
  });

  it("rechaza cambiar la contraseña de un admin", async () => {
    mocks.leerUsuario.mockResolvedValue({
      email: "admin2@test.com",
      role: "admin",
    });
    const res = await cambiarPasswordUsuario("uid-admin", "nueva123");
    expect(res).toEqual({
      exito: false,
      error: "No puedes cambiar la contraseña de administradores",
    });
    expect(mocks.actualizarAuthUser).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña corta", async () => {
    const res = await cambiarPasswordUsuario("uid-1", "abc");
    expect(res.exito).toBe(false);
    expect(mocks.actualizarAuthUser).not.toHaveBeenCalled();
  });

  it("cambia la contraseña y registra el log", async () => {
    const res = await cambiarPasswordUsuario("uid-1", "nueva-segura-123");
    expect(res).toEqual({ exito: true });
    expect(mocks.actualizarAuthUser).toHaveBeenCalledWith("uid-1", {
      password: "nueva-segura-123",
    });
    expect(mocks.registrarLogAdmin).toHaveBeenCalledWith(
      "cambiar_password",
      "uid-1",
      "objetivo@test.com",
      expect.any(String)
    );
  });

  it("devuelve error si actualizarAuthUser falla", async () => {
    mocks.actualizarAuthUser.mockRejectedValue(new Error("Identity Toolkit error"));
    const res = await cambiarPasswordUsuario("uid-1", "nueva-segura-123");
    expect(res).toEqual({
      exito: false,
      error: "Identity Toolkit error",
    });
  });
});

describe("eliminarUsuario (T3)", () => {
  it("rechaza si verificarAdmin lanza", async () => {
    mocks.verificarAdmin.mockRejectedValue(new Error("No autorizado"));
    const res = await eliminarUsuario("uid-1");
    expect(res).toEqual({ exito: false, error: "No autorizado" });
    expect(mocks.eliminarColeccion).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario no existe", async () => {
    mocks.leerUsuario.mockResolvedValue(null);
    const res = await eliminarUsuario("uid-1");
    expect(res).toEqual({ exito: false, error: "Usuario no encontrado" });
  });

  it("rechaza eliminar a un admin", async () => {
    mocks.leerUsuario.mockResolvedValue({
      email: "admin2@test.com",
      role: "admin",
    });
    const res = await eliminarUsuario("uid-admin");
    expect(res).toEqual({
      exito: false,
      error: "No puedes eliminar administradores",
    });
    expect(mocks.eliminarColeccion).not.toHaveBeenCalled();
  });

  it("rechaza eliminar la propia cuenta", async () => {
    const res = await eliminarUsuario("admin-1");
    expect(res).toEqual({
      exito: false,
      error: "No puedes eliminar tu propia cuenta desde el panel",
    });
    expect(mocks.eliminarColeccion).not.toHaveBeenCalled();
  });

  it("elimina subcolecciones, documentos raíz, el doc y el auth user", async () => {
    const res = await eliminarUsuario("uid-1");
    expect(res).toEqual({ exito: true });

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
      expect(mocks.eliminarColeccion).toHaveBeenCalledWith("uid-1", sub);
    }
    expect(mocks.eliminarDocumentosWhere).toHaveBeenCalledWith(
      "transactions",
      "userId",
      "uid-1"
    );
    expect(mocks.eliminarDocumentosWhere).toHaveBeenCalledWith(
      "shopping_lists",
      "userId",
      "uid-1"
    );
    expect(mocks.eliminarUsuarioDoc).toHaveBeenCalledWith("uid-1");
    expect(mocks.eliminarAuthUser).toHaveBeenCalledWith("uid-1");
    expect(mocks.registrarLogAdmin).toHaveBeenCalledWith(
      "eliminar_usuario",
      "uid-1",
      "objetivo@test.com",
      expect.any(String)
    );
  });

  it("no devuelve exito:true si una subcolección falla", async () => {
    mocks.eliminarColeccion.mockRejectedValueOnce(
      new Error("Quedaron 2 documentos en debts")
    );
    const res = (await eliminarUsuario("uid-1")) as {
      exito: false;
      error: string;
    };
    expect(res.exito).toBe(false);
    expect(res.error).toContain("Eliminación incompleta");
    expect(res.error).toContain("debts");
    expect(mocks.registrarLogAdmin).not.toHaveBeenCalled();
  });

  it("no devuelve exito:true si auth user falla", async () => {
    mocks.eliminarAuthUser.mockRejectedValue(
      new Error("Identity Toolkit error al eliminar auth user (500)")
    );
    const res = (await eliminarUsuario("uid-1")) as {
      exito: false;
      error: string;
    };
    expect(res.exito).toBe(false);
    expect(res.error).toContain("autenticación");
    expect(mocks.registrarLogAdmin).not.toHaveBeenCalled();
  });

  it("intenta todos los pasos y no registra log si alguno falla", async () => {
    mocks.eliminarColeccion.mockRejectedValue(new Error("fallo"));
    const res = await eliminarUsuario("uid-1");
    expect(res.exito).toBe(false);
    expect(mocks.registrarLogAdmin).not.toHaveBeenCalled();
    expect(mocks.eliminarAuthUser).toHaveBeenCalledWith("uid-1");
  });
});