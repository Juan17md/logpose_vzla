import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/shortcuts/transaction/route'

vi.mock('server-only', () => ({}))

const { mockLimit, mockCrearTransaccion, mockObtenerCuenta, mockIncrementarSaldo } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
  mockCrearTransaccion: vi.fn(),
  mockObtenerCuenta: vi.fn(),
  mockIncrementarSaldo: vi.fn(),
}))

vi.mock('@/lib/rateLimit', () => ({
  obtenerShortcutRateLimit: () => ({ limit: mockLimit }),
}))

vi.mock('@/lib/firebaseAdmin', () => ({
  crearTransaccionFirestore: mockCrearTransaccion,
  obtenerCuentaFirestore: mockObtenerCuenta,
  incrementarSaldoCuenta: mockIncrementarSaldo,
}))

const TOKEN = "token-de-prueba"
const USER_ID = "uid-del-dueno"

function peticion(
  payload: unknown,
  token: string | null = TOKEN
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  }
  if (token !== null) headers.authorization = `Bearer ${token}`
  return new NextRequest("http://localhost/api/shortcuts/transaction", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
}

function cuerpoValido(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    monto: 100,
    tipo: "gasto",
    categoria: "Comida",
    ...extra,
  }
}

beforeEach(() => {
  vi.stubEnv("SHORTCUTS_API_TOKEN", TOKEN)
  vi.stubEnv("SHORTCUTS_USER_ID", USER_ID)
  mockLimit.mockReset()
  mockCrearTransaccion.mockReset()
  mockObtenerCuenta.mockReset()
  mockIncrementarSaldo.mockReset()
  mockLimit.mockResolvedValue({ success: true })
  mockCrearTransaccion.mockResolvedValue("id-generado-123")
  mockObtenerCuenta.mockResolvedValue({ nombre: "Efectivo", saldo: 1000 })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("POST /api/shortcuts/transaction", () => {
  it("devuelve 500 si SHORTCUTS_API_TOKEN no está configurado", async () => {
    vi.stubEnv("SHORTCUTS_API_TOKEN", "")
    const respuesta = await POST(peticion(cuerpoValido()))
    expect(respuesta.status).toBe(500)
    expect(mockCrearTransaccion).not.toHaveBeenCalled()
  })

  it("devuelve 401 si no se envía el token", async () => {
    const respuesta = await POST(peticion(cuerpoValido(), null))
    expect(respuesta.status).toBe(401)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toBe("Token no autorizado.")
  })

  it("devuelve 401 si el token es incorrecto", async () => {
    const respuesta = await POST(peticion(cuerpoValido(), "token-equivocado"))
    expect(respuesta.status).toBe(401)
  })

  it("devuelve 429 si se supera el límite de solicitudes", async () => {
    mockLimit.mockResolvedValue({ success: false })
    const respuesta = await POST(peticion(cuerpoValido()))
    expect(respuesta.status).toBe(429)
    expect(mockCrearTransaccion).not.toHaveBeenCalled()
  })

  it("usa el SHORTCUTS_USER_ID como clave del rate limit (no global)", async () => {
    const respuesta = await POST(peticion(cuerpoValido()))
    expect(respuesta.status).toBe(200)
    const clave = mockLimit.mock.calls[0][0] as string
    expect(clave).toBe(USER_ID)
  })

  it("no aplica el rate limit si el token es inválido", async () => {
    const respuesta = await POST(peticion(cuerpoValido(), "token-equivocado"))
    expect(respuesta.status).toBe(401)
    expect(mockLimit).not.toHaveBeenCalled()
  })

  it("devuelve 500 (no 401) si falta SHORTCUTS_API_TOKEN aunque se envíe token", async () => {
    vi.stubEnv("SHORTCUTS_API_TOKEN", "")
    const respuesta = await POST(peticion(cuerpoValido()))
    expect(respuesta.status).toBe(500)
    expect(mockLimit).not.toHaveBeenCalled()
    expect(mockCrearTransaccion).not.toHaveBeenCalled()
  })

  it("devuelve 500 si SHORTCUTS_USER_ID no está configurado", async () => {
    vi.stubEnv("SHORTCUTS_USER_ID", "")
    const respuesta = await POST(peticion(cuerpoValido()))
    expect(respuesta.status).toBe(500)
    expect(mockCrearTransaccion).not.toHaveBeenCalled()
  })

  it("devuelve 400 con JSON inválido", async () => {
    const request = new NextRequest("http://localhost/api/shortcuts/transaction", {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}` },
      body: "no-json",
    })
    const respuesta = await POST(request)
    expect(respuesta.status).toBe(400)
  })

  it("devuelve 400 si el monto no es numérico", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ monto: "cien" })))
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toBe("El monto debe ser un número.")
  })

  it("devuelve 400 si el monto no es positivo", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ monto: 0 })))
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toBe("El monto debe ser mayor que cero.")
  })

  it("devuelve 400 si el monto es una string vacía (Atajos envía \"\")", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ monto: "" })))
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toBe("El monto debe ser un número.")
  })

  it("devuelve 400 si el monto es una string no numérica", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ monto: "8.5.3" })))
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toBe("El monto debe ser un número.")
  })

  it("acepta el monto como string numérica (Atajos lo serializa como texto)", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ monto: "8" })))
    expect(respuesta.status).toBe(200)
    const cuerpo = await respuesta.json()
    expect(cuerpo.transaccion.monto).toBe(8)
    const escritos = mockCrearTransaccion.mock.calls[0][0]
    expect(escritos.amount).toBe(8)
  })

  it("acepta el monto decimal como string y lo redondea a 2 decimales", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ monto: "8.509" })))
    expect(respuesta.status).toBe(200)
    const escritos = mockCrearTransaccion.mock.calls[0][0]
    expect(escritos.amount).toBe(8.51)
  })

  it("devuelve 400 si el tipo no es válido", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ tipo: "transferencia" })))
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toBe('El tipo debe ser "ingreso" o "gasto".')
  })

  it("acepta el tipo con la primera letra en mayúscula (Atajos capitaliza la lista)", async () => {
    const respuesta = await POST(
      peticion(cuerpoValido({ tipo: "Gasto", categoria: "Comida" }))
    )
    expect(respuesta.status).toBe(200)
    const escritos = mockCrearTransaccion.mock.calls[0][0]
    expect(escritos.type).toBe("gasto")
  })

  it("acepta el tipo ingreso con mayúscula y valida su categoría", async () => {
    const respuesta = await POST(
      peticion(cuerpoValido({ tipo: "Ingreso", categoria: "Salario" }))
    )
    expect(respuesta.status).toBe(200)
    const escritos = mockCrearTransaccion.mock.calls[0][0]
    expect(escritos.type).toBe("ingreso")
  })

  it("devuelve 400 si la categoría no está permitida", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ categoria: "Cripto" })))
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toContain("no es válida para un gasto")
    expect(cuerpo.error).toContain("Comida")
  })

  it("devuelve 400 si la categoría no corresponde al tipo", async () => {
    const respuesta = await POST(
      peticion(cuerpoValido({ tipo: "gasto", categoria: "Salario" }))
    )
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toContain('"Salario" no es válida para un gasto')
  })

  it("devuelve 400 si la fecha no es válida", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ fecha: "no-es-fecha" })))
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toContain("ISO 8601")
  })

  it("devuelve 400 si la descripción supera 200 caracteres", async () => {
    const respuesta = await POST(
      peticion(cuerpoValido({ descripcion: "x".repeat(201) }))
    )
    expect(respuesta.status).toBe(400)
  })

  it("crea la transacción con valores por defecto (USD, ahora, sin descripción)", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ monto: 99.999 })))
    expect(respuesta.status).toBe(200)

    const cuerpo = await respuesta.json()
    expect(cuerpo.success).toBe(true)
    expect(cuerpo.transaccion.id).toBe("id-generado-123")
    expect(cuerpo.transaccion.currency).toBe("USD")

    const escritos = mockCrearTransaccion.mock.calls[0][0]
    expect(escritos.userId).toBe(USER_ID)
    expect(escritos.amount).toBe(100)
    expect(escritos.type).toBe("gasto")
    expect(escritos.category).toBe("Comida")
    expect(escritos.description).toBe("")
    expect(escritos.currency).toBe("USD")
    expect(escritos.date).toBeInstanceOf(Date)
    expect(escritos.createdAt).toBeInstanceOf(Date)
  })

  it("crea la transacción con fecha y moneda explícitas", async () => {
    const fecha = "2026-08-18T14:30:00-04:00"
    const respuesta = await POST(
      peticion(
        cuerpoValido({
          tipo: "ingreso",
          categoria: "Salario",
          descripcion: "Quincena",
          fecha,
          currency: "VES",
        })
      )
    )
    expect(respuesta.status).toBe(200)

    const cuerpo = await respuesta.json()
    expect(cuerpo.transaccion.fecha).toBe(new Date(fecha).toISOString())
    expect(cuerpo.transaccion.currency).toBe("VES")
    expect(cuerpo.transaccion.tipo).toBe("ingreso")

    const escritos = mockCrearTransaccion.mock.calls[0][0]
    expect(escritos.currency).toBe("VES")
    expect(escritos.description).toBe("Quincena")
    expect((escritos.date as Date).toISOString()).toBe(new Date(fecha).toISOString())
  })

  it("actualiza el saldo de la cuenta con un gasto (delta negativo)", async () => {
    const respuesta = await POST(
      peticion(cuerpoValido({ monto: 30, accountId: "cuenta-1" }))
    )
    expect(respuesta.status).toBe(200)
    expect(mockObtenerCuenta).toHaveBeenCalledWith(USER_ID, "cuenta-1")
    expect(mockIncrementarSaldo).toHaveBeenCalledWith(USER_ID, "cuenta-1", -30)
    const escritos = mockCrearTransaccion.mock.calls[0][0]
    expect(escritos.accountId).toBeUndefined()
  })

  it("actualiza el saldo de la cuenta con un ingreso (delta positivo)", async () => {
    const respuesta = await POST(
      peticion(
        cuerpoValido({ tipo: "ingreso", categoria: "Salario", monto: 500, accountId: "cuenta-1" })
      )
    )
    expect(respuesta.status).toBe(200)
    expect(mockIncrementarSaldo).toHaveBeenCalledWith(USER_ID, "cuenta-1", 500)
    expect(mockObtenerCuenta).toHaveBeenCalledWith(USER_ID, "cuenta-1")
  })

  it("devuelve 400 si el accountId no existe para el usuario", async () => {
    mockObtenerCuenta.mockResolvedValue(null)
    const respuesta = await POST(
      peticion(cuerpoValido({ monto: 30, accountId: "cuenta-inexistente" }))
    )
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toContain("cuenta-inexistente")
    expect(mockCrearTransaccion).not.toHaveBeenCalled()
    expect(mockIncrementarSaldo).not.toHaveBeenCalled()
  })

  it("no toca saldos ni cuentas cuando no se envía accountId", async () => {
    const respuesta = await POST(peticion(cuerpoValido()))
    expect(respuesta.status).toBe(200)
    expect(mockObtenerCuenta).not.toHaveBeenCalled()
    expect(mockIncrementarSaldo).not.toHaveBeenCalled()
  })

  it("rechaza un accountId vacío", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ accountId: "" })))
    expect(respuesta.status).toBe(400)
    expect(mockCrearTransaccion).not.toHaveBeenCalled()
  })

  it("incluye accountId en la respuesta cuando se envía", async () => {
    const respuesta = await POST(
      peticion(cuerpoValido({ monto: 10, accountId: "cuenta-1" }))
    )
    expect(respuesta.status).toBe(200)
    const cuerpo = await respuesta.json()
    expect(cuerpo.transaccion.accountId).toBe("cuenta-1")
  })

  it("aplica el redondeo a 2 decimales también al delta del saldo", async () => {
    const respuesta = await POST(
      peticion(cuerpoValido({ monto: "8.509", accountId: "cuenta-1" }))
    )
    expect(respuesta.status).toBe(200)
    expect(mockIncrementarSaldo).toHaveBeenCalledWith(USER_ID, "cuenta-1", -8.51)
  })
})