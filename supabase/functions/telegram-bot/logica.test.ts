import { describe, it, expect } from 'vitest';
import { CATEGORIAS as CATEGORIAS_APP } from '../../../src/utils/constants.js';
import {
  CATEGORIAS, parseMensaje, esParaEsteBot, parseCategoria, separarCategoria, categoriasVisibles, veCategoria, comandosDe, ordenMenu,
  parseCodigo, edad, diasParaCumple, parseAnio, marcador, jornadaLabel, fechaPartido,
  rivalBuscado, nombreCoincide, type Permisos,
  ALIAS, COMANDOS, textoViatico, etiquetaDocumento, minutosJugados, miles, ordenarPorMinutos,
  armarMensajesJugadores, planFoto, largoVisible, LIMITE_CAPTION, PIDE_DATO, textoPideDato, comandoDesdeRespuesta,
} from './logica';

const perm = (over: Partial<Permisos> = {}): Permisos => ({
  email: 'x@cap.uy', role: 'delegado', categoria: [],
  can_access_players: false, can_view_partidos: false, can_access_widgets: false, can_access_tareas: false, can_access_viatico: false,
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

describe('/ficha y alias', () => {
  it('acepta /jugador-completo y lo lleva a ficha', () => {
    const m = parseMensaje('/jugador-completo tomas gemelli');
    expect(m).toMatchObject({ comando: 'jugador_completo', resto: 'tomas gemelli' });
    expect(ALIAS[m.comando!]).toBe('ficha');
    expect(COMANDOS.ficha).toBeDefined();
  });
});

describe('textoViatico', () => {
  const hoy = '2026-11-24';
  it('sin contrato suma viático y complemento, con el detalle', () => {
    expect(textoViatico({ viatico: 8000 }, hoy)).toBe('$ 8.000');
    expect(textoViatico({ viatico: 8000, complemento: 4000 }, hoy)).toBe('$ 12.000 ($ 8.000 viático + $ 4.000 complemento)');
  });

  it('usa el override del complemento mientras está vigente', () => {
    const p = { viatico: 8000, complemento: 4000, complemento_override: 6000, complemento_override_expira: '2026-11-30' };
    expect(textoViatico(p, hoy)).toBe('$ 14.000 ($ 8.000 viático + $ 6.000 complemento) (complemento temporal hasta el 30/11)');
    expect(textoViatico({ ...p, complemento_override_expira: '2026-11-23' }, hoy)).toBe('$ 12.000 ($ 8.000 viático + $ 4.000 complemento)');
  });

  it('con contrato dice Contrato, y el caso especial suma el complemento', () => {
    expect(textoViatico({ contrato: true, viatico: 8000, complemento: 4000 }, hoy)).toBe('Contrato');
    expect(textoViatico({ contrato: true, complemento: 4000, incluir_viatico_export: true }, hoy)).toBe('Contrato + Complemento $ 4.000');
    // Como montoViatico: el caso especial cobra el complemento base aunque haya override
    expect(textoViatico({ contrato: true, complemento: 4000, incluir_viatico_export: true, complemento_override: 6000, complemento_override_expira: '2026-12-31' }, hoy))
      .toBe('Contrato + Complemento $ 4.000');
  });
});

describe('etiquetaDocumento', () => {
  it('sale del tipo de documento', () => {
    expect(etiquetaDocumento('Cédula de Identidad')).toBe('Cédula');
    expect(etiquetaDocumento('Pasaporte')).toBe('Pasaporte');
    expect(etiquetaDocumento('Otro')).toBe('Documento');
    expect(etiquetaDocumento(null)).toBe('Cédula');
  });
});

describe('minutosJugados', () => {
  it('= calcMinutos de la app', () => {
    expect(minutosJugados(90, { tipo: 'titular' })).toBe(90);
    expect(minutosJugados(90, { tipo: 'titular', minuto_salida: 70 })).toBe(70);
    expect(minutosJugados(90, { tipo: 'suplente', minuto_entrada: 70 })).toBe(20);
    expect(minutosJugados(90, { tipo: 'suplente' })).toBe(0);
    expect(minutosJugados(90, { tipo: 'titular' }, 60)).toBe(60);
    expect(minutosJugados(null, { tipo: 'titular' })).toBeNull();
  });
});

describe('/minutos', () => {
  it('parseo, alias y permiso', () => {
    expect(parseMensaje('/minutos 4ta 2025')).toMatchObject({ comando: 'minutos', args: ['4ta', '2025'] });
    expect(ALIAS[parseMensaje('/minuto 5ta').comando!]).toBe('minutos');
    expect(COMANDOS.minutos.permiso(perm())).toBe(false);
    expect(COMANDOS.minutos.permiso(perm({ can_view_partidos: true }))).toBe(true);
  });
  it('miles', () => {
    expect(miles(1180)).toBe('1.180');
    expect(miles(90)).toBe('90');
    expect(miles(null)).toBe('0');
  });
  it('ordena por minutos, sin dato al final, y desempata por titular y nombre', () => {
    const filas = [
      { name_visual: 'Zeta', minutos: 90, titular: 1 },
      { name_visual: 'Sin dato', minutos: null, titular: 3 },
      { name_visual: 'Álvarez', minutos: 90, titular: 1 },
      { name_visual: 'Titular', minutos: 90, titular: 2 },
      { name_visual: 'Más', minutos: 300, titular: 0 },
      { name_visual: 'Cero', minutos: 0, titular: 0 },
    ];
    expect(ordenarPorMinutos(filas).map((f) => f.name_visual)).toEqual(['Más', 'Titular', 'Álvarez', 'Zeta', 'Cero', 'Sin dato']);
  });
});

describe('fotos de jugadores', () => {
  it('arma un mensaje por jugador con su foto y el pie en el último', () => {
    expect(armarMensajesJugadores(['A', 'B'], ['p1/1.webp', null], '\n\naviso')).toEqual([
      { html: 'A', foto: 'p1/1.webp' },
      { html: 'B\n\naviso', foto: null },
    ]);
  });
  it('sin pie y con menos fotos que bloques', () => {
    expect(armarMensajesJugadores(['A'], [])).toEqual([{ html: 'A', foto: null }]);
  });
  it('cuenta los caracteres visibles, sin etiquetas y con las entidades como uno', () => {
    expect(largoVisible('👤 <b>Pérez &amp; Cía</b>')).toBe('👤 Pérez x Cía'.length);
  });
  it('pone el bloque entero como pie si entra', () => {
    expect(planFoto('👤 <b>Pérez</b>\nCategoría: 5ta')).toEqual({ caption: '👤 <b>Pérez</b>\nCategoría: 5ta', textoAparte: null });
  });
  it('si no entra, el nombre va de pie y el bloque aparte', () => {
    const largo = `👤 <b>Pérez</b>\n${'x'.repeat(LIMITE_CAPTION)}`;
    expect(planFoto(largo)).toEqual({ caption: '👤 <b>Pérez</b>', textoAparte: largo });
  });
  it('las etiquetas no cuentan para el límite', () => {
    const justo = `<b>${'x'.repeat(LIMITE_CAPTION)}</b>`;
    expect(planFoto(justo).textoAparte).toBeNull();
  });
});

describe('pedir el dato que falta', () => {
  // Telegram devuelve el texto del mensaje del bot sin las etiquetas HTML
  const sinHTML = (html: string) => html.replace(/<[^>]+>/g, '');

  it('arma el pedido con el comando, la pregunta y un ejemplo', () => {
    expect(textoPideDato('pregunta')).toBe('✍️ <b>/pregunta</b>: ¿Qué querés saber?\n<i>Respondé a este mensaje, por ejemplo: jugadores con más de 7 amarillas</i>');
  });
  it('la respuesta al pedido se toma como el dato del comando', () => {
    expect(comandoDesdeRespuesta(sinHTML(textoPideDato('pregunta')), ' jugadores con más de 7 amarillas ')).toBe('/pregunta jugadores con más de 7 amarillas');
    expect(comandoDesdeRespuesta(sinHTML(textoPideDato('jugador')), 'Pérez')).toBe('/jugador Pérez');
  });
  it('ignora respuestas a otros mensajes del bot', () => {
    expect(comandoDesdeRespuesta('🔎 5ta · al menos 8 amarillas', 'gracias')).toBeNull();
    expect(comandoDesdeRespuesta(null, 'Pérez')).toBeNull();
  });
  it('reconoce el lápiz con o sin selector de variación', () => {
    expect(comandoDesdeRespuesta('\u270D /jugador: ¿Qué jugador?', 'Pérez')).toBe('/jugador Pérez');
  });
  it('ignora comandos que no piden dato', () => {
    expect(comandoDesdeRespuesta('✍️ /lesionados: ¿Qué?', '5ta')).toBeNull();
  });
  it('si la respuesta ya es un comando, se respeta ese comando', () => {
    expect(comandoDesdeRespuesta(sinHTML(textoPideDato('jugador')), '/ayuda')).toBeNull();
  });
  it('una respuesta vacía no arma nada', () => {
    expect(comandoDesdeRespuesta(sinHTML(textoPideDato('jugador')), '  ')).toBeNull();
  });
  it('todos los comandos que piden dato existen', () => {
    for (const c of Object.keys(PIDE_DATO)) expect(COMANDOS[c]).toBeDefined();
  });
});

describe('orden del menú', () => {
  it('/pregunta primero, /ayuda segundo y el resto en el orden de COMANDOS', () => {
    const orden = ordenMenu();
    expect(orden.slice(0, 2)).toEqual(['pregunta', 'ayuda']);
    expect(orden.slice(2)).toEqual(Object.keys(COMANDOS).filter((c) => c !== 'pregunta' && c !== 'ayuda'));
  });
  it('tiene todos los comandos, sin repetidos', () => {
    expect([...ordenMenu()].sort()).toEqual(Object.keys(COMANDOS).sort());
  });
  it('/ayuda sigue el mismo orden', () => {
    expect(comandosDe({ email: 'x', role: 'admin', categoria: null, can_access_players: true, can_view_partidos: false, can_access_widgets: false, can_access_tareas: false, can_access_viatico: false }).slice(0, 2))
      .toEqual(['pregunta', 'ayuda']);
  });
});
