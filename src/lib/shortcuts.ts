import 'server-only';
import { createHash, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import {
  crearTransaccionFirestore,
  crearTransaccionConSaldoAtomico,
  ejecutarCommitAtomico,
  obtenerCuentaFirestore,
  type EscrituraAtomica,
} from '@/lib/firebaseAdmin';
import { convertirMontoParaCuenta, type MonedaSoportada } from '@/lib/bankAccounts';
import { getRates } from '@/lib/currency';
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
      z.enum(['ingreso', 'gasto', 'transferencia'], {
        error: 'El tipo debe ser "ingreso", "gasto" o "transferencia".',
      })
    ),
    categoria: z
      .string({ error: 'La categoría es obligatoria.' })
      .min(1, { error: 'La categoría es obligatoria.' })
      .max(50, { error: 'La categoría no puede superar 50 caracteres.' }),
    subcategoria: z
      .string()
      .max(50, { error: 'La subcategoría no puede superar 50 caracteres.' })
      .optional(),
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
    targetAccountId: z
      .string()
      .min(1, { error: 'El targetAccountId no puede estar vacío.' })
      .max(50, { error: 'El targetAccountId no puede superar 50 caracteres.' })
      .optional(),
    comision: z
      .number({ error: 'La comisión debe ser un número.' })
      .positive({ error: 'La comisión debe ser mayor que cero.' })
      .max(999_999_999, { error: 'La comisión es demasiado grande.' })
      .optional(),
  })
  .superRefine((datos, ctx) => {
    if (datos.tipo === 'transferencia') {
      if (datos.categoria !== 'Transferencias') {
        ctx.addIssue({
          code: 'custom',
          message:
            'Las transferencias usan siempre la categoría "Transferencias".',
        });
      }
      if (!datos.targetAccountId) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Una transferencia requiere el campo targetAccountId (cuenta destino).',
        });
      } else if (datos.accountId && datos.accountId === datos.targetAccountId) {
        ctx.addIssue({
          code: 'custom',
          message:
            'La cuenta origen y la cuenta destino deben ser distintas.',
        });
      }
      return;
    }

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
  const comision = datos.comision
    ? Math.round(datos.comision * 100) / 100
    : 0;

  if (datos.tipo === 'transferencia') {
    return crearTransferenciaDesdeShortcut(datos, userId, fecha, monto, comision);
  }

  // Datos base del documento — T8: accountId incluido si viene.
  const docData: Record<string, unknown> = {
    userId,
    amount: monto,
    type: datos.tipo,
    category: datos.categoria,
    description: datos.descripcion ?? '',
    date: fecha,
    currency: datos.currency,
    createdAt: new Date(),
  };
  if (datos.subcategoria) {
    docData.subcategory = datos.subcategoria;
  }

  const docComision = comision > 0 ? construirDocComision(datos, userId, fecha, comision) : null;

  if (!datos.accountId) {
    // Sin cuenta: registro sin impacto en saldo. Con comisión, ambos documentos
    // se crean en un solo commit para no dejar la contabilidad a medias.
    if (docComision) {
      const ids = await ejecutarCommitAtomico([
        { clase: 'doc', coleccion: 'transactions', datos: docData },
        { clase: 'doc', coleccion: 'transactions', datos: docComision },
      ]);
      return { id: ids[0], fecha: fecha.toISOString() };
    }
    const id = await crearTransaccionFirestore(docData);
    return { id, fecha: fecha.toISOString() };
  }

  // Validación anticipada: si la cuenta no existe, devolvemos un 400
  // descriptivo. El :commit también fallaría (precondición exists:true),
  // pero el error de la API REST sería críptico.
  const cuenta = await obtenerCuentaFirestore(userId, datos.accountId);
  if (!cuenta) {
    throw new ErrorCuentaShortcut(
      `La cuenta "${datos.accountId}" no existe para este usuario.`
    );
  }

  // T8: persistir accountId en el documento.
  docData.accountId = datos.accountId;

  // T10: conversión de moneda a la moneda de la cuenta bancaria.
  const monedaCuenta = ((cuenta.moneda as string) || 'USD') as MonedaSoportada;
  const rates = await getRates();
  const tasasEnBs: Record<string, number> = {
    USD: rates.usd,
    EUR: rates.eur,
    USDT: rates.usdt,
    BS: 1,
  };

  const montoEnMonedaCuenta = convertirMontoParaCuenta(
    monto,
    datos.currency,
    monedaCuenta,
    rates.usd,
    undefined,
    tasasEnBs
  );
  const montoDelta = Math.round(montoEnMonedaCuenta * 100) / 100;

  // Guardar tasa de cambio de referencia si hubo conversión o si la moneda es VES
  if (datos.currency === 'VES' || monedaCuenta !== datos.currency) {
    docData.exchangeRate = rates.usd;
  }

  // Comisión: se descuenta del mismo saldo y se registra como gasto
  // independiente categoría "Comisiones" (mismo modelo que movimientos.ts).
  if (docComision && comision > 0) {
    docComision.accountId = datos.accountId;
    if (datos.currency === 'VES' || monedaCuenta !== datos.currency) {
      docComision.exchangeRate = rates.usd;
    }
    const comisionEnMonedaCuenta = Math.round(
      convertirMontoParaCuenta(
        comision,
        datos.currency,
        monedaCuenta,
        rates.usd,
        undefined,
        tasasEnBs
      ) * 100
    ) / 100;
    const deltaTotal =
      (datos.tipo === 'gasto' ? -montoDelta : montoDelta) -
      comisionEnMonedaCuenta;

    const ids = await ejecutarCommitAtomico([
      { clase: 'doc', coleccion: 'transactions', datos: docData },
      { clase: 'doc', coleccion: 'transactions', datos: docComision },
      {
        clase: 'saldo',
        userId,
        accountId: datos.accountId,
        delta: deltaTotal,
      },
    ]);
    return { id: ids[0], fecha: fecha.toISOString() };
  }

  // T9: commit atómico — transacción + saldo en una sola escritura.
  // Si el :commit falla, ni la transacción ni el saldo se modifican.
  const delta = datos.tipo === 'gasto' ? -montoDelta : montoDelta;
  const id = await crearTransaccionConSaldoAtomico(
    docData,
    userId,
    datos.accountId,
    delta
  );
  return { id, fecha: fecha.toISOString() };
}

function construirDocComision(
  datos: TransaccionShortcut,
  userId: string,
  fecha: Date,
  comision: number
): Record<string, unknown> {
  return {
    userId,
    amount: comision,
    type: 'gasto',
    category: 'Comisiones',
    description: 'Comisión',
    date: fecha,
    currency: datos.currency,
    createdAt: new Date(),
  };
}

async function crearTransferenciaDesdeShortcut(
  datos: TransaccionShortcut,
  userId: string,
  fecha: Date,
  monto: number,
  comision: number
): Promise<{ id: string; fecha: string }> {
  const cuentaOrigenId = datos.accountId;
  const cuentaDestinoId = datos.targetAccountId;
  if (!cuentaOrigenId || !cuentaDestinoId) {
    throw new ErrorCuentaShortcut(
      "La transferencia requiere accountId (origen) y targetAccountId (destino)."
    );
  }

  const [origen, destino] = await Promise.all([
    obtenerCuentaFirestore(userId, cuentaOrigenId),
    obtenerCuentaFirestore(userId, cuentaDestinoId),
  ]);

  if (!origen) {
    throw new ErrorCuentaShortcut(
      `La cuenta origen "${cuentaOrigenId}" no existe para este usuario.`
    );
  }
  if (!destino) {
    throw new ErrorCuentaShortcut(
      `La cuenta destino "${cuentaDestinoId}" no existe para este usuario.`
    );
  }

  const rates = await getRates();
  const tasasEnBs: Record<string, number> = {
    USD: rates.usd,
    EUR: rates.eur,
    USDT: rates.usdt,
    BS: 1,
  };

  const monedaOrigen = ((origen.moneda as string) || 'USD') as MonedaSoportada;
  const monedaDestino = ((destino.moneda as string) || 'USD') as MonedaSoportada;

  const montoOrigen = Math.round(
    convertirMontoParaCuenta(monto, datos.currency, monedaOrigen, rates.usd, undefined, tasasEnBs) * 100
  ) / 100;
  const montoDestino = Math.round(
    convertirMontoParaCuenta(monto, datos.currency, monedaDestino, rates.usd, undefined, tasasEnBs) * 100
  ) / 100;
  const comisionOrigen = comision > 0
    ? Math.round(convertirMontoParaCuenta(comision, datos.currency, monedaOrigen, rates.usd, undefined, tasasEnBs) * 100) / 100
    : 0;

  const saldoOrigen = Number(origen.saldo ?? 0);
  if (saldoOrigen < montoOrigen + comisionOrigen) {
    throw new ErrorCuentaShortcut(
      `Saldo insuficiente en la cuenta origen "${(origen.nombre as string) || datos.accountId}" (saldo: ${saldoOrigen}, requerido: ${montoOrigen + comisionOrigen}).`
    );
  }

  const huboConversion =
    datos.currency === 'VES' ||
    monedaOrigen !== datos.currency ||
    monedaDestino !== datos.currency ||
    monedaOrigen !== monedaDestino;

  const docTransferencia: Record<string, unknown> = {
    userId,
    amount: monto,
    type: 'transferencia',
    category: 'Transferencias',
    description: datos.descripcion ?? '',
    date: fecha,
    currency: datos.currency,
    createdAt: new Date(),
    accountId: datos.accountId,
    targetAccountId: datos.targetAccountId,
  };
  if (datos.subcategoria) {
    docTransferencia.subcategory = datos.subcategoria;
  }
  if (huboConversion) {
    docTransferencia.exchangeRate = rates.usd;
  }

  const escrituras: EscrituraAtomica[] = [
    { clase: 'doc', coleccion: 'transactions', datos: docTransferencia },
    {
      clase: 'saldo',
      userId,
      accountId: cuentaOrigenId,
      delta: -(montoOrigen + comisionOrigen),
    },
    {
      clase: 'saldo',
      userId,
      accountId: cuentaDestinoId,
      delta: montoDestino,
    },
  ];

  if (comision > 0) {
    escrituras.push({
      clase: 'doc',
      coleccion: 'transactions',
      datos: construirDocComision(datos, userId, fecha, comision),
    });
  }

  const ids = await ejecutarCommitAtomico(escrituras);
  return { id: ids[0], fecha: fecha.toISOString() };
}