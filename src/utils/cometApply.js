import { DURACION_PARTIDO_DEFAULT } from './constants';
import { matchCometPlayers } from './cometMatch';
import { posicionesHistorial, sugerirPosiciones } from './posicionSugerida';
import { MAX_TITULARES, MAX_SUPLENTES, emptySlot, emptySuplente, emptyEvento, sortTitulares } from './partidoFormState';

const ORDINALES = { 4: '4ta', 5: '5ta', 6: '6ta', 7: '7ma' };
const PALABRAS = { cuarta: '4ta', quinta: '5ta', sexta: '6ta', septima: '7ma', setima: '7ma' };

const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** "TORNEO CLAUSURA 5A 2026" → '5ta'; "SUB 16" → 'S16' */
export function categoriaDelTorneo(torneo) {
  if (!torneo) return null;
  if (/\b(SUB|S)[\s-]*16\b/i.test(torneo)) return 'S16';
  const m = torneo.match(/\b([4-7])\s*[AªT]\b/i);
  return m ? ORDINALES[m[1]] : null;
}

/**
 * Categoría escrita en el nombre del archivo: "4ta", "5A", "6ª", "quinta", "Sub 16", "S16"…
 * Devuelve null si no hay ninguna o si aparece más de una distinta.
 */
export function categoriaDeArchivo(nombre) {
  const base = sinTildes(nombre).toLowerCase().replace(/\.pdf$/, '');
  const encontradas = new Set();
  if (/(?<![a-z0-9])(sub|s)[\s_-]*16(?![0-9])/.test(base)) encontradas.add('S16');
  for (const m of base.matchAll(/(?<![a-z0-9])([4-7])\s*(ta|ma|a|ª|º|°)(?![a-z0-9])/g)) encontradas.add(ORDINALES[m[1]]);
  for (const m of base.matchAll(/(?<![a-z])(cuarta|quinta|sexta|septima|setima)(?![a-z])/g)) encontradas.add(PALABRAS[m[1]]);
  return encontradas.size === 1 ? [...encontradas][0] : null;
}

const PALABRAS_GENERICAS = new Set(['club', 'atletico', 'football', 'futbol', 'fc', 'de', 'del', 'cs', 'sc', 'ca', 'cd', 'social', 'deportivo', 'sporting', 'y']);
const palabrasClave = (nombre) => sinTildes(nombre).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !PALABRAS_GENERICAS.has(w));

/**
 * ¿El equipo del informe COMET ("CLUB NACIONAL DE FOOTBALL") es el rival de la app ("Nacional")?
 * Todas las palabras significativas del nombre en la app tienen que estar en el del informe.
 */
export function rivalCoincide(nombreComet, nombreRival) {
  const rival = palabrasClave(nombreRival);
  if (rival.length === 0) return false;
  const comet = new Set(palabrasClave(nombreComet));
  return rival.every((w) => comet.has(w));
}

/**
 * Renglones a revisar de un informe ya leído: titulares y suplentes cruzados con `players`.
 * Por defecto se guarda el COMET ID de todo jugador que no matcheó por ID.
 */
export function filasParaRevisar(parsed, players, categoria) {
  const all = [
    ...parsed.titulares.map((r) => ({ ...r, rol: 'titular' })),
    ...parsed.suplentes.map((r) => ({ ...r, rol: 'suplente' })),
  ];
  return matchCometPlayers(all, players, categoria).map((r) => ({ ...r, saveComet: r.status !== 'id' }));
}

/**
 * Vuelca un informe COMET revisado (ver CometImportPanel / CometMatchTable) sobre el estado
 * de un partido. Reemplaza titulares, suplentes, minutos y tarjetas; los goles solo si el
 * informe trae el detalle (si no, se conservan los cargados).
 *
 * @param imp  resultado de parseCometReport + rows (matches ya revisados)
 * @returns {{ formData, titulares, suplentes, eventos, avisos, importedPlayers, suspendidosQueJugaron, suplentesDeMas }}
 */
export function aplicarComet(imp, { partido, categoria, formData, titulares: titularesPrev, eventos: eventosPrev, jornadas = [], players = [], suspendedMap = new Map() }) {
  const byDorsal = new Map(imp.rows.map((r) => [r.dorsal, r]));
  const salida = new Map(imp.cambios.map((c) => [c.sale, c.minuto]));
  const entrada = new Map(imp.cambios.map((c) => [c.entra, c.minuto]));
  const prevPosicion = new Map(titularesPrev.filter((t) => t.player_id).map((t) => [t.player_id, t.posicion]));

  // El COMET ID viaja con el slot y se guarda en el jugador al guardar el partido
  const cometFields = (r) => ({
    comet_id: r.player_id ? (r.status !== 'id' && r.saveComet ? r.cometId : null) : r.cometId,
    comet_hint: r.player_id ? null : `${r.dorsal} ${r.nombre}`,
  });

  // Posición: la que ya tenía en este partido, si no la más frecuente en sus últimos partidos,
  // si no la de su ficha (ver posicionSugerida.js)
  const titularesImp = imp.rows.filter((r) => r.rol === 'titular').slice(0, MAX_TITULARES);
  const sugeridas = sugerirPosiciones(titularesImp.map((r) => r.player_id), {
    prevPosicion,
    historial: posicionesHistorial(jornadas, partido?.id),
    playersById: new Map(players.map((p) => [p.id, p])),
  });
  const titulares = titularesImp.map((r, i) => ({
    player_id: r.player_id,
    posicion: sugeridas[i].posicion,
    minuto_salida: salida.get(r.dorsal) ?? null,
    ...cometFields(r),
  }));
  while (titulares.length < MAX_TITULARES) titulares.push(emptySlot());

  const suplentesImp = imp.rows.filter((r) => r.rol === 'suplente');
  const suplentes = suplentesImp.slice(0, MAX_SUPLENTES).map((r) => ({
    player_id: r.player_id,
    minuto_entrada: entrada.get(r.dorsal) ?? null,
    minuto_salida: salida.get(r.dorsal) ?? null,
    ...cometFields(r),
  }));
  while (suplentes.length < MAX_SUPLENTES) suplentes.push(emptySuplente());

  // Eventos: tarjetas del informe; goles del informe si los trae, si no se conservan los cargados
  const eventos = {};
  const ensure = (pid) => (eventos[pid] ||= emptyEvento());
  if (imp.goles.length === 0) {
    Object.entries(eventosPrev).forEach(([pid, ev]) => {
      if (ev.goles > 0) Object.assign(ensure(pid), { goles: ev.goles, goles_minutos: ev.goles_minutos });
    });
  }
  imp.goles.forEach((g) => {
    const pid = byDorsal.get(g.dorsal)?.player_id;
    if (!pid) return;
    const ev = ensure(pid);
    ev.goles += 1;
    ev.goles_minutos = [...ev.goles_minutos, g.minuto];
  });
  imp.tarjetas.forEach((t) => {
    const pid = byDorsal.get(t.dorsal)?.player_id;
    if (!pid) return;
    const ev = ensure(pid);
    if (t.tipo === 'amarilla') Object.assign(ev, { amarilla: true, amarilla_minuto: t.minuto });
    else Object.assign(ev, { roja: true, roja_minuto: t.minuto, roja_fechas: eventosPrev[pid]?.roja_fechas ?? 1 });
  });

  const importedPlayers = imp.rows.map((r) => players.find((p) => p.id === r.player_id)).filter(Boolean);

  const newFormData = {
    ...formData,
    escenario: imp.escenario,
    goles_local: imp.golesLocal,
    goles_visitante: imp.golesVisitante,
    arbitro: imp.arbitro || formData.arbitro,
    primer_linea: imp.primerLinea || formData.primer_linea,
    segundo_linea: imp.segundaLinea || formData.segundo_linea,
    duracion: formData.duracion || DURACION_PARTIDO_DEFAULT[categoria] || 90,
  };

  const avisos = [];
  const sinAsignar = imp.rows.filter((r) => !r.player_id);
  if (sinAsignar.length) avisos.push(`Sin asignar: ${sinAsignar.map((r) => `${r.dorsal} ${r.nombre}`).join(', ')}. Elegilos en su lugar de la planilla.`);
  const origenCount = (o) => sugeridas.filter((s) => s.origen === o).length;
  const sinPosicion = sugeridas.filter((s, i) => titularesImp[i].player_id && !s.posicion).length;
  const posResumen = [
    [origenCount('partido'), 'ya cargadas'],
    [origenCount('historial'), 'de partidos anteriores'],
    [origenCount('ficha'), 'de la ficha'],
    [sinPosicion, 'sin posición'],
  ].filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}`);
  if (origenCount('historial') + origenCount('ficha') + sinPosicion > 0) {
    avisos.push(`Posiciones: ${posResumen.join(', ')}. Revisá el lado de zagueros, laterales y extremos.`);
  }
  if (suplentesImp.length > MAX_SUPLENTES) avisos.push(`El informe trae ${suplentesImp.length} suplentes; solo entran ${MAX_SUPLENTES}.`);
  const suspendidosQueJugaron = importedPlayers.filter((p) => suspendedMap.has(p.id));
  suspendidosQueJugaron.forEach((p) => {
    avisos.push(`${p.name_visual || p.name} figura como suspendido (${suspendedMap.get(p.id).reason}) pero jugó según el informe.`);
  });
  if (imp.goles.length === 0 && Number(imp.escenario === 'Local' ? imp.golesLocal : imp.golesVisitante) > 0) {
    avisos.push('El informe no trae el detalle de los goles de Peñarol: cargalos a mano.');
  }

  return { formData: newFormData, titulares: sortTitulares(titulares), suplentes, eventos, avisos, importedPlayers, suspendidosQueJugaron, suplentesDeMas: Math.max(0, suplentesImp.length - MAX_SUPLENTES) };
}
