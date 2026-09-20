import { CATEGORIAS_PARTIDO } from './constants';

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
 * Returns { counters, suspendedAt }:
 *   counters[playerId]    -> running count since that player's last reset
 *   suspendedAt[playerId] -> jornada index where their 5th yellow landed
 */
function walkYellowCounters(yearJornadas, categoria, uptoIdx) {
  const counters = {};
  const suspendedAt = {};

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
      }
    }

    for (const pid of expulsados) counters[pid] = 0;
  }

  return { counters, suspendedAt };
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
 * Returns a Map of playerId → { reason } for players suspended for a specific jornada + categoria.
 *
 * A player is suspended for jornada J if:
 *  - They received a red card in a prior jornada and the suspension still covers J
 *    (red card at jornada index i with fechas_suspension=N → suspended for i+1..i+N), OR
 *  - Their running yellow card counter (since the last reset) hit 5 in the previous jornada
 *
 * Cards count toward the partido's category (not the player's home category).
 * Yellow cards accumulate across the full year (no Apertura/Clausura reset),
 * but the running counter resets to 0 whenever the player receives a red card.
 */
export function getSuspensionMap(jornadas, targetJornadaId, categoria) {
  const currentYear = new Date().getFullYear();
  const suspensions = new Map();

  const yearJornadas = jornadas
    .filter((j) => new Date(j.fecha).getFullYear() === currentYear)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const targetIdx = yearJornadas.findIndex((j) => j.id === targetJornadaId);
  if (targetIdx <= 0) return suspensions;

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

  return suspensions;
}

/**
 * For TarjetasTab: computes current suspensions across all categories.
 * "Current" = suspended for the next upcoming jornada (fecha >= today).
 * If all jornadas are in the past, uses a virtual "next" jornada after the last one,
 * meaning players who got cards in the last jornada are still shown as suspended.
 *
 * Returns Map<categoria, Map<playerId, { reason }>>
 */
export function getCurrentSuspensionsByCategory(jornadas) {
  const result = new Map();
  const currentYear = new Date().getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yearJornadas = jornadas
    .filter((j) => new Date(j.fecha).getFullYear() === currentYear)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  if (yearJornadas.length === 0) return result;

  // Find the next upcoming jornada (first with fecha >= today)
  const nextIdx = yearJornadas.findIndex((j) => new Date(j.fecha) >= today);

  for (const cat of CATEGORIAS_PARTIDO) {
    if (nextIdx >= 1) {
      // There's a future jornada — compute suspensions for it
      result.set(cat, getSuspensionMap(jornadas, yearJornadas[nextIdx].id, cat));
    } else if (nextIdx === -1 && yearJornadas.length > 0) {
      // All jornadas are in the past — simulate a virtual "next" jornada
      // virtualTargetIdx = yearJornadas.length (one past the last)
      const virtualTargetIdx = yearJornadas.length;
      const suspensions = new Map();

      // Red cards — scan backwards for active multi-game suspensions
      for (let i = yearJornadas.length - 1; i >= 0; i--) {
        const partido = (yearJornadas[i].partidos || []).find((p) => p.categoria === cat);
        if (!partido) continue;

        (partido.partido_eventos || [])
          .filter((e) => e.tipo === 'roja' && e.player_id)
          .forEach((e) => {
            const fechas = e.fechas_suspension || 1;
            // Suspended for jornadas i+1 through i+fechas
            if (virtualTargetIdx <= i + fechas) {
              const remaining = (i + fechas) - virtualTargetIdx + 1;
              suspensions.set(e.player_id, {
                reason: remaining > 1 ? `Roja (${remaining} fechas)` : 'Roja (última fecha)',
              });
            }
          });
      }

      // Yellow accumulation (resets to 0 on a red card) up to and including last jornada
      const yellowSuspensions = computeYellowSuspension(yearJornadas, cat, virtualTargetIdx);
      for (const [playerId, info] of yellowSuspensions) {
        if (!suspensions.has(playerId)) {
          suspensions.set(playerId, info);
        }
      }

      result.set(cat, suspensions);
    } else {
      // nextIdx === 0 means the first jornada is upcoming — no previous jornada
      result.set(cat, new Map());
    }
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
  const currentYear = new Date().getFullYear();

  const yearJornadas = jornadas
    .filter((j) => new Date(j.fecha).getFullYear() === currentYear)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  for (const cat of CATEGORIAS_PARTIDO) {
    const { counters } = walkYellowCounters(yearJornadas, cat, yearJornadas.length);
    result.set(cat, new Map(Object.entries(counters)));
  }

  return result;
}
