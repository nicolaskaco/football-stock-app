// Parte de disponibilidad automático al grupo de Telegram. Lo llama pg_cron los miércoles
// a las 12:59 de Uruguay (ver supabase/migrations/20261125_cron_parte_semanal.sql).
//
// Es el mismo /parte del bot (comandos.ts), con todas las categorías que tienen partido
// pendiente en la próxima jornada y sin el tipo de lesión (va al grupo). Si no hay próxima
// jornada cargada, avisa que no hay siguiente partido.
//
// Protegida con x-cron-secret (igual que weekly-digest, --no-verify-jwt).
// Respeta app_settings.parte_semanal_enabled = 'true'.
// Con ?preview=1 devuelve el mensaje sin mandarlo ni loguear (para probar).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTelegram } from "../_shared/telegram.ts";
import { type Contexto, EJECUTORES, proximaJornada } from "../telegram-bot/comandos.ts";

const AUTOR = "Sistema (parte semanal)";
const SIN_PARTIDO = "📅 No hay siguiente partido cargado en la app.";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const hoyUY = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date());

serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "No autorizado" }, 401);
  const preview = new URL(req.url).searchParams.get("preview") === "1";

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (!preview) {
    const { data: setting } = await db.from("app_settings").select("value").eq("key", "parte_semanal_enabled").maybeSingle();
    if (setting?.value !== "true") return json({ skipped: "parte_semanal_enabled está apagado" });
  }

  // Un admin sin categorías propias: ve todas. enGrupo = true para no mostrar el tipo de lesión.
  const ctx: Contexto = {
    db,
    perm: {
      email: AUTOR,
      role: "admin",
      categoria: null,
      can_access_players: true,
      can_view_partidos: true,
      can_access_widgets: false,
      can_access_tareas: false,
      can_access_viatico: false,
    },
    args: [],
    resto: "",
    hoy: hoyUY(),
    enGrupo: true,
  };

  let html: string;
  let jornadaId: string | null = null;
  try {
    const proxima = await proximaJornada(ctx, null);
    jornadaId = proxima?.id ?? null;
    html = proxima ? await EJECUTORES.parte(ctx) : SIN_PARTIDO;
  } catch (err) {
    console.error("parte-semanal:", err);
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }

  if (preview) return json({ preview: true, html });

  try {
    await sendTelegram(html);
  } catch (err) {
    console.error("parte-semanal:", err);
    return json({ error: String(err instanceof Error ? err.message : err) }, 502);
  }

  const { error: logErr } = await db.from("activity_log").insert([{
    action_type: "telegram_parte_auto",
    performed_by: AUTOR,
    target_type: "telegram",
    details: { hay_jornada: !!jornadaId, jornada_id: jornadaId, caracteres: html.length },
  }]);
  if (logErr) console.error("activity_log:", logErr.message);

  return json({ ok: true, hay_jornada: !!jornadaId, caracteres: html.length });
});
