import { z } from 'zod';

// ─── Límites de tamaño ──────────────────────────────────────────
const MAX_LONGITUD_MENSAJE = 2000;
const MAX_LONGITUD_CONTENIDO_HISTORIAL = 4000;
const MAX_LONGITUD_STRING_CONTEXTO = 200;
const MAX_ITEMS_POR_ARRAY = 100;
const MAX_PROFUNDIDAD_ANIDAMIENTO = 4;
const MAX_VALOR_NUMERICO = 1e15;

// ─── Sanitización defensiva ─────────────────────────────────────

/**
 * Recorta strings, acota arrays y limita la profundidad del contexto que
 * llega del cliente antes de inyectarlo en el prompt de Groq. Así se evita
 * abuso de tokens con contextos gigantes y se mitiga la inyección de
 * instrucciones con valores inflados.
 */
function sanitizarValor(valor: unknown, profundidad: number): unknown {
  if (typeof valor === 'string') {
    return valor.length > MAX_LONGITUD_STRING_CONTEXTO
      ? valor.slice(0, MAX_LONGITUD_STRING_CONTEXTO)
      : valor;
  }

  if (Array.isArray(valor)) {
    return valor
      .slice(0, MAX_ITEMS_POR_ARRAY)
      .map((item) => sanitizarValor(item, profundidad + 1));
  }

  if (valor !== null && typeof valor === 'object') {
    if (profundidad > MAX_PROFUNDIDAD_ANIDAMIENTO) return null;
    const resultado: Record<string, unknown> = {};
    for (const [clave, item] of Object.entries(
      valor as Record<string, unknown>
    )) {
      resultado[clave] = sanitizarValor(item, profundidad + 1);
    }
    return resultado;
  }

  if (typeof valor === 'number') {
    return Number.isFinite(valor) && Math.abs(valor) <= MAX_VALOR_NUMERICO
      ? valor
      : 0;
  }

  return valor;
}

// ─── Schemas del body de /api/chat ──────────────────────────────

export const mensajeHistorialSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().max(MAX_LONGITUD_CONTENIDO_HISTORIAL),
}).passthrough();

export const operacionPendienteSchema = z.object({
  campoFaltante: z.string().max(50).optional(),
}).passthrough();

const contextoUsuarioSchema = z
  .record(z.string(), z.unknown())
  .transform(
    (valor) => sanitizarValor(valor, 0) as Record<string, unknown>
  );

export const chatBodySchema = z.object({
  message: z.string().max(MAX_LONGITUD_MENSAJE).default(''),
  conversationHistory: z
    .array(mensajeHistorialSchema)
    .max(10)
    .default([]),
  userContext: contextoUsuarioSchema.default({}),
  operacionPendiente: operacionPendienteSchema.nullable().default(null),
});

export type ChatBody = z.infer<typeof chatBodySchema>;
export type MensajeChatValidado = z.infer<typeof mensajeHistorialSchema>;
