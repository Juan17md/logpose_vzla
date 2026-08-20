import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  crearCookieSesion,
  verificarCookieSesion,
  obtenerCookieSesion,
} from "@/lib/authCookie"

vi.mock("server-only", () => ({}))

const SECRETO = "secreto-de-prueba-que-supera-16-caracteres"

function base64UrlEncode(buf: Uint8Array): string {
  return Buffer.from(buf).toString("base64url")
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8")
}

async function fabricarCookie(payload: Record<string, unknown>): Promise<string> {
  const encoder = new TextEncoder()
  const payloadBase64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)))
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRETO),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadBase64))
  return `${payloadBase64}.${base64UrlEncode(new Uint8Array(sig))}`
}

beforeEach(() => {
  vi.stubEnv("COOKIE_SECRET", SECRETO)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("authCookie (expiración interna)", () => {
  it("crea una cookie que se verifica correctamente", async () => {
    const cookie = await crearCookieSesion({ uid: "uid-1", role: "usuario" })
    const sesion = await verificarCookieSesion(cookie)
    expect(sesion).not.toBeNull()
    expect(sesion?.uid).toBe("uid-1")
    expect(sesion?.role).toBe("usuario")
    expect(typeof sesion?.iat).toBe("number")
  })

  it("incluye el iat en el payload de la cookie", async () => {
    const antes = Math.floor(Date.now() / 1000)
    const cookie = await crearCookieSesion({ uid: "uid-1", role: "usuario" })
    const despues = Math.floor(Date.now() / 1000)
    const payload = JSON.parse(base64UrlDecode(cookie.split(".")[0]))
    expect(payload.iat).toBeGreaterThanOrEqual(antes)
    expect(payload.iat).toBeLessThanOrEqual(despues)
  })

  it("rechaza una cookie sin iat en el payload", async () => {
    const cookie = await fabricarCookie({ uid: "uid-1", role: "usuario" })
    expect(await verificarCookieSesion(cookie)).toBeNull()
  })

  it("rechaza una cookie expirada (iat hace más de 7 días)", async () => {
    const iatViejo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 8
    const cookie = await fabricarCookie({ uid: "uid-1", role: "usuario", iat: iatViejo })
    expect(await verificarCookieSesion(cookie)).toBeNull()
  })

  it("acepta una cookie emitida hace menos de 7 días", async () => {
    const iatMedio = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 6
    const cookie = await fabricarCookie({ uid: "uid-1", role: "usuario", iat: iatMedio })
    const sesion = await verificarCookieSesion(cookie)
    expect(sesion?.uid).toBe("uid-1")
  })

  it("rechaza una cookie con iat en el futuro (desviación de reloj > 60s)", async () => {
    const iatFuturo = Math.floor(Date.now() / 1000) + 3600
    const cookie = await fabricarCookie({ uid: "uid-1", role: "usuario", iat: iatFuturo })
    expect(await verificarCookieSesion(cookie)).toBeNull()
  })

  it("rechaza una cookie manipulada", async () => {
    const cookie = await crearCookieSesion({ uid: "uid-1", role: "usuario" })
    const cookieManipulada = cookie.slice(0, -5) + "AAAAA"
    expect(await verificarCookieSesion(cookieManipulada)).toBeNull()
  })

  it("rechaza una cookie con formato inválido", async () => {
    expect(await verificarCookieSesion("sin-puntos")).toBeNull()
    expect(await verificarCookieSesion("")).toBeNull()
  })

  it("rechaza una cookie con iat no numérico", async () => {
    const cookie = await fabricarCookie({ uid: "uid-1", role: "usuario", iat: "ayer" })
    expect(await verificarCookieSesion(cookie)).toBeNull()
  })

  it("obtenerCookieSesion extrae la cookie del header", () => {
    const header = "otra=1; session=cookie-valor; algo=2"
    expect(obtenerCookieSesion(header)).toBe("cookie-valor")
    expect(obtenerCookieSesion("sin-cookie")).toBeNull()
    expect(obtenerCookieSesion(null)).toBeNull()
  })
})