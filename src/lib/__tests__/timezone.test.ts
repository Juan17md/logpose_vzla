import { describe, it, expect } from 'vitest';
import { createVenezuelaDate } from '../timezone';

describe('createVenezuelaDate', () => {
  it('devuelve un objeto Date', () => {
    const date = createVenezuelaDate();
    expect(date).toBeInstanceOf(Date);
  });

  it('la fecha no es inválida', () => {
    const date = createVenezuelaDate();
    expect(date.getTime()).not.toBeNaN();
  });
});
