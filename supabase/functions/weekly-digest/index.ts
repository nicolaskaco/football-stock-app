// Resumen semanal al grupo de Telegram del club. Lo llama pg_cron los lunes
// (ver supabase/migrations/20261125_cron_weekly_digest.sql).
//
// Incluye:
//  - fichas médicas vencidas o por vencer en 30 días, por categoría (los "sin ficha" solo contados);
//  - lesiones activas con el retorno estimado ya pasado (sin el tipo de lesión);
//  - solicitudes de cambio pendientes hace 7 días o más;
//  - artículos de inventario con stock bajo;
//  - el resultado de los chequeos automáticos de fichas SND de la última semana.
// Las suspensiones no van: su lógica vive en el frontend y están en el parte pre-jornada.
//
// Protegida con x-cron-secret (igual que refresh-fichas-medicas, --no-verify-jwt).
// Respeta app_settings.telegram_digest_enabled = 'true'.
// Con ?preview=1 devuelve el mensaje sin mandarlo ni loguear (para probar).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { escapeHTML as e, sendTelegram } from "../_shared/telegram.ts";

const CATEGORIAS = ["3era", "4ta", "5ta", "S16", "6ta", "7ma"]; // con ficha médica (sin Sub13)
const VENTANA_FICHA_DIAS = 30;
const DIAS_SOLICITUD_VIEJA = 7;
const AUTOR = "Sistema (resumen semanal)";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const hoyUY = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date());
const sumarDias = (iso: string, dias: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
};
/** 'YYYY-MM-DD…' → 'DD/MM' */
const ddmm = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");

type Player = {
  id: string;
  name: string;
  name_visual: string | null;
  categoria: string | null;
  categoria_juego: string | null;
  ficha_medica_hasta: string | null;
};
const nombre = (p: { name: string; name_visual: string | null } | null | undefined) =>
  e(p?.name_visual || p?.name || "—");
const categoria = (p: Player) => p.categoria_juego || p.categoria || "";

serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "No autorizado" }, 401);
  const preview = new URL(req.url).searchParams.get("preview") === "1";

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (!preview) {
    const { data: setting } = await db.from("app_settings").select("value").eq("key", "telegram_digest_enabled").maybeSingle();
    if (setting?.value !== "true") return json({ skipped: "telegram_digest_enabled está apagado" });
  }

  const hoy = hoyUY();
  const limiteFicha = sumarDias(hoy, VENTANA_FICHA_DIAS);
  const haceUnaSemana = new Date(Date.now() - 7 * 86400_000).toISOString();
  const limiteSolicitud = new Date(Date.now() - DIAS_SOLICITUD_VIEJA * 86400_000).toISOString();

  const [playersRes, injuriesRes, requestsRes, inventoryRes, sndRes] = await Promise.all([
    db.from("players")
      .select("id, name, name_visual, categoria, categoria_juego, ficha_medica_hasta")
      .eq("hide_player", false)
      .or("status.is.null,status.eq.activo"),
    db.from("player_injuries")
      .select("player_id, fecha_retorno_estimada")
      .is("fecha_alta", null)
      .lt("fecha_retorno_estimada", hoy),
    db.from("player_change_requests")
      .select("request_date, requested_by, players ( name, name_visual, categoria )")
      .eq("status", "pending")
      .lte("request_date", limiteSolicitud)
      .order("request_date", { ascending: true }),
    db.from("inventory").select("name, size, quantity, min_stock"),
    db.from("activity_log")
      .select("details, created_at")
      .eq("action_type", "ficha_medica_auto")
      .gte("created_at", haceUnaSemana),
  ]);
  const fallo = [playersRes, injuriesRes, requestsRes, inventoryRes, sndRes].find((r) => r.error);
  if (fallo?.error) return json({ error: fallo.error.message }, 500);

  const players = (playersRes.data || []) as Player[];
  const playersById = new Map(players.map((p) => [p.id, p]));
  const secciones: string[] = [];

  // ── Fichas médicas ──────────────────────────────────────────────
  const conFicha = players.filter((p) => CATEGORIAS.includes(categoria(p)));
  const lineasFicha: string[] = [];
  for (const cat of CATEGORIAS) {
    const delaCat = conFicha.filter((p) => categoria(p) === cat);
    const vencidas = delaCat.filter((p) => p.ficha_medica_hasta && p.ficha_medica_hasta < hoy)
      .sort((a, b) => a.ficha_medica_hasta!.localeCompare(b.ficha_medica_hasta!));
    const porVencer = delaCat.filter((p) => p.ficha_medica_hasta && p.ficha_medica_hasta >= hoy && p.ficha_medica_hasta <= limiteFicha)
      .sort((a, b) => a.ficha_medica_hasta!.localeCompare(b.ficha_medica_hasta!));
    const sinFicha = delaCat.filter((p) => !p.ficha_medica_hasta).length;
    if (!vencidas.length && !porVencer.length && !sinFicha) continue;

    const partes = [];
    if (vencidas.length) partes.push(`vencidas: ${vencidas.map((p) => `${nombre(p)} (${ddmm(p.ficha_medica_hasta)})`).join(", ")}`);
    if (porVencer.length) partes.push(`vencen pronto: ${porVencer.map((p) => `${nombre(p)} (${ddmm(p.ficha_medica_hasta)})`).join(", ")}`);
    if (sinFicha) partes.push(`${sinFicha} sin ficha cargada`);
    lineasFicha.push(`• <b>${cat}</b>: ${partes.join(" · ")}`);
  }
  secciones.push(lineasFicha.length
    ? `🩺 <b>Fichas médicas</b> (vencidas o por vencer en ${VENTANA_FICHA_DIAS} días)\n${lineasFicha.join("\n")}`
    : "🩺 <b>Fichas médicas</b>: todas vigentes por más de 30 días ✅");

  // ── Chequeo automático SND ──────────────────────────────────────
  // refresh-fichas-medicas deja al menos una fila por madrugada (sin_pendientes si no había
  // nadie) y una fila con error si falló, así que una semana sin filas es que el cron no corrió.
  const corridas = (sndRes.data || []).map((c) => (c.details || {}) as Record<string, unknown>);
  const fallidas = corridas.filter((d) => d.error).length;
  const consultas = corridas.filter((d) => !d.error && !d.sin_pendientes);
  const sinPendientes = corridas.filter((d) => d.sin_pendientes).length;
  if (corridas.length) {
    const suma = (k: string) => consultas.reduce((s, d) => s + (Number(d[k]) || 0), 0);
    const partes = [`${suma("procesados")} consultas, ${suma("actualizadas")} fichas actualizadas, ${suma("no_encontrados")} no encontrados en SND, ${suma("errores")} con error`];
    if (sinPendientes) partes.push(`${sinPendientes} noche${sinPendientes !== 1 ? "s" : ""} sin pendientes`);
    if (fallidas) partes.push(`⚠️ ${fallidas} corrida${fallidas !== 1 ? "s fallidas" : " fallida"}`);
    secciones.push(`🔄 <b>Chequeo SND automático</b> (última semana): ${partes.join(" · ")}`);
  } else {
    secciones.push("🔄 <b>Chequeo SND automático</b>: ⚠️ no corrió en la última semana");
  }

  // ── Lesiones con retorno vencido ────────────────────────────────
  const vistos = new Set<string>();
  const lesiones = (injuriesRes.data || [])
    .filter((i) => !vistos.has(i.player_id) && vistos.add(i.player_id))
    .map((i) => ({ ...i, player: playersById.get(i.player_id) }))
    .filter((i) => i.player);
  if (lesiones.length) {
    secciones.push(`🏥 <b>Lesionados con el retorno estimado vencido</b> (¿actualizar o dar de alta?)\n${
      lesiones.map((i) => `• ${nombre(i.player)} (${e(categoria(i.player!))}): retorno estimado ${ddmm(i.fecha_retorno_estimada)}`).join("\n")}`);
  }

  // ── Solicitudes pendientes viejas ───────────────────────────────
  const solicitudes = requestsRes.data || [];
  if (solicitudes.length) {
    secciones.push(`📝 <b>Solicitudes pendientes hace ${DIAS_SOLICITUD_VIEJA} días o más</b>: ${solicitudes.length}\n${
      solicitudes.map((r) => {
        // deno-lint-ignore no-explicit-any
        const p = r.players as any;
        return `• ${nombre(p)}${p?.categoria ? ` (${e(p.categoria)})` : ""}: desde el ${ddmm(r.request_date)}`;
      }).join("\n")}`);
  }

  // ── Stock bajo ──────────────────────────────────────────────────
  const stockBajo = (inventoryRes.data || []).filter((i) => i.min_stock != null && i.quantity <= i.min_stock);
  if (stockBajo.length) {
    secciones.push(`📦 <b>Stock bajo</b>\n${
      stockBajo.map((i) => `• ${e(i.name)}${i.size ? ` (${e(i.size)})` : ""}: ${i.quantity} (mín. ${i.min_stock})`).join("\n")}`);
  }

  const html = `📋 <b>Resumen semanal — Formativas CAP</b> (${ddmm(hoy)})\n\n${secciones.join("\n\n")}`;

  if (preview) return json({ preview: true, html });

  try {
    await sendTelegram(html);
  } catch (err) {
    console.error("weekly-digest:", err);
    return json({ error: String(err instanceof Error ? err.message : err) }, 502);
  }

  const { error: logErr } = await db.from("activity_log").insert([{
    action_type: "telegram_resumen",
    performed_by: AUTOR,
    target_type: "telegram",
    details: {
      caracteres: html.length,
      lesiones_vencidas: lesiones.length,
      solicitudes_viejas: solicitudes.length,
      stock_bajo: stockBajo.length,
    },
  }]);
  if (logErr) console.error("activity_log:", logErr.message);

  return json({ ok: true, caracteres: html.length });
});
