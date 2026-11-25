// Aviso al grupo de Telegram con las fichas médicas que cambió el chequeo automático de SND.
// Lo llama pg_cron todos los días a las 06:00 de Uruguay (ver
// supabase/migrations/20261125_cron_fichas_cambios.sql), después de las tandas de
// refresh-fichas-medicas (03:00–05:40). Junta en un solo mensaje los cambios de la noche,
// leyéndolos de player_history; si no hubo cambios no manda nada.
//
// Protegida con x-cron-secret (igual que weekly-digest, --no-verify-jwt).
// Respeta app_settings.telegram_fichas_cambios_enabled = 'true'.
// Con ?preview=1 devuelve el mensaje sin mandarlo ni loguear (para probar).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { escapeHTML as e, sendTelegram } from "../_shared/telegram.ts";
import { CATEGORIAS } from "../_shared/app/constants.js";

// = AUTOR de refresh-fichas-medicas: así se distinguen los cambios automáticos de los manuales
const AUTOR_SND = "Sistema (SND automático)";
const AUTOR = "Sistema (fichas SND)";
// Cubre las tandas de 03:00–05:40 sin tomar las de la noche anterior
const VENTANA_HORAS = 12;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const hoyUY = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date());
/** 'YYYY-MM-DD…' → 'DD/MM' */
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
/** 'YYYY-MM-DD…' → 'DD/MM/YYYY', o "sin ficha" */
const fecha = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "sin ficha");

type Jugador = { name: string; name_visual: string | null; categoria: string | null; categoria_juego: string | null; hide_player: boolean | null };
type Fila = { player_id: string; old_value: string | null; new_value: string | null; changed_at: string; players: Jugador | null };
type Cambio = { jugador: Jugador; antes: string | null; ahora: string | null };

const ordenCategoria = (a: string, b: string) => {
  const ia = CATEGORIAS.indexOf(a), ib = CATEGORIAS.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
};

serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "No autorizado" }, 401);
  const preview = new URL(req.url).searchParams.get("preview") === "1";

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (!preview) {
    const { data: setting } = await db.from("app_settings").select("value").eq("key", "telegram_fichas_cambios_enabled").maybeSingle();
    if (setting?.value !== "true") return json({ skipped: "telegram_fichas_cambios_enabled está apagado" });
  }

  const desde = new Date(Date.now() - VENTANA_HORAS * 3600_000).toISOString();
  const { data, error } = await db.from("player_history")
    .select("player_id, old_value, new_value, changed_at, players(name, name_visual, categoria, categoria_juego, hide_player)")
    .eq("field_name", "ficha_medica_hasta")
    .eq("changed_by", AUTOR_SND)
    .gte("changed_at", desde)
    .order("changed_at", { ascending: true });
  if (error) return json({ error: error.message }, 500);

  // Un jugador que cambió más de una vez: de la primera fecha a la última
  const porJugador = new Map<string, Cambio>();
  for (const f of (data || []) as unknown as Fila[]) {
    if (!f.players || f.players.hide_player) continue;
    const previo = porJugador.get(f.player_id);
    porJugador.set(f.player_id, { jugador: f.players, antes: previo ? previo.antes : f.old_value, ahora: f.new_value });
  }
  const cambios = [...porJugador.values()].filter((c) => c.antes !== c.ahora);

  if (!cambios.length) return json({ ok: true, cambios: 0, ...(preview ? { preview: true, html: null } : {}) });

  const nombre = (j: Jugador) => j.name_visual || j.name;
  const categoria = (j: Jugador) => j.categoria_juego || j.categoria || "Sin categoría";
  const grupos = new Map<string, Cambio[]>();
  for (const c of cambios) grupos.set(categoria(c.jugador), [...(grupos.get(categoria(c.jugador)) || []), c]);

  const secciones = [...grupos.entries()]
    .sort(([a], [b]) => ordenCategoria(a, b))
    .map(([cat, lista]) => `<b>${e(cat)}</b>\n${lista
      .sort((a, b) => nombre(a.jugador).localeCompare(nombre(b.jugador)))
      .map((c) => `• ${e(nombre(c.jugador))}: ${fecha(c.antes)} → ${fecha(c.ahora)}`)
      .join("\n")}`);
  const html = `🩺 <b>Fichas médicas actualizadas desde SND</b> (${ddmm(hoyUY())})\n\n${secciones.join("\n\n")}`;

  if (preview) return json({ preview: true, cambios: cambios.length, html });

  try {
    await sendTelegram(html);
  } catch (err) {
    console.error("fichas-cambios:", err);
    return json({ error: String(err instanceof Error ? err.message : err) }, 502);
  }

  const { error: logErr } = await db.from("activity_log").insert([{
    action_type: "telegram_fichas_cambios",
    performed_by: AUTOR,
    target_type: "telegram",
    details: { cambios: cambios.length, caracteres: html.length },
  }]);
  if (logErr) console.error("activity_log:", logErr.message);

  return json({ ok: true, cambios: cambios.length, caracteres: html.length });
});
