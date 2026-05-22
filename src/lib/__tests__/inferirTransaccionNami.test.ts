import { describe, it, expect } from 'vitest';
import { inferirTransaccionDesdeTexto, mensajePideCuenta } from '../inferirTransaccionNami';

describe('inferirTransaccionDesdeTexto', () => {
  it('infiere gasto en bolívares y categoría comida', () => {
    const tx = inferirTransaccionDesdeTexto('gaste 100bs en comida');
    expect(tx).toMatchObject({
      intent: 'transaction',
      amount: 100,
      type: 'gasto',
      category: 'Comida',
      currency: 'VES',
    });
  });

  it('infiere ingreso en dólares', () => {
    const tx = inferirTransaccionDesdeTexto('recibí 50 dólares de salario');
    expect(tx).toMatchObject({
      amount: 50,
      type: 'ingreso',
      currency: 'USD',
      category: 'Salario',
    });
  });

  it('devuelve null si no hay monto', () => {
    expect(inferirTransaccionDesdeTexto('hola nami')).toBeNull();
  });
});

describe('mensajePideCuenta', () => {
  it('detecta pregunta por cuenta', () => {
    expect(
      mensajePideCuenta('¿De cuál de tus cuentas fue el gasto?')
    ).toBe(true);
  });
});
