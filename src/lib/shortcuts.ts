import 'server-only';
import { createHash, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import {
  crearTransaccionFirestore,
  obtenerCuentaFirestore,
  incrementarSaldoCuenta,
} from '@/lib/firebaseAdmin';
import { createVenezuelaDate } from '@/lib/timezone';

// ─── Categorías permitidas ─────────────────────────────────────
// Mismas que inicializa la app al primer login (src/contexts/CategoriesContext.tsx).
const CATEGORIAS_GASTO = [
  'Comida',
  'Hogar',
  'Transporte',
  'Servicios',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Mascotas',
  'Regalos',
  'Ropa',
  'Seguros',
  'Belleza',
  'Deudas',
  'Inversiones',
  'Otra',
] as const;

const CATEGORIAS_INGRESO = ['Salario', 'Freelance'] as const;

const CATEGORIAS_POR_TIPO = {
  ingreso: CATEGORIAS_INGRESO,
  gasto: CATEGORIAS_GASTO,
} as const;

// ─── Esquema de validación ─────────────────────────────────────

export const transaccionShortcutSchema = z
  .object({
    monto: z.preprocess(
      (valor) =>
        typeof valor === 'string' && /^\d+(\.\d+)?$/.test(valor)
          ? Number(valor)
          : valor,
      z
        .number({ error: 'El monto debe ser un número.' })
        .positive({ error: 'El monto debe ser mayor que cero.' })
        .max(999_999_999, { error: 'El monto es demasiado grande.' })
    ),
    tipo: z.preprocess(
      (valor) => (typeof valor === 'string' ? valor.toLowerCase() : valor),
      z.enum(['ingreso', 'gasto'], {
        error: 'El tipo debe ser "ingreso" o "gasto".',
      })
    ),
    categoria: z
      .string({ error: 'La categoría es obligatoria.' })
      .min(1, { error: 'La categoría es obligatoria.' })
      .max(50, { error: 'La categoría no puede superar 50 caracteres.' }),
    descripcion: z
      .string()
      .max(200, { error: 'La descripción no puede superar 200 caracteres.' })
      .optional(),
    fecha: z
      .string()
      .refine((valor) => !Number.isNaN(Date.parse(valor)), {
        error: 'La fecha debe ser válida en formato ISO 8601 (ej. 2026-08-18T14:30:00-04:00).',
      })
      .optional(),
    currency: z
      .enum(['USD', 'VES'], {
        error: 'La moneda debe ser "USD" o "VES".',
      })
      .default('USD'),
    accountId: z
      .string()
      .min(1, { error: 'El accountId no puede estar vacío.' })
      .max(50, { error: 'El accountId no puede superar 50 caracteres.' })
      .optional(),
  })
  .superRefine((datos, ctx) => {
    const categorias = CATEGORIAS_POR_TIPO[datos.tipo];
    if (!(categorias as readonly string[]).includes(datos.categoria)) {
      ctx.addIssue({
        code: 'custom',
        message: `La categoría "${datos.categoria}" no es válida para un ${datos.tipo}. Categorías de ${datos.tipo} permitidas: ${categorias.join(', ')}.`,
      });
    }
  });

export type TransaccionShortcut = z.infer<typeof transaccionShortcutSchema>;

// ─── Autenticación con token estático ──────────────────────────

export type ResultadoVerificacionToken =
  | { estado: 'no_config' }
  | { estado: 'invalid' }
  | { estado: 'valid' };

/**
 * Compara el token recibido con SHORTCUTS_API_TOKEN en tiempo constante
 * (hash SHA-256 previo para igualar longitudes y evitar leaks por longitud).
 * Centraliza la validación: distingue entre "el endpoint no está configurado"
 * (500) y "el token es inválido" (401).
 */
export function verificarTokenShortcut(
  token: string | null
): ResultadoVerificacionToken {
  const esperado = process.env.SHORTCUTS_API_TOKEN;
  if (!esperado) return { estado: 'no_config' };
  if (!token) return { estado: 'invalid' };
  const recibido = createHash('sha256').update(token).digest();
  const correcto = createHash('sha256').update(esperado).digest();
  return timingSafeEqual(recibido, correcto)
    ? { estado: 'valid' }
    : { estado: 'invalid' };
}

// ─── Creación de la transacción ────────────────────────────────

/** Error cuando el accountId enviado no corresponde a una cuenta del usuario. */
export class ErrorCuentaShortcut extends Error {}

/**
 * Crea la transacción en Firestore con el mismo modelo que usa el resto de la
 * app (userId, amount, type, category, description, date, currency, createdAt)
 * y devuelve el ID generado junto con la fecha final normalizada a ISO 8601.
 *
 * Si se envía `accountId`, valida que la cuenta exista (400 si no) y actualiza
 * su saldo con un increment atómico server-side (gasto resta, ingreso suma),
 * replicando el comportamiento de `TransactionsContext.addTransaction`. Si no
 * se envía, la transacción queda como registro sin cuenta (saldo intacto).
 */
export async function crearTransaccionDesdeShortcut(
  datos: TransaccionShortcut,
  userId: string
): Promise<{ id: string; fecha: string }> {
  const fecha = datos.fecha ? new Date(datos.fecha) : createVenezuelaDate();
  const monto = Math.round(datos.monto * 100) / 100;

  if (datos.accountId) {
    const cuenta = await obtenerCuentaFirestore(userId, datos.accountId);
    if (!cuenta) {
      throw new ErrorCuentaShortcut(
        `La cuenta "${datos.accountId}" no existe para este usuario.`
      );
    }
  }

  const id = await crearTransaccionFirestore({
    userId,
    amount: monto,
    type: datos.tipo,
    category: datos.categoria,
    description: datos.descripcion ?? '',
    date: fecha,
    currency: datos.currency,
    createdAt: new Date(),
  });

  if (datos.accountId) {
    const delta = datos.tipo === 'gasto' ? -monto : monto;
    await incrementarSaldoCuenta(userId, datos.accountId, delta);
  }

  return { id, fecha: fecha.toISOString() };
}