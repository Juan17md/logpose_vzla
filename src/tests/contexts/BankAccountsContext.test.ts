import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCrearMovimiento } = vi.hoisted(() => ({
  mockCrearMovimiento: vi.fn(),
}));

vi.mock("@/lib/movimientos", () => ({
  crearMovimiento: mockCrearMovimiento,
}));

vi.mock("@/lib/currency", () => ({
  getRates: vi.fn(async () => ({ usd: 500, eur: 600, usdt: 500, lastUpdated: "" })),
}));

vi.mock("@/lib/firebase", () => ({
  db: { _type: "fake-db" },
  auth: { currentUser: { uid: "user-test-789" } },
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth, cb) => {
    cb({ uid: "user-test-789" });
    return () => {};
  }),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn((_q, cb) => {
    // Simular que tenemos 2 cuentas: una en BS y una en USD
    cb({
      docs: [
        {
          id: "cuenta-bs-1",
          data: () => ({
            nombre: "Banesco",
            banco: "banesco",
            moneda: "BS",
            saldo: 5000,
            activa: true,
            color: "#10b981",
          }),
        },
        {
          id: "cuenta-usd-1",
          data: () => ({
            nombre: "Zelle",
            banco: "zelle",
            moneda: "USD",
            saldo: 200,
            activa: true,
            color: "#3b82f6",
          }),
        },
      ],
    });
    return () => {};
  }),
  doc: vi.fn(),
  serverTimestamp: () => new Date(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

import { useBankAccounts, BankAccountsProvider } from "@/contexts/BankAccountsContext";
import { renderHook, act } from "@testing-library/react";
import React from "react";

describe("BankAccountsContext — realizarOperacion con crearMovimiento (T12)", () => {
  beforeEach(() => {
    mockCrearMovimiento.mockReset();
    mockCrearMovimiento.mockResolvedValue({ exito: true, id: "mov-123" });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(BankAccountsProvider, null, children);

  it("mapea depósito a crearMovimiento con tipo ingreso", async () => {
    const { result } = renderHook(() => useBankAccounts(), { wrapper });

    let exito = false;
    await act(async () => {
      exito = await result.current.realizarOperacion({
        cuentaOrigenId: "cuenta-bs-1",
        tipo: "deposito",
        monto: 1500,
        descripcion: "Nómina quincenal",
      });
    });

    expect(exito).toBe(true);
    expect(mockCrearMovimiento).toHaveBeenCalledOnce();

    const [, , datos, opciones] = mockCrearMovimiento.mock.calls[0];
    expect(datos.amount).toBe(1500);
    expect(datos.type).toBe("ingreso");
    expect(datos.category).toBe("Transferencia");
    expect(datos.description).toBe("Nómina quincenal");
    expect(datos.accountId).toBe("cuenta-bs-1");
    expect(datos.currency).toBe("VES"); // Cuenta BS -> VES
    expect(opciones.validarSaldoOrigen).toBe(false); // Depósito no valida saldo insuficiente
  });

  it("mapea retiro a crearMovimiento con tipo gasto y valida saldo", async () => {
    const { result } = renderHook(() => useBankAccounts(), { wrapper });

    let exito = false;
    await act(async () => {
      exito = await result.current.realizarOperacion({
        cuentaOrigenId: "cuenta-usd-1",
        tipo: "retiro",
        monto: 50,
      });
    });

    expect(exito).toBe(true);
    const [, , datos, opciones] = mockCrearMovimiento.mock.calls[0];
    expect(datos.amount).toBe(50);
    expect(datos.type).toBe("gasto");
    expect(datos.category).toBe("Retiro");
    expect(datos.currency).toBe("USD");
    expect(opciones.validarSaldoOrigen).toBe(true);
  });

  it("mapea transferencia a crearMovimiento con targetAccountId y comisión", async () => {
    const { result } = renderHook(() => useBankAccounts(), { wrapper });

    let exito = false;
    await act(async () => {
      exito = await result.current.realizarOperacion({
        cuentaOrigenId: "cuenta-usd-1",
        cuentaDestinoId: "cuenta-bs-1",
        tipo: "transferencia",
        monto: 100,
        comision: 2,
        tasaCambio: 500,
      });
    });

    expect(exito).toBe(true);
    const [, , datos, opciones] = mockCrearMovimiento.mock.calls[0];
    expect(datos.amount).toBe(100);
    expect(datos.type).toBe("transferencia");
    expect(datos.accountId).toBe("cuenta-usd-1");
    expect(datos.targetAccountId).toBe("cuenta-bs-1");
    expect(opciones.validarSaldoOrigen).toBe(true);
    expect(opciones.tasaCambioDestino).toBe(500);
    expect(opciones.comisiones?.length).toBe(1);
    expect(opciones.comisiones?.[0].amount).toBe(2);
  });

  it("lanza error si crearMovimiento falla (ej. saldo insuficiente)", async () => {
    mockCrearMovimiento.mockResolvedValue({
      exito: false,
      error: "Saldo insuficiente",
    });

    const { result } = renderHook(() => useBankAccounts(), { wrapper });

    await expect(
      act(async () => {
        await result.current.realizarOperacion({
          cuentaOrigenId: "cuenta-usd-1",
          tipo: "retiro",
          monto: 10000,
        });
      })
    ).rejects.toThrow("Saldo insuficiente");
  });
});
