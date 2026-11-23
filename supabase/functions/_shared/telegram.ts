// Envío de mensajes al grupo de Telegram del club.
// El token del bot y el chat del grupo son secretos de las funciones:
//   supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=...
// Nunca van al repo ni al frontend.

const LIMITE = 4000; // Telegram acepta hasta 4096 caracteres por mensaje

/** Escapa texto para parse_mode HTML. */
export const escapeHTML = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Corta un texto largo en partes de hasta LIMITE caracteres, sin partir renglones si se puede. */
export function partir(texto: string, limite = LIMITE): string[] {
  const partes: string[] = [];
  let actual = "";
  for (const linea of texto.split("\n")) {
    const candidata = actual ? `${actual}\n${linea}` : linea;
    if (candidata.length <= limite) {
      actual = candidata;
      continue;
    }
    if (actual) partes.push(actual);
    // Un renglón solo más largo que el límite se corta a la fuerza
    let resto = linea;
    while (resto.length > limite) {
      partes.push(resto.slice(0, limite));
      resto = resto.slice(limite);
    }
    actual = resto;
  }
  if (actual) partes.push(actual);
  return partes;
}

/** Manda `html` (parse_mode HTML) al grupo configurado, en varias partes si hace falta. */
export async function sendTelegram(html: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) throw new Error("Falta configurar TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID");

  for (const parte of partir(html)) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: parte, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Telegram respondió ${res.status}: ${body.slice(0, 200)}`);
    }
  }
}
