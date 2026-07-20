import { NextResponse, type NextRequest } from "next/server";
import {
  obtenerCookieSesion,
  verificarCookieSesion,
} from "@/lib/authCookie";
import { esPruebaExpirada } from "@/types/rbac";

const RUTAS_PROTEGIDAS = ["/dashboard"];
const RUTAS_ADMIN = ["/dashboard/admin"];
const RUTAS_AUTH = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieHeader = request.headers.get("cookie");
  const cookieVal = obtenerCookieSesion(cookieHeader);

  const esRutaProtegida = RUTAS_PROTEGIDAS.some((r) => pathname.startsWith(r));
  const esRutaAdmin = RUTAS_ADMIN.some((r) => pathname.startsWith(r));
  const esRutaAuth = RUTAS_AUTH.some((r) => pathname.startsWith(r));

  if (!cookieVal) {
    if (esRutaProtegida && !esRutaAuth) {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  const sesion = await verificarCookieSesion(cookieVal);
  if (!sesion) {
    if (esRutaProtegida) {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  if (esPruebaExpirada(sesion.role, sesion.trialExpiresAt)) {
    if (
      pathname.startsWith("/prueba-expirada") ||
      esRutaAuth
    ) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/prueba-expirada", request.url));
  }

  if (esRutaAdmin && sesion.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (esRutaAuth && sesion.role) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon|icon|apple-icon|manifest|\\.well-known|sw\\.js|workbox-).*)",
  ],
};
