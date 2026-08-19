import 'server-only';
import { createHash, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { crearTransaccionFirestore } from '@/lib/firebaseAdmin';
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

/**
 * Compara el token recibido con SHORTCUTS_API_TOKEN en tiempo constante
 * (hash SHA-256 previo para igualar longitudes y evitar leaks por longitud).
 */
export function verificarTokenShortcut(token: string | null): boolean {
  const esperado = process.env.SHORTCUTS_API_TOKEN;
  if (!token || !esperado) return false;
  const recibido = createHash('sha256').update(token).digest();
  const correcto = createHash('sha256').update(esperado).digest();
  return timingSafeEqual(recibido, correcto);
}

// ─── Creación de la transacción ────────────────────────────────

/**
 * Crea la transacción en Firestore con el mismo modelo que usa el resto de la
 * app (userId, amount, type, category, description, date, currency, createdAt)
 * y devuelve el ID generado junto con la fecha final normalizada a ISO 8601.
 */
export async function crearTransaccionDesdeShortcut(
  datos: TransaccionShortcut,
  userId: string
): Promise<{ id: string; fecha: string }> {
  const fecha = datos.fecha ? new Date(datos.fecha) : createVenezuelaDate();

  const id = await crearTransaccionFirestore({
    userId,
    amount: Math.round(datos.monto * 100) / 100,
    type: datos.tipo,
    category: datos.categoria,
    description: datos.descripcion ?? '',
    date: fecha,
    currency: datos.currency,
    createdAt: new Date(),
  });

  return { id, fecha: fecha.toISOString() };
}