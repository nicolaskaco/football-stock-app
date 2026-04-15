import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ok = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { gov_id } = await req.json();

    if (!gov_id) {
      return ok({ error: "Cédula requerida." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service-role client — bypasses RLS so we can look up any player
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Look up the player by gov_id (cedula is the credential)
    const { data: players, error: playerError } = await adminClient
      .from("players")
      .select("id, name, gov_id, date_of_birth, hide_player")
      .eq("gov_id", gov_id)
      .eq("hide_player", false)
      .limit(1);

    if (playerError) {
      return ok({ error: "Error al buscar el jugador." });
    }

    if (!players || players.length === 0) {
      return ok({ error: "Cédula no encontrada. Contactá al club si hay un error." });
    }

    const player = players[0];

    // Check whether the questionnaire has already been submitted
    const { data: existing, error: qError } = await adminClient
      .from("player_questionnaire")
      .select("id, completed_at")
      .eq("player_id", player.id)
      .maybeSingle();

    if (qError) {
      return ok({ error: "Error al verificar el formulario." });
    }

    return ok({
      player: {
        id: player.id,
        name: player.name,
        gov_id: player.gov_id,
        date_of_birth: player.date_of_birth,
      },
      already_submitted: existing !== null,
    });
  } catch (err) {
    return ok({ error: "Error inesperado: " + String(err) });
  }
});
