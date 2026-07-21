import 'server-only';
import { type DatosSesion } from "@/types/rbac";

const NOMBRE_COOKIE = "session";
const MAX_AGE_SEGUNDOS = 60 * 60 * 24 * 7;

function obtenerSecreto(): string {
  const secreto = process.env.COOKIE_SECRET;
  if (!secreto || secreto.length < 16) {
    throw new Error(
      "COOKIE_SECRET debe tener al menos 16 caracteres en .env.local"
    );
  }
  return secreto;
}

function base64UrlEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function hmacSign(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(obtenerSecreto()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(sig));
}

async function hmacVerify(
  payload: string,
  signatureBase64: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(obtenerSecreto()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = base64UrlDecode(signatureBase64);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as ArrayBuffer,
      encoder.encode(payload)
    );
  } catch {
    return false;
  }
}

export async function crearCookieSesion(
  data: DatosSesion
): Promise<string> {
  const payload = JSON.stringify(data);
  const payloadBase64 = base64UrlEncode(new TextEncoder().encode(payload));
  const sig = await hmacSign(payloadBase64);
  return `${payloadBase64}.${sig}`;
}

export async function verificarCookieSesion(
  cookieValue: string
): Promise<DatosSesion | null> {
  try {
    const partes = cookieValue.split(".");
    if (partes.length !== 2) return null;

    const [payloadBase64, sig] = partes;
    const valido = await hmacVerify(payloadBase64, sig);
    if (!valido) return null;

    const json = new TextDecoder().decode(base64UrlDecode(payloadBase64));
    return JSON.parse(json) as DatosSesion;
  } catch {
    return null;
  }
}

export function configCookie(): {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    name: NOMBRE_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEGUNDOS,
  };
}

export function obtenerCookieSesion(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${NOMBRE_COOKIE}=`));
  if (!match) return null;
  return match.slice(NOMBRE_COOKIE.length + 1);
}
