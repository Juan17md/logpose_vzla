import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import {
  listarCategoriasFirestore,
  listarCuentasActivasFirestore,
} from '@/lib/firebaseAdmin';
import { verificarTokenShortcut } from '@/lib/shortcuts';
import { obtenerShortcutRateLimit } from '@/lib/rateLimit';

/**
 * ─────────────────────────────────────────────────────────────────────
 * 📱 ATAJOS DE iOS — Listado de cuentas disponibles
 * ─────────────────────────────────────────────────────────────────────
 * GET /api/shortcuts/accounts
 *
 * Devuelve las cuentas ACTIVAS y el catálogo de categorías (con sus
 * subcategorías) del dueño (SHORTCUTS_USER_ID) para que el atajo o el
 * simulador puedan elegir todo desde menús en lugar de tipear IDs o
 * adivinar categorías.
 *
 * Autenticación idéntica al endpoint de transacciones:
 *   Authorization: Bearer <SHORTCUTS_API_TOKEN>
 *
 * Respuestas:
 *   200 → { "success": true, "cuentas": [{ id, nombre, banco, moneda, saldo }] }
 *   401 → { "error": "Token no autorizado." }
 *   429 → { "error": "Demasiadas solicitudes..." }
 *   500 → { "error": "Error interno del servidor" }   (o no configurado)
 *
 * Solo lectura, limitada al propio usuario del token: no amplía la
 * superficie del token estático.
 * ─────────────────────────────────────────────────────────────────────
 */

export async function GET(request: NextRequest) {
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

    const { success } = await obtenerShortcutRateLimit().limit(userId);
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
        { status: 429 }
      );
    }

    const [cuentas, categorias] = await Promise.all([
      listarCuentasActivasFirestore(userId),
      listarCategoriasFirestore(userId),
    ]);

    return NextResponse.json({
      success: true,
      cuentas: cuentas.map((cuenta) => ({
        id: cuenta.id,
        nombre: cuenta.nombre,
        banco: cuenta.banco,
        moneda: cuenta.moneda,
        saldo: cuenta.saldo,
      })),
      categorias,
    });
  } catch (e) {
    console.error('Error en /api/shortcuts/accounts:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
