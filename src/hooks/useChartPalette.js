import { useDarkMode } from '../context/DarkModeContext';

/**
 * Paleta de series para las comparaciones de jugadores (hasta 3).
 *
 * En modo claro la segunda serie es casi negra, que es la identidad visual de
 * la app. Eso no sirve en modo oscuro: `index.css` reescribe `.bg-white` a
 * slate-800 (#1e293b), así que un #1F2937 sobre esa tarjeta queda invisible.
 * Por eso la variante oscura la reemplaza por un neutro CLARO — mantiene el
 * lugar de "el neutro" en la paleta, pero se ve.
 */
export const CHART_PALETTE_LIGHT = ['#D4A017', '#1F2937', '#0D9488'];
export const CHART_PALETTE_DARK  = ['#EAB308', '#CBD5E1', '#2DD4BF'];

/**
 * Devuelve la paleta que corresponde al tema activo.
 * Tolera la ausencia del provider (devuelve la paleta clara).
 */
export function useChartPalette() {
  const ctx = useDarkMode();
  return ctx?.dark ? CHART_PALETTE_DARK : CHART_PALETTE_LIGHT;
}

/**
 * Color de texto legible sobre un color de la paleta, para los círculos con la
 * inicial del jugador. Necesario porque el neutro cambia de casi negro (modo
 * claro) a casi blanco (modo oscuro): un `text-white` fijo se volvería ilegible.
 */
export function contrastText(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  // Luminancia percibida (ITU-R BT.601)
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // El umbral 0.65 deja el oro de modo claro (#D4A017) con texto blanco, como
  // estaba, y solo cambia a texto oscuro los fondos claros de la paleta oscura.
  return luminancia > 0.65 ? '#0F172A' : '#FFFFFF';
}
