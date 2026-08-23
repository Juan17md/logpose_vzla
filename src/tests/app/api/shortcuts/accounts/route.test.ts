import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/shortcuts/accounts/route'

vi.mock('server-only', () => ({}))

const { mockLimit, mockListarCuentas, mockListarCategorias } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
  mockListarCuentas: vi.fn(),
  mockListarCategorias: vi.fn(),
}))

vi.mock('@/lib/rateLimit', () => ({
  obtenerShortcutRateLimit: () => ({ limit: mockLimit }),
}))

vi.mock('@/lib/firebaseAdmin', () => ({
  listarCuentasActivasFirestore: mockListarCuentas,
  listarCategoriasFirestore: mockListarCategorias,
}))

const TOKEN = "token-de-prueba"
const USER_ID = "uid-del-dueno"

function peticion(token: string | null = TOKEN): NextRequest {
  const headers: Record<string, string> = {}
  if (token !== null) headers.authorization = `Bearer ${token}`
  return new NextRequest("http://localhost/api/shortcuts/accounts", {
    method: "GET",
    headers,
  })
}

beforeEach(() => {
  vi.stubEnv("SHORTCUTS_API_TOKEN", TOKEN)
  vi.stubEnv("SHORTCUTS_USER_ID", USER_ID)
  mockLimit.mockReset()
  mockListarCuentas.mockReset()
  mockListarCategorias.mockReset()
  mockLimit.mockResolvedValue({ success: true })
  mockListarCuentas.mockResolvedValue([
    { id: "cta-abc123", nombre: "Zelle", banco: "Bank of America", moneda: "USD", saldo: 500 },
    { id: "cta-xyz789", nombre: "Pago Móvil", banco: "Mercantil", moneda: "BS", saldo: 9000 },
  ])
  mockListarCategorias.mockResolvedValue([
    { nombre: "Comida", tipo: "gasto", subcategorias: ["Supermercado", "Restaurantes"] },
    { nombre: "Salario", tipo: "ingreso", subcategorias: ["Nómina principal"] },
    { nombre: "Negocio", tipo: "ambas", subcategorias: [] },
  ])
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("GET /api/shortcuts/accounts", () => {
  it("devuelve 500 si SHORTCUTS_API_TOKEN no está configurado", async () => {
    vi.stubEnv("SHORTCUTS_API_TOKEN", "")
    const respuesta = await GET(peticion(TOKEN))
    expect(respuesta.status).toBe(500)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toContain("no está configurado")
    expect(mockListarCuentas).not.toHaveBeenCalled()
  })

  it("devuelve 401 si no se envía token", async () => {
    const respuesta = await GET(peticion(null))
    expect(respuesta.status).toBe(401)
    expect(mockListarCuentas).not.toHaveBeenCalled()
  })

  it("devuelve 401 si el token es incorrecto", async () => {
    const respuesta = await GET(peticion("token-equivocado"))
    expect(respuesta.status).toBe(401)
    expect(mockListarCuentas).not.toHaveBeenCalled()
  })

  it("devuelve 429 si se supera el límite de solicitudes", async () => {
    mockLimit.mockResolvedValue({ success: false })
    const respuesta = await GET(peticion())
    expect(respuesta.status).toBe(429)
    expect(mockListarCuentas).not.toHaveBeenCalled()
  })

  it("devuelve 500 si falta SHORTCUTS_USER_ID", async () => {
    vi.stubEnv("SHORTCUTS_USER_ID", "")
    const respuesta = await GET(peticion())
    expect(respuesta.status).toBe(500)
    expect(mockListarCuentas).not.toHaveBeenCalled()
  })

  it("lista las cuentas activas y el catalogo de categorias del dueño del token", async () => {
    const respuesta = await GET(peticion())
    expect(respuesta.status).toBe(200)

    expect(mockListarCuentas).toHaveBeenCalledWith(USER_ID)
    expect(mockListarCategorias).toHaveBeenCalledWith(USER_ID)
    const cuerpo = await respuesta.json()
    expect(cuerpo.success).toBe(true)
    expect(cuerpo.cuentas).toHaveLength(2)
    expect(cuerpo.cuentas[0]).toEqual({
      id: "cta-abc123",
      nombre: "Zelle",
      banco: "Bank of America",
      moneda: "USD",
      saldo: 500,
    })
    expect(cuerpo.categorias).toHaveLength(3)
    expect(cuerpo.categorias.find((c: { nombre: string }) => c.nombre === "Comida").subcategorias).toEqual([
      "Supermercado",
      "Restaurantes",
    ])
  })

  it("devuelve lista vacía cuando el usuario no tiene cuentas activas", async () => {
    mockListarCuentas.mockResolvedValue([])
    const respuesta = await GET(peticion())
    expect(respuesta.status).toBe(200)
    const cuerpo = await respuesta.json()
    expect(cuerpo.cuentas).toEqual([])
  })

  it("usa el SHORTCUTS_USER_ID como clave del rate limit", async () => {
    await GET(peticion())
    expect(mockLimit).toHaveBeenCalledWith(USER_ID)
  })

  it("propaga error interno como 500 genérico sin filtrar detalles", async () => {
    mockListarCuentas.mockRejectedValue(new Error("credenciales expiradas detalle interno"))
    const respuesta = await GET(peticion())
    expect(respuesta.status).toBe(500)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toBe("Error interno del servidor")
    expect(JSON.stringify(cuerpo)).not.toContain("credenciales expiradas")
  })
})
