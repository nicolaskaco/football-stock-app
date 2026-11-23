/** Pasa a minúsculas y quita tildes/diéresis para comparar búsquedas ("Martín" → "martin"). */
export function normalizeSearchText(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Texto con *negrita* estilo WhatsApp → HTML de Telegram (parse_mode HTML):
 * escapa &, < y > y convierte *texto* (dentro de un mismo renglón) en <b>texto</b>.
 */
export function textoATelegramHTML(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
}
