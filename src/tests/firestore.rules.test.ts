import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const rules = readFileSync(
  path.join(process.cwd(), "firestore.rules"),
  "utf8"
);

function extraerBloque(nombre: string, inicioDelimitador: string, finDelimitador?: string): string {
  const inicio = rules.indexOf(inicioDelimitador);
  expect(inicio, `No se encontró bloque para ${nombre}`).toBeGreaterThan(-1);
  const desde = rules.slice(inicio);
  if (!finDelimitador) return desde;
  const fin = desde.indexOf(finDelimitador);
  expect(fin, `No se encontró fin de bloque para ${nombre}`).toBeGreaterThan(-1);
  return desde.slice(0, fin);
}

describe("firestore.rules — usuarios y RBAC (T1)", () => {
  const bloqueUsers = extraerBloque("users", "match /users/{userId} {", "match /bank_accounts/");

  it("define keepsSameRole para impedir mutar role desde el cliente", () => {
    expect(rules).toContain("function keepsSameRole()");
    expect(rules).toContain(
      "return request.resource.data.role == resource.data.role;"
    );
  });

  it("el update de users solo permite al dueño y exige keepsSameRole", () => {
    expect(bloqueUsers).toMatch(
      /allow update:\s*if isOwner\(userId\)[\s\S]*?keepsSameRole\(\)/
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

describe("firestore.rules — transacciones estrictas (T14)", () => {
  const bloqueTrans = extraerBloque("transactions", "match /transactions/{transactionId} {", "match /admin_logs/");

  it("exige que el monto sea un número positivo (> 0) en create", () => {
    expect(bloqueTrans).toContain("isPositiveNumber(request.resource.data.amount)");
  });

  it("valida que el tipo sea ingreso, gasto o transferencia en create", () => {
    expect(bloqueTrans).toContain("isValidType(request.resource.data.type)");
  });

  it("valida que la moneda sea VES o USD", () => {
    expect(bloqueTrans).toContain("isValidTransactionCurrency(request.resource.data.currency)");
  });

  it("limita el tamaño de category (100) y description (500) en create", () => {
    expect(bloqueTrans).toContain('isStringMaxSize(request.resource.data.category, 100)');
    expect(bloqueTrans).toContain('isStringMaxSize(request.resource.data.description, 500)');
  });

  it("el update es tan estricto como el create y mantiene el mismo userId", () => {
    expect(bloqueTrans).toContain("keepsSameUserId()");
    expect(bloqueTrans).toContain('validPositiveNumberIfPresent("amount")');
    expect(bloqueTrans).toContain("validTypeIfPresent()");
    expect(bloqueTrans).toContain('validStringMaxSizeIfPresent("category", 100)');
    expect(bloqueTrans).toContain('validStringMaxSizeIfPresent("description", 500)');
    expect(bloqueTrans).toContain("validTransactionCurrencyIfPresent()");
  });
});

describe("firestore.rules — cuentas bancarias (T15)", () => {
  const bloqueCuentas = extraerBloque("bank_accounts", "match /bank_accounts/{accountId} {", "match /account_transactions/");

  it("valida moneda soportada de cuenta (BS, USD, EUR, USDT)", () => {
    expect(rules).toContain("function isValidAccountCurrency(currency)");
    expect(rules).toContain('currency == "BS" || currency == "USD" || currency == "EUR" || currency == "USDT"');
    expect(bloqueCuentas).toContain("isValidAccountCurrency(request.resource.data.moneda)");
  });

  it("limita el tamaño de nombre, banco y color en create", () => {
    expect(bloqueCuentas).toContain('isStringMaxSize(request.resource.data.nombre, 100)');
    expect(bloqueCuentas).toContain('isStringMaxSize(request.resource.data.banco, 100)');
    expect(bloqueCuentas).toContain('isStringMaxSize(request.resource.data.color, 30)');
  });

  it("permite actualizar saldo y propiedades válidas", () => {
    expect(bloqueCuentas).toContain('validAccountCurrencyIfPresent()');
    expect(bloqueCuentas).toContain('validNumberIfPresent("saldo")');
    expect(bloqueCuentas).toContain('validBooleanIfPresent("activa")');
  });
});

describe("firestore.rules — deudas, gastos fijos, metas y categorías (T16)", () => {
  it("deudas: valida tipo (por_cobrar/por_pagar), monto positivo y límite de 100 abonos", () => {
    const bloqueDebts = extraerBloque("debts", "match /debts/{debtId} {", "match /fixed_expenses/");
    expect(bloqueDebts).toContain("isPositiveNumber(request.resource.data.amount)");
    expect(bloqueDebts).toContain("isValidDebtType(request.resource.data.type)");
    expect(bloqueDebts).toContain("validPaymentsSizeIfPresent()");
    expect(rules).toContain("request.resource.data.payments.size() <= 100");
  });

  it("gastos fijos: valida día de vencimiento entre 1 y 31 y monto positivo", () => {
    const bloqueFixed = extraerBloque("fixed_expenses", "match /fixed_expenses/{expenseId} {", "match /saving_goals/");
    expect(bloqueFixed).toContain("isPositiveNumber(request.resource.data.amount)");
    expect(bloqueFixed).toContain("request.resource.data.dueDay >= 1");
    expect(bloqueFixed).toContain("request.resource.data.dueDay <= 31");
    expect(bloqueFixed).toContain("validDueDayIfPresent()");
  });

  it("metas de ahorro: valida targetAmount positivo y currentAmount no negativo", () => {
    const bloqueGoals = extraerBloque("saving_goals", "match /saving_goals/{goalId} {", "match /savings_transactions/");
    expect(bloqueGoals).toContain("isPositiveNumber(request.resource.data.targetAmount)");
    expect(bloqueGoals).toContain('validNonNegativeIfPresent("currentAmount")');
  });

  it("categorías: valida enum de tipo (ingreso/gasto/ambas) y límites de tamaño", () => {
    const bloqueCat = extraerBloque("categories", "match /categories/{categoryId} {", "match /debts/");
    expect(bloqueCat).toContain("isValidCategoryType(request.resource.data.tipo)");
    expect(rules).toContain('type == "ingreso" || type == "gasto" || type == "ambas"');
    expect(bloqueCat).toContain('isStringMaxSize(request.resource.data.nombre, 100)');
  });
});
