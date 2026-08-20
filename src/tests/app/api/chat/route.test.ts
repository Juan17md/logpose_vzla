import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "@/app/api/chat/route"

vi.mock("server-only", () => ({}))

const { mockLimit, mockVerificarToken, mockCreate } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
  mockVerificarToken: vi.fn(),
  mockCreate: vi.fn(),
}))

vi.mock("@/lib/rateLimit", () => ({
  obtenerChatRateLimit: () => ({ limit: mockLimit }),
}))

vi.mock("@/lib/verificarAuthFirebase", () => ({
  verificarTokenFirebase: mockVerificarToken,
}))

vi.mock("groq-sdk", () => {
  class MockGroq {
    chat = {
      completions: {
        create: mockCreate,
      },
    }
  }
  return { default: MockGroq, Groq: MockGroq }
})

function peticion(payload: unknown): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: "Bearer token-valido",
  }
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
}

function respuestaGroq(content: string): unknown {
  return {
    choices: [{ message: { content } }],
  }
}

beforeEach(() => {
  mockLimit.mockReset()
  mockVerificarToken.mockReset()
  mockCreate.mockReset()
  mockLimit.mockResolvedValue({ success: true })
  mockVerificarToken.mockResolvedValue({ uid: "uid-123", email: "a@b.com" })
  mockCreate.mockResolvedValue(respuestaGroq('{"operations": [], "message": "Hola"}'))
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("POST /api/chat (validación del body con Zod)", () => {
  it("devuelve 400 si el message no es un string", async () => {
    const respuesta = await POST(peticion({ message: 123 }))
    expect(respuesta.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("devuelve 400 si el message supera 2000 caracteres", async () => {
    const respuesta = await POST(peticion({ message: "x".repeat(2001) }))
    expect(respuesta.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("devuelve 400 si conversationHistory supera 10 mensajes", async () => {
    const historial = Array.from({ length: 11 }, () => ({ role: "user", content: "hola" }))
    const respuesta = await POST(peticion({ message: "hola", conversationHistory: historial }))
    expect(respuesta.status).toBe(400)
  })

  it("devuelve 400 si conversationHistory tiene un role inválido", async () => {
    const respuesta = await POST(
      peticion({ message: "hola", conversationHistory: [{ role: "robot", content: "x" }] })
    )
    expect(respuesta.status).toBe(400)
  })

  it("devuelve 400 si userContext no es un objeto", async () => {
    const respuesta = await POST(peticion({ message: "hola", userContext: "texto" }))
    expect(respuesta.status).toBe(400)
  })

  it("devuelve 400 si operacionPendiente no es un objeto ni null", async () => {
    const respuesta = await POST(peticion({ message: "hola", operacionPendiente: "texto" }))
    expect(respuesta.status).toBe(400)
  })

  it("acepta operacionPendiente null", async () => {
    const respuesta = await POST(peticion({ message: "hola", operacionPendiente: null }))
    expect(respuesta.status).toBe(200)
  })

  it("procesa un mensaje válido y construye el prompt", async () => {
    const respuesta = await POST(
      peticion({
        message: "Gasté 50 en comida",
        conversationHistory: [{ role: "user", content: "hola" }],
        userContext: { balance: 100, monthlyExpense: 50 },
      })
    )
    expect(respuesta.status).toBe(200)
    const llamada = mockCreate.mock.calls[0][0]
    expect(llamada.messages.length).toBe(3)
    expect(llamada.messages[1].role).toBe("user")
    expect(llamada.messages[2].content).toBe("Gasté 50 en comida")
  })

  it("sanitiza strings gigantes del userContext antes del prompt", async () => {
    const gigante = "X".repeat(500)
    const respuesta = await POST(
      peticion({
        message: "hola",
        userContext: { bankAccounts: [{ id: "1", nombre: gigante, banco: "Banesco" }] },
      })
    )
    expect(respuesta.status).toBe(200)
    const systemPrompt = mockCreate.mock.calls[0][0].messages[0].content as string
    expect(systemPrompt).not.toContain(gigante)
    expect(systemPrompt).toContain("X".repeat(200))
  })

  it("acota arrays gigantes del userContext", async () => {
    const milMetas = Array.from({ length: 1000 }, (_, i) => ({ name: `Meta ${i}`, current: 1, target: 2 }))
    const respuesta = await POST(
      peticion({ message: "hola", userContext: { balance: 100, goals: milMetas } })
    )
    expect(respuesta.status).toBe(200)
    const systemPrompt = mockCreate.mock.calls[0][0].messages[0].content as string
    expect(systemPrompt).toContain("Meta 0")
    expect(systemPrompt).not.toContain("Meta 999")
  })

  it("neutraliza números desorbitados del userContext", async () => {
    const respuesta = await POST(
      peticion({ message: "hola", userContext: { balance: 1e300 } })
    )
    expect(respuesta.status).toBe(200)
    const systemPrompt = mockCreate.mock.calls[0][0].messages[0].content as string
    expect(systemPrompt).toContain("Balance actual: $0")
  })

  it("trata los campos null del userContext como ausentes (no imprime \"$null\")", async () => {
    const respuesta = await POST(
      peticion({ message: "hola", userContext: { balance: null } })
    )
    expect(respuesta.status).toBe(200)
    const systemPrompt = mockCreate.mock.calls[0][0].messages[0].content as string
    expect(systemPrompt).not.toContain("$null")
    expect(systemPrompt).not.toContain("Balance actual")
  })

  it("ignora strings en campos numéricos del userContext", async () => {
    const respuesta = await POST(
      peticion({ message: "hola", userContext: { balance: "999999", goals: "no-soy-array" } })
    )
    expect(respuesta.status).toBe(200)
    const systemPrompt = mockCreate.mock.calls[0][0].messages[0].content as string
    expect(systemPrompt).not.toContain("999999")
    expect(systemPrompt).not.toContain("Balance actual")
  })

  it("no aplica el rate limit a bodies inválidos", async () => {
    await POST(peticion({ message: 123 }))
    expect(mockLimit).toHaveBeenCalled()
  })

  it("responde 200 amigable con JSON mal formado (comportamiento original)", async () => {
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      headers: { authorization: "Bearer token-valido" },
      body: "no-json",
    })
    const respuesta = await POST(request)
    expect(respuesta.status).toBe(200)
    const cuerpo = await respuesta.json()
    expect(cuerpo.message).toContain("No entendí bien")
  })
})