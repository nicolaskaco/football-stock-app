import { describe, it, expect } from 'vitest';
import { asignarPartido, agruparPorJornada, diferenciasConPlanilla, clasificarHistorico } from './cometHistorico';
import { jornada, titular, suplente, amarilla, gol } from './__fixtures__/jornadas';

// Un informe ya leído (leerInforme) con lo mínimo que usa la asignación
const informe = ({ categoria = '5ta', rival = 'CLUB NACIONAL DE FOOTBALL', fase = 'Apertura', numeroFecha = 3, fecha = '2026-04-11' } = {}) => ({
  key: `${categoria}-${rival}-${fase}-${numeroFecha}`,
  categoria,
  parsed: { escenario: 'Local', local: 'PEÑAROL', visitante: rival, fase, numeroFecha, fecha },
});

describe('asignarPartido', () => {
  // Ida y vuelta contra el mismo rival, y otro rival el mismo día
  const ida = jornada({ fecha: '2026-04-11', numero: '3', rival: 'Nacional', fase: 'Apertura' });
  const vuelta = jornada({ fecha: '2026-09-12', numero: '3', rival: 'Nacional', fase: 'Clausura' });
  const otro = jornada({ fecha: '2026-04-11', numero: '3', rival: 'Danubio', fase: 'Apertura' });
  const jornadas = [ida, vuelta, otro];

  it('elige por rival, fase y N° de fecha', () => {
    expect(asignarPartido(informe(), jornadas)).toMatchObject({ jornada: ida, porFecha: false, motivo: null });
    expect(asignarPartido(informe({ fase: 'Clausura', fecha: '2026-09-12' }), jornadas).jornada).toBe(vuelta);
  });

  it('la fase sale del informe aunque el archivo diga otra cosa', () => {
    // El "nombre del archivo" no se mira: la fase la trae el torneo del informe
    expect(asignarPartido(informe({ fase: 'Apertura' }), jornadas).jornada).toBe(ida);
  });

  it('sin N° de fecha que coincida, acepta la fecha más cercana dentro de ±3 días y lo marca', () => {
    const r = asignarPartido(informe({ numeroFecha: 9, fecha: '2026-04-10' }), jornadas);
    expect(r).toMatchObject({ jornada: ida, porFecha: true, motivo: null });
  });

  it('no asigna si no hay jornada del rival en esa fecha', () => {
    expect(asignarPartido(informe({ numeroFecha: 9, fecha: '2026-05-30' }), jornadas).motivo).toBe('sin_jornada');
    expect(asignarPartido(informe({ rival: 'RIVER PLATE' }), jornadas).motivo).toBe('sin_jornada');
  });

  it('no usa jornadas de otro año', () => {
    const vieja = jornada({ fecha: '2025-04-12', numero: '3', rival: 'Nacional' });
    expect(asignarPartido(informe(), [vieja]).motivo).toBe('sin_jornada');
  });

  it('sin categoría (1era, 3era) o ilegible no se asigna', () => {
    expect(asignarPartido(informe({ categoria: '' }), jornadas).motivo).toBe('sin_categoria');
    expect(asignarPartido({ key: 'x', parsed: null, categoria: '' }, jornadas).motivo).toBe('ilegible');
  });

  it('dos jornadas igual de posibles es ambigua', () => {
    const a = jornada({ fecha: '2026-04-10', numero: '7', rival: 'Nacional' });
    const b = jornada({ fecha: '2026-04-12', numero: '8', rival: 'Nacional' });
    expect(asignarPartido(informe({ numeroFecha: 1, fecha: '2026-04-11' }), [a, b]).motivo).toBe('ambigua');
  });

  it('la 4ta juega el día anterior a la jornada', () => {
    const j = jornada({ fecha: '2026-04-11', numero: '3', rival: 'Nacional', categoria: '4ta' });
    const r = asignarPartido(informe({ categoria: '4ta', numeroFecha: null, fecha: '2026-04-10' }), [j]);
    expect(r).toMatchObject({ jornada: j, motivo: null });
  });
});

describe('agruparPorJornada', () => {
  it('agrupa por jornada en orden cronológico y separa los que no tienen partido', () => {
    const vuelta = jornada({ fecha: '2026-09-12', numero: '3', fase: 'Clausura' });
    const ida = jornada({ fecha: '2026-04-11', numero: '3' });
    const { grupos, sinAsignar } = agruparPorJornada([
      informe({ fase: 'Clausura', fecha: '2026-09-12' }),
      informe(),
      informe({ rival: 'PEÑAROL B', numeroFecha: 1 }),
    ], [vuelta, ida]);
    expect(grupos.map((g) => g.jornada)).toEqual([ida, vuelta]);
    expect(sinAsignar).toHaveLength(1);
  });
});

describe('diferenciasConPlanilla', () => {
  const partidoCargado = () => jornada({
    fecha: '2026-04-11',
    goles: [2, 0],
    players: [titular('a'), titular('b'), suplente('c')],
    eventos: [gol('a', 10), amarilla('b')],
  }).partidos[0];
  const preview = (over = {}) => ({
    titulares: [{ player_id: 'a' }, { player_id: 'b' }, { player_id: '' }],
    suplentes: [{ player_id: 'c', minuto_entrada: 60 }],
    eventos: { a: { goles: 1, amarilla: false, roja: false }, b: { goles: 0, amarilla: true, roja: false } },
    formData: { goles_local: 2, goles_visitante: 0, escenario: 'Local' },
    ...over,
  });
  const players = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' }, { id: 'c', name: 'Caro' }, { id: 'd', name: 'Dani' }];

  it('sin diferencias cuando el informe solo suma minutos', () => {
    expect(diferenciasConPlanilla(partidoCargado(), preview(), players)).toEqual({ items: [], hayDiferencias: false });
  });

  it('marca el titular que entra y el que sale', () => {
    const d = diferenciasConPlanilla(partidoCargado(), preview({ titulares: [{ player_id: 'a' }, { player_id: 'd' }] }), players);
    expect(d.items).toEqual([
      { tipo: 'suma', texto: 'Dani como titular' },
      { tipo: 'saca', texto: 'Beto como titular' },
    ]);
  });

  it('marca tarjetas, goles y resultado distintos', () => {
    const d = diferenciasConPlanilla(partidoCargado(), preview({
      eventos: { a: { goles: 2, amarilla: true, roja: false }, b: { goles: 0, amarilla: true, roja: false } },
      formData: { goles_local: 3, goles_visitante: 0, escenario: 'Local' },
    }), players);
    expect(d.items.map((x) => x.texto)).toEqual(['Goles de Ana: 1 → 2', 'Amarilla de Ana', 'Resultado: 2-0 → 3-0']);
    expect(d.hayDiferencias).toBe(true);
  });

  it('un partido sin planilla no tiene diferencias', () => {
    const vacio = jornada({ fecha: '2026-04-11' }).partidos[0];
    expect(diferenciasConPlanilla(vacio, preview(), players).hayDiferencias).toBe(false);
  });
});

describe('clasificarHistorico', () => {
  const sinDiff = { items: [], hayDiferencias: false };
  const conDiff = { items: [{ tipo: 'suma', texto: 'x' }], hayDiferencias: true };
  const ev = (over = {}) => ({ puede: true, yaCargado: false, motivosRevision: [], partido: { partido_players: [] }, ...over });

  it('guarda solo los que no tienen planilla o coinciden con ella', () => {
    expect(clasificarHistorico(ev(), sinDiff)).toBe('auto');
    expect(clasificarHistorico(ev({ yaCargado: true, partido: { partido_players: [titular('a')] } }), sinDiff)).toBe('auto');
  });

  it('deja para revisar las diferencias, los avisos y los bloqueos', () => {
    expect(clasificarHistorico(ev({ yaCargado: true }), conDiff)).toBe('revision');
    expect(clasificarHistorico(ev({ motivosRevision: ['x'] }), sinDiff)).toBe('revision');
    expect(clasificarHistorico(ev({ puede: false }), sinDiff)).toBe('revision');
  });

  it('no toca los que ya tienen minutos y coinciden', () => {
    const partido = { partido_players: [{ ...titular('a'), minuto_salida: 70 }] };
    expect(clasificarHistorico(ev({ yaCargado: true, partido }), sinDiff)).toBe('completo');
  });
});
