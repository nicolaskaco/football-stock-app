import { CATEGORIAS_PARTIDO } from './constants';

/**
 * Returns a Map of playerId → { reason } for players suspended for a specific jornada + categoria.
 *
 * A player is suspended for jornada J if:
 *  - They received a red card in a prior jornada and the suspension still covers J
 *    (red card at jornada index i with fechas_suspension=N → suspended for i+1..i+N), OR
 *  - Their cumulative yellow card count crossed a multiple of 5 in the previous jornada
 *
 * Cards count toward the partido's category (not the player's home category).
 * Yellow cards accumulate across the full year (no Apertura/Clausura reset).
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

  // Yellow card accumulation: walk jornadas 0..targetIdx-1
  const yellowsBefore = {}; // count BEFORE prevJornada
  const yellowsIncluding = {}; // count INCLUDING prevJornada

  for (let i = 0; i <= targetIdx - 1; i++) {
    const partido = (yearJornadas[i].partidos || []).find((p) => p.categoria === categoria);
    if (!partido) continue;

    (partido.partido_eventos || [])
      .filter((e) => e.tipo === 'amarilla' && e.player_id)
      .forEach((e) => {
        if (i < targetIdx - 1) {
          yellowsBefore[e.player_id] = (yellowsBefore[e.player_id] || 0) + 1;
        }
        yellowsIncluding[e.player_id] = (yellowsIncluding[e.player_id] || 0) + 1;
      });
  }

  for (const [playerId, total] of Object.entries(yellowsIncluding)) {
    const prior = yellowsBefore[playerId] || 0;
    if (Math.floor(total / 5) > Math.floor(prior / 5)) {
      const milestone = Math.floor(total / 5) * 5;
      // Only set yellow suspension if no red card suspension already active
      if (!suspensions.has(playerId)) {
        suspensions.set(playerId, { reason: `${milestone}ª Amarilla` });
      }
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

      // Yellow accumulation up to and including last jornada
      const yellows = {};
      const yellowsBefore = {};
      for (let i = 0; i < yearJornadas.length; i++) {
        const partido = (yearJornadas[i].partidos || []).find((p) => p.categoria === cat);
        if (!partido) continue;
        (partido.partido_eventos || [])
          .filter((e) => e.tipo === 'amarilla' && e.player_id)
          .forEach((e) => {
            if (i < yearJornadas.length - 1) {
              yellowsBefore[e.player_id] = (yellowsBefore[e.player_id] || 0) + 1;
            }
            yellows[e.player_id] = (yellows[e.player_id] || 0) + 1;
          });
      }
      for (const [playerId, total] of Object.entries(yellows)) {
        const prior = yellowsBefore[playerId] || 0;
        if (Math.floor(total / 5) > Math.floor(prior / 5)) {
          const milestone = Math.floor(total / 5) * 5;
          if (!suspensions.has(playerId)) {
            suspensions.set(playerId, { reason: `${milestone}ª Amarilla` });
          }
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
