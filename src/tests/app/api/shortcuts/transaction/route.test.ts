import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/shortcuts/transaction/route'

vi.mock('server-only', () => ({}))

const { mockLimit, mockCrearTransaccion, mockObtenerCuenta, mockCommitAtomico, mockGetRates, mockCommitGenerico, mockCatalogo } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
  mockCrearTransaccion: vi.fn(),
  mockObtenerCuenta: vi.fn(),
  mockCommitAtomico: vi.fn(),
  mockGetRates: vi.fn(),
  mockCommitGenerico: vi.fn(),
  mockCatalogo: vi.fn(),
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
  ejecutarCommitAtomico: mockCommitGenerico,
  generarNuevoDocId: vi.fn(() => `id-generado-${Math.floor(Math.random() * 1e9)}`),
  listarCategoriasFirestore: mockCatalogo,
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
  mockCommitGenerico.mockReset()
  mockCatalogo.mockReset()
  mockLimit.mockResolvedValue({ success: true })
  mockCrearTransaccion.mockResolvedValue("id-generado-123")
  mockCommitAtomico.mockResolvedValue("id-atomico-456")
  mockCommitGenerico.mockResolvedValue(["id-commit-789", "id-commit-790"])
  mockCatalogo.mockResolvedValue([
    { nombre: "Salario", tipo: "ingreso", subcategorias: [] },
    { nombre: "Freelance", tipo: "ingreso", subcategorias: [] },
    { nombre: "Comida", tipo: "gasto", subcategorias: [] },
    { nombre: "Tania", tipo: "ambas", subcategorias: ["Ingreso", "Gasto"] },
  ])
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
    const respuesta = await POST(peticion(cuerpoValido({ tipo: "prestamo" })))
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toBe(
      'El tipo debe ser "ingreso", "gasto" o "transferencia".'
    )
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

  it("acepta categorías personalizadas del catálogo con tipo ambas", async () => {
    const respuesta = await POST(
      peticion(
        cuerpoValido({ tipo: "ingreso", categoria: "Tania", subcategoria: "Ingreso" })
      )
    )
    expect(respuesta.status).toBe(200)
    const escritos = mockCrearTransaccion.mock.calls[0][0]
    expect(escritos.category).toBe("Tania")
    expect(escritos.subcategory).toBe("Ingreso")
  })

  it("devuelve 400 si la categoría no está en el catálogo", async () => {
    const respuesta = await POST(peticion(cuerpoValido({ categoria: "Cripto" })))
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toContain('"Cripto" no existe en tu catálogo')
    expect(cuerpo.error).toContain("Comida")
  })

  it("devuelve 400 si la categoría existe pero su tipo no corresponde", async () => {
    const respuesta = await POST(
      peticion(cuerpoValido({ tipo: "gasto", categoria: "Salario" }))
    )
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.error).toContain('"Salario" no existe en tu catálogo para un gasto')
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

    describe("transferencias, comisiones y subcategoría", () => {
      const CUERPO_TRANSFERENCIA = {
        monto: 100,
        tipo: "transferencia",
        categoria: "Transferencias",
        accountId: "cta-usd",
        targetAccountId: "cta-bs",
      }

      function mockearDosCuentas() {
        const cuentas: Record<string, { nombre: string; moneda: string; saldo: number }> = {
          "cta-usd": { nombre: "Zelle", moneda: "USD", saldo: 500 },
          "cta-bs": { nombre: "Pago Móvil", moneda: "BS", saldo: 90000 },
        }
        mockObtenerCuenta.mockImplementation(
          (_uid: string, id: string) => Promise.resolve(cuentas[id] ?? null)
        )
      }

      it("rechaza transferencia sin targetAccountId", async () => {
        const respuesta = await POST(
          peticion({
            monto: 100,
            tipo: "transferencia",
            categoria: "Transferencias",
            accountId: "cta-usd",
          })
        )
        expect(respuesta.status).toBe(400)
        const cuerpo = await respuesta.json()
        expect(cuerpo.error).toContain("targetAccountId")
      })

      it("rechaza transferencia con cuenta origen igual a la destino", async () => {
        const respuesta = await POST(
          peticion({ ...CUERPO_TRANSFERENCIA, targetAccountId: "cta-usd" })
        )
        expect(respuesta.status).toBe(400)
        const cuerpo = await respuesta.json()
        expect(cuerpo.error).toContain("distintas")
      })

      it("rechaza transferencia con categoría distinta de Transferencias", async () => {
        const respuesta = await POST(
          peticion({ ...CUERPO_TRANSFERENCIA, categoria: "Comida" })
        )
        expect(respuesta.status).toBe(400)
        const cuerpo = await respuesta.json()
        expect(cuerpo.error).toContain("Transferencias")
      })

      it("rechaza comision menor o igual que cero", async () => {
        const respuesta = await POST(
          peticion(cuerpoValido({ comision: 0 }))
        )
        expect(respuesta.status).toBe(400)
      })

      it("rechaza subcategoria de más de 50 caracteres", async () => {
        const respuesta = await POST(
          peticion(cuerpoValido({ subcategoria: "s".repeat(51) }))
        )
        expect(respuesta.status).toBe(400)
      })

      it("registra transferencia USD→USD con deltas opuestos en un solo commit", async () => {
        mockObtenerCuenta.mockImplementation((_uid: string, id: string) =>
          Promise.resolve(
            id === "cta-usd"
              ? { nombre: "Zelle", moneda: "USD", saldo: 500 }
              : { nombre: "Efectivo USD", moneda: "USD", saldo: 300 }
          )
        )
        const respuesta = await POST(peticion(CUERPO_TRANSFERENCIA))
        expect(respuesta.status).toBe(200)

        expect(mockCommitGenerico).toHaveBeenCalledTimes(1)
        const escrituras = mockCommitGenerico.mock.calls[0][0]

        const doc = escrituras[0].datos
        expect(doc.type).toBe("transferencia")
        expect(doc.category).toBe("Transferencias")
        expect(doc.accountId).toBe("cta-usd")
        expect(doc.targetAccountId).toBe("cta-bs")

        const saldoOrigen = escrituras.find(
          (e: { clase: string; accountId?: string }) =>
            e.clase === "saldo" && e.accountId === "cta-usd"
        )
        const saldoDestino = escrituras.find(
          (e: { clase: string; accountId?: string }) =>
            e.clase === "saldo" && e.accountId === "cta-bs"
        )
        expect(saldoOrigen.delta).toBe(-100)
        expect(saldoDestino.delta).toBe(100)
        expect(escrituras.filter((e: { clase: string }) => e.clase === "doc")).toHaveLength(1)

        const cuerpo = await respuesta.json()
        expect(cuerpo.success).toBe(true)
        expect(cuerpo.transaccion.id).toBe("id-commit-789")
      })

      it("convierte el monto destino cuando las monedas difieren (USD→BS)", async () => {
        mockearDosCuentas()
        const respuesta = await POST(peticion(CUERPO_TRANSFERENCIA))
        const escrituras = mockCommitGenerico.mock.calls[0][0]
        const saldoDestino = escrituras.find(
          (e: { clase: string; accountId?: string }) =>
            e.clase === "saldo" && e.accountId === "cta-bs"
        )
        // 100 USD * 500 = 50000 BS
        expect(saldoDestino.delta).toBe(50000)
      })

      it("devuelve 400 si la cuenta origen no existe", async () => {
        mockObtenerCuenta.mockResolvedValue(null)
        const respuesta = await POST(peticion(CUERPO_TRANSFERENCIA))
        expect(respuesta.status).toBe(400)
        const cuerpo = await respuesta.json()
        expect(cuerpo.error).toContain("origen")
      })

      it("devuelve 400 si la cuenta destino no existe", async () => {
        mockObtenerCuenta.mockImplementation((_uid: string, id: string) =>
          id === "cta-usd"
            ? Promise.resolve({ nombre: "Zelle", moneda: "USD", saldo: 500 })
            : Promise.resolve(null)
        )
        const respuesta = await POST(peticion(CUERPO_TRANSFERENCIA))
        expect(respuesta.status).toBe(400)
        const cuerpo = await respuesta.json()
        expect(cuerpo.error).toContain("destino")
      })

      it("devuelve 400 si el saldo origen no alcanza para monto + comisión", async () => {
        mockearDosCuentas()
        mockObtenerCuenta.mockImplementation((_uid: string, id: string) =>
          id === "cta-usd"
            ? Promise.resolve({ nombre: "Zelle", moneda: "USD", saldo: 50 })
            : Promise.resolve({ nombre: "Pago Móvil", moneda: "BS", saldo: 90000 })
        )
        const respuesta = await POST(
          peticion({ ...CUERPO_TRANSFERENCIA, comision: 5 })
        )
        expect(respuesta.status).toBe(400)
        const cuerpo = await respuesta.json()
        expect(cuerpo.error).toContain("Saldo insuficiente")
      })

      it("con comisión registra documento aparte y descuenta del mismo saldo origen", async () => {
        mockearDosCuentas()
        const respuesta = await POST(
          peticion({ ...CUERPO_TRANSFERENCIA, comision: 5 })
        )
        expect(respuesta.status).toBe(200)

        const escrituras = mockCommitGenerico.mock.calls[0][0]
        const docs = escrituras.filter((e: { clase: string }) => e.clase === "doc")
        expect(docs).toHaveLength(2)
        const docComision = docs[1].datos
        expect(docComision.category).toBe("Comisiones")
        expect(docComision.amount).toBe(5)
        expect(docComision.type).toBe("gasto")

        const saldoOrigen = escrituras.find(
          (e: { clase: string; accountId?: string }) =>
            e.clase === "saldo" && e.accountId === "cta-usd"
        )
        // -(monto 100 + comisión 5)
        expect(saldoOrigen.delta).toBe(-105)
      })

      it("gasto sin cuenta con comisión crea ambos documentos sin tocar saldos", async () => {
        const respuesta = await POST(
          peticion(cuerpoValido({ comision: 2.5 }))
        )
        expect(respuesta.status).toBe(200)

        const escrituras = mockCommitGenerico.mock.calls[0][0]
        expect(escrituras.filter((e: { clase: string }) => e.clase === "doc")).toHaveLength(2)
        expect(escrituras.filter((e: { clase: string }) => e.clase === "saldo")).toHaveLength(0)
        // camino antiguo NO debe usarse
        expect(mockCrearTransaccion).not.toHaveBeenCalled()
      })

      it("gasto con cuenta y comisión fusiona delta -(monto+comisión) en un saldo", async () => {
        mockObtenerCuenta.mockResolvedValue({ nombre: "Zelle", moneda: "USD", saldo: 1000 })
        const respuesta = await POST(
          peticion(cuerpoValido({ accountId: "cta-usd", comision: 3 }))
        )
        expect(respuesta.status).toBe(200)

        const escrituras = mockCommitGenerico.mock.calls[0][0]
        const docs = escrituras.filter((e: { clase: string }) => e.clase === "doc")
        expect(docs.map((d: { datos: { category: string } }) => d.datos.category)).toEqual([
          "Comida",
          "Comisiones",
        ])
        const saldoOrigen = escrituras.find((e: { clase: string }) => e.clase === "saldo")
        expect(saldoOrigen.delta).toBe(-103)
      })

      it("persiste subcategoria como subcategory en el documento", async () => {
        const respuesta = await POST(
          peticion(cuerpoValido({ subcategoria: "Mercado Municipal" }))
        )
        expect(respuesta.status).toBe(200)
        const docData = mockCrearTransaccion.mock.calls[0][0]
        expect(docData.subcategory).toBe("Mercado Municipal")
      })

      it("regresión: gasto simple con cuenta sigue usando el commit atómico original", async () => {
        mockObtenerCuenta.mockResolvedValue({ nombre: "Efectivo", moneda: "USD", saldo: 1000 })
        const respuesta = await POST(peticion(cuerpoValido({ accountId: "cta-usd" })))
        expect(respuesta.status).toBe(200)
        expect(mockCommitAtomico).toHaveBeenCalledTimes(1)
        expect(mockCommitGenerico).not.toHaveBeenCalled()
      })

      it("canonicaliza el monto VES a USD en el documento (canon de la app)", async () => {
        const respuesta = await POST(
          peticion(cuerpoValido({ monto: 2500, currency: "VES" }))
        )
        expect(respuesta.status).toBe(200)
        const docData = mockCrearTransaccion.mock.calls[0][0]
        expect(docData.amount).toBe(5) // 2500 VES / 500
        expect(docData.originalAmount).toBe(2500)
        expect(docData.exchangeRate).toBe(500)
        expect(docData.currency).toBe("VES")
      })

      it("vincula la comisión con transaccionAsociadaId igual al documento principal", async () => {
        mockObtenerCuenta.mockResolvedValue({ nombre: "Zelle", moneda: "USD", saldo: 1000 })
        await POST(
          peticion(cuerpoValido({ accountId: "cta-usd", comision: 3 }))
        )
        const escrituras = mockCommitGenerico.mock.calls[0][0]
        const idPrincipal = escrituras[0].docId
        expect(idPrincipal).toBeTruthy()
        const docComision = escrituras[1].datos
        expect(docComision.transaccionAsociadaId).toBe(idPrincipal)
      })
    })
  })
})