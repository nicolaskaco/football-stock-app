// /pregunta: Claude Haiku traduce una pregunta en lenguaje natural a un filtro de jugadores.
// La IA no ve datos de la base ni tiene herramientas: solo devuelve un JSON con el esquema de
// filtros.ts, que después se valida (validarFiltro) y se aplica en código (filtrarJugadores).
// Clave: secreto ANTHROPIC_API_KEY de las funciones (supabase secrets set ANTHROPIC_API_KEY=...).

import Anthropic from "npm:@anthropic-ai/sdk";
import { CATEGORIAS } from "./logica.ts";
import { ESQUEMA_RESPUESTA_IA, ESTADOS } from "./filtros.ts";
import { DEPARTAMENTOS, POSICIONES_JUGADOR } from "../_shared/app/constants.js";

export const MODELO_IA = "claude-haiku-5-5";

export type Interpretacion = {
  entendido: boolean;
  aclaracion: string | null;
  filtro: unknown;
  usage: { input_tokens: number; output_tokens: number };
};

// Fijo (sin fecha ni datos del usuario) para que el prefijo se pueda cachear; la fecha va en el mensaje.
const SISTEMA = `Sos el traductor de preguntas del bot de las divisiones formativas del Club Atlético Peñarol.
Tu única tarea: convertir una pregunta sobre jugadores en un filtro JSON con el esquema dado. No respondés la pregunta ni inventás datos: el sistema busca con tu filtro.

Reglas:
- Campos que la pregunta no menciona: null, o lista vacía.
- Números enteros. "más de 7" → min 8; "al menos 7" o "7 o más" → min 7; "menos de 200" → max 199; "mayor a 10000" → min 10001; "hasta 5" → max 5; "exactamente 3" → min 3 y max 3; "ninguna/nunca" → max 0.
- Categorías válidas: ${CATEGORIAS.join(", ")}. Sinónimos: quinta=5ta, cuarta=4ta, tercera=3era, sexta=6ta, séptima=7ma, sub16/sub-16=S16, sub13=Sub13. "categorias" es la categoría del jugador; "categorias_juego" solo si se pregunta en qué categoría juega distinta de la suya.
- Posiciones válidas: ${POSICIONES_JUGADOR.join(", ")} (arqueros → Arquero, defensas centrales → Zaguero, etc.).
- Departamentos válidos: ${DEPARTAMENTOS.join(", ")}.
- Estados válidos: ${ESTADOS.join(", ")}. Si no se piden estados, lista vacía (el sistema usa solo activos). "Incluyendo cedidos" → ["activo","cedido"].
- Nacimiento: "nacidos en 2009" → anios_nacimiento [2009]; "entre enero y junio" → mes_nacimiento_desde 1 y mes_nacimiento_hasta 6 (con año, sumá anios_nacimiento); fechas exactas → nacimiento_desde / nacimiento_hasta (YYYY-MM-DD); "cumplen en marzo" → cumple_mes 3; edades → edad.
- Estadísticas (goles, amarillas, rojas, minutos, convocatorias, titular): del año en curso salvo que digan otro año (anio_stats). "Suspendidos" → suspendido_hoy true.
- Viático: "viático" sin más → viatico_total (viático + complemento); "solo viático" → viatico; "complemento" → complemento. "Con contrato" → contrato true; "casos especiales" → caso_especial true.
- Ficha médica: "ficha vencida" → ficha "vencida"; "por vencer"/"vence pronto" → "por_vencer" (ficha_dias si dicen cuántos días); "sin ficha" → "sin_ficha".
- casita: viven en la casita del club. vianda_min: cantidad mínima de viandas.
- orden: solo si piden un orden ("los que más goles", "ordenados por edad"); si no, campo null y descendente null.
- entendido false (con una aclaración corta en español rioplatense, voseo) si la pregunta no es una búsqueda de jugadores con estos filtros: opiniones ("quién rinde mejor"), lesiones o lesionados (no disponible), modificar datos, cálculos sobre el resultado (promedios, totales), funcionarios, dirigentes o inventario. Si es una búsqueda válida, aclaracion null.`;

let cliente: Anthropic | null = null;
const clienteIA = () => {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null;
  cliente ??= new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });
  return cliente;
};

export const iaConfigurada = () => !!Deno.env.get("ANTHROPIC_API_KEY");

/** Le pide a Haiku el filtro para la pregunta. Tira error si la API falla. */
export async function interpretarPregunta(texto: string, { hoy }: { hoy: string }): Promise<Interpretacion> {
  const ia = clienteIA();
  if (!ia) throw new Error("Falta configurar ANTHROPIC_API_KEY");

  const respuesta = await ia.messages.create({
    model: MODELO_IA,
    max_tokens: 4000,
    system: [{ type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA_RESPUESTA_IA } },
    messages: [{ role: "user", content: `Hoy es ${hoy}.\nPregunta: ${texto}` }],
  });
  const usage = { input_tokens: respuesta.usage.input_tokens, output_tokens: respuesta.usage.output_tokens };

  if (respuesta.stop_reason === "refusal") {
    return { entendido: false, aclaracion: "No puedo responder esa pregunta.", filtro: null, usage };
  }
  if (respuesta.stop_reason === "max_tokens") throw new Error("La respuesta de la IA quedó cortada");

  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") throw new Error("La IA no devolvió el filtro");
  const json = JSON.parse(bloque.text) as { entendido?: unknown; aclaracion?: unknown; filtro?: unknown };
  return {
    entendido: json.entendido === true,
    aclaracion: typeof json.aclaracion === "string" && json.aclaracion.trim() ? json.aclaracion.trim() : null,
    filtro: json.filtro ?? null,
    usage,
  };
}
