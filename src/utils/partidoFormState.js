import { POSICIONES_PARTIDO, DURACION_PARTIDO_DEFAULT } from './constants';

/**
 * Estado editable de un partido (el que maneja PartidoForm) y su conversión al
 * formato que guarda database.updatePartido. Lo comparten PartidoForm y la
 * importación masiva de informes COMET.
 */

export const MAX_TITULARES = 11;
export const MAX_SUPLENTES = 10;

// comet_id/comet_hint: datos del informe COMET importado para ese slot
export const emptySlot = () => ({ player_id: '', posicion: '', minuto_salida: null });
export const emptySuplente = () => ({ player_id: '', minuto_entrada: null, minuto_salida: null });
// Eventos: mapa player_id → { goles, goles_minutos, amarilla, amarilla_minuto, roja, roja_minuto, roja_fechas }
export const emptyEvento = () => ({ goles: 0, goles_minutos: [], amarilla: false, amarilla_minuto: null, roja: false, roja_minuto: null, roja_fechas: 1 });

export const toMinuto = (v) => (v === '' || v == null ? null : Number(v));

// Ordena titulares según POSICIONES_PARTIDO (Arquero primero, Delantero centro último).
// Sin posición van después; los slots vacíos al final. El sort es estable, así que
// posiciones repetidas (dos volantes defensivos, tres zagueros) mantienen su orden relativo.
const rankTitular = (t) => {
  const idx = POSICIONES_PARTIDO.indexOf(t.posicion);
  if (idx !== -1) return idx;
  return t.player_id || t.comet_hint ? POSICIONES_PARTIDO.length : POSICIONES_PARTIDO.length + 1;
};
export const sortTitulares = (slots) => [...slots].sort((a, b) => rankTitular(a) - rankTitular(b));

export function initialFormData(partido, fechaDefault = null) {
  return {
    fecha: partido?.fecha || fechaDefault || '',
    escenario: partido?.escenario || '',
    cesped: partido?.cesped || 'Natural',
    cancha: partido?.cancha || 'Ciudad Deportiva',
    goles_local: partido?.goles_local ?? '',
    goles_visitante: partido?.goles_visitante ?? '',
    comentario: partido?.comentario || '',
    arbitro: partido?.arbitro || '',
    primer_linea: partido?.primer_linea || '',
    segundo_linea: partido?.segundo_linea || '',
    duracion: partido?.duracion ?? '',
  };
}

const porOrden = (tipo) => (partido) => (partido?.partido_players || [])
  .filter((pp) => pp.tipo === tipo)
  .sort((a, b) => (a.orden || 0) - (b.orden || 0));

export function initialTitulares(partido) {
  const slots = porOrden('titular')(partido).map((pp) => ({
    player_id: pp.player_id || pp.players?.id || '',
    posicion: pp.posicion || '',
    minuto_salida: pp.minuto_salida ?? null,
  }));
  while (slots.length < MAX_TITULARES) slots.push(emptySlot());
  return slots;
}

export function initialSuplentes(partido) {
  const slots = porOrden('suplente')(partido).map((pp) => ({
    player_id: pp.player_id || pp.players?.id || '',
    minuto_entrada: pp.minuto_entrada ?? null,
    minuto_salida: pp.minuto_salida ?? null,
  }));
  while (slots.length < MAX_SUPLENTES) slots.push(emptySuplente());
  return slots;
}

export function initialEventos(partido) {
  const map = {};
  (partido?.partido_eventos || []).forEach((e) => {
    if (!map[e.player_id]) map[e.player_id] = emptyEvento();
    if (e.tipo === 'gol') {
      map[e.player_id].goles++;
      map[e.player_id].goles_minutos.push(e.minuto ?? null);
    }
    if (e.tipo === 'amarilla') { map[e.player_id].amarilla = true; map[e.player_id].amarilla_minuto = e.minuto ?? null; }
    if (e.tipo === 'roja')     { map[e.player_id].roja = true;     map[e.player_id].roja_minuto = e.minuto ?? null; map[e.player_id].roja_fechas = e.fechas_suspension ?? 1; }
  });
  return map;
}

/**
 * Convierte el estado del formulario en los argumentos de database.updatePartido.
 * Los eventos de jugadores que ya no están en la planilla se descartan.
 * @returns {{ data, titularesData, suplentesData, eventosData, cometIds }}
 */
export function armarPartidoParaGuardar({ formData, titulares, suplentes, eventos, players, categoria }) {
  const titularesData = titulares
    .map((t, i) => ({ player_id: t.player_id, posicion: t.posicion, orden: i + 1, minuto_salida: toMinuto(t.minuto_salida) }))
    .filter((t) => t.player_id);
  const suplentesData = suplentes
    .map((s, i) => ({ player_id: s.player_id, orden: i + 1, minuto_entrada: toMinuto(s.minuto_entrada), minuto_salida: toMinuto(s.minuto_salida) }))
    .filter((s) => s.player_id);

  const tieneMinutos = [...titularesData, ...suplentesData].some((x) => x.minuto_entrada != null || x.minuto_salida != null);
  const data = {
    ...formData,
    fecha: formData.fecha || null,
    cancha: formData.escenario === 'Local' ? formData.cancha : null,
    goles_local: formData.goles_local === '' ? null : Number(formData.goles_local),
    goles_visitante: formData.goles_visitante === '' ? null : Number(formData.goles_visitante),
    duracion: formData.duracion !== '' ? Number(formData.duracion) : tieneMinutos ? (DURACION_PARTIDO_DEFAULT[categoria] || 90) : null,
  };

  // COMET IDs a aprender: slots importados cuyo jugador todavía no tiene ese ID
  const cometIds = [...titulares, ...suplentes]
    .filter((s) => s.player_id && s.comet_id && players.find((p) => p.id === s.player_id)?.comet_id !== s.comet_id)
    .map((s) => ({ player_id: s.player_id, comet_id: s.comet_id }));

  const lineupIds = new Set([
    ...titularesData.map((t) => t.player_id),
    ...suplentesData.map((s) => s.player_id),
  ]);
  const eventosData = [];
  Object.entries(eventos).forEach(([player_id, stats]) => {
    if (!lineupIds.has(player_id)) return;
    for (let i = 0; i < (stats.goles || 0); i++) {
      const min = stats.goles_minutos?.[i];
      eventosData.push({ player_id, tipo: 'gol', minuto: min ? Number(min) : null });
    }
    if (stats.amarilla) eventosData.push({ player_id, tipo: 'amarilla', minuto: stats.amarilla_minuto ? Number(stats.amarilla_minuto) : null });
    if (stats.roja)     eventosData.push({ player_id, tipo: 'roja',     minuto: stats.roja_minuto    ? Number(stats.roja_minuto)    : null, fechas_suspension: stats.roja_fechas || 1 });
  });

  return { data, titularesData, suplentesData, eventosData, cometIds };
}
