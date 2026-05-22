import { describe, it, expect } from 'vitest';
import { aplicarCuentaAPendiente, filtrarCuentasParaBotones } from '../namiPendiente';

describe('aplicarCuentaAPendiente', () => {
  it('asigna accountId por defecto', () => {
    const r = aplicarCuentaAPendiente(
      { intent: 'transaction', amount: 100, campoFaltante: 'accountId' },
      'id-1'
    );
    expect(r.accountId).toBe('id-1');
    expect(r.campoFaltante).toBeUndefined();
  });

  it('asigna targetAccountId en transferencias', () => {
    const r = aplicarCuentaAPendiente(
      { intent: 'transaction', accountId: 'origen', campoFaltante: 'targetAccountId' },
      'destino-1'
    );
    expect(r.targetAccountId).toBe('destino-1');
    expect(r.accountId).toBe('origen');
  });
});

describe('filtrarCuentasParaBotones', () => {
  const cuentas = [
    { id: 'a', nombre: 'A', banco: 'x' },
    { id: 'b', nombre: 'B', banco: 'y' },
  ];

  it('excluye cuenta origen al elegir destino', () => {
    const f = filtrarCuentasParaBotones(cuentas, {
      accountId: 'a',
      campoFaltante: 'targetAccountId',
    });
    expect(f).toHaveLength(1);
    expect(f[0].id).toBe('b');
  });
});
