import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { POST } from "@/app/api/auth/login/route"

vi.mock("server-only", () => ({}))

const { mockLimit, mockCreateCustomToken } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
  mockCreateCustomToken: vi.fn(),
}))

vi.mock("@/lib/rateLimit", () => ({
  obtenerLoginRateLimit: () => ({ limit: mockLimit }),
}))

vi.mock("firebase-admin/app", () => ({
  getApps: () => [],
  initializeApp: () => ({}),
  cert: () => ({}),
}))

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ createCustomToken: mockCreateCustomToken }),
}))

vi.stubGlobal("fetch", vi.fn())

const API_KEY = "clave-de-prueba"

function peticion(payload: unknown): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
}

function respuestaFirebase(payload: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => payload,
  } as Response
}

beforeEach(() => {
  vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", JSON.stringify({}))
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", API_KEY)
  mockLimit.mockReset()
  mockCreateCustomToken.mockReset()
  vi.mocked(fetch).mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("POST /api/auth/login", () => {
  it("devuelve 429 si se supera el límite de intentos por IP", async () => {
    mockLimit.mockResolvedValue({ success: false })
    const respuesta = await POST(peticion({ email: "a@b.com", password: "123456" }))
    expect(respuesta.status).toBe(429)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("devuelve 400 con JSON inválido", async () => {
    mockLimit.mockResolvedValue({ success: true })
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: "no-json",
    })
    const respuesta = await POST(request)
    expect(respuesta.status).toBe(400)
  })

  it("devuelve 400 si el email no es válido", async () => {
    mockLimit.mockResolvedValue({ success: true })
    const respuesta = await POST(peticion({ email: "invalido", password: "123456" }))
    expect(respuesta.status).toBe(400)
  })

  it("devuelve 401 con credenciales incorrectas", async () => {
    mockLimit.mockResolvedValue({ success: true })
    vi.mocked(fetch).mockResolvedValue(
      respuestaFirebase({ error: { message: "INVALID_LOGIN_CREDENTIALS" } }, false, 400)
    )
    const respuesta = await POST(peticion({ email: "a@b.com", password: "mala" }))
    expect(respuesta.status).toBe(401)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toBe("Credenciales incorrectas.")
  })

  it("devuelve 403 si la cuenta está deshabilitada", async () => {
    mockLimit.mockResolvedValue({ success: true })
    vi.mocked(fetch).mockResolvedValue(
      respuestaFirebase({ error: { message: "USER_DISABLED" } }, false, 400)
    )
    const respuesta = await POST(peticion({ email: "a@b.com", password: "123456" }))
    expect(respuesta.status).toBe(403)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toBe("Esta cuenta está deshabilitada.")
  })

  it("devuelve custom token al validar credenciales", async () => {
    mockLimit.mockResolvedValue({ success: true })
    mockCreateCustomToken.mockResolvedValue("token-personalizado")
    vi.mocked(fetch).mockResolvedValue(
      respuestaFirebase({ localId: "uid-123", idToken: "id-token" })
    )

    const respuesta = await POST(peticion({ email: "a@b.com", password: "123456" }))
    expect(respuesta.status).toBe(200)
    const cuerpo = await respuesta.json()
    expect(cuerpo.customToken).toBe("token-personalizado")

    const [url, opciones] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain(`accounts:signInWithPassword?key=${API_KEY}`)
    const enviado = JSON.parse(String(opciones?.body))
    expect(enviado.email).toBe("a@b.com")
    expect(enviado.returnSecureToken).toBe(true)
  })

  it("devuelve 500 si falta la API key", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "")
    mockLimit.mockResolvedValue({ success: true })
    const respuesta = await POST(peticion({ email: "a@b.com", password: "123456" }))
    expect(respuesta.status).toBe(500)
    expect(fetch).not.toHaveBeenCalled()
  })
})