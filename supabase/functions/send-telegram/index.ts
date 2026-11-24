// Envía un mensaje al grupo de Telegram del club desde la app (por ejemplo el parte de
// disponibilidad). Requiere un usuario logueado con rol admin, ejecutivo, presidente o
// presidente_categoria. Se despliega con la verificación de JWT por defecto.
//
// Body: { html: string }: texto con parse_mode HTML de Telegram (<b>, <i>, escapado).
// El contenido es responsabilidad de quien llama: la función solo controla el rol.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTelegram } from "../_shared/telegram.ts";

const ROLES_PERMITIDOS = ["admin", "ejecutivo", "presidente", "presidente_categoria"];
const MAX_CARACTERES = 20_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Falta la sesión" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const callerClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user?.email) return json({ error: "Sesión inválida" }, 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: perm } = await admin.from("user_permissions").select("role").eq("email", user.email).maybeSingle();
  if (!perm || !ROLES_PERMITIDOS.includes(perm.role)) {
    return json({ error: "Tu rol no puede enviar mensajes a Telegram" }, 403);
  }

  let html: unknown;
  try {
    ({ html } = await req.json());
  } catch {
    return json({ error: "Body inválido" }, 400);
  }
  if (typeof html !== "string" || !html.trim()) return json({ error: "Mensaje vacío" }, 400);
  if (html.length > MAX_CARACTERES) return json({ error: "Mensaje demasiado largo" }, 400);

  try {
    await sendTelegram(html);
  } catch (err) {
    console.error("send-telegram:", err);
    return json({ error: String(err instanceof Error ? err.message : err) }, 502);
  }

  const resumen = html.replace(/<[^>]+>/g, "").split("\n")[0]
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .slice(0, 120);
  const { error: logErr } = await admin.from("activity_log").insert([{
    action_type: "telegram_envio",
    performed_by: user.email,
    target_type: "telegram",
    details: { caracteres: html.length, resumen },
  }]);
  if (logErr) console.error("activity_log:", logErr.message);

  return json({ ok: true });
});
