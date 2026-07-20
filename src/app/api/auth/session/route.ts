import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verificarTokenFirebase } from "@/lib/verificarAuthFirebase";
import { crearCookieSesion, configCookie } from "@/lib/authCookie";
import { esPrueba } from "@/types/rbac";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const info = await verificarTokenFirebase(idToken);
    if (!info) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const docSnap = await adminDb.collection("users").doc(info.uid).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const userData = docSnap.data()!;
    const role = userData.role || "usuario";
    const status = userData.status || "active";
    const trialExpiresAt = esPrueba(role)
      ? userData.trialExpiresAt?.toMillis() ?? null
      : null;

    const sessionData = {
      uid: info.uid,
      role,
      status,
      trialExpiresAt,
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
  } catch {
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
