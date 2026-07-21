import { describe, it, expect } from 'vitest';
import { obtenerSimboloMoneda, formatearSaldo, obtenerColorMoneda, MONEDAS_SOPORTADAS, convertirMontoParaCuenta, resolverIdCuenta, obtenerTasaParaMoneda } from '../bankAccounts';

describe('obtenerSimboloMoneda', () => {
  it('devuelve $ para USD', () => {
    expect(obtenerSimboloMoneda('USD')).toBe('$');
  });

  it('devuelve € para EUR', () => {
    expect(obtenerSimboloMoneda('EUR')).toBe('€');
  });

  it('devuelve ₮ para USDT', () => {
    expect(obtenerSimboloMoneda('USDT')).toBe('₮');
  });

  it('devuelve Bs. para BS', () => {
    expect(obtenerSimboloMoneda('BS')).toBe('Bs.');
  });

  it('devuelve $ por defecto para moneda no soportada', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(obtenerSimboloMoneda('XXX' as any)).toBe('$');
  });
});

describe('formatearSaldo', () => {
  it('incluye símbolo de moneda', () => {
    const result = formatearSaldo(1500.5, 'USD');
    expect(result).toContain('$');
  });

  it('incluye el monto formateado', () => {
    const result = formatearSaldo(1500.5, 'USD');
    expect(result).toContain('1500');
  });
});

describe('obtenerColorMoneda', () => {
  it('devuelve colores para USD', () => {
    const color = obtenerColorMoneda('USD');
    expect(color).toHaveProperty('bg');
    expect(color).toHaveProperty('text');
    expect(color).toHaveProperty('border');
    expect(color).toHaveProperty('gradient');
  });

  it('devuelve colores para BS', () => {
    const color = obtenerColorMoneda('BS');
    expect(color.bg).toContain('amber');
  });
});

describe('convertirMontoParaCuenta', () => {
  it('devuelve el mismo monto si la cuenta es USD', () => {
    const result = convertirMontoParaCuenta(100, 'USD', 'USD');
    expect(result).toBe(100);
  });

  it('usa originalAmount si la cuenta es BS y moneda es VES', () => {
    const result = convertirMontoParaCuenta(50, 'VES', 'BS', 400, 20000);
    expect(result).toBe(20000);
  });

  it('usa exchangeRate si la cuenta es BS y moneda no es VES', () => {
    const result = convertirMontoParaCuenta(50, 'USD', 'BS', 400);
    expect(result).toBe(20000);
  });

  it('usa monto como fallback si no hay exchangeRate y cuenta es BS', () => {
    const result = convertirMontoParaCuenta(50, 'USD', 'BS');
    expect(result).toBe(50);
  });
});

describe('resolverIdCuenta', () => {
  const cuentas = [
    { id: 'abc123', nombre: 'Cuenta Principal', banco: 'banesco' },
    { id: 'def456', nombre: 'Ahorros', banco: 'mercantil' },
  ];

  it('resuelve por ID exacto', () => {
    expect(resolverIdCuenta('abc123', cuentas)).toBe('abc123');
  });

  it('resuelve por nombre parcial único', () => {
    expect(resolverIdCuenta('mercantil', cuentas)).toBe('def456');
  });

  it('resuelve por nombre exacto ignorando acentos', () => {
    expect(resolverIdCuenta('cuenta principal', cuentas)).toBe('abc123');
  });

  it('resuelve alias de banco venezuela', () => {
    const cuentasVe = [
      { id: 've1', nombre: 'Banco Venezuela (BS)', banco: 'Banco de Venezuela' },
      { id: 'pr1', nombre: 'Banco Provincial (BS)', banco: 'Provincial (BBVA)' },
      { id: 'me1', nombre: 'Mercantil (BS)', banco: 'Mercantil' },
    ];
    expect(resolverIdCuenta('venezuela', cuentasVe)).toBe('ve1');
    expect(resolverIdCuenta('en mi cuenta venezuela', cuentasVe)).toBe('ve1');
  });

  it('devuelve null si hay ambigüedad', () => {
    expect(resolverIdCuenta('banco', cuentas)).toBeNull();
  });
});

describe('obtenerTasaParaMoneda', () => {
  it('usa tasa EUR cuando corresponde', () => {
    expect(obtenerTasaParaMoneda('EUR', { USD: 50, EUR: 60, USDT: 55 })).toBe(60);
  });
});

describe('MONEDAS_SOPORTADAS', () => {
  it('contiene las 4 monedas', () => {
    expect(MONEDAS_SOPORTADAS).toHaveLength(4);
  });

  it('incluye USD, EUR, USDT, BS', () => {
    const ids = MONEDAS_SOPORTADAS.map(m => m.id);
    expect(ids).toContain('USD');
    expect(ids).toContain('EUR');
    expect(ids).toContain('USDT');
    expect(ids).toContain('BS');
  });
});
