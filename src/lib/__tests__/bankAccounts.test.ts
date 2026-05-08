import { describe, it, expect } from 'vitest';
import { obtenerSimboloMoneda, formatearSaldo, obtenerColorMoneda, MONEDAS_SOPORTADAS, convertirMontoParaCuenta } from '../bankAccounts';

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
