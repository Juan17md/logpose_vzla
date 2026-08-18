import 'server-only';
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { obtenerLoginRateLimit } from "@/lib/rateLimit";
import { crearCustomToken } from "@/lib/customToken";

const credencialesSchema = z.object({
  email: z.string().email("Correo electrónico inválido").max(254),
  password: z.string().min(1, "La contraseña es obligatoria").max(1024),
});

const ERRORES_FIREBASE = {
  INVALID_LOGIN_CREDENTIALS: { status: 401, mensaje: "Credenciales incorrectas." },
  INVALID_EMAIL: { status: 400, mensaje: "El correo electrónico no es válido." },
  INVALID_PASSWORD: { status: 401, mensaje: "Credenciales incorrectas." },
  USER_DISABLED: { status: 403, mensaje: "Esta cuenta está deshabilitada." },
  EMAIL_NOT_FOUND: { status: 401, mensaje: "Credenciales incorrectas." },
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = credencialesSchema.safeParse(body);
    if (!parsed.success) {
      const primerError = parsed.error.issues[0]?.message ?? "Datos inválidos.";
      return NextResponse.json({ error: primerError }, { status: 400 });
    }

    const emailNormalizado = parsed.data.email.toLowerCase();
    const { success } = await obtenerLoginRateLimit().limit(emailNormalizado);
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo en un minuto.' },
        { status: 429 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailNormalizado,
          password: parsed.data.password,
          returnSecureToken: true,
        }),
      }
    );

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      const codigo = data?.error?.message ?? "";
      const config = ERRORES_FIREBASE[codigo as keyof typeof ERRORES_FIREBASE];
      return NextResponse.json(
        { error: config?.mensaje ?? "Ocurrió un error al iniciar sesión." },
        { status: config?.status ?? 500 }
      );
    }

    const data = (await res.json()) as { localId?: string };
    if (!data.localId) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    const customToken = await crearCustomToken(data.localId);

    return NextResponse.json({ customToken });
  } catch (e) {
    console.error("Error en login:", e);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
