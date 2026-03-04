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

  if (html.includes('No existen resultados')) {
    return new Response(JSON.stringify({ found: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const nameMatch = html.match(/<h4>([^<(]+)/);
  const nombre = nameMatch ? nameMatch[1].trim() : '';

  // Each sport block: <strong>FÚTBOL</strong>: desde DD/MM/YYYY hasta DD/MM/YYYY
  const fichas: { deporte: string; desde: string; hasta: string; vencido: boolean }[] = [];
  const blockRegex = /<strong>([^<]+)<\/strong>[^]*?desde\s+([\d\/]+)[^]*?hasta\s+([\d\/]+)/g;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let match;
  while ((match = blockRegex.exec(html)) !== null) {
    const hasta = match[3].trim();
    const [d, m, y] = hasta.split('/').map(Number);
    const hastaDate = new Date(y, m - 1, d);
    fichas.push({
      deporte: match[1].trim(),
      desde: match[2].trim(),
      hasta,
      vencido: hastaDate < today,
    });
  }

  return new Response(JSON.stringify({ found: true, nombre, fichas }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
