import { describe, it, expect } from 'vitest';
import { resolveMarcador, getRecord, buildPlayerMatchLog, getRecordSinConvocar, getMinutos, minutosPosibles, getEstadisticasJugadores, getRotacion } from './playerStats';
import { jornada, amarilla, gol, roja, titular, suplente } from './__fixtures__/jornadas';

const P = 'player-1';

describe('resolveMarcador', () => {
  it('orienta el marcador desde CAP según el escenario', () => {
    expect(resolveMarcador({ escenario: 'Neutral', goles_local: 2, goles_visitante: 1 })).toEqual({ capGoles: 2, rivalGoles: 1, resultado: 'G' });
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

describe('minutos', () => {
  // Cuatro partidos de 90' de 5ta y uno viejo sin cambios cargados (sin duracion)
  const roja90 = { ...roja('a'), minuto: 60 };
  const jornadas = [
    jornada({ fecha: '2026-03-07', duracion: 90, players: [titular('a'), titular('b', 70), suplente('c', 70), suplente('d')], eventos: [gol('a', 10)] }),
    jornada({ fecha: '2026-03-14', duracion: 90, players: [titular('a'), titular('c', 46), suplente('b', 46, 80), suplente('d')], eventos: [gol('a', 20), gol('b', 50)] }),
    jornada({ fecha: '2026-03-21', duracion: 90, players: [titular('a'), titular('b'), suplente('c'), suplente('d', 85)], eventos: [roja90] }),
    jornada({ fecha: '2026-03-28', duracion: 90, categoria: '4ta', players: [titular('a')] }),
    jornada({ fecha: '2025-10-01', players: [titular('a'), suplente('d')] }),
  ];

  it('calcula minutos, jugados, completos, reemplazos e ingresos de un jugador', () => {
    const log = buildPlayerMatchLog(jornadas, 'b', { year: 2026 });
    expect(getMinutos(log)).toMatchObject({
      minutos: 70 + 34 + 90,
      partidosConMinutos: 3,
      jugados: 3,
      sinJugar: 0,
      completos: 1,
      reemplazado: 1,
      minSalidaProm: 70,
      ingresos: 1,
      minIngresoProm: 46,
    });
  });

  it('el suplente que no entró no suma partido jugado', () => {
    const log = buildPlayerMatchLog(jornadas, 'd', { year: 2026 });
    expect(getMinutos(log)).toMatchObject({ minutos: 5, jugados: 1, sinJugar: 2, ingresos: 1 });
    expect(log.map((m) => m.jugo)).toEqual([false, false, true]);
  });

  it('el suplente que hizo un gol jugó aunque falte su minuto de entrada', () => {
    const js = [jornada({ fecha: '2026-04-04', duracion: 90, players: [titular('a', 60), suplente('e')], eventos: [gol('e', 75)] })];
    const log = buildPlayerMatchLog(js, 'e');
    expect(log[0].jugo).toBe(true);
    expect(getMinutos(log)).toMatchObject({ jugados: 1, sinJugar: 0 });
    expect(getEstadisticasJugadores(js, []).find((s) => s.id === 'e')).toMatchObject({ pj: 1, goles: 1, golesRatio: 1 });
  });

  it('la roja corta los minutos y el partido no es completo', () => {
    const log = buildPlayerMatchLog(jornadas, 'a', { year: 2026, categoria: '5ta' });
    expect(getMinutos(log)).toMatchObject({ minutos: 90 + 90 + 60, completos: 2 });
  });

  it('un partido sin duracion cuenta como jugado pero no suma minutos', () => {
    const log = buildPlayerMatchLog(jornadas, 'a', { year: 2025 });
    expect(getMinutos(log)).toMatchObject({ minutos: 0, partidosConMinutos: 0, jugados: 1 });
  });

  it('minutos por gol y goles cada 90; con menos de 90 minutos no hay G/90', () => {
    const a = getMinutos(buildPlayerMatchLog(jornadas, 'a', { year: 2026, categoria: '5ta' }));
    expect(a.minPorGol).toBe(120);
    expect(a.golesPor90).toBeCloseTo(0.75);
    const corto = getMinutos([{ tipo: 'suplente', minutos: 30, minutoEntrada: 60, duracion: 90, goles: 1 }]);
    expect(corto).toMatchObject({ minPorGol: 30, golesPor90: null });
  });

  it('% de minutos sobre los de sus categorías', () => {
    const posibles = minutosPosibles(jornadas, ['5ta'], { year: 2026 });
    expect(posibles).toBe(270);
    expect(getMinutos(buildPlayerMatchLog(jornadas, 'b', { year: 2026 }), posibles).pctMinutos).toBeCloseTo((194 / 270) * 100);
  });
});

describe('getEstadisticasJugadores', () => {
  const jornadas = [
    jornada({ fecha: '2026-03-07', duracion: 90, players: [titular('a'), suplente('d')] }),
    jornada({ fecha: '2026-03-14', duracion: 90, players: [titular('a', 60), suplente('d', 60)], eventos: [gol('d', 70)] }),
    jornada({ fecha: '2026-03-21', duracion: 90, categoria: '4ta', players: [titular('a')] }),
  ];
  const players = [{ id: 'a', name: 'Ana' }, { id: 'd', name: 'Dani' }];

  it('PJ son los jugados; convocatorias y sin jugar aparte', () => {
    const d = getEstadisticasJugadores(jornadas, players).find((s) => s.id === 'd');
    expect(d).toMatchObject({ convocatorias: 2, pj: 1, sinJugar: 1, suplente: 1, minutos: 30, goles: 1, golesRatio: 1, pctMinutos: (30 / 180) * 100 });
  });

  it('el % de minutos usa las categorías en las que fue convocado, y respeta el filtro', () => {
    const a = getEstadisticasJugadores(jornadas, players).find((s) => s.id === 'a');
    expect(a).toMatchObject({ categoria: '4ta/5ta', minutos: 240, pctMinutos: (240 / 270) * 100, completos: 2, reemplazado: 1 });
    const a5 = getEstadisticasJugadores(jornadas, players, '5ta').find((s) => s.id === 'a');
    expect(a5).toMatchObject({ categoria: '5ta', minutos: 150, pctMinutos: (150 / 180) * 100 });
  });
});

describe('getRotacion', () => {
  it('resume jugadores usados, cambios y primer cambio de la categoría', () => {
    const jornadas = [
      jornada({ fecha: '2026-03-07', duracion: 90, players: [titular('a'), titular('b', 60), suplente('c', 60), suplente('d')] }),
      jornada({ fecha: '2026-03-14', duracion: 90, players: [titular('a'), titular('c', 46), suplente('b', 46), suplente('d', 80)] }),
      jornada({ fecha: '2026-03-21', categoria: '4ta', players: [titular('z')] }),
    ];
    expect(getRotacion(jornadas, '5ta')).toMatchObject({
      partidos: 2,
      jugadoresUsados: 4,
      masDeLaMitad: 2, // a (180) y b (60 + 44)
      cambiosPorPartido: 1.5,
      minutoPrimerCambio: 53,
      top: { player_id: 'a', minutos: 180, pct: 100 },
    });
    expect(getRotacion(jornadas, '4ta')).toBeNull();
  });
});
