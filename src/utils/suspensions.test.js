import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getSuspensionMap, getCurrentSuspensionsByCategory, getYellowCountsByCategory } from './suspensions';
import { jornada, amarilla, roja, titular } from './__fixtures__/jornadas';

// El timeline solo usa jornadas del año actual
beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-06-30T12:00:00Z')); });
afterAll(() => { vi.useRealTimers(); });

const P = 'player-1';
const fechas = (n) => Array.from({ length: n }, (_, i) => `2026-03-${String(i + 1).padStart(2, '0')}`);

describe('getSuspensionMap', () => {
  it('suspende por la 5ª amarilla solo en la jornada siguiente', () => {
    const js = fechas(7).map((fecha, i) => jornada({ fecha, numero: i + 1, eventos: i < 5 ? [amarilla(P)] : [] }));
    expect(getSuspensionMap(js, js[4].id, '5ta').has(P)).toBe(false);
    expect(getSuspensionMap(js, js[5].id, '5ta').get(P)).toEqual({ reason: '5ª Amarilla' });
    expect(getSuspensionMap(js, js[6].id, '5ta').has(P)).toBe(false);
  });

  it('una roja de 2 fechas suspende las dos jornadas siguientes', () => {
    const js = fechas(4).map((fecha, i) => jornada({ fecha, numero: i + 1, eventos: i === 0 ? [roja(P, 2)] : [] }));
    expect(getSuspensionMap(js, js[1].id, '5ta').get(P).reason).toBe('Roja (2 fechas)');
    expect(getSuspensionMap(js, js[2].id, '5ta').get(P).reason).toBe('Roja (última fecha)');
    expect(getSuspensionMap(js, js[3].id, '5ta').has(P)).toBe(false);
  });

  it('la roja reinicia el contador de amarillas, incluidas las del mismo partido', () => {
    const js = [
      jornada({ fecha: '2026-03-01', eventos: [amarilla(P), amarilla(P), amarilla(P), amarilla(P)] }),
      jornada({ fecha: '2026-03-08', eventos: [amarilla(P), roja(P)] }),
      jornada({ fecha: '2026-03-15', eventos: [amarilla(P)] }),
      jornada({ fecha: '2026-03-22' }),
    ];
    // La 5ª amarilla quedó anulada por la roja: en J4 no hay suspensión
    expect(getSuspensionMap(js, js[3].id, '5ta').has(P)).toBe(false);
    expect(getYellowCountsByCategory(js).get('5ta').get(P)).toBe(1);
  });

  it('un partido reprogramado cuenta donde se jugó', () => {
    const js = [
      jornada({ fecha: '2026-03-01', eventos: [amarilla(P), amarilla(P), amarilla(P), amarilla(P)] }),
      // J2 se jugó después de J3
      jornada({ fecha: '2026-03-08', fechaPartido: '2026-03-20' }),
      jornada({ fecha: '2026-03-15', eventos: [amarilla(P)] }),
      jornada({ fecha: '2026-03-29' }),
    ];
    expect(getSuspensionMap(js, js[1].id, '5ta').get(P)).toEqual({ reason: '5ª Amarilla' });
    expect(getSuspensionMap(js, js[3].id, '5ta').has(P)).toBe(false);
  });

  it('aplica los ajustes manuales guardados y los que se pasan por parámetro', () => {
    const js = [
      jornada({ fecha: '2026-03-01', eventos: [roja(P)] }),
      jornada({ fecha: '2026-03-08', ajustes: [{ player_id: P, accion: 'quitar' }, { player_id: 'otro', accion: 'agregar', motivo: 'Tribunal' }] }),
    ];
    const map = getSuspensionMap(js, js[1].id, '5ta');
    expect(map.has(P)).toBe(false);
    expect(map.get('otro')).toEqual({ reason: 'Manual: Tribunal', manual: true });
    // ajustes: [] → solo el resultado automático
    expect(getSuspensionMap(js, js[1].id, '5ta', { ajustes: [] }).get(P).reason).toBe('Roja (última fecha)');
  });

  it('ignora jornadas de otros años y otras categorías', () => {
    const js = [
      jornada({ fecha: '2025-11-01', eventos: [roja(P)] }),
      jornada({ fecha: '2026-03-01', categoria: '6ta', eventos: [roja(P)] }),
      jornada({ fecha: '2026-03-08' }),
    ];
    expect(getSuspensionMap(js, js[2].id, '5ta').size).toBe(0);
  });
});

describe('getCurrentSuspensionsByCategory', () => {
  it('usa la jornada siguiente al último partido cargado (resultado + formación)', () => {
    const js = [
      jornada({ fecha: '2026-03-01', eventos: [roja(P)], goles: [1, 0], players: [titular(P)] }),
      jornada({ fecha: '2026-03-08' }),
    ];
    expect(getCurrentSuspensionsByCategory(js).get('5ta').has(P)).toBe(true);

    // Cuando se carga J2 la suspensión ya se cumplió
    const p2 = js[1].partidos[0];
    Object.assign(p2, { goles_local: 0, goles_visitante: 0, partido_players: [titular('otro')] });
    expect(getCurrentSuspensionsByCategory(js).get('5ta').has(P)).toBe(false);
  });

  it('si el último cargado es el último del timeline usa una jornada virtual', () => {
    const js = [jornada({ fecha: '2026-03-01', eventos: [roja(P)], goles: [1, 0], players: [titular(P)] })];
    expect(getCurrentSuspensionsByCategory(js).get('5ta').get(P).reason).toBe('Roja (última fecha)');
  });
});
