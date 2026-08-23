import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import {
  crearTransaccionDesdeShortcut,
  ErrorCuentaShortcut,
  ErrorValidacionShortcut,
  transaccionShortcutSchema,
  verificarTokenShortcut,
} from '@/lib/shortcuts';
import { obtenerShortcutRateLimit } from '@/lib/rateLimit';

/**
 * ─────────────────────────────────────────────────────────────────────
 * 📱 AT AJOS DE iOS — Registro rápido de transacciones
 * ─────────────────────────────────────────────────────────────────────
 * POST /api/shortcuts/transaction
 *
 * Permite registrar un ingreso o gasto desde la app Atajos (Shortcuts) de
 * iOS sin pasar por la interfaz web. Se autentica con un token estático
 * (header `Authorization: Bearer <token>`) que identifica al dueño de la
 * cuenta configurado en `SHORTCUTS_USER_ID`.
 *
 * Body (JSON):
 *   monto:       number        (obligatorio, positivo)
 *   tipo:        "ingreso" | "gasto"   (obligatorio)
 *   categoria:   string        (obligatorio; ver lista permitida abajo)
 *   descripcion: string        (opcional, máx. 200 caracteres)
 *   fecha:       string        (opcional, ISO 8601; default: ahora)
 *   currency:    "USD" | "VES" (opcional, default: "USD")
 *   accountId:   string        (opcional; ID de una cuenta del usuario)
 *
 * Categorías permitidas:
 *   ingreso → Salario, Freelance
 *   gasto   → Comida, Hogar, Transporte, Servicios, Salud, Educación,
 *             Entretenimiento, Mascotas, Regalos, Ropa, Seguros, Belleza,
 *             Deudas, Inversiones, Otra
 *
 * Nota sobre accountId: si se envía, la transacción se asocia a la cuenta y
 * su saldo se actualiza atómicamente (gasto resta, ingreso suma), igual que
 * al registrar desde la app. Si no se envía, la transacción queda como
 * registro sin cuenta (el saldo de ninguna cuenta se modifica).
 *
 * Configuración (.env / Vercel):
 *   SHORTCUTS_API_TOKEN=<token generado con: openssl rand -hex 32>
 *   SHORTCUTS_USER_ID=<UID de Firebase del dueño de la cuenta>
 *
 * Nota sobre CORS: la app Atajos de iOS usa URLSession (no un navegador),
 * por lo que NO está sujeta a CORS y no requiere cabeceras adicionales.
 * El endpoint no expone cabeceras CORS a propósito: eso impide que un
 * navegador web pueda consumirlo, lo que limita el alcance del token.
 *
 * Ejemplo de prueba (curl):
 *   curl -X POST https://logpose-vzla.vercel.app/api/shortcuts/transaction \
 *     -H "Authorization: Bearer $SHORTCUTS_API_TOKEN" \
 *     -H "Content-Type: application/json" \
 *     -d '{"monto": 2500, "tipo": "gasto", "categoria": "Comida",
 *          "descripcion": "Almuerzo con amigos", "currency": "VES"}'
 *
 * Respuestas:
 *   200 → { "success": true, "transaccion": { id, monto, tipo, ... } }
 *   400 → { "error": "<mensaje descriptivo>" }        (body inválido o cuenta inexistente)
 *   401 → { "error": "Token no autorizado." }
 *   429 → { "error": "Demasiadas solicitudes..." }
 *   500 → { "error": "Error interno del servidor" }   (o no configurado)
 * ─────────────────────────────────────────────────────────────────────
 */

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    const verificacion = verificarTokenShortcut(token);
    if (verificacion.estado === 'no_config') {
      return NextResponse.json(
        { error: 'El endpoint no está configurado (falta SHORTCUTS_API_TOKEN).' },
        { status: 500 }
      );
    }
    if (verificacion.estado === 'invalid') {
      return NextResponse.json({ error: 'Token no autorizado.' }, { status: 401 });
    }

    const userId = process.env.SHORTCUTS_USER_ID;
    if (!userId) {
      return NextResponse.json(
        { error: 'El endpoint no está configurado (falta SHORTCUTS_USER_ID).' },
        { status: 500 }
      );
    }

    // Clave del rate limit por usuario (no global): un token comprometido no
    // puede agotar la cuota de los demás usuarios del endpoint.
    const { success } = await obtenerShortcutRateLimit().limit(userId);
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = transaccionShortcutSchema.safeParse(body);
    if (!parsed.success) {
      const primerError =
        parsed.error.issues[0]?.message ?? 'Datos inválidos.';
      return NextResponse.json({ error: primerError }, { status: 400 });
    }

    const { id, fecha } = await crearTransaccionDesdeShortcut(
      parsed.data,
      userId
    );

    return NextResponse.json({
      success: true,
      transaccion: {
        id,
        monto: parsed.data.monto,
        tipo: parsed.data.tipo,
        categoria: parsed.data.categoria,
        ...(parsed.data.subcategoria ? { subcategoria: parsed.data.subcategoria } : {}),
        descripcion: parsed.data.descripcion ?? '',
        fecha,
        currency: parsed.data.currency,
        ...(parsed.data.accountId ? { accountId: parsed.data.accountId } : {}),
      },
    });
  } catch (e) {
    if (
      e instanceof ErrorCuentaShortcut ||
      e instanceof ErrorValidacionShortcut
    ) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('Error en /api/shortcuts/transaction:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}