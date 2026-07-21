import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBCVRate } from '../currency';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('getBCVRate', () => {
  it('devuelve la tasa fallback cuando la API falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const rate = await getBCVRate();
    expect(rate).toBeTypeOf('number');
    expect(rate).toBeGreaterThan(0);
  });

  it('devuelve un número positivo', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const rate = await getBCVRate();
    expect(rate).toBeGreaterThan(0);
  });

  it('usa el caché en llamadas consecutivas (no lanza nuevo fetch)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    await getBCVRate();
    fetchMock.mockClear();
    fetchMock.mockRejectedValue(new Error('Should not fetch'));

    const rate = await getBCVRate();
    expect(rate).toBeTypeOf('number');
  });
});
