import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/shortcuts/transaction/route'

vi.mock('server-only', () => ({}))

const { mockLimit, mockCrearTransaccion, mockObtenerCuenta, mockCommitAtomico, mockGetRates } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
  mockCrearTransaccion: vi.fn(),
  mockObtenerCuenta: vi.fn(),
  mockCommitAtomico: vi.fn(),
  mockGetRates: vi.fn(),
}))

vi.mock('@/lib/rateLimit', () => ({
  obtenerShortcutRateLimit: () => ({ limit: mockLimit }),
}))

vi.mock('@/lib/currency', () => ({
  getRates: mockGetRates,
}))

vi.mock('@/lib/firebaseAdmin', () => ({
  crearTransaccionFirestore: mockCrearTransaccion,
  crearTransaccionConSaldoAtomico: mockCommitAtomico,
  obtenerCuentaFirestore: mockObtenerCuenta,
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
  mockCommitAtomico.mockReset()
  mockGetRates.mockReset()
  mockLimit.mockResolvedValue({ success: true })
  mockCrearTransaccion.mockResolvedValue("id-generado-123")
  mockCommitAtomico.mockResolvedValue("id-atomico-456")
  mockObtenerCuenta.mockResolvedValue({ nombre: "Efectivo", moneda: "USD", saldo: 1000 })
  mockGetRates.mockResolvedValue({
    usd: 500,
    eur: 600,
    usdt: 500,
    lastUpdated: new Date().toISOString(),
  })
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

  it("usa commit atómico y persiste accountId con un gasto (delta negativo) — T8+T9", async () => {
    const respuesta = await POST(
      peticion(cuerpoValido({ monto: 30, accountId: "cuenta-1" }))
    )
    expect(respuesta.status).toBe(200)
    expect(mockObtenerCuenta).toHaveBeenCalledWith(USER_ID, "cuenta-1")

    // T9: debe usar commit atómico, NO crearTransaccion + incrementar por separado
    expect(mockCommitAtomico).toHaveBeenCalledOnce()
    expect(mockCrearTransaccion).not.toHaveBeenCalled()

    // T8: accountId debe estar en los datos del documento
    const datosDoc = mockCommitAtomico.mock.calls[0][0]
    expect(datosDoc.accountId).toBe("cuenta-1")

    // Delta correcto: gasto = negativo
    const delta = mockCommitAtomico.mock.calls[0][3]
    expect(delta).toBe(-30)

    // Verifica userId y accountId pasados al commit
    expect(mockCommitAtomico.mock.calls[0][1]).toBe(USER_ID)
    expect(mockCommitAtomico.mock.calls[0][2]).toBe("cuenta-1")
  })

  it("usa commit atómico con un ingreso (delta positivo) — T9", async () => {
    const respuesta = await POST(
      peticion(
        cuerpoValido({ tipo: "ingreso", categoria: "Salario", monto: 500, accountId: "cuenta-1" })
      )
    )
    expect(respuesta.status).toBe(200)
    expect(mockCommitAtomico).toHaveBeenCalledOnce()
    const delta = mockCommitAtomico.mock.calls[0][3]
    expect(delta).toBe(500)
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
    expect(mockCommitAtomico).not.toHaveBeenCalled()
  })

  it("no toca saldos ni cuentas cuando no se envía accountId", async () => {
    const respuesta = await POST(peticion(cuerpoValido()))
    expect(respuesta.status).toBe(200)
    expect(mockObtenerCuenta).not.toHaveBeenCalled()
    expect(mockCommitAtomico).not.toHaveBeenCalled()
    // Sin accountId: usa crearTransaccionFirestore (no atómico)
    expect(mockCrearTransaccion).toHaveBeenCalledOnce()
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
    // El ID proviene del commit atómico
    expect(cuerpo.transaccion.id).toBe("id-atomico-456")
  })

  it("aplica el redondeo a 2 decimales también al delta del commit atómico", async () => {
    const respuesta = await POST(
      peticion(cuerpoValido({ monto: "8.509", accountId: "cuenta-1" }))
    )
    expect(respuesta.status).toBe(200)
    const delta = mockCommitAtomico.mock.calls[0][3]
    expect(delta).toBe(-8.51)
  })

  describe("Conversión de moneda al impactar saldo de cuenta — T10", () => {
    it("convierte gasto USD a cuenta en BS multiplicando por la tasa BCV", async () => {
      mockObtenerCuenta.mockResolvedValue({ nombre: "Banesco", moneda: "BS", saldo: 50000 })
      const respuesta = await POST(
        peticion(cuerpoValido({ monto: 10, currency: "USD", accountId: "cuenta-bs" }))
      )
      expect(respuesta.status).toBe(200)
      // 10 USD * 500 = 5000 BS
      const delta = mockCommitAtomico.mock.calls[0][3]
      expect(delta).toBe(-5000)

      const docData = mockCommitAtomico.mock.calls[0][0]
      expect(docData.currency).toBe("USD")
      expect(docData.exchangeRate).toBe(500)
    })

    it("convierte gasto VES a cuenta en USD dividiendo por la tasa BCV", async () => {
      mockObtenerCuenta.mockResolvedValue({ nombre: "Zelle", moneda: "USD", saldo: 100 })
      const respuesta = await POST(
        peticion(cuerpoValido({ monto: 2500, currency: "VES", accountId: "cuenta-usd" }))
      )
      expect(respuesta.status).toBe(200)
      // 2500 VES / 500 = 5 USD
      const delta = mockCommitAtomico.mock.calls[0][3]
      expect(delta).toBe(-5)

      const docData = mockCommitAtomico.mock.calls[0][0]
      expect(docData.currency).toBe("VES")
      expect(docData.exchangeRate).toBe(500)
    })

    it("aplica 1:1 cuando la transacción VES va a cuenta en BS", async () => {
      mockObtenerCuenta.mockResolvedValue({ nombre: "Pago Móvil", moneda: "BS", saldo: 10000 })
      const respuesta = await POST(
        peticion(cuerpoValido({ monto: 750, currency: "VES", accountId: "cuenta-bs" }))
      )
      expect(respuesta.status).toBe(200)
      // 750 VES = 750 BS
      const delta = mockCommitAtomico.mock.calls[0][3]
      expect(delta).toBe(-750)
    })

    it("convierte gasto USD a cuenta en EUR usando tasas intermediarias en BS", async () => {
      mockObtenerCuenta.mockResolvedValue({ nombre: "Cuenta Euro", moneda: "EUR", saldo: 500 })
      const respuesta = await POST(
        peticion(cuerpoValido({ monto: 120, currency: "USD", accountId: "cuenta-eur" }))
      )
      expect(respuesta.status).toBe(200)
      // 120 USD * (500 / 600) = 100 EUR
      const delta = mockCommitAtomico.mock.calls[0][3]
      expect(delta).toBe(-100)
    })

    it("convierte ingreso VES a cuenta en USD sumando el delta convertido", async () => {
      mockObtenerCuenta.mockResolvedValue({ nombre: "Efectivo USD", moneda: "USD", saldo: 200 })
      const respuesta = await POST(
        peticion(
          cuerpoValido({
            tipo: "ingreso",
            categoria: "Salario",
            monto: 10000,
            currency: "VES",
            accountId: "cuenta-usd",
          })
        )
      )
      expect(respuesta.status).toBe(200)
      // 10000 VES / 500 = 20 USD (positivo)
      const delta = mockCommitAtomico.mock.calls[0][3]
      expect(delta).toBe(20)
    })
  })
})