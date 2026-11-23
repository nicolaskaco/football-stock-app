import { describe, it, expect, afterEach, vi } from 'vitest';
import { isFichaVencida, fechaPartidoDefault, fechaPartido } from './dateUtils';

afterEach(() => { vi.useRealTimers(); });

describe('isFichaVencida', () => {
  it('sin ficha cuenta como vencida', () => {
    expect(isFichaVencida({ ficha_medica_hasta: null }, '2026-03-01')).toBe(true);
    expect(isFichaVencida(undefined, '2026-03-01')).toBe(true);
  });

  it('vale hasta el último día inclusive', () => {
    const p = { ficha_medica_hasta: '2026-03-01' };
    expect(isFichaVencida(p, '2026-03-01')).toBe(false);
    expect(isFichaVencida(p, '2026-03-02')).toBe(true);
    expect(isFichaVencida(p, '2026-03-02T00:00:00')).toBe(true);
  });

  it('sin fecha compara con hoy', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(isFichaVencida({ ficha_medica_hasta: '2026-06-14' })).toBe(true);
    expect(isFichaVencida({ ficha_medica_hasta: '2026-06-15' }, '')).toBe(false);
  });
});

describe('fechaPartidoDefault / fechaPartido', () => {
  it('la 4ta juega el día anterior a la jornada, el resto el mismo día', () => {
    expect(fechaPartidoDefault('2026-03-01', '4ta')).toBe('2026-02-28');
    expect(fechaPartidoDefault('2026-03-01', '5ta')).toBe('2026-03-01');
    expect(fechaPartidoDefault(null, '5ta')).toBeNull();
  });

  it('la fecha propia del partido gana sobre la de la jornada', () => {
    expect(fechaPartido({ fecha: '2026-03-20', categoria: '5ta' }, { fecha: '2026-03-01' })).toBe('2026-03-20');
    expect(fechaPartido({ categoria: '4ta' }, { fecha: '2026-03-01' })).toBe('2026-02-28');
  });
});
