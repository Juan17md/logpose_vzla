import { describe, it, expect } from 'vitest';
import { parseNumeroFlexible } from '../number';

describe('parseNumeroFlexible', () => {
  it('devuelve el mismo número si recibe un número', () => {
    expect(parseNumeroFlexible(1234.56)).toBe(1234.56);
  });

  it('parsea string con punto decimal', () => {
    expect(parseNumeroFlexible('1234.56')).toBe(1234.56);
  });

  it('parsea string con coma decimal', () => {
    expect(parseNumeroFlexible('1234,56')).toBe(1234.56);
  });

  it('parsea string con separador de miles y coma decimal', () => {
    expect(parseNumeroFlexible('1.234,56')).toBe(1234.56);
  });

  it('devuelve NaN para null', () => {
    expect(parseNumeroFlexible(null)).toBeNaN();
  });

  it('devuelve NaN para undefined', () => {
    expect(parseNumeroFlexible(undefined)).toBeNaN();
  });

  it('devuelve NaN para string vacío', () => {
    expect(parseNumeroFlexible('')).toBeNaN();
  });

  it('parsea string con espacios', () => {
    expect(parseNumeroFlexible('  500 ')).toBe(500);
  });

  it('parsea Infinity como NaN', () => {
    expect(parseNumeroFlexible(Infinity)).toBeNaN();
  });
});
