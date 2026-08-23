import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock en memoria de firebase/firestore ────────────────────────────────────

const { estado } = vi.hoisted(() => {
  const estado = new Map<string, Record<string, unknown>>();
  return { estado };
});

let contadorIds = 0;

vi.mock("firebase/firestore", () => {
  const generarId = () => `auto-${++contadorIds}`;

  const collection = (_db: unknown, path: string) => ({ path, type: "collection" });

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
        // Read-your-writes: check pending ops first
        const pendingUpdate = [...pendingOps].reverse().find(o => o.op === "update" && o.ref.path === ref.path);
        if (pendingUpdate) return { exists: () => true, data: () => ({ ...estado.get(ref.path), ...pendingUpdate.data }) };
        const pendingSet = [...pendingOps].reverse().find(o => o.op === "set" && o.ref.path === ref.path);
        if (pendingSet) return { exists: () => true, data: () => pendingSet.data };
        const pendingDelete = pendingOps.find(o => o.op === "delete" && o.ref.path === ref.path);
        if (pendingDelete) return { exists: () => false, data: () => undefined };
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
      // Apply pending ops to global state
      for (const op of tx._pendingOps) {
        if (op.op === "update") {
          const current = estado.get(op.ref.path) ?? {};
          const merged = { ...current };
          if (op.data) {
            for (const [k, v] of Object.entries(op.data)) {
              if (v && typeof v === "object" && "__deleteField" in v) {
                delete merged[k];
              } else {
                merged[k] = v;
              }
            }
          }
          estado.set(op.ref.path, merged);
        } else if (op.op === "set") {
          const cleanData: Record<string, unknown> = {};
          if (op.data) {
            for (const [k, v] of Object.entries(op.data)) {
              if (!(v && typeof v === "object" && "__deleteField" in v)) {
                cleanData[k] = v;
              }
            }
          }
          estado.set(op.ref.path, cleanData);
        } else {
          estado.delete(op.ref.path);
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const serverTimestamp = () => ({ __serverTimestamp: true });
  const Timestamp = { now: () => ({ __timestampNow: true }) };
  const deleteField = () => ({ __deleteField: true });

  const where = (campo: string, _op: string, valor: unknown) => ({
    type: "where",
    campo,
    valor,
  });
  const query = (base: unknown, ...constraints: Array<Record<string, unknown>>) => ({
    ...(base as Record<string, unknown>),
    constraints,
  });
  const getDocs = async (
    q: { constraints?: Array<{ type: string; campo: string; valor: unknown }> }
  ) => {
    const docs = [];
    for (const [path, data] of estado) {
      if (!path.startsWith("transactions/")) continue;
      let cumple = true;
      for (const c of q.constraints ?? []) {
        if (c.type === "where" && (data as Record<string, unknown>)?.[c.campo] !== c.valor) {
          cumple = false;
          break;
        }
      }
      if (cumple) docs.push({ id: path.split("/").pop(), data: () => data });
    }
    return { docs, size: docs.length };
  };

  return { collection, doc, runTransaction, serverTimestamp, Timestamp, deleteField, where, query, getDocs };
});

// ─── Sujeto bajo prueba ───────────────────────────────────────────────────────

import {
  crearMovimiento,
  eliminarMovimiento,
  actualizarMovimiento,
  type MovimientoData,
} from "@/lib/movimientos";

const db = {} as never;

function sembrarCuenta(uid: string, cuentaId: string, moneda: string, saldo: number) {
  estado.set(`users/${uid}/bank_accounts/${cuentaId}`, { moneda, saldo });
}

function leerCuenta(uid: string, cuentaId: string): Record<string, unknown> | undefined {
  return estado.get(`users/${uid}/bank_accounts/${cuentaId}`);
}

function leerTransacciones(uid: string): Array<Record<string, unknown> & { id: string }> {
  const resultado: Array<Record<string, unknown> & { id: string }> = [];
  for (const [path, data] of estado) {
    if (path.startsWith("transactions/") && (data as { userId?: string }).userId === uid) {
      resultado.push({ ...data, id: path.split("/")[1] });
    }
  }
  return resultado;
}

function baseGasto(overrides: Partial<MovimientoData> = {}): MovimientoData {
  return {
    amount: 10,
    type: "gasto",
    category: "Comida",
    date: new Date("2026-08-20T12:00:00Z"),
    currency: "USD",
    exchangeRate: 1,
    originalAmount: 10,
    accountId: "a1",
    ...overrides,
  };
}

describe("crearMovimiento", () => {
  beforeEach(() => {
    estado.clear();
    contadorIds = 0;
  });

  it("resta el monto del saldo de la cuenta en un gasto", async () => {
    sembrarCuenta("u1", "a1", "USD", 100);

    const resultado = await crearMovimiento(db, "u1", baseGasto());

    expect(resultado.exito).toBe(true);
    expect(leerCuenta("u1", "a1")?.saldo).toBe(90);
    const [trans] = leerTransacciones("u1");
    expect(trans).toBeDefined();
    expect(trans.amount).toBe(10);
    expect(trans.userId).toBe("u1");
  });

  it("suma el monto del saldo de la cuenta en un ingreso", async () => {
    sembrarCuenta("u1", "a1", "USD", 100);

    const resultado = await crearMovimiento(
      db,
      "u1",
      baseGasto({ type: "ingreso", category: "Salario" })
    );

    expect(resultado.exito).toBe(true);
    expect(leerCuenta("u1", "a1")?.saldo).toBe(110);
  });

  it("convierte VES → BS usando originalAmount", async () => {
    sembrarCuenta("u1", "a1", "BS", 1000);

    const resultado = await crearMovimiento(
      db,
      "u1",
      baseGasto({ amount: 5, currency: "VES", originalAmount: 50, exchangeRate: 10 })
    );

    expect(resultado.exito).toBe(true);
    expect(leerCuenta("u1", "a1")?.saldo).toBe(950);
  });

  it("rechaza el gasto que deja saldo negativo si validarSaldoOrigen", async () => {
    sembrarCuenta("u1", "a1", "USD", 5);

    const resultado = await crearMovimiento(db, "u1", baseGasto({ amount: 10 }), {
      validarSaldoOrigen: true,
    });

    expect(resultado.exito).toBe(false);
    expect(resultado).toEqual({ exito: false, error: "Saldo insuficiente" });
    expect(leerCuenta("u1", "a1")?.saldo).toBe(5);
    expect(leerTransacciones("u1")).toHaveLength(0);
  });

  it("mueve saldo origen → destino en una transferencia", async () => {
    sembrarCuenta("u1", "a1", "USD", 100);
    sembrarCuenta("u1", "a2", "USD", 50);

    const resultado = await crearMovimiento(
      db,
      "u1",
      baseGasto({ type: "transferencia", category: "Transferencias", targetAccountId: "a2" })
    );

    expect(resultado.exito).toBe(true);
    expect(leerCuenta("u1", "a1")?.saldo).toBe(90);
    expect(leerCuenta("u1", "a2")?.saldo).toBe(60);
  });

  it("aplica tasaCambioDestino en transferencia entre monedas distintas", async () => {
    sembrarCuenta("u1", "a1", "USD", 100);
    sembrarCuenta("u1", "a2", "BS", 0);

    const resultado = await crearMovimiento(
      db,
      "u1",
      baseGasto({ type: "transferencia", category: "Transferencias", targetAccountId: "a2" }),
      { tasaCambioDestino: 2 }
    );

    expect(resultado.exito).toBe(true);
    expect(leerCuenta("u1", "a1")?.saldo).toBe(90);
    expect(leerCuenta("u1", "a2")?.saldo).toBe(20);
  });

  it("descuenta comisiones del saldo y registra su movimiento", async () => {
    sembrarCuenta("u1", "a1", "USD", 100);

    const resultado = await crearMovimiento(
      db,
      "u1",
      baseGasto({ amount: 10 }),
      {
        comisiones: [
          {
            amount: 2,
            currency: "USD",
            accountId: "a1",
            description: "Comisión del banco",
          },
        ],
      }
    );

    expect(resultado.exito).toBe(true);
    expect(leerCuenta("u1", "a1")?.saldo).toBe(88);
    const transacciones = leerTransacciones("u1");
    const comision = transacciones.find(t => t.category === "Comisiones");
    expect(comision).toBeDefined();
    expect(comision?.amount).toBe(2);
    expect(comision?.type).toBe("gasto");
  });

  it("setea el saldo al valor exacto con ajusteSaldo", async () => {
    sembrarCuenta("u1", "a1", "BS", 1000);

    const resultado = await crearMovimiento(
      db,
      "u1",
      {
        amount: 200,
        type: "ingreso",
        category: "Ajuste",
        description: "Ajuste manual de saldo",
        date: new Date("2026-08-20T12:00:00Z"),
        currency: "VES",
        originalAmount: 200,
        exchangeRate: 1,
        accountId: "a1",
      },
      { ajusteSaldo: { nuevoSaldo: 1200, monedaMovimiento: "VES" } }
    );

    expect(resultado.exito).toBe(true);
    expect(leerCuenta("u1", "a1")?.saldo).toBe(1200);
  });
});

describe("eliminarMovimiento", () => {
  beforeEach(() => {
    estado.clear();
    contadorIds = 0;
  });

  it("revierte el saldo y borra el documento", async () => {
    sembrarCuenta("u1", "a1", "USD", 100);
    const creado = await crearMovimiento(db, "u1", baseGasto());
    if (!creado.exito) throw new Error("Setup fallido");

    const resultado = await eliminarMovimiento(db, "u1", creado.id);

    expect(resultado.exito).toBe(true);
    expect(leerCuenta("u1", "a1")?.saldo).toBe(100);
    expect(estado.has(`transactions/${creado.id}`)).toBe(false);
  });

  it("devuelve error si la transacción no existe", async () => {
    const resultado = await eliminarMovimiento(db, "u1", "no-existe");

    expect(resultado.exito).toBe(false);
    expect(resultado).toEqual({ exito: false, error: "La transacción no existe" });
  });

  it("elimina la comisión hija del atajo y revierte su impacto junto al padre", async () => {
    sembrarCuenta("u1", "cta-bs", "BS", 740);

    // Par contable creado por el atajo: gasto 250 VES (canon USD) + comisión 10 VES
    estado.set("transactions/tx-padre", {
      userId: "u1",
      amount: 0.5,
      type: "gasto",
      category: "Comida",
      currency: "VES",
      originalAmount: 250,
      exchangeRate: 500,
      accountId: "cta-bs",
    });
    estado.set("transactions/com-hija", {
      userId: "u1",
      amount: 0.02,
      type: "gasto",
      category: "Comisiones",
      description: "Comisión",
      currency: "VES",
      originalAmount: 10,
      exchangeRate: 500,
      accountId: "cta-bs",
      transaccionAsociadaId: "tx-padre",
    });

    const resultado = await eliminarMovimiento(db, "u1", "tx-padre");

    expect(resultado.exito).toBe(true);
    // Revierte padre (250 BS) + comisión hija (10 BS): saldo vuelve a 1000
    expect(leerCuenta("u1", "cta-bs")?.saldo).toBe(1000);
    expect(estado.has("transactions/tx-padre")).toBe(false);
    expect(estado.has("transactions/com-hija")).toBe(false);
  });

  it("deja intactas otras transacciones sin vinculación al eliminado", async () => {
    sembrarCuenta("u1", "a1", "USD", 200);
    const creado = await crearMovimiento(db, "u1", baseGasto());
    if (!creado.exito) throw new Error("Setup falló");

    estado.set("transactions/otra-transaccion", {
      userId: "u1",
      amount: 50,
      type: "gasto",
      category: "Otra",
      currency: "USD",
      accountId: "a1",
      transaccionAsociadaId: "id-distinto",
    });

    await eliminarMovimiento(db, "u1", creado.id);

    expect(estado.has("transactions/otra-transaccion")).toBe(true);
  });
});

describe("actualizarMovimiento", () => {
  beforeEach(() => {
    estado.clear();
    contadorIds = 0;
  });

  it("revierte la cuenta anterior y aplica en la nueva al cambiar de cuenta", async () => {
    sembrarCuenta("u1", "a1", "USD", 100);
    sembrarCuenta("u1", "a2", "USD", 50);
    const creado = await crearMovimiento(db, "u1", baseGasto());
    if (!creado.exito) throw new Error("Setup fallido");
    expect(leerCuenta("u1", "a1")?.saldo).toBe(90);

    const resultado = await actualizarMovimiento(db, "u1", creado.id, {
      amount: 15,
      accountId: "a2",
    });

    expect(resultado.exito).toBe(true);
    expect(leerCuenta("u1", "a1")?.saldo).toBe(100);
    expect(leerCuenta("u1", "a2")?.saldo).toBe(35);
    const [trans] = leerTransacciones("u1");
    expect(trans.amount).toBe(15);
    expect(trans.accountId).toBe("a2");
  });

  it("revierte el destino anterior de una transferencia al cambiar de tipo", async () => {
    sembrarCuenta("u1", "a1", "USD", 100);
    sembrarCuenta("u1", "a2", "USD", 50);
    const creado = await crearMovimiento(
      db,
      "u1",
      baseGasto({ type: "transferencia", category: "Transferencias", targetAccountId: "a2" })
    );
    if (!creado.exito) throw new Error("Setup fallido");
    expect(leerCuenta("u1", "a2")?.saldo).toBe(60);

    // Convertir la transferencia en un gasto desde la cuenta origen
    const resultado = await actualizarMovimiento(db, "u1", creado.id, {
      type: "gasto",
      category: "Comida",
      targetAccountId: undefined,
    });

    expect(resultado.exito).toBe(true);
    // Origen: se revierte la transferencia (100) y se aplica el gasto (90)
    expect(leerCuenta("u1", "a1")?.saldo).toBe(90);
    // Destino: se revierte por completo (50)
    expect(leerCuenta("u1", "a2")?.saldo).toBe(50);
    const [trans] = leerTransacciones("u1");
    expect(trans.type).toBe("gasto");
    expect(trans.targetAccountId).toBeUndefined();
  });
});