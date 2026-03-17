/**
 * Returns the configured minimum birth year for a category, or null if not set.
 * Players born BEFORE this year are over-age for the category.
 */
export function getMinBirthYearForCategory(categoria, appSettings) {
  if (!categoria || !appSettings) return null;
  const raw = appSettings['ano_min_' + categoria];
  if (raw === undefined || raw === null || raw === '') return null;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Checks whether a player is over-age for a given category based on birth year.
 * Returns { overAge, birthYear, minYear }.
 */
export function isPlayerOverAge(player, categoria, appSettings) {
  const minYear = getMinBirthYearForCategory(categoria, appSettings);
  if (minYear === null) return { overAge: false, birthYear: null, minYear: null };

  const dob = player?.date_of_birth;
  if (!dob) return { overAge: false, birthYear: null, minYear };

  const birthYear = parseInt(dob.substring(0, 4), 10);
  if (Number.isNaN(birthYear)) return { overAge: false, birthYear: null, minYear };

  return { overAge: birthYear < minYear, birthYear, minYear };
}
