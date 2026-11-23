// Chequeo automático de fichas médicas contra SND.
//
// La llama pg_cron (ver supabase/migrations/20261124_cron_fichas_medicas.sql) varias veces
// por noche. Cada corrida toma una tanda de jugadores activos con la ficha vencida, sin
// ficha o por vencer en VENTANA_DIAS días, que no se hayan chequeado en las últimas
// HORAS_ENTRE_CHEQUEOS horas, y consulta SND de a uno. Así el plantel entero se recorre en
// varias corridas cortas, sin pasar el tiempo máximo de una Edge Function.
//
// Mismo criterio que database.saveFichaMedicaHasta: solo escribe si la fecha cambió y deja el
// cambio en player_history. Cada corrida que procesó a alguien deja un resumen en activity_log.
//
// Se despliega sin verificación de JWT (--no-verify-jwt) y se protege con el header
// x-cron-secret, que tiene que coincidir con el secreto CRON_SECRET de la función.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { consultarSND, fichaFutbol, hastaToISO, idTipoDocumento, normalizarDocumento } from "../_shared/snd.ts";

const VENTANA_DIAS = 30;
const HORAS_ENTRE_CHEQUEOS = 20;
const TANDA = 40;
const PRESUPUESTO_MS = 110_000; // margen bajo el límite de 150 s de las Edge Functions
const PAUSA_MS = 500; // entre consultas, para no saturar a SND
const AUTOR = "Sistema (SND automático)";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fecha de hoy en Uruguay, 'YYYY-MM-DD'. */
function hoyUY(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date());
}

function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

type Player = {
  id: string;
  name: string;
  name_visual: string | null;
  gov_id: string | null;
  tipo_documento: string | null;
  ficha_medica_hasta: string | null;
  ficha_medica_chequeada_at: string | null;
  status: string | null;
};

serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "No autorizado" }, 401);
  }

  const inicio = Date.now();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const hoy = hoyUY();
  const limite = sumarDias(hoy, VENTANA_DIAS);
  const chequeadoAntesDe = new Date(Date.now() - HORAS_ENTRE_CHEQUEOS * 3600_000).toISOString();

  const { data, error } = await supabase
    .from("players")
    .select("id, name, name_visual, gov_id, tipo_documento, ficha_medica_hasta, ficha_medica_chequeada_at, status")
    .eq("hide_player", false)
    .or(`ficha_medica_hasta.is.null,ficha_medica_hasta.lte.${limite}`);
  if (error) return json({ error: error.message }, 500);

  const pendientes = (data as Player[])
    .filter((p) => !p.status || p.status === "activo")
    .filter((p) => p.gov_id && String(p.gov_id).trim())
    .filter((p) => !p.ficha_medica_chequeada_at || p.ficha_medica_chequeada_at < chequeadoAntesDe)
    // Primero los que nunca se chequearon, después los de chequeo más viejo
    .sort((a, b) => (a.ficha_medica_chequeada_at ?? "").localeCompare(b.ficha_medica_chequeada_at ?? ""));

  const tanda = pendientes.slice(0, TANDA);
  const resumen = {
    actualizadas: [] as { nombre: string; antes: string | null; ahora: string }[],
    sin_cambios: 0,
    sin_ficha_futbol: [] as string[],
    no_encontrados: [] as string[],
    errores: [] as string[],
  };
  let procesados = 0;

  for (const p of tanda) {
    if (Date.now() - inicio > PRESUPUESTO_MS) break;
    const nombre = p.name_visual || p.name;
    try {
      const consulta = await consultarSND(normalizarDocumento(p.gov_id!, p.tipo_documento), idTipoDocumento(p.tipo_documento));
      const futbol = consulta.found ? fichaFutbol(consulta.fichas) : undefined;

      if (!consulta.found) resumen.no_encontrados.push(nombre);
      else if (!futbol) resumen.sin_ficha_futbol.push(nombre);
      else {
        const nueva = hastaToISO(futbol.hasta);
        if (nueva === p.ficha_medica_hasta) resumen.sin_cambios++;
        else {
          const { error: upErr } = await supabase.from("players").update({ ficha_medica_hasta: nueva }).eq("id", p.id);
          if (upErr) throw upErr;
          const { error: histErr } = await supabase.from("player_history").insert([{
            player_id: p.id,
            field_name: "ficha_medica_hasta",
            old_value: p.ficha_medica_hasta,
            new_value: nueva,
            changed_by: AUTOR,
          }]);
          if (histErr) console.error("player_history:", histErr.message);
          resumen.actualizadas.push({ nombre, antes: p.ficha_medica_hasta, ahora: nueva });
        }
      }

      // Se marca como chequeado aunque no haya cambios; los errores se reintentan en la próxima corrida
      await supabase.from("players").update({ ficha_medica_chequeada_at: new Date().toISOString() }).eq("id", p.id);
    } catch (err) {
      console.error(`SND ${p.id}:`, err);
      resumen.errores.push(nombre);
    }
    procesados++;
    await sleep(PAUSA_MS);
  }

  const resultado = {
    procesados,
    pendientes_restantes: pendientes.length - procesados,
    actualizadas: resumen.actualizadas.length,
    sin_cambios: resumen.sin_cambios,
    sin_ficha_futbol: resumen.sin_ficha_futbol.length,
    no_encontrados: resumen.no_encontrados.length,
    errores: resumen.errores.length,
  };

  if (procesados > 0) {
    const { error: logErr } = await supabase.from("activity_log").insert([{
      action_type: "ficha_medica_auto",
      performed_by: AUTOR,
      target_type: "player",
      details: { ...resultado, detalle: resumen },
    }]);
    if (logErr) console.error("activity_log:", logErr.message);
  }

  return json(resultado);
});
