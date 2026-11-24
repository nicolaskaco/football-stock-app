import { CATEGORIAS_ESCENARIO_INVERTIDO, CATEGORIAS_PARTIDO, FASES_CAMPEONATO, JORNADAS_UNA_CATEGORIA } from './constants';
import { fechaPartidoDefault } from './dateUtils';

/**
 * Escenario de una categoría a partir del escenario base de la jornada:
 * 6ta y 7ma juegan al revés (Local ↔ Visitante). Neutral es neutral para todas.
 */
export function escenarioDeCategoria(escenarioBase, categoria) {
  if (escenarioBase === 'Neutral' || !CATEGORIAS_ESCENARIO_INVERTIDO.includes(categoria)) return escenarioBase;
  return escenarioBase === 'Local' ? 'Visitante' : 'Local';
}

/**
 * Filas de `partidos` para una jornada recién creada.
 *  - Sin `categoria`: los 5 partidos, con el escenario invertido en 6ta/7ma y la fecha
 *    por defecto de cada categoría (la 4ta el día anterior).
 *  - Con `categoria` (Semifinal / Final): un solo partido, con el escenario elegido tal cual
 *    y la fecha de la jornada.
 * Césped por defecto: Sintético de local, Natural de visitante o en cancha neutral.
 */
export function armarPartidosJornada(jornada, escenarioBase, categoria = null) {
  const fila = (cat, escenario, fecha) => ({
    jornada_id: jornada.id,
    categoria: cat,
    fecha,
    escenario,
    cesped: escenario === 'Local' ? 'Sintético' : 'Natural',
  });
  if (categoria) return [fila(categoria, escenarioBase, fechaPartidoDefault(jornada.fecha, null))];
  return CATEGORIAS_PARTIDO.map((cat) =>
    fila(cat, escenarioDeCategoria(escenarioBase, cat), fechaPartidoDefault(jornada.fecha, cat)));
}

/**
 * Semifinal y Final definen el campeonato entre los ganadores del Apertura y el Clausura (y la
 * tabla anual): no son de ninguna de las dos fases y se guardan con `fase` null.
 */
export const esDefinicion = (numeroJornada) => JORNADAS_UNA_CATEGORIA.includes(numeroJornada);

/** Fase para mostrar: 'Definición' cuando la jornada no tiene fase (Semifinal / Final). */
export const faseLabel = (jornada) => jornada?.fase || 'Definición';

/** Orden de fase: Apertura, Clausura y después las jornadas sin fase (la definición). */
export const ordenFase = (fase) => (FASES_CAMPEONATO.includes(fase) ? FASES_CAMPEONATO.indexOf(fase) : FASES_CAMPEONATO.length);
