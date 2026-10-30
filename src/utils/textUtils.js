/** Pasa a minúsculas y quita tildes/diéresis para comparar búsquedas ("Martín" → "martin"). */
export function normalizeSearchText(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
