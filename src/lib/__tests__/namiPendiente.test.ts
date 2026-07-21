import { describe, it, expect } from 'vitest';
import { aplicarCuentaAPendiente, filtrarCuentasParaBotones, esMensajeCorrectivo } from '../namiPendiente';

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

describe('esMensajeCorrectivo', () => {
  const cuentas = [
    { id: '1', nombre: 'Mercantil 2', banco: 'Mercantil' },
    { id: '2', nombre: 'Banesco', banco: 'Banesco' },
  ];

  it('retorna false para respuestas directas de cuenta sin correcciones', () => {
    expect(esMensajeCorrectivo('Mercantil', 500, cuentas)).toBe(false);
    expect(esMensajeCorrectivo('en mi cuenta banesco', 500, cuentas)).toBe(false);
  });

  it('retorna true cuando el mensaje contiene palabras correctivas o de negación', () => {
    expect(esMensajeCorrectivo('no, en mercantil', 500, cuentas)).toBe(true);
    expect(esMensajeCorrectivo('me equivoqué, era en banesco', 500, cuentas)).toBe(true);
    expect(esMensajeCorrectivo('cancela eso', 500, cuentas)).toBe(true);
    expect(esMensajeCorrectivo('en mercantil pero era otro monto', 500, cuentas)).toBe(true);
  });

  it('retorna true cuando el mensaje contiene un monto numérico diferente al pendiente', () => {
    expect(esMensajeCorrectivo('eran 50 en banesco', 500, cuentas)).toBe(true);
    // Aunque no contenga palabras clave, si hay un número diferente, es correctivo
    expect(esMensajeCorrectivo('registro mercantil 50', 500, cuentas)).toBe(true);
  });

  it('retorna false si el número en el mensaje coincide con el monto pendiente', () => {
    // Si repite el mismo monto, no es discrepancia numérica
    expect(esMensajeCorrectivo('cuenta mercantil 500', 500, cuentas)).toBe(false);
  });

  it('retorna false si el número en el mensaje es parte del nombre de la cuenta', () => {
    // El '2' es parte de 'Mercantil 2', no debería considerarse correctivo
    expect(esMensajeCorrectivo('en mi cuenta Mercantil 2', 500, cuentas)).toBe(false);
  });
});

