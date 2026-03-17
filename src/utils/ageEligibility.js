import { calculateAge } from './dateUtils';

/**
 * Returns the configured max age for a category, or null if not set.
 */
export function getMaxAgeForCategory(categoria, appSettings) {
  if (!categoria || !appSettings) return null;
  const raw = appSettings['edad_max_' + categoria];
  if (raw === undefined || raw === null || raw === '') return null;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Checks whether a player exceeds the max age for a given category.
 * Returns { overAge, playerAge, maxAge }.
 */
export function isPlayerOverAge(player, categoria, appSettings) {
  const maxAge = getMaxAgeForCategory(categoria, appSettings);
  if (maxAge === null) return { overAge: false, playerAge: null, maxAge: null };

  const age = calculateAge(player?.fecha_nacimiento);
  if (typeof age !== 'number') return { overAge: false, playerAge: null, maxAge };

  return { overAge: age > maxAge, playerAge: age, maxAge };
}
