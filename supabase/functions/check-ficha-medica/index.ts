import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { documento, idtipodocumento = 1 } = await req.json();

  const body = new URLSearchParams();
  body.append('documento', String(documento));
  body.append('idtipodocumento', String(idtipodocumento));

  const res = await fetch(
    'https://aps.deporte.gub.uy/ConsultaCarneDeportista/Carnes/consultar',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }
  );

  const html = await res.text();
  console.log('SND HTML snippet:', html.substring(0, 3000));

  if (html.includes('No existen resultados')) {
    return new Response(JSON.stringify({ found: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const nameMatch = html.match(/<h4>([^<(]+)/);
  const nombre = nameMatch ? nameMatch[1].trim() : '';

  // Each sport block looks like:
  // <strong>FÚTBOL</strong>: desde DD/MM/YYYY hasta DD/MM/YYYY <span class="label label-danger">Vencido</span>
  const fichas: { deporte: string; desde: string; hasta: string; vencido: boolean }[] = [];
  const blockRegex = /<strong>([^<]+)<\/strong>[\s\S]*?desde\s+([\d\/]+)[\s\S]*?hasta\s+([\d\/]+)[\s\S]*?label-(danger|success)/g;
  let match;
  while ((match = blockRegex.exec(html)) !== null) {
    fichas.push({
      deporte: match[1].trim(),
      desde: match[2],
      hasta: match[3],
      vencido: match[4] === 'danger',
    });
  }

  return new Response(JSON.stringify({ found: true, nombre, fichas }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
