import { describe, it, expect } from 'vitest';
import { resolveMarcador, getRecord, buildPlayerMatchLog, getRecordSinConvocar } from './playerStats';
import { jornada, amarilla, gol, roja, titular, suplente } from './__fixtures__/jornadas';

const P = 'player-1';

describe('resolveMarcador', () => {
  it('orienta el marcador desde CAP según el escenario', () => {
    expect(resolveMarcador({ escenario: 'Local', goles_local: 2, goles_visitante: 1 })).toEqual({ capGoles: 2, rivalGoles: 1, resultado: 'G' });
    expect(resolveMarcador({ escenario: 'Visitante', goles_local: 2, goles_visitante: 1 })).toEqual({ capGoles: 1, rivalGoles: 2, resultado: 'P' });
    expect(resolveMarcador({ escenario: 'Local', goles_local: 0, goles_visitante: 0 }).resultado).toBe('E');
  });

  it('sin marcador completo el resultado es null', () => {
    expect(resolveMarcador({ escenario: 'Local', goles_local: 1, goles_visitante: null }).resultado).toBeNull();
  });
});

describe('getRecord', () => {
  it('cuenta solo partidos con resultado y calcula % de puntos 3-1-0', () => {
    const r = getRecord([{ resultado: 'G' }, { resultado: 'E' }, { resultado: 'P' }, { resultado: null }]);
    expect(r).toMatchObject({ pj: 3, g: 1, e: 1, p: 1 });
    expect(r.pctPuntos).toBeCloseTo((4 / 9) * 100);
  });

  it('sin partidos los porcentajes son null', () => {
    expect(getRecord([]).pctPuntos).toBeNull();
  });
});

describe('buildPlayerMatchLog', () => {
  const js = [
    jornada({ fecha: '2026-04-05', goles: [3, 1], players: [suplente(P, 60)], eventos: [gol(P, 75)] }),
    jornada({ fecha: '2026-03-01', goles: [0, 1], players: [titular(P)], eventos: [amarilla(P), roja(P, 2)] }),
    jornada({ fecha: '2026-03-08', goles: [1, 1], players: [titular('otro')] }),
    jornada({ fecha: '2025-10-01', goles: [1, 0], players: [titular(P)] }),
  ];

  it('incluye solo los partidos donde fue convocado, en orden cronológico', () => {
    const log = buildPlayerMatchLog(js, P);
    expect(log.map((m) => m.fecha)).toEqual(['2025-10-01', '2026-03-01', '2026-04-05']);
  });

  it('cuenta goles, tarjetas y filtra por año', () => {
    const log = buildPlayerMatchLog(js, P, { year: 2026 });
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ tipo: 'titular', amarillas: 1, rojas: 1, rojaFechas: 2, resultado: 'P' });
    expect(log[1]).toMatchObject({ tipo: 'suplente', goles: 1, golesMinutos: [75], resultado: 'G' });
  });

  it('calcula minutos solo si el partido tiene duración', () => {
    const conDuracion = jornada({ fecha: '2026-05-01', goles: [1, 0], players: [suplente(P, 60)] });
    conDuracion.partidos[0].duracion = 90;
    expect(buildPlayerMatchLog([conDuracion], P)[0].minutos).toBe(30);
    expect(buildPlayerMatchLog(js, P, { year: 2026 })[1].minutos).toBeNull();
  });
});

describe('getRecordSinConvocar', () => {
  it('cuenta los partidos sin convocar desde la primera convocatoria', () => {
    const js = [
      jornada({ fecha: '2026-03-01', goles: [1, 0], players: [titular('otro')] }), // antes de su primera convocatoria
      jornada({ fecha: '2026-03-08', goles: [1, 0], players: [titular(P)] }),
      jornada({ fecha: '2026-03-15', goles: [0, 2], players: [titular('otro')] }),
      jornada({ fecha: '2026-03-22', goles: [1, 1], players: [titular('otro')] }),
    ];
    expect(getRecordSinConvocar(js, P, '5ta')).toMatchObject({ pj: 2, g: 0, e: 1, p: 1 });
  });

  it('si nunca fue convocado no hay récord', () => {
    expect(getRecordSinConvocar([jornada({ fecha: '2026-03-01', goles: [1, 0] })], P, '5ta').pj).toBe(0);
  });
});
