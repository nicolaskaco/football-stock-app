import { describe, expect, it } from 'vitest';
import {
  campoDeOrden, describirCriterio, detalleResultado, ESQUEMA_RESPUESTA_IA, type Filtro, filtrarJugadores, filtroVacio,
  type Jugador, montosViatico, type StatsJugador, usaStats, validarFiltro,
} from './filtros';
import type { Permisos } from './logica';

const HOY = '2026-11-25';

const perm = (over: Partial<Permisos> = {}): Permisos => ({
  email: 'x@cap.uy', role: 'admin', categoria: null,
  can_access_players: true, can_view_partidos: true, can_access_widgets: true, can_access_tareas: false, can_access_viatico: true,
  ...over,
});

/** Filtro vacío de la IA, con lo que se pise. */
const crudo = (over: Record<string, unknown> = {}) => {
  const vacio = { min: null, max: null };
  return {
    categorias: [], categorias_juego: [], posiciones: [], anios_nacimiento: [], nacimiento_desde: null, nacimiento_hasta: null,
    mes_nacimiento_desde: null, mes_nacimiento_hasta: null, edad: vacio, cumple_mes: null, estados: [], departamentos: [],
    casita: null, vianda_min: null, ficha: null, ficha_dias: null, anio_stats: null,
    goles: vacio, amarillas: vacio, rojas: vacio, minutos: vacio, convocatorias: vacio, titular: vacio, suspendido_hoy: null,
    viatico_total: vacio, viatico: vacio, complemento: vacio, contrato: null, caso_especial: null,
    orden: { campo: null, descendente: null },
    ...over,
  };
};

const filtro = (over: Record<string, unknown> = {}, p = perm(), enGrupo = false): Filtro => {
  const r = validarFiltro(crudo(over), p, { enGrupo });
  if (!r.ok) throw new Error(r.error);
  return r.filtro;
};

const J = (over: Partial<Jugador>): Jugador => ({ id: over.name || 'x', name: 'x', categoria: '5ta', status: 'activo', ...over });

const jugadores: Jugador[] = [
  J({ id: 'a', name: 'Ana', categoria: '5ta', date_of_birth: '2009-03-10', viatico: 8000, complemento: 3000, posicion: 'Arquero', departamento: 'Canelones', vianda: 2 }),
  J({ id: 'b', name: 'Beto', categoria: '5ta', date_of_birth: '2009-08-01', viatico: 12000, complemento: 0, posicion: 'Volante', casita: true }),
  J({ id: 'c', name: 'Caro', categoria: '4ta', date_of_birth: '2008-01-20', contrato: true, incluir_viatico_export: true, complemento: 5000, ficha_medica_hasta: '2026-11-01' }),
  J({ id: 'd', name: 'Dani', categoria: '4ta', date_of_birth: '2008-06-30', contrato: true, status: 'cedido' }),
  J({ id: 'e', name: 'Eli', categoria: '6ta', date_of_birth: '2011-05-05', viatico: 5000, ficha_medica_hasta: '2026-12-10' }),
];

const stats = new Map<string, StatsJugador>([
  ['a', { goles: 0, amarillas: 9, rojas: 0, minutos: 900, convocatorias: 12, titular: 11 }],
  ['b', { goles: 7, amarillas: 8, rojas: 1, minutos: 1100, convocatorias: 14, titular: 13 }],
  ['c', { goles: 2, amarillas: 3, rojas: 0, minutos: null, convocatorias: 5, titular: 2 }],
]);

const ids = (r: { jugador: Jugador }[]) => r.map((x) => x.jugador.id);

describe('esquema de la IA', () => {
  it('pide todas las propiedades y no admite otras (structured outputs)', () => {
    const f = ESQUEMA_RESPUESTA_IA.properties.filtro;
    expect(f.additionalProperties).toBe(false);
    expect(f.required.sort()).toEqual(Object.keys(f.properties).sort());
  });
  it('no usa tipos unión (límite de 16 en structured outputs) ni propiedades opcionales', () => {
    const json = JSON.stringify(ESQUEMA_RESPUESTA_IA);
    expect(json).not.toContain('anyOf');
    expect(json).not.toContain('"null"');
    const opcionales = (s: unknown): number => {
      if (!s || typeof s !== 'object') return 0;
      const o = s as Record<string, unknown>;
      const props = (o.properties || {}) as Record<string, unknown>;
      const req = new Set((o.required as string[]) || []);
      return Object.keys(props).filter((k) => !req.has(k)).length +
        Object.values(props).reduce((n: number, v) => n + opcionales(v) + opcionales((v as Record<string, unknown>)?.items), 0);
    };
    expect(opcionales(ESQUEMA_RESPUESTA_IA)).toBe(0);
  });
});

describe('centinelas de la IA', () => {
  it('-1, "", "cualquiera", "ninguna" y "ninguno" son "sin valor"', () => {
    const f = filtro({
      categorias: ['5ta'], vianda_min: -1, cumple_mes: -1, nacimiento_desde: '', casita: 'cualquiera', ficha: 'ninguna',
      amarillas: { min: -1, max: -1 }, orden: { campo: 'ninguno', descendente: 'cualquiera' },
    });
    expect(f.vianda_min).toBeNull();
    expect(f.cumple_mes).toBeNull();
    expect(f.nacimiento_desde).toBeNull();
    expect(f.casita).toBeNull();
    expect(f.ficha).toBeNull();
    expect(f.amarillas).toEqual({ min: null, max: null });
    expect(f.orden).toEqual({ campo: null, descendente: null });
  });
  it('"si" y "no" son booleanos', () => {
    expect(filtro({ casita: 'si' }).casita).toBe(true);
    expect(filtro({ casita: 'no' }).casita).toBe(false);
  });
});

describe('validarFiltro', () => {
  it('descarta valores fuera de la lista blanca y normaliza tildes', () => {
    const f = filtro({ categorias: ['5ta', 'Primera'], departamentos: ['canelones', 'Narnia'], posiciones: ['arquero'] });
    expect(f.categorias).toEqual(['5ta']);
    expect(f.departamentos).toEqual(['Canelones']);
    expect(f.posiciones).toEqual(['Arquero']);
  });
  it('descarta números inválidos', () => {
    const f = filtro({ amarillas: { min: -3, max: 2.5 }, cumple_mes: 13, mes_nacimiento_desde: 1 });
    expect(f.amarillas).toEqual({ min: null, max: null });
    expect(f.cumple_mes).toBeNull();
  });
  it('un filtro vacío no se acepta', () => {
    expect(validarFiltro(crudo(), perm(), { enGrupo: false })).toEqual({ ok: false, error: expect.stringMatching(/qué filtrar/) });
    expect(filtroVacio(filtro({ categorias: ['5ta'] }))).toBe(false);
  });
  it('no deja pedir categorías ajenas', () => {
    const r = validarFiltro(crudo({ categorias: ['4ta'] }), perm({ role: 'presidente', categoria: ['5ta'] }), { enGrupo: false });
    expect(r).toEqual({ ok: false, error: 'No tenés acceso a 4ta.' });
  });
  it('estadísticas solo con permiso de Partidos', () => {
    const r = validarFiltro(crudo({ amarillas: { min: 8, max: null } }), perm({ can_view_partidos: false }), { enGrupo: false });
    expect(r.ok).toBe(false);
  });
  it('viático solo por privado y con permiso', () => {
    const v = crudo({ viatico_total: { min: 10001, max: null } });
    expect(validarFiltro(v, perm(), { enGrupo: true })).toEqual({ ok: false, error: expect.stringMatching(/privado/) });
    expect(validarFiltro(v, perm({ can_access_viatico: false }), { enGrupo: false }).ok).toBe(false);
    expect(validarFiltro(v, perm(), { enGrupo: false }).ok).toBe(true);
  });
  it('ordenar por viático también cuenta como pregunta de viático', () => {
    const r = validarFiltro(crudo({ categorias: ['5ta'], orden: { campo: 'viatico_total', descendente: true } }), perm(), { enGrupo: true });
    expect(r.ok).toBe(false);
  });
  it('ordenar por una estadística cuenta como pregunta de estadísticas', () => {
    const crudoOrden = crudo({ orden: { campo: 'goles', descendente: 'si' } });
    const r = validarFiltro(crudoOrden, perm(), { enGrupo: false });
    expect(r.ok && usaStats(r.filtro)).toBe(true);
    expect(validarFiltro(crudoOrden, perm({ can_view_partidos: false }), { enGrupo: false }).ok).toBe(false);
  });
  it('ficha médica solo para los roles que la ven', () => {
    const r = validarFiltro(crudo({ ficha: 'vencida' }), perm({ role: 'presidente', can_access_widgets: false }), { enGrupo: false });
    expect(r.ok).toBe(false);
  });
});

describe('filtrarJugadores', () => {
  const correr = (over: Record<string, unknown>) => filtrarJugadores(jugadores, filtro(over), { hoy: HOY, stats });

  it('viático mayor a 10000 compara el total con complemento', () => {
    expect(ids(correr({ viatico_total: { min: 10001, max: null } }))).toEqual(['b', 'a']);
  });
  it('el total de un caso especial es su complemento; con contrato, 0', () => {
    expect(montosViatico(jugadores[2], HOY).viatico_total).toBe(5000);
    expect(montosViatico(jugadores[3], HOY).viatico_total).toBe(0);
  });
  it('más de 7 amarillas, de mayor a menor', () => {
    expect(ids(correr({ amarillas: { min: 8, max: null } }))).toEqual(['a', 'b']);
  });
  it('nacidos entre enero y junio, por fecha', () => {
    expect(ids(correr({ mes_nacimiento_desde: 1, mes_nacimiento_hasta: 6 }))).toEqual(['c', 'a', 'e']);
  });
  it('solo activos salvo que se pidan otros estados', () => {
    expect(ids(correr({ categorias: ['4ta'] }))).toEqual(['c']);
    expect(ids(correr({ categorias: ['4ta'], estados: ['activo', 'cedido'] }))).toEqual(['c', 'd']);
  });
  it('sin partidos cuenta como 0 (nunca titular)', () => {
    expect(ids(correr({ titular: { min: null, max: 0 } }))).toEqual(['e']);
  });
  it('minutos sin cargar no entran en un filtro de minutos', () => {
    expect(ids(correr({ minutos: { min: null, max: 1000 } }))).toEqual(['e', 'a']);
  });
  it('combina filtros', () => {
    expect(ids(correr({ categorias: ['5ta'], anios_nacimiento: [2009], goles: { min: 3, max: null } }))).toEqual(['b']);
  });
  it('ficha vencida o por vencer', () => {
    expect(ids(correr({ ficha: 'vencida' }))).toEqual(['c']);
    expect(ids(correr({ ficha: 'por_vencer' }))).toEqual(['e']);
  });
  it('departamento, casita y vianda', () => {
    expect(ids(correr({ departamentos: ['Canelones'] }))).toEqual(['a']);
    expect(ids(correr({ casita: true }))).toEqual(['b']);
    expect(ids(correr({ vianda_min: 2 }))).toEqual(['a']);
  });
  it('suspendidos hoy', () => {
    const r = filtrarJugadores(jugadores, filtro({ suspendido_hoy: true }), { hoy: HOY, stats, suspendidos: new Set(['b']) });
    expect(ids(r)).toEqual(['b']);
  });
  it('edad', () => {
    expect(ids(correr({ edad: { min: 18, max: null } }))).toEqual(['c']);
  });
});

describe('ordenar por goles y tarjetas sin rango', () => {
  const correr = (over: Record<string, unknown>) => filtrarJugadores(jugadores, filtro(over), { hoy: HOY, stats });

  it('"con más goles" deja afuera a los de 0 y lo dice en el criterio', () => {
    const f = filtro({ anios_nacimiento: [2009], orden: { campo: 'goles', descendente: 'si' } });
    expect(f.goles).toEqual({ min: 1, max: null });
    expect(ids(filtrarJugadores(jugadores, f, { hoy: HOY, stats }))).toEqual(['b']);
    expect(describirCriterio(f, { anio: 2026, visibles: null })).toContain('al menos 1 gol');
  });
  it('lo mismo con amarillas y rojas', () => {
    expect(ids(correr({ orden: { campo: 'amarillas', descendente: 'cualquiera' } }))).toEqual(['a', 'b', 'c']);
    expect(ids(correr({ orden: { campo: 'rojas', descendente: 'si' } }))).toEqual(['b']);
  });
  it('en partidos y titularidades sí van los de 0', () => {
    expect(ids(correr({ orden: { campo: 'titular', descendente: 'si' } }))).toEqual(['b', 'a', 'c', 'e']);
    expect(ids(correr({ orden: { campo: 'convocatorias', descendente: 'si' } }))).toHaveLength(4);
  });
  it('un rango pedido se respeta', () => {
    expect(ids(correr({ goles: { min: null, max: 0 }, orden: { campo: 'goles', descendente: 'si' } }))).toEqual(['a', 'e']);
    expect(filtro({ goles: { min: 0, max: null }, orden: { campo: 'goles', descendente: 'si' } }).goles).toEqual({ min: 0, max: null });
  });
  it('si otro rango ya filtra, el orden solo ordena', () => {
    const f = filtro({ amarillas: { min: 8, max: null }, orden: { campo: 'goles', descendente: 'si' } });
    expect(f.goles).toEqual({ min: null, max: null });
    expect(ids(filtrarJugadores(jugadores, f, { hoy: HOY, stats }))).toEqual(['b', 'a']);
  });
  it('minutos de mayor a menor incluye a los de 0', () => {
    expect(filtro({ orden: { campo: 'minutos', descendente: 'si' } }).minutos).toEqual({ min: null, max: null });
  });
  it('de menor a mayor no agrega el mínimo', () => {
    expect(filtro({ orden: { campo: 'goles', descendente: 'no' } }).goles).toEqual({ min: null, max: null });
  });
});

describe('orden y texto', () => {
  it('con solo un máximo ordena de menor a mayor', () => {
    expect(campoDeOrden(filtro({ minutos: { min: null, max: 200 } }))).toEqual({ campo: 'minutos', descendente: false });
  });
  it('sin dato numérico ordena alfabético', () => {
    expect(campoDeOrden(filtro({ categorias: ['5ta'] }))).toEqual({ campo: 'nombre', descendente: false });
  });
  it('describe el criterio aplicado', () => {
    const f = filtro({ categorias: ['5ta'], amarillas: { min: 8, max: null } });
    expect(describirCriterio(f, { anio: 2026, visibles: null })).toBe('5ta · al menos 8 amarillas · 2026 · solo activos');
    expect(describirCriterio(filtro({ viatico_total: { min: 10001, max: null } }), { anio: 2026, visibles: ['5ta'] }))
      .toBe('tus categorías (5ta) · viático total desde $ 10.001 · solo activos');
  });
  it('muestra el dato de cada jugador', () => {
    const f = filtro({ amarillas: { min: 8, max: null } });
    const [primero] = filtrarJugadores(jugadores, f, { hoy: HOY, stats });
    expect(detalleResultado(primero, f, HOY)).toBe('9 🟨');
  });
});
