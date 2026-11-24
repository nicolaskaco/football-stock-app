import { describe, it, expect } from 'vitest';
import { CATEGORIAS as CATEGORIAS_APP } from '../../../src/utils/constants.js';
import {
  CATEGORIAS, parseMensaje, esParaEsteBot, parseCategoria, separarCategoria, categoriasVisibles, veCategoria, comandosDe,
  parseCodigo, edad, diasParaCumple, parseAnio, marcador, jornadaLabel, fechaPartido,
  rivalBuscado, nombreCoincide, type Permisos,
} from './logica';

const perm = (over: Partial<Permisos> = {}): Permisos => ({
  email: 'x@cap.uy', role: 'delegado', categoria: [],
  can_access_players: false, can_view_partidos: false, can_access_widgets: false, can_access_tareas: false,
  ...over,
});

describe('parseMensaje', () => {
  it('separa comando y argumentos', () => {
    expect(parseMensaje('/nacidos 2008 5ta')).toEqual({ comando: 'nacidos', destinatario: null, args: ['2008', '5ta'], resto: '2008 5ta' });
  });
  it('ignora la mención al bot y normaliza el comando', () => {
    expect(parseMensaje('/Próximo@CapBot').comando).toBe('proximo');
    expect(parseMensaje('/jugador@CapBot  Juan  Pérez ').resto).toBe('Juan  Pérez');
  });
  it('devuelve el bot nombrado con @ en minúsculas', () => {
    expect(parseMensaje('/proximo@Formativas_CAP_bot 5ta').destinatario).toBe('formativas_cap_bot');
    expect(parseMensaje('/proximo@Formativas_CAP_bot 5ta').args).toEqual(['5ta']);
  });
  it('esParaEsteBot: sin @, con el nuestro, con otro', () => {
    expect(esParaEsteBot(null, 'formativas_cap_bot')).toBe(true);
    expect(esParaEsteBot('formativas_cap_bot', '@Formativas_CAP_bot')).toBe(true);
    expect(esParaEsteBot('otrobot', 'formativas_cap_bot')).toBe(false);
    expect(esParaEsteBot('otrobot', null)).toBe(true);
  });
  it('texto sin barra no es comando', () => {
    expect(parseMensaje('hola').comando).toBeNull();
  });
});

describe('parseCategoria', () => {
  it.each([
    ['5ta', '5ta'], ['5', '5ta'], ['5a', '5ta'], ['quinta', '5ta'], ['Quinta', '5ta'],
    ['3era', '3era'], ['tercera', '3era'], ['7ma', '7ma'], ['séptima', '7ma'],
    ['S16', 'S16'], ['sub-16', 'S16'], ['sub16', 'S16'], ['sub13', 'Sub13'],
  ])('%s → %s', (entrada, esperado) => {
    expect(parseCategoria(entrada)).toBe(esperado);
  });
  it('rechaza lo que no es categoría', () => {
    expect(parseCategoria('2008')).toBeNull();
    expect(parseCategoria('8va')).toBeNull();
    expect(parseCategoria('')).toBeNull();
  });
  it('separarCategoria toma la primera categoría y deja el resto', () => {
    expect(separarCategoria(['2008', 'quinta'])).toEqual({ categoria: '5ta', otros: ['2008'] });
    expect(separarCategoria(['2026'])).toEqual({ categoria: null, otros: ['2026'] });
  });
});

describe('permisos', () => {
  it('admin y usuarios sin categorías ven todas', () => {
    expect(categoriasVisibles({ role: 'admin', categoria: ['5ta'] })).toBeNull();
    expect(categoriasVisibles({ role: 'delegado', categoria: [] })).toBeNull();
    expect(categoriasVisibles({ role: 'delegado', categoria: null })).toBeNull();
  });
  it('los demás solo ven sus categorías', () => {
    const visibles = categoriasVisibles({ role: 'presidente_categoria', categoria: ['5ta'] });
    expect(veCategoria(visibles, '5ta')).toBe(true);
    expect(veCategoria(visibles, '6ta')).toBe(false);
  });
  it('comandos según flags y rol', () => {
    expect(comandosDe(perm())).toEqual(['ayuda']);
    expect(comandosDe(perm({ can_access_players: true }))).toContain('nacidos');
    expect(comandosDe(perm({ can_view_partidos: true }))).toContain('goleadores');
    // fichas: flag de widgets y rol de FichaMedicaWidget
    expect(comandosDe(perm({ can_access_widgets: true }))).toContain('fichas');
    expect(comandosDe(perm({ can_access_widgets: true, role: 'coordinador' }))).not.toContain('fichas');
    expect(comandosDe(perm({ can_access_tareas: true }))).toContain('tareas');
  });
});

describe('parseCodigo', () => {
  it('acepta 8 hex sin importar mayúsculas', () => {
    expect(parseCodigo(' ab12cd34 ')).toBe('AB12CD34');
  });
  it('rechaza otros formatos', () => {
    expect(parseCodigo('123')).toBeNull();
    expect(parseCodigo('ZZZZZZZZ')).toBeNull();
    expect(parseCodigo(undefined)).toBeNull();
  });
});

describe('fechas', () => {
  it('edad cumplida', () => {
    expect(edad('2008-11-25', '2026-11-24')).toBe(17);
    expect(edad('2008-11-24', '2026-11-24')).toBe(18);
    expect(edad(null, '2026-11-24')).toBeNull();
  });
  it('días para el cumpleaños, también cruzando el año', () => {
    expect(diasParaCumple('2008-11-24', '2026-11-24')).toBe(0);
    expect(diasParaCumple('2008-11-30', '2026-11-24')).toBe(6);
    expect(diasParaCumple('2008-01-02', '2026-12-30')).toBe(3);
  });
  it('29/02 en año no bisiesto se cuenta el 28/02', () => {
    expect(diasParaCumple('2008-02-29', '2027-02-27')).toBe(1);
  });
  it('parseAnio', () => {
    expect(parseAnio('2008')).toBe(2008);
    expect(parseAnio('08')).toBeNull();
    expect(parseAnio('5ta')).toBeNull();
  });
});

describe('partidos', () => {
  it('marcador desde CAP (Neutral como Local)', () => {
    expect(marcador({ escenario: 'Local', goles_local: 2, goles_visitante: 1 })).toEqual({ cap: 2, rival: 1, resultado: 'G' });
    expect(marcador({ escenario: 'Visitante', goles_local: 2, goles_visitante: 1 })).toEqual({ cap: 1, rival: 2, resultado: 'P' });
    expect(marcador({ escenario: 'Neutral', goles_local: 0, goles_visitante: 0 }).resultado).toBe('E');
    expect(marcador({ escenario: 'Local', goles_local: null, goles_visitante: null }).resultado).toBeNull();
  });
  it('jornadaLabel igual que playerStats', () => {
    expect(jornadaLabel({ fase: 'Apertura', numero_jornada: '5' })).toBe('Apertura · J5');
    expect(jornadaLabel({ fase: null, numero_jornada: 'Final' })).toBe('Final');
    expect(jornadaLabel({ fase: null, numero_jornada: null })).toBe('-');
  });
  it('fechaPartido: la propia, o la 4ta un día antes salvo en jornadas de una categoría', () => {
    const jornada = { fecha: '2026-11-29', partidos: [{}, {}] };
    expect(fechaPartido({ fecha: '2026-12-02', categoria: '5ta' }, jornada)).toBe('2026-12-02');
    expect(fechaPartido({ fecha: null, categoria: '4ta' }, jornada)).toBe('2026-11-28');
    expect(fechaPartido({ fecha: null, categoria: '4ta' }, { fecha: '2026-11-29', partidos: [{}] })).toBe('2026-11-29');
  });
});

describe('búsquedas', () => {
  it('rivalBuscado por inicio de palabra, sin tildes ni palabras genéricas', () => {
    expect(rivalBuscado('nacional', 'Nacional')).toBe(true);
    expect(rivalBuscado('river', 'River Plate')).toBe(true);
    expect(rivalBuscado('defensor', 'Defensor Sporting')).toBe(true);
    expect(rivalBuscado('club', 'Club Nacional')).toBe(false);
    expect(rivalBuscado('wanderers', 'Nacional')).toBe(false);
  });
  it('nombreCoincide busca todas las palabras en nombre o nombre visual', () => {
    expect(nombreCoincide('perez', 'Juan Pérez Gómez', null)).toBe(true);
    expect(nombreCoincide('juan gom', 'Juan Pérez Gómez', null)).toBe(true);
    expect(nombreCoincide('juanchi', 'Juan Pérez Gómez', 'Juanchi Pérez')).toBe(true);
    expect(nombreCoincide('lopez', 'Juan Pérez Gómez', null)).toBe(false);
  });
});

describe('listas copiadas de la app', () => {
  it('CATEGORIAS igual a constants.js (Deno no puede importar src/)', () => {
    expect(CATEGORIAS).toEqual(CATEGORIAS_APP);
  });
});
