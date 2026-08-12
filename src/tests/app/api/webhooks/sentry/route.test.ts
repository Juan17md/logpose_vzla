import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { POST } from "@/app/api/webhooks/sentry/route"
import {
  esAccionNotificable,
  formatearMensajeSentry,
} from "@/lib/telegram"

const { mockCaptureException } = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mockCaptureException,
}))

vi.stubGlobal("fetch", vi.fn())

const SECRETO = "secreto-de-prueba"
const TOKEN_BOT = "123456:token-prueba"
const CHAT_ID = "987654321"

function peticion(payload: unknown, secreto?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (secreto !== undefined) headers["x-webhook-secret"] = secreto
  return new Request("http://localhost/api/webhooks/sentry", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
}

function payloadSentry(action = "created"): unknown {
  return {
    action,
    data: {
      issue: {
        id: "123",
        title: "Error de prueba <en> el módulo",
        level: "error",
        web_url: "https://juan17md.sentry.io/issues/123",
        project: { name: "logpose-vzla", slug: "logpose-vzla" },
      },
    },
  }
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", TOKEN_BOT)
  vi.stubEnv("TELEGRAM_CHAT_ID", CHAT_ID)
  vi.stubEnv("SENTRY_WEBHOOK_SECRET", SECRETO)
  mockCaptureException.mockReset()
  vi.mocked(fetch).mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("POST /api/webhooks/sentry", () => {
  it("devuelve 503 si Telegram no está configurado", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "")
    const respuesta = await POST(peticion(payloadSentry(), SECRETO))
    expect(respuesta.status).toBe(503)
  })

  it("devuelve 401 si falta el secreto o es incorrecto", async () => {
    const sinSecreto = await POST(peticion(payloadSentry()))
    expect(sinSecreto.status).toBe(401)

    const malSecreto = await POST(peticion(payloadSentry(), "incorrecto"))
    expect(malSecreto.status).toBe(401)
  })

  it("devuelve 400 con JSON inválido", async () => {
    const request = new Request("http://localhost/api/webhooks/sentry", {
      method: "POST",
      headers: { "x-webhook-secret": SECRETO },
      body: "no-json",
    })
    const respuesta = await POST(request)
    expect(respuesta.status).toBe(400)
  })

  it("ignora acciones no notificables (resolved, assigned)", async () => {
    const respuesta = await POST(peticion(payloadSentry("resolved"), SECRETO))
    expect(respuesta.status).toBe(200)
    const cuerpo = await respuesta.json()
    expect(cuerpo.ignorado).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("envía mensaje a Telegram para un error nuevo", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200 } as Response)

    const respuesta = await POST(peticion(payloadSentry("created"), SECRETO))
    expect(respuesta.status).toBe(200)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, opciones] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe(`https://api.telegram.org/bot${TOKEN_BOT}/sendMessage`)
    const cuerpo = JSON.parse(String(opciones?.body))
    expect(cuerpo.chat_id).toBe(CHAT_ID)
    expect(cuerpo.text).toContain("Nuevo error")
    expect(cuerpo.text).toContain("[LogPose VZLA]")
    expect(cuerpo.text).toContain("logpose-vzla")
    expect(cuerpo.text).toContain("Error de prueba &lt;en&gt; el módulo")
    expect(cuerpo.parse_mode).toBe("HTML")
  })

  it("envía mensaje para una regresión (unresolved)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200 } as Response)

    const respuesta = await POST(peticion(payloadSentry("unresolved"), SECRETO))
    expect(respuesta.status).toBe(200)

    const cuerpo = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))
    expect(cuerpo.text).toContain("Regresión detectada")
  })

  it("devuelve 502 y registra en Sentry si Telegram falla", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "Bad Request",
    } as Response)

    const respuesta = await POST(peticion(payloadSentry("created"), SECRETO))
    expect(respuesta.status).toBe(502)
    expect(mockCaptureException).toHaveBeenCalledTimes(1)
  })
})

describe("utilidades de telegram", () => {
  it("detecta acciones notificables", () => {
    expect(esAccionNotificable({ action: "created" })).toBe(true)
    expect(esAccionNotificable({ action: "unresolved" })).toBe(true)
    expect(esAccionNotificable({ action: "resolved" })).toBe(false)
    expect(esAccionNotificable({})).toBe(false)
  })

  it("retorna null si el issue no tiene título", () => {
    expect(formatearMensajeSentry({ action: "created", data: {} })).toBeNull()
    expect(formatearMensajeSentry({ action: "created", data: { issue: {} } })).toBeNull()
  })

  it("formatea el nivel warning e info", () => {
    const mensajeWarning = formatearMensajeSentry({
      action: "created",
      data: { issue: { title: "X", level: "warning" } },
    })
    expect(mensajeWarning).toContain("🟠")
    expect(mensajeWarning).toContain("Advertencia")

    const mensajeError = formatearMensajeSentry({
      action: "created",
      data: { issue: { title: "X", level: "error" } },
    })
    expect(mensajeError).toContain("🔴")
    expect(mensajeError).toContain("Error")
  })
})
