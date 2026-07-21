import { z } from "zod";

export const monedaSchema = z.enum(["VES", "USD", "EUR", "USDT", "BS"]);
export const tipoOperacionSchema = z.enum(["deposito", "retiro", "transferencia", "pago"]);
export const tipoCategoriaSchema = z.enum(["ingreso", "gasto", "ambas"]);
export const tipoDeudaSchema = z.enum(["por_cobrar", "por_pagar"]);
export const metodoAhorroSchema = z.enum(["physical", "usdt"]);

export const userDataSchema = z.object({
  monthlyBudget: z.number().min(0).optional(),
  monthlySalary: z.number().min(0).optional(),
  savingsPhysical: z.number().min(0).optional(),
  savingsUSDT: z.number().min(0).optional(),
});

export const categoriaSchema = z.object({
  nombre: z.string().min(1).max(50).trim(),
  tipo: z.enum(["ingreso", "gasto", "ambas"]),
  icono: z.string().min(1).max(50),
  subcategorias: z.array(z.string().min(1).max(50)).default([]),
  esPredeterminada: z.boolean().default(false),
  color: z.string().nullable().optional(),
});

export const cuentaBancariaSchema = z.object({
  nombre: z.string().min(1).max(50).trim(),
  banco: z.string().min(1).max(50).trim(),
  moneda: z.enum(["BS", "USD", "EUR", "USDT"]),
  saldo: z.number().min(0),
  color: z.string().min(1).max(20),
  activa: z.boolean().default(true),
});

export const transaccionCuentaSchema = z.object({
  cuentaOrigenId: z.string().min(1),
  cuentaDestinoId: z.string().nullable().optional(),
  tipo: tipoOperacionSchema,
  monto: z.number().positive(),
  moneda: z.enum(["BS", "USD", "EUR", "USDT"]),
  comision: z.number().min(0).nullable().optional(),
  tasaCambio: z.number().positive().nullable().optional(),
  descripcion: z.string().max(200).optional(),
});

export const deudaSchema = z.object({
  personName: z.string().min(1).max(100).trim(),
  type: tipoDeudaSchema,
  amount: z.number().positive(),
  description: z.string().max(500).optional(),
  dueDate: z.date().optional(),
  currency: z.enum(["USD", "VES", "EUR", "USDT"]).optional(),
  originalAmount: z.number().positive().optional(),
  exchangeRate: z.number().positive().optional(),
});

export const pagoSchema = z.object({
  amount: z.number().positive(),
  date: z.date(),
  note: z.string().max(200).optional(),
  currency: z.enum(["USD", "VES"]).optional(),
  originalAmount: z.number().positive().optional(),
  exchangeRate: z.number().positive().optional(),
});

export const gastoFijoSchema = z.object({
  title: z.string().min(1).max(100).trim(),
  amount: z.number().positive(),
  currency: z.enum(["USD", "BS"]),
  category: z.string().min(1),
  dueDay: z.number().int().min(1).max(31),
  description: z.string().max(500).optional(),
  lastPaidDate: z.date().optional(),
});

export const metaAhorroSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).default(0),
  deadline: z.date().nullable().optional(),
  color: z.string().min(1).max(20).default("#10b981"),
});

export const contribucionAhorroSchema = z.object({
  amount: z.number().positive(),
  method: metodoAhorroSchema,
  description: z.string().max(200).optional(),
});

export const itemListaSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  quantity: z.number().positive(),
  price: z.number().min(0),
});

export const listaComprasSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});