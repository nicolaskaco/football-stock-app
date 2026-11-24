import { rivalCoincide } from './cometApply';
import { rivalDelInforme } from './cometLote';
import { fechaPartido } from './dateUtils';

/**
 * Importación de informes COMET de partidos viejos: a qué jornada va cada uno y qué cambia
 * respecto de la planilla ya cargada. Funciones puras (ver CometHistoricoImportButton).
 */

const DIAS_TOLERANCIA = 3;

const MOTIVOS = {
  ilegible: 'No es un informe COMET o no se pudo leer.',
  sin_categoria: 'No es de 4ta, 5ta, 6ta, 7ma ni Sub 16.',
  sin_jornada: 'No encontré la jornada de este rival, fase y fecha.',
  ambigua: 'Hay más de una jornada posible para este informe.',
};
export const textoMotivo = (motivo) => MOTIVOS[motivo] || motivo;

const dias = (a, b) => Math.round(Math.abs(new Date(`${a}T12:00:00`) - new Date(`${b}T12:00:00`)) / 86400000);

/**
 * Jornada y partido de un informe leído (leerInforme).
 * 1. Mismo rival, misma fase (Apertura/Clausura, del torneo del informe), mismo año y con
 *    partido de la categoría.
 * 2. Gana la del mismo N° de jornada que el "Fecha: N" del informe.
 * 3. Si no hay, la de fecha más cercana dentro de ±3 días, y queda para revisar.
 *
 * @returns {{ jornada, partido, porFecha, motivo }}  motivo: null si se asignó
 */
export function asignarPartido(item, jornadas = []) {
  const vacio = { jornada: null, partido: null, porFecha: false };
  if (!item.parsed) return { ...vacio, motivo: 'ilegible' };
  if (!item.categoria) return { ...vacio, motivo: 'sin_categoria' };
  const { fase, numeroFecha, fecha } = item.parsed;
  const rival = rivalDelInforme(item.parsed);
  const anio = fecha?.slice(0, 4);

  const candidatas = jornadas
    .map((j) => ({ jornada: j, partido: (j.partidos || []).find((p) => p.categoria === item.categoria) }))
    .filter(({ jornada: j, partido }) => partido
      && rivalCoincide(rival, j.rivales?.name)
      && (!fase || !j.fase || j.fase === fase)
      && (!anio || !j.fecha || j.fecha.slice(0, 4) === anio));

  const exactas = numeroFecha != null ? candidatas.filter(({ jornada: j }) => String(j.numero_jornada) === String(numeroFecha)) : [];
  if (exactas.length === 1) return { ...exactas[0], porFecha: false, motivo: null };

  const pool = exactas.length > 1 ? exactas : candidatas;
  if (!fecha) return { ...vacio, motivo: pool.length ? 'ambigua' : 'sin_jornada' };
  const conDistancia = pool
    .map((c) => ({ ...c, dist: dias(fechaPartido(c.partido, c.jornada) || c.jornada.fecha.slice(0, 10), fecha) }))
    .filter((c) => c.dist <= DIAS_TOLERANCIA)
    .sort((a, b) => a.dist - b.dist);
  if (conDistancia.length === 0) return { ...vacio, motivo: 'sin_jornada' };
  if (conDistancia[1] && conDistancia[1].dist === conDistancia[0].dist) return { ...vacio, motivo: 'ambigua' };
  return { jornada: conDistancia[0].jornada, partido: conDistancia[0].partido, porFecha: exactas.length !== 1, motivo: null };
}

/**
 * Agrupa los informes por jornada, en orden cronológico (así las suspensiones salen en orden).
 * @returns {{ grupos: [{ jornada, items }], sinAsignar: [{ item, motivo }] }}
 */
export function agruparPorJornada(items, jornadas) {
  const grupos = new Map();
  const sinAsignar = [];
  items.forEach((item) => {
    const { jornada, porFecha, motivo } = asignarPartido(item, jornadas);
    if (motivo) {
      sinAsignar.push({ item, motivo });
      return;
    }
    if (!grupos.has(jornada.id)) grupos.set(jornada.id, { jornada, items: [] });
    grupos.get(jornada.id).items.push({ ...item, porFecha });
  });
  const ordenados = [...grupos.values()].sort((a, b) => a.jornada.fecha.localeCompare(b.jornada.fecha));
  return { grupos: ordenados, sinAsignar };
}

const nombreDe = (players, id) => {
  const p = players.find((x) => x.id === id);
  return p?.name_visual || p?.name || 'Jugador';
};

/** ¿El partido ya tiene algún minuto de entrada o salida cargado? */
export const tieneMinutos = (partido) => (partido?.partido_players || []).some((pp) => pp.minuto_entrada != null || pp.minuto_salida != null);

/**
 * Qué cambia en la planilla ya cargada si se aplica el informe (preview de aplicarComet).
 * Los cambios, minutos, árbitros e IDs nuevos no cuentan como diferencia: es lo que viene a sumar
 * el COMET. Que no coincida el minuto de un gol o una tarjeta tampoco.
 *
 * @returns {{ items: [{ tipo: 'suma'|'saca'|'cambia', texto }], hayDiferencias }}
 */
export function diferenciasConPlanilla(partido, preview, players = []) {
  const items = [];
  const pps = partido?.partido_players || [];
  if (pps.length === 0) return { items, hayDiferencias: false };

  const ids = (lista) => new Set(lista.filter((x) => x.player_id).map((x) => x.player_id));
  const comparar = (antes, despues, rol) => {
    despues.forEach((id) => { if (!antes.has(id)) items.push({ tipo: 'suma', texto: `${nombreDe(players, id)} como ${rol}` }); });
    antes.forEach((id) => { if (!despues.has(id)) items.push({ tipo: 'saca', texto: `${nombreDe(players, id)} como ${rol}` }); });
  };
  comparar(ids(pps.filter((pp) => pp.tipo === 'titular')), ids(preview.titulares), 'titular');
  comparar(ids(pps.filter((pp) => pp.tipo === 'suplente')), ids(preview.suplentes), 'suplente');

  // Eventos por jugador: goles (cantidad), amarilla y roja
  const antes = {};
  (partido.partido_eventos || []).forEach((e) => {
    const ev = (antes[e.player_id] ||= { goles: 0, amarilla: false, roja: false });
    if (e.tipo === 'gol') ev.goles++;
    if (e.tipo === 'amarilla') ev.amarilla = true;
    if (e.tipo === 'roja') ev.roja = true;
  });
  const despues = {};
  Object.entries(preview.eventos || {}).forEach(([id, ev]) => {
    despues[id] = { goles: ev.goles || 0, amarilla: !!ev.amarilla, roja: !!ev.roja };
  });
  new Set([...Object.keys(antes), ...Object.keys(despues)]).forEach((id) => {
    const a = antes[id] || { goles: 0, amarilla: false, roja: false };
    const d = despues[id] || { goles: 0, amarilla: false, roja: false };
    const nombre = nombreDe(players, id);
    if (a.goles !== d.goles) {
      items.push({ tipo: d.goles > a.goles ? 'suma' : 'saca', texto: `Goles de ${nombre}: ${a.goles} → ${d.goles}` });
    }
    [['amarilla', 'Amarilla'], ['roja', 'Roja']].forEach(([k, label]) => {
      if (a[k] !== d[k]) items.push({ tipo: d[k] ? 'suma' : 'saca', texto: `${label} de ${nombre}` });
    });
  });

  // Resultado y escenario, solo si ya estaban cargados
  const num = (v) => (v === '' || v == null ? null : Number(v));
  const [gl, gv] = [num(partido.goles_local), num(partido.goles_visitante)];
  const [nl, nv] = [num(preview.formData.goles_local), num(preview.formData.goles_visitante)];
  if (gl != null && gv != null && (gl !== nl || gv !== nv)) {
    items.push({ tipo: 'cambia', texto: `Resultado: ${gl}-${gv} → ${nl}-${nv}` });
  }
  if (partido.escenario && preview.formData.escenario && partido.escenario !== preview.formData.escenario) {
    items.push({ tipo: 'cambia', texto: `Escenario: ${partido.escenario} → ${preview.formData.escenario}` });
  }
  return { items, hayDiferencias: items.length > 0 };
}

/**
 * Qué hacer con un informe evaluado (evaluarInformes) en la importación histórica:
 * - 'auto': se guarda solo (partido sin planilla, o con planilla igual a la del informe).
 * - 'completo': ya tiene minutos y no hay diferencias; no se toca.
 * - 'revision': todo lo demás (bloqueos, avisos o diferencias con lo cargado).
 */
export function clasificarHistorico(evaluado, diff) {
  if (!evaluado.puede) return 'revision';
  if (evaluado.yaCargado && !diff.hayDiferencias && tieneMinutos(evaluado.partido)) return 'completo';
  if (evaluado.motivosRevision.length > 0) return 'revision';
  if (evaluado.yaCargado && diff.hayDiferencias) return 'revision';
  return 'auto';
}
