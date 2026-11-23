import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { consultarSND } from "../_shared/snd.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { documento, idtipodocumento = 1 } = await req.json();
  try {
    const result = await consultarSND(documento, idtipodocumento);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // SND caído o con error: 502 con CORS para que la app lo muestre como error
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
