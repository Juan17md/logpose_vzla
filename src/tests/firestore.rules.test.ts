import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Regresión de T1: el update de /users no debe conceder isAdmin() irrestricto.
 * El emulador de rules no está en el CI; este test ancla el texto de la regla.
 */
function extraerBloqueUsers(rules: string): string {
  const inicio = rules.indexOf("match /users/{userId} {");
  expect(inicio).toBeGreaterThan(-1);
  const desde = rules.slice(inicio);
  const finSubcoleccion = desde.indexOf("match /bank_accounts/");
  expect(finSubcoleccion).toBeGreaterThan(-1);
  return desde.slice(0, finSubcoleccion);
}

describe("firestore.rules — usuarios (T1)", () => {
  const rules = readFileSync(
    path.join(process.cwd(), "firestore.rules"),
    "utf8"
  );
  const bloqueUsers = extraerBloqueUsers(rules);

  it("define keepsSameRole para impedir mutar role desde el cliente", () => {
    expect(rules).toContain("function keepsSameRole()");
    expect(rules).toContain(
      "return request.resource.data.role == resource.data.role;"
    );
  });

  it("el update de users solo permite al dueño y exige keepsSameRole", () => {
    expect(bloqueUsers).toMatch(
      /allow update:\s*if isOwner\(userId\) && keepsSameRole\(\);/
    );
  });

  it("el update de users no concede isAdmin() irrestricto", () => {
    const lineaUpdate = bloqueUsers
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("allow update:"));
    expect(lineaUpdate).toBeDefined();
    expect(lineaUpdate).not.toMatch(/isAdmin/);
  });

  it("el create de users sigue exigiendo role usuario", () => {
    expect(bloqueUsers).toContain('request.resource.data.role == "usuario"');
  });

  it("los administradores siguen pudiendo leer users", () => {
    expect(bloqueUsers).toMatch(
      /allow read:\s*if isOwner\(userId\) \|\| isAdmin\(\);/
    );
  });
});
