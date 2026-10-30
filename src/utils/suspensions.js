import { CATEGORIAS_PARTIDO } from './constants';
import { fechaPartido } from './dateUtils';

/**
 * All the functions below work on a categoria TIMELINE (see getCategoriaTimeline): the
 * jornadas that have a partido of that categoria, ordered by the date the partido was
 * actually played. Suspension indexes are positions in that list, so a postponed partido
 * counts where it was really played, not where its jornada sits in the fixture.
 */

/**
 * Walks jornadas 0..uptoIdx-1 for a given categoria and simulates a running
 * yellow-card counter per player: +1 per yellow, reset to 0 (and suspension
 * fired) on the 5th, and reset to 0 (no suspension from the reset itself)
 * whenever the player receives a red card.
 *
 * A red card wipes every yellow the player got in that SAME partido, regardless
 * of `minuto` — the field is optional and PartidoForm stores minute 0 as null,
 * so it cannot be trusted for ordering. A player cannot earn a yellow after
 * being sent off anyway.
 *
 * Returns { counters, suspendedAt, milestones }:
 *   counters[playerId]    -> running count since that player's last reset
 *   suspendedAt[playerId] -> jornada index where their (latest) 5th yellow landed
 *   milestones[playerId]  -> every jornada index where the counter reached 5
 */
function walkYellowCounters(yearJornadas, categoria, uptoIdx) {
  const counters = {};
  const suspendedAt = {};
  const milestones = {};

  for (let i = 0; i < uptoIdx; i++) {
    const partido = (yearJornadas[i].partidos || []).find((p) => p.categoria === categoria);
    if (!partido) continue;

    const eventos = (partido.partido_eventos || []).filter((e) => e.player_id);
    const expulsados = new Set(
      eventos.filter((e) => e.tipo === 'roja').map((e) => e.player_id)
    );

    for (const e of eventos) {
      if (e.tipo !== 'amarilla') continue;
      const pid = e.player_id;
      if (expulsados.has(pid)) continue; // wiped by the red in this same partido
      counters[pid] = (counters[pid] || 0) + 1;
      if (counters[pid] === 5) {
        counters[pid] = 0;
        suspendedAt[pid] = i;
        (milestones[pid] ||= []).push(i);
      }
    }

    for (const pid of expulsados) counters[pid] = 0;
  }

  return { counters, suspendedAt, milestones };
}

/**
 * Returns Map<playerId, { reason }> for players whose 5th-yellow milestone
 * landed exactly in jornada (uptoIdx - 1), i.e. whose suspension applies to
 * jornada uptoIdx.
 */
function computeYellowSuspension(yearJornadas, categoria, uptoIdx) {
  const { suspendedAt } = walkYellowCounters(yearJornadas, categoria, uptoIdx);

  const result = new Map();
  for (const [pid, jornadaIdx] of Object.entries(suspendedAt)) {
    if (jornadaIdx === uptoIdx - 1) {
      result.set(pid, { reason: '5ª Amarilla' });
    }
  }
  return result;
}

/**
 * Current-year jornadas that have a partido of this categoria, ordered by the date that
 * partido was played (partidos.fecha, see fechaPartido). Ties fall back to the jornada's
 * date and then numero_jornada.
 */
function getCategoriaTimeline(jornadas, categoria) {
  const currentYear = String(new Date().getFullYear());
  return jornadas
    .map((j) => {
      const partido = (j.partidos || []).find((p) => p.categoria === categoria);
      return partido ? { jornada: j, fecha: fechaPartido(partido, j) } : null;
    })
    .filter((x) => x && x.fecha?.startsWith(currentYear))
    .sort((a, b) => a.fecha.localeCompare(b.fecha)
      || String(a.jornada.fecha).localeCompare(String(b.jornada.fecha))
      || (a.jornada.numero_jornada || 0) - (b.jornada.numero_jornada || 0))
    .map((x) => x.jornada);
}

/**
 * Manual ajustes (partido_suspension_ajustes) of the partido of `categoria` in `jornada`:
 *  - 'quitar'  → the player is NOT suspended for that partido (served elsewhere, tribunal...).
 *  - 'agregar' → the player IS suspended for it, reason "Manual" (+ motivo).
 * They only change that one partido: nothing is moved or extended, and the yellow counter
 * is untouched (a 5th yellow still resets it).
 */
function applyAjustes(suspensions, jornada, categoria, ajustesOverride) {
  const partido = (jornada?.partidos || []).find((p) => p.categoria === categoria);
  (ajustesOverride || partido?.partido_suspension_ajustes || []).forEach((a) => {
    if (a.accion === 'quitar') suspensions.delete(a.player_id);
    else if (a.accion === 'agregar') suspensions.set(a.player_id, { reason: manualReason(a), manual: true });
  });
  return suspensions;
}

const manualReason = (ajuste) => (ajuste.motivo ? `Manual: ${ajuste.motivo}` : 'Manual');

/**
 * Suspensions for the jornada at targetIdx of the categoria timeline (yearJornadas), with the
 * manual ajustes of that partido applied. targetIdx may be yearJornadas.length: a virtual
 * jornada after the last one (no ajustes there). ajustesOverride replaces the stored ajustes.
 *
 * Returns Map<playerId, { reason, manual? }>
 */
function computeSuspensionsAt(yearJornadas, categoria, targetIdx, ajustesOverride) {
  const suspensions = new Map();
  if (targetIdx < 0) return suspensions;

  // Red cards — scan backwards for active multi-game suspensions
  for (let i = targetIdx - 1; i >= 0; i--) {
    const partido = (yearJornadas[i].partidos || []).find((p) => p.categoria === categoria);
    if (!partido) continue;

    (partido.partido_eventos || [])
      .filter((e) => e.tipo === 'roja' && e.player_id)
      .forEach((e) => {
        const fechas = e.fechas_suspension || 1;
        // Suspended for jornadas i+1 through i+fechas
        if (targetIdx <= i + fechas) {
          const remaining = (i + fechas) - targetIdx + 1;
          suspensions.set(e.player_id, {
            reason: remaining > 1 ? `Roja (${remaining} fechas)` : 'Roja (última fecha)',
          });
        }
      });
  }

  // Yellow card accumulation (resets to 0 on a red card): walk jornadas 0..targetIdx-1
  const yellowSuspensions = computeYellowSuspension(yearJornadas, categoria, targetIdx);
  for (const [playerId, info] of yellowSuspensions) {
    // Only set yellow suspension if no red card suspension already active
    if (!suspensions.has(playerId)) {
      suspensions.set(playerId, info);
    }
  }

  return applyAjustes(suspensions, yearJornadas[targetIdx], categoria, ajustesOverride);
}

/**
 * A partido counts as played once both scores and at least one player of the lineup are loaded.
 */
function isPartidoCargado(partido) {
  return partido.goles_local != null
    && partido.goles_visitante != null
    && (partido.partido_players?.length || 0) > 0;
}

/**
 * Returns a Map of playerId → { reason } for players suspended for a specific jornada + categoria.
 *
 * A player is suspended for jornada J if:
 *  - They received a red card in a prior jornada and the suspension still covers J
 *    (red card at jornada index i with fechas_suspension=N → suspended for i+1..i+N), OR
 *  - Their running yellow card counter (since the last reset) hit 5 in the previous jornada
 * "Previous" follows the order the partidos of that categoria were played (partidos.fecha).
 * An admin's manual ajuste on this partido wins over the automatic result.
 *
 * Cards count toward the partido's category (not the player's home category).
 * Yellow cards accumulate across the full year (no Apertura/Clausura reset),
 * but the running counter resets to 0 whenever the player receives a red card.
 *
 * `ajustes` replaces the partido's stored ajustes (PartidoForm passes the ones being
 * edited, or [] to get the automatic result only).
 */
export function getSuspensionMap(jornadas, targetJornadaId, categoria, { ajustes } = {}) {
  const yearJornadas = getCategoriaTimeline(jornadas, categoria);
  const targetIdx = yearJornadas.findIndex((j) => j.id === targetJornadaId);
  return computeSuspensionsAt(yearJornadas, categoria, targetIdx, ajustes);
}

/**
 * Current suspensions across all categories (SuspensionWidget, TarjetasTab, PlayersTab,
 * EstadisticasJugadoresTab).
 *
 * "Current" = suspended for the jornada right after the last one whose partido of that
 * categoria is loaded (result + lineup, see isPartidoCargado). Today's date is not used: a jornada
 * that already took place but is not loaded yet still shows its suspended players, exactly
 * like the lineup of that partido does. "Last" follows the categoria timeline (the date each
 * partido was played), so a postponed partido loaded late becomes the reference. If the last
 * loaded jornada is the last one of the timeline, a virtual "next" jornada is used.
 *
 * Returns Map<categoria, Map<playerId, { reason }>>
 */
export function getCurrentSuspensionsByCategory(jornadas) {
  const result = new Map();

  for (const cat of CATEGORIAS_PARTIDO) {
    const yearJornadas = getCategoriaTimeline(jornadas, cat);
    let lastLoadedIdx = -1;
    yearJornadas.forEach((j, i) => {
      const partido = (j.partidos || []).find((p) => p.categoria === cat);
      if (partido && isPartidoCargado(partido)) lastLoadedIdx = i;
    });
    result.set(cat, computeSuspensionsAt(yearJornadas, cat, lastLoadedIdx + 1));
  }

  return result;
}

/**
 * Current running yellow-card counter per player, per categoria, after red-card resets.
 *
 * This is the number the Suspensiones widget and the Tarjetas tab must display: the raw
 * yearly total is NOT what counts toward the 5-yellow suspension, since any red card
 * resets the counter back to 0.
 *
 * Returns Map<categoria, Map<playerId, number>>
 */
export function getYellowCountsByCategory(jornadas) {
  const result = new Map();

  for (const cat of CATEGORIAS_PARTIDO) {
    const yearJornadas = getCategoriaTimeline(jornadas, cat);
    const { counters } = walkYellowCounters(yearJornadas, cat, yearJornadas.length);
    result.set(cat, new Map(Object.entries(counters)));
  }

  return result;
}

/**
 * Partidos of the current year, in one categoria, where a player got a yellow or red card
 * (Suspensiones widget pop up), in timeline order.
 *
 * `vigente` tells whether the row still counts toward the current yellow counter: it is false
 * for the partido of the player's last reset (a red card or the 5th yellow) and every one
 * before it. Same counting rules as walkYellowCounters, so the yellows of the vigente rows add
 * up to the number getYellowCountsByCategory reports.
 *
 * Returns [{ jornada, partido, amarillas, rojas, vigente }]
 */
export function getPlayerCardHistory(jornadas, playerId, categoria) {
  if (!playerId) return [];
  const rows = [];
  let counter = 0;
  let lastResetIdx = -1;

  getCategoriaTimeline(jornadas, categoria).forEach((jornada, i) => {
    const partido = jornada.partidos.find((p) => p.categoria === categoria);
    const eventos = (partido.partido_eventos || []).filter((e) => e.player_id === playerId);
    const amarillas = eventos.filter((e) => e.tipo === 'amarilla').length;
    const rojas = eventos.filter((e) => e.tipo === 'roja').length;
    if (amarillas === 0 && rojas === 0) return;

    if (rojas > 0) {
      counter = 0;
      lastResetIdx = i;
    } else {
      for (let k = 0; k < amarillas; k++) {
        counter += 1;
        if (counter === 5) {
          counter = 0;
          lastResetIdx = i;
        }
      }
    }
    rows.push({ idx: i, jornada, partido, amarillas, rojas });
  });

  return rows.map(({ idx, ...r }) => ({ ...r, vigente: idx > lastResetIdx }));
}

/**
 * Every jornada of the current year a single player is (or will be) suspended for,
 * using the same rules as getSuspensionMap(), per categoria timeline:
 *  - Red card at timeline index i with fechas_suspension=N → indexes i+1..i+N.
 *  - Running yellow counter reaching 5 at index i → index i+1.
 * A red-card suspension wins over a yellow one for the same jornada + categoria, and the
 * manual ajustes of each partido win over both ('quitar' removes it, 'agregar' adds one).
 * Only jornadas that already exist are returned (upcoming ones included).
 *
 * Returns [{ jornadaId, categoria, reason }]
 */
export function getPlayerSuspensions(jornadas, playerId) {
  if (!playerId) return [];
  const result = [];

  for (const cat of CATEGORIAS_PARTIDO) {
    const yearJornadas = getCategoriaTimeline(jornadas, cat);
    const len = yearJornadas.length;
    const reasons = new Map(); // timeline index -> reason
    const add = (idx, reason) => {
      if (idx < len && !reasons.has(idx)) reasons.set(idx, reason);
    };

    // Red cards first so they win over a yellow suspension for the same jornada
    yearJornadas.forEach((jornada, i) => {
      const partido = jornada.partidos.find((p) => p.categoria === cat);
      (partido.partido_eventos || [])
        .filter((e) => e.tipo === 'roja' && e.player_id === playerId)
        .forEach((e) => {
          const fechas = e.fechas_suspension || 1;
          for (let k = 1; k <= fechas; k++) {
            add(i + k, fechas > 1 ? `Roja · fecha ${k} de ${fechas}` : 'Roja');
          }
        });
    });

    const { milestones } = walkYellowCounters(yearJornadas, cat, len);
    (milestones[playerId] || []).forEach((i) => add(i + 1, '5ª amarilla'));

    yearJornadas.forEach((jornada, i) => {
      const partido = jornada.partidos.find((p) => p.categoria === cat);
      const ajuste = (partido.partido_suspension_ajustes || []).find((a) => a.player_id === playerId);
      if (ajuste?.accion === 'quitar') reasons.delete(i);
      else if (ajuste?.accion === 'agregar') reasons.set(i, manualReason(ajuste));
    });

    for (const [i, reason] of reasons) {
      result.push({ jornadaId: yearJornadas[i].id, categoria: cat, reason });
    }
  }

  return result;
}
