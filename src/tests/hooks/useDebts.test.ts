import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock en memoria de firebase/firestore ────────────────────────────────────

const { estado } = vi.hoisted(() => {
  const estado = new Map<string, Record<string, unknown>>();
  return { estado };
});

let contadorIds = 0;

vi.mock("firebase/firestore", () => {
  const generarId = () => `debt-auto-${++contadorIds}`;

  const collection = (_db: unknown, ...args: string[]) => ({
    path: args.join("/"),
    type: "collection",
  });

  const doc = (...args: unknown[]) => {
    const primero = args[0] as { path?: string };
    if (typeof primero === "object" && primero !== null && typeof primero.path === "string") {
      const id = (args[1] as string) || generarId();
      return { id, path: `${primero.path}/${id}` };
    }
    const strings = args.slice(1) as string[];
    return { id: strings[strings.length - 1], path: strings.join("/") };
  };

  const createTransaction = () => {
    const pendingOps: Array<{ op: string; ref: { path: string }; data?: Record<string, unknown> }> = [];
    return {
      get: async (ref: { path: string }) => {
        const pendingUpdate = [...pendingOps].reverse().find((o) => o.op === "update" && o.ref.path === ref.path);
        if (pendingUpdate) return { exists: () => true, data: () => ({ ...estado.get(ref.path), ...pendingUpdate.data }) };
        const pendingSet = [...pendingOps].reverse().find((o) => o.op === "set" && o.ref.path === ref.path);
        if (pendingSet) return { exists: () => true, data: () => pendingSet.data };
        return { exists: () => estado.has(ref.path), data: () => estado.get(ref.path) };
      },
      update: (ref: { path: string }, data: Record<string, unknown>) => {
        pendingOps.push({ op: "update", ref, data });
      },
      set: (ref: { path: string }, data: Record<string, unknown>) => {
        pendingOps.push({ op: "set", ref, data });
      },
      delete: (ref: { path: string }) => {
        pendingOps.push({ op: "delete", ref });
      },
      _pendingOps: pendingOps,
    };
  };

  const runTransaction = async (_db: unknown, fn: (t: ReturnType<typeof createTransaction>) => Promise<void>) => {
    const tx = createTransaction();
    try {
      await fn(tx);
      for (const op of tx._pendingOps) {
        if (op.op === "update") {
          const current = estado.get(op.ref.path) ?? {};
          estado.set(op.ref.path, { ...current, ...op.data });
        } else if (op.op === "set") {
          estado.set(op.ref.path, op.data ?? {});
        } else if (op.op === "delete") {
          estado.delete(op.ref.path);
        }
      }
    } catch (e) {
      throw e;
    }
  };

  const serverTimestamp = () => new Date();
  const query = vi.fn();
  const orderBy = vi.fn();
  const onSnapshot = vi.fn();
  const addDoc = vi.fn();
  const updateDoc = vi.fn();
  const deleteDoc = vi.fn();

  return {
    collection,
    doc,
    runTransaction,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    Timestamp: {
      now: () => ({ toDate: () => new Date() }),
    },
  };
});

vi.mock("@/lib/firebase", () => ({
  db: { _type: "fake-firestore" },
  auth: { currentUser: { uid: "user-test-123" } },
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
}));

import { useDebts } from "@/hooks/useDebts";
import { renderHook, act } from "@testing-library/react";

describe("useDebts — addPayment con movimiento contable (T13)", () => {
  beforeEach(() => {
    estado.clear();
    contadorIds = 0;
  });

  it("crea un movimiento de tipo ingreso al abonar a una deuda por cobrar", async () => {
    const debtId = "deuda-cobrar-1";
    const debtPath = "users/user-test-123/debts/deuda-cobrar-1";

    estado.set(debtPath, {
      personName: "Carlos Pérez",
      type: "por_cobrar",
      amount: 100,
      payments: [],
      isPaid: false,
      currency: "USD",
    });

    const { result } = renderHook(() => useDebts());

    let exito = false;
    await act(async () => {
      exito = (await result.current.addPayment(debtId, {
        amount: 40,
        currency: "USD",
        note: "Primer abono",
        date: new Date("2026-08-20T12:00:00Z"),
      })) ?? false;
    });

    expect(exito).toBe(true);

    // Verificar que la deuda se actualizó
    const deudaActualizada = estado.get(debtPath);
    expect(deudaActualizada).toBeDefined();
    expect(deudaActualizada?.isPaid).toBe(false);
    expect((deudaActualizada?.payments as unknown[]).length).toBe(1);

    // Verificar que se creó el movimiento contable en transactions
    const transEntries = Array.from(estado.entries()).filter(([key]) => key.startsWith("transactions/"));
    expect(transEntries.length).toBe(1);

    const transData = transEntries[0][1];
    expect(transData.userId).toBe("user-test-123");
    expect(transData.amount).toBe(40);
    expect(transData.type).toBe("ingreso"); // Por cobrar -> Ingreso
    expect(transData.category).toBe("Deudas");
    expect(transData.description).toContain("Cobro de deuda: Carlos Pérez");
    expect(transData.description).toContain("Primer abono");
    expect(transData.currency).toBe("USD");
  });

  it("crea un movimiento de tipo gasto al abonar a una deuda por pagar", async () => {
    const debtId = "deuda-pagar-1";
    const debtPath = "users/user-test-123/debts/deuda-pagar-1";

    estado.set(debtPath, {
      personName: "María Gómez",
      type: "por_pagar",
      amount: 50,
      payments: [],
      isPaid: false,
      currency: "USD",
    });

    const { result } = renderHook(() => useDebts());

    let exito = false;
    await act(async () => {
      exito = (await result.current.addPayment(debtId, {
        amount: 50,
        currency: "USD",
        date: new Date("2026-08-20T14:00:00Z"),
      })) ?? false;
    });

    expect(exito).toBe(true);

    // La deuda debe estar completamente pagada
    const deudaActualizada = estado.get(debtPath);
    expect(deudaActualizada?.isPaid).toBe(true);

    // Movimiento contable de gasto
    const transEntries = Array.from(estado.entries()).filter(([key]) => key.startsWith("transactions/"));
    expect(transEntries.length).toBe(1);

    const transData = transEntries[0][1];
    expect(transData.type).toBe("gasto"); // Por pagar -> Gasto
    expect(transData.amount).toBe(50);
    expect(transData.category).toBe("Deudas");
    expect(transData.description).toBe("Pago de deuda: María Gómez");
  });
});
