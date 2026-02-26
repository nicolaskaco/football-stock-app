// ============================================================
// Centralised date utilities for the CAP internal app.
// All formatting uses the 'es-UY' locale to match the app's language.
// Import from here instead of using inline toLocaleDateString() calls.
// ============================================================

const LOCALE = 'es-UY';

/**
 * ISO string (or null/undefined) → 'DD/MM/YYYY'
 * Use for table cells, list items, form labels.
 */
export function formatDate(isoString) {
  if (!isoString) return '-';
  const [year, month, day] = isoString.split('T')[0].split('-');
  return new Date(Number(year), Number(month) - 1, Number(day))
    .toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * ISO string (or null/undefined) → 'DD de mes de YYYY'
 * Use where a longer, human-readable date is preferred (e.g. tournament dates).
 */
export function formatDateLong(isoString) {
  if (!isoString) return '-';
  const [year, month, day] = isoString.split('T')[0].split('-');
  return new Date(Number(year), Number(month) - 1, Number(day))
    .toLocaleDateString(LOCALE, { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * ISO timestamp (or null/undefined) → 'DD de mes de YYYY, HH:MM'
 * Use for audit trail entries that include a time component.
 */
export function formatDateTime(isoString) {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString(LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * ISO date string 'YYYY-MM-DD' → 'DD de mes' (no year)
 * Use for birthday displays. Parses without timezone drift by
 * constructing the Date from explicit year/month/day parts.
 */
export function formatBirthday(isoDate) {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day))
    .toLocaleDateString(LOCALE, { month: 'long', day: 'numeric' });
}

/**
 * Returns today's date as 'YYYY-MM-DD' for use in HTML <input type="date">
 * default values and file-name timestamps.
 */
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Parses a 'YYYY-MM-DD' date-of-birth string into a Date object without
 * timezone drift. Always prefer this over `new Date(dobString)` for DOB fields.
 */
export function parseDOB(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
}
