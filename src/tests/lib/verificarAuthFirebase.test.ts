import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { generateKeyPairSync, createSign } from "node:crypto"
import forge from "node-forge"
import { verificarTokenFirebase, resetearCacheClavesPublicas } from "@/lib/verificarAuthFirebase"

vi.mock("server-only", () => ({}))

const PROJECT_ID = "control-gastos-74a5a"
const EMISOR = `https://securetoken.google.com/${PROJECT_ID}`
const KID = "test-key-1"

let clavePrivadaPem: string
let clavePublicaPem: string

vi.stubGlobal("fetch", vi.fn())

function generarParClaves(): void {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
  clavePrivadaPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString()
  clavePublicaPem = generarCertificado(
    privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey.export({ type: "spki", format: "pem" }).toString()
  )
}

function generarCertificado(clavePrivada: string, clavePublica: string): string {
  const pki = forge.pki
  const cert = pki.createCertificate()
  cert.publicKey = pki.publicKeyFromPem(clavePublica)
  cert.serialNumber = "01"
  cert.validity.notBefore = new Date(Date.now() - 86400000)
  cert.validity.notAfter = new Date(Date.now() + 86400000 * 365)
  const attrs = [{ name: "commonName", value: "securetoken@system.gserviceaccount.com" }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(pki.privateKeyFromPem(clavePrivada))
  return pki.certificateToPem(cert)
}

function generarCertificadoOtraClave(): string {
  const otroPar = generateKeyPairSync("rsa", { modulusLength: 2048 })
  return generarCertificado(
    otroPar.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    otroPar.publicKey.export({ type: "spki", format: "pem" }).toString()
  )
}

function base64url(texto: string): string {
  return Buffer.from(texto).toString("base64url")
}

interface OpcionesFirma {
  expirado?: boolean
  issuer?: string
  audience?: string
  kid?: string
}

function firmarToken(
  payload: Record<string, unknown>,
  opciones: OpcionesFirma = {},
  clavePem: string = clavePrivadaPem
): string {
  const ahora = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", kid: opciones.kid ?? KID, typ: "JWT" }
  const claims = {
    ...payload,
    iat: ahora,
    iss: opciones.issuer ?? EMISOR,
    aud: opciones.audience ?? PROJECT_ID,
    exp: ahora + (opciones.expirado ? -3600 : 3600),
  }
  const input = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`
  const firma = createSign("RSA-SHA256").update(input).sign(clavePem, "base64url").toString()
  return `${input}.${firma}`
}

function mockearClaves(mapa: Record<string, string> = { [KID]: clavePublicaPem }): void {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ "cache-control": "max-age=3600" }),
    json: async () => mapa,
  } as Response)
}

beforeEach(() => {
  resetearCacheClavesPublicas()
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", PROJECT_ID)
  vi.mocked(fetch).mockReset()
  generarParClaves()
  mockearClaves()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("verificarTokenFirebase (verificación criptográfica con jose)", () => {
  it("devuelve null si no hay PROJECT_ID configurado", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "")
    expect(await verificarTokenFirebase("token")).toBeNull()
  })

  it("devuelve null si el token está vacío y no llama a fetch", async () => {
    expect(await verificarTokenFirebase("  ")).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("devuelve null si el token no es un JWT", async () => {
    expect(await verificarTokenFirebase("no-es-un-jwt")).toBeNull()
  })

  it("devuelve { uid, email } para un token válido", async () => {
    const token = firmarToken({ sub: "uid-123", email: "juan@example.com" })
    expect(await verificarTokenFirebase(token)).toEqual({ uid: "uid-123", email: "juan@example.com" })
  })

  it("devuelve { uid } sin email si el token no lo incluye", async () => {
    const token = firmarToken({ sub: "uid-456" })
    expect(await verificarTokenFirebase(token)).toEqual({ uid: "uid-456" })
  })

  it("rechaza un token expirado", async () => {
    const token = firmarToken({ sub: "uid-123", email: "juan@example.com" }, { expirado: true })
    expect(await verificarTokenFirebase(token)).toBeNull()
  })

  it("rechaza un token con issuer incorrecto", async () => {
    const token = firmarToken({ sub: "uid-123" }, { issuer: "https://securetoken.google.com/otro-proyecto" })
    expect(await verificarTokenFirebase(token)).toBeNull()
  })

  it("rechaza un token con audience incorrecta", async () => {
    const token = firmarToken({ sub: "uid-123" }, { audience: "otro-proyecto" })
    expect(await verificarTokenFirebase(token)).toBeNull()
  })

  it("rechaza un token con firma manipulada", async () => {
    const token = firmarToken({ sub: "uid-123" })
    const tokenManipulado = token.slice(0, -5) + "AAAAA"
    expect(await verificarTokenFirebase(tokenManipulado)).toBeNull()
  })

  it("rechaza un token cuyo kid no existe en el mapa de claves", async () => {
    const token = firmarToken({ sub: "uid-123" }, { kid: "kid-desconocido" })
    expect(await verificarTokenFirebase(token)).toBeNull()
  })

  it("rechaza un token firmado con otra clave usando el kid correcto", async () => {
    const otroPar = generateKeyPairSync("rsa", { modulusLength: 2048 })
    const otraPrivada = otroPar.privateKey.export({ type: "pkcs8", format: "pem" }).toString()
    mockearClaves({ [KID]: generarCertificadoOtraClave() })
    const token = firmarToken({ sub: "uid-123" }, {}, otraPrivada)
    expect(await verificarTokenFirebase(token)).toBeNull()
  })

  it("usa la clave correcta del mapa cuando hay varios kids", async () => {
    const otroPar = generateKeyPairSync("rsa", { modulusLength: 2048 })
    const otraPrivada = otroPar.privateKey.export({ type: "pkcs8", format: "pem" }).toString()
    const otroCert = generarCertificado(
      otraPrivada,
      otroPar.publicKey.export({ type: "spki", format: "pem" }).toString()
    )
    mockearClaves({ [KID]: clavePublicaPem, "otra-clave": otroCert })

    const token = firmarToken({ sub: "uid-999" }, { kid: "otra-clave" }, otraPrivada)
    expect(await verificarTokenFirebase(token)).toEqual({ uid: "uid-999" })
  })

  it("devuelve null si falla la descarga de claves", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response)
    const token = firmarToken({ sub: "uid-123" })
    expect(await verificarTokenFirebase(token)).toBeNull()
  })

  it("cachea las claves y no vuelve a descargarlas", async () => {
    const token = firmarToken({ sub: "uid-123" })
    await verificarTokenFirebase(token)
    await verificarTokenFirebase(token)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("descarga de nuevo las claves cuando expira el cache", async () => {
    vi.useFakeTimers()
    try {
      const token = firmarToken({ sub: "uid-123" })
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "cache-control": "max-age=0" }),
        json: async () => ({ [KID]: clavePublicaPem }),
      } as Response)
      await verificarTokenFirebase(token)
      expect(fetch).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(301_000)
      await verificarTokenFirebase(token)
      expect(fetch).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})