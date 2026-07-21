import { describe, it, expect } from 'vitest';
import {
  userDataSchema, categoriaSchema, cuentaBancariaSchema,
  transaccionCuentaSchema, deudaSchema, pagoSchema,
  gastoFijoSchema, metaAhorroSchema, contribucionAhorroSchema,
  itemListaSchema, listaComprasSchema,
} from '../schemas';

describe('userDataSchema', () => {
  it('acepta datos parciales válidos', () => {
    expect(userDataSchema.safeParse({ monthlyBudget: 500 }).success).toBe(true);
  });

  it('acepta datos completos válidos', () => {
    const data = { monthlyBudget: 500, monthlySalary: 1000, savingsPhysical: 200, savingsUSDT: 100 };
    expect(userDataSchema.safeParse(data).success).toBe(true);
  });

  it('rechaza montos negativos', () => {
    expect(userDataSchema.safeParse({ monthlyBudget: -1 }).success).toBe(false);
  });

  it('rechaza strings en lugar de números', () => {
    expect(userDataSchema.safeParse({ monthlyBudget: "500" }).success).toBe(false);
  });
});

describe('categoriaSchema', () => {
  it('acepta categoría válida', () => {
    const data = { nombre: "Comida", tipo: "gasto", icono: "FiCoffee", subcategorias: ["Mercado"] };
    expect(categoriaSchema.safeParse(data).success).toBe(true);
  });

  it('rechaza nombre vacío', () => {
    expect(categoriaSchema.safeParse({ nombre: "", tipo: "gasto", icono: "FiCoffee" }).success).toBe(false);
  });

  it('rechaza tipo inválido', () => {
    expect(categoriaSchema.safeParse({ nombre: "Test", tipo: "invalido", icono: "FiCoffee" }).success).toBe(false);
  });

  it('asigna esPredeterminada por defecto', () => {
    const result = categoriaSchema.parse({ nombre: "Test", tipo: "ingreso", icono: "FiCoffee" });
    expect(result.esPredeterminada).toBe(false);
  });

  it('aplica trim al nombre', () => {
    const result = categoriaSchema.parse({ nombre: "  Test  ", tipo: "ingreso", icono: "FiCoffee" });
    expect(result.nombre).toBe("Test");
  });
});

describe('cuentaBancariaSchema', () => {
  it('acepta cuenta válida', () => {
    const data = { nombre: "Principal", banco: "Mercantil", moneda: "USD", saldo: 500, color: "#10b981" };
    expect(cuentaBancariaSchema.safeParse(data).success).toBe(true);
  });

  it('rechaza moneda no soportada', () => {
    const data = { nombre: "Test", banco: "Test", moneda: "GBP", saldo: 100, color: "#fff" };
    expect(cuentaBancariaSchema.safeParse(data).success).toBe(false);
  });

  it('rechaza saldo negativo', () => {
    const data = { nombre: "Test", banco: "Test", moneda: "USD", saldo: -10, color: "#fff" };
    expect(cuentaBancariaSchema.safeParse(data).success).toBe(false);
  });

  it('asigna activa por defecto', () => {
    const data = { nombre: "Test", banco: "Test", moneda: "USD", saldo: 100, color: "#fff" };
    expect(cuentaBancariaSchema.parse(data).activa).toBe(true);
  });
});

describe('transaccionCuentaSchema', () => {
  it('acepta transacción válida', () => {
    const data = { cuentaOrigenId: "abc", tipo: "deposito", monto: 100, moneda: "USD" };
    expect(transaccionCuentaSchema.safeParse(data).success).toBe(true);
  });

  it('acepta transferencia con destino', () => {
    const data = { cuentaOrigenId: "abc", cuentaDestinoId: "def", tipo: "transferencia", monto: 100, moneda: "USD", comision: 0, tasaCambio: 1 };
    expect(transaccionCuentaSchema.safeParse(data).success).toBe(true);
  });

  it('rechaza monto cero', () => {
    const data = { cuentaOrigenId: "abc", tipo: "deposito", monto: 0, moneda: "USD" };
    expect(transaccionCuentaSchema.safeParse(data).success).toBe(false);
  });

  it('rechaza tipo inválido', () => {
    const data = { cuentaOrigenId: "abc", tipo: "invalido", monto: 100, moneda: "USD" };
    expect(transaccionCuentaSchema.safeParse(data).success).toBe(false);
  });

  it('rechaza comisión negativa', () => {
    const data = { cuentaOrigenId: "abc", tipo: "transferencia", monto: 100, moneda: "USD", comision: -5 };
    expect(transaccionCuentaSchema.safeParse(data).success).toBe(false);
  });
});

describe('deudaSchema', () => {
  it('acepta deuda válida', () => {
    const data = { personName: "Juan", type: "por_cobrar", amount: 500 };
    expect(deudaSchema.safeParse(data).success).toBe(true);
  });

  it('acepta deuda con moneda y fecha', () => {
    const data = { personName: "Juan", type: "por_pagar", amount: 500, currency: "USD", dueDate: new Date() };
    expect(deudaSchema.safeParse(data).success).toBe(true);
  });

  it('rechaza monto negativo', () => {
    const data = { personName: "Juan", type: "por_cobrar", amount: -10 };
    expect(deudaSchema.safeParse(data).success).toBe(false);
  });

  it('rechaza type inválido', () => {
    const data = { personName: "Juan", type: "invalido", amount: 100 };
    expect(deudaSchema.safeParse(data).success).toBe(false);
  });

  it('rechaza nombre vacío', () => {
    const data = { personName: "", type: "por_cobrar", amount: 100 };
    expect(deudaSchema.safeParse(data).success).toBe(false);
  });
});

describe('pagoSchema', () => {
  it('acepta pago válido', () => {
    const data = { amount: 100, date: new Date() };
    expect(pagoSchema.safeParse(data).success).toBe(true);
  });

  it('acepta pago con nota y moneda', () => {
    const data = { amount: 100, date: new Date(), note: "Pago parcial", currency: "USD" };
    expect(pagoSchema.safeParse(data).success).toBe(true);
  });

  it('rechaza monto cero', () => {
    const data = { amount: 0, date: new Date() };
    expect(pagoSchema.safeParse(data).success).toBe(false);
  });

  it('rechaza sin fecha', () => {
    const data = { amount: 100 };
    expect(pagoSchema.safeParse(data).success).toBe(false);
  });
});

describe('gastoFijoSchema', () => {
  it('acepta gasto fijo válido', () => {
    const data = { title: "Internet", amount: 30, currency: "USD", category: "Servicios", dueDay: 15 };
    expect(gastoFijoSchema.safeParse(data).success).toBe(true);
  });

  it('rechaza dueDay fuera de rango', () => {
    expect(gastoFijoSchema.safeParse({ title: "Test", amount: 100, currency: "USD", category: "Test", dueDay: 0 }).success).toBe(false);
    expect(gastoFijoSchema.safeParse({ title: "Test", amount: 100, currency: "USD", category: "Test", dueDay: 32 }).success).toBe(false);
  });

  it('rechaza moneda inválida', () => {
    const data = { title: "Test", amount: 100, currency: "EUR", category: "Test", dueDay: 15 };
    expect(gastoFijoSchema.safeParse(data).success).toBe(false);
  });

  it('rechaza amount no positivo', () => {
    const data = { title: "Test", amount: 0, currency: "USD", category: "Test", dueDay: 15 };
    expect(gastoFijoSchema.safeParse(data).success).toBe(false);
  });
});

describe('metaAhorroSchema', () => {
  it('acepta meta válida', () => {
    const data = { name: "Viaje", targetAmount: 1000 };
    expect(metaAhorroSchema.safeParse(data).success).toBe(true);
  });

  it('asigna valores por defecto', () => {
    const result = metaAhorroSchema.parse({ name: "Test", targetAmount: 500 });
    expect(result.currentAmount).toBe(0);
    expect(result.color).toBe("#10b981");
  });

  it('rechaza targetAmount cero', () => {
    expect(metaAhorroSchema.safeParse({ name: "Test", targetAmount: 0 }).success).toBe(false);
  });

  it('acepta color personalizado', () => {
    const result = metaAhorroSchema.parse({ name: "Test", targetAmount: 500, color: "#ef4444" });
    expect(result.color).toBe("#ef4444");
  });
});

describe('contribucionAhorroSchema', () => {
  it('acepta contribución válida', () => {
    const data = { amount: 100, method: "physical" };
    expect(contribucionAhorroSchema.safeParse(data).success).toBe(true);
  });

  it('rechaza method inválido', () => {
    const data = { amount: 100, method: "tarjeta" };
    expect(contribucionAhorroSchema.safeParse(data).success).toBe(false);
  });
});

describe('itemListaSchema', () => {
  it('acepta item válido', () => {
    const data = { name: "Leche", quantity: 2, price: 1.5 };
    expect(itemListaSchema.safeParse(data).success).toBe(true);
  });

  it('rechaza cantidad cero', () => {
    const data = { name: "Leche", quantity: 0, price: 1.5 };
    expect(itemListaSchema.safeParse(data).success).toBe(false);
  });

  it('rechaza precio negativo', () => {
    const data = { name: "Leche", quantity: 1, price: -1 };
    expect(itemListaSchema.safeParse(data).success).toBe(false);
  });
});

describe('listaComprasSchema', () => {
  it('acepta nombre válido', () => {
    expect(listaComprasSchema.safeParse({ name: "Mercado Semanal" }).success).toBe(true);
  });

  it('rechaza nombre vacío', () => {
    expect(listaComprasSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it('aplica trim al nombre', () => {
    const result = listaComprasSchema.parse({ name: "  Mi Lista  " });
    expect(result.name).toBe("Mi Lista");
  });
});
