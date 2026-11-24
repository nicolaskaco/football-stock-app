import { describe, it, expect } from 'vitest';
import { armarPartidosJornada, escenarioDeCategoria } from './jornadas';
import { esJornadaUnaCategoria, fechaPartido, fechaPartidoDefaultEnJornada } from './dateUtils';

const jornada = { id: 'j1', fecha: '2026-12-06' };

describe('escenarioDeCategoria', () => {
  it('invierte 6ta y 7ma, salvo en cancha neutral', () => {
    expect(escenarioDeCategoria('Local', '5ta')).toBe('Local');
    expect(escenarioDeCategoria('Local', '7ma')).toBe('Visitante');
    expect(escenarioDeCategoria('Visitante', '6ta')).toBe('Local');
    expect(escenarioDeCategoria('Neutral', '6ta')).toBe('Neutral');
  });
});

describe('armarPartidosJornada', () => {
  it('jornada común: 5 partidos, inversión en 6ta/7ma y la 4ta el día anterior', () => {
    const partidos = armarPartidosJornada(jornada, 'Local');
    expect(partidos).toHaveLength(5);
    const por = Object.fromEntries(partidos.map((p) => [p.categoria, p]));
    expect(por['5ta']).toMatchObject({ escenario: 'Local', cesped: 'Sintético', fecha: '2026-12-06', jornada_id: 'j1' });
    expect(por['7ma']).toMatchObject({ escenario: 'Visitante', cesped: 'Natural' });
    expect(por['4ta'].fecha).toBe('2026-12-05');
  });

  it('Semifinal/Final: un solo partido, sin inversión y en la fecha de la jornada', () => {
    const partidos = armarPartidosJornada(jornada, 'Local', '7ma');
    expect(partidos).toEqual([{ jornada_id: 'j1', categoria: '7ma', fecha: '2026-12-06', escenario: 'Local', cesped: 'Sintético' }]);
    expect(armarPartidosJornada(jornada, 'Neutral', '4ta')[0]).toMatchObject({ fecha: '2026-12-06', escenario: 'Neutral', cesped: 'Natural' });
  });
});

describe('fecha por defecto en jornadas de una categoría', () => {
  const final4ta = { fecha: '2026-12-06', partidos: [{ categoria: '4ta' }] };
  const comun = { fecha: '2026-12-06', partidos: ['4ta', '5ta', 'S16', '6ta', '7ma'].map((categoria) => ({ categoria })) };

  it('la 4ta de una final juega el día de la jornada; en una común, el día anterior', () => {
    expect(esJornadaUnaCategoria(final4ta)).toBe(true);
    expect(fechaPartidoDefaultEnJornada(final4ta, '4ta')).toBe('2026-12-06');
    expect(fechaPartidoDefaultEnJornada(comun, '4ta')).toBe('2026-12-05');
    expect(fechaPartido({ categoria: '4ta', fecha: null }, final4ta)).toBe('2026-12-06');
  });
});
