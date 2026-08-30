import 'server-only';
import { NextRequest, NextResponse } from "next/server";
import { leerUsuario } from "@/lib/firebaseAdmin";
import { verificarTokenFirebase } from "@/lib/verificarAuthFirebase";
import { crearCookieSesion, configCookie } from "@/lib/authCookie";
import { obtenerAuthRateLimit } from "@/lib/rateLimit";
import type { Role } from "@/types/rbac";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = await obtenerAuthRateLimit().limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo en un minuto.' },
        { status: 429 }
      );
    }

    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const info = await verificarTokenFirebase(idToken);
    if (!info) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const userData = await leerUsuario(info.uid);
    const role = (userData?.role as Role) || "usuario";

    const sessionData = {
      uid: info.uid,
      role,
    };

    const cookieValue = await crearCookieSesion(sessionData);
    const cfg = configCookie();

    const response = NextResponse.json({ exito: true });
    response.cookies.set(cfg.name, cookieValue, {
      httpOnly: cfg.httpOnly,
      secure: cfg.secure,
      sameSite: cfg.sameSite,
      path: cfg.path,
      maxAge: cfg.maxAge,
    });

    return response;
  } catch (e) {
    console.error("Error en sesión:", e);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cfg = configCookie();
  const response = NextResponse.json({ exito: true });
  response.cookies.set(cfg.name, "", {
    httpOnly: cfg.httpOnly,
    secure: cfg.secure,
    sameSite: cfg.sameSite,
    path: cfg.path,
    maxAge: 0,
  });
  return response;
}
