// Generado desde src/utils — no editar a mano: corré npm run sync:shared.
/**
 * Parte de disponibilidad de una jornada: por cada partido (categoría), quiénes del plantel
 * pueden jugar y quiénes no, con el motivo. Usa los mismos criterios que PartidoForm:
 *  - plantel: jugadores activos cuya categoría de juego (o, si no tiene, su categoría) es la del partido;
 *  - suspendido: getSuspensionMap con los ajustes manuales guardados en el partido;
 *  - lesionado: lesión sin fecha de alta;
 *  - ficha vencida: ficha SND faltante o vencida a la fecha en que se juega el partido;
 *  - excede edad: año de nacimiento anterior al mínimo configurado para la categoría.
 */

import { CATEGORIAS_PARTIDO } from './constants.js';
import { getSuspensionMap } from './suspensions.js';
import { isPlayerOverAge } from './ageEligibility.js';
import { fechaPartido, formatDate, isFichaVencida } from './dateUtils.js';
import { jornadaLabel } from './playerStats.js';

const nombre = (p) => p.name_visual || p.name || '';
const porNombre = (a, b) => nombre(a).localeCompare(nombre(b), 'es');

/**
 * @param {object} opts
 * @param {object} opts.jornada      jornada con sus partidos (payload de getJornadas)
 * @param {Array}  opts.jornadas     todas las jornadas (para las suspensiones)
 * @param {Array}  opts.players
 * @param {Array}  opts.injuries
 * @param {object} opts.appSettings  años mínimos por categoría
 * @param {Array}  opts.categorias   categorías visibles para el usuario ([] o null = todas)
 * @param {boolean} opts.detalleLesion  true muestra el tipo de lesión (solo admin); si no, solo "Lesionado"
 * @returns {Array<{ categoria, fecha, disponibles, noDisponibles: Array<{ player, motivos }> }>}
 *          motivos: [{ tipo: 'suspendido'|'lesionado'|'ficha'|'edad', texto }]
 */
export function buildParteDisponibilidad({ jornada, jornadas = [], players = [], injuries = [], appSettings = {}, categorias = null, detalleLesion = false }) {
  const lesionActiva = new Map();
  injuries.forEach((inj) => {
    if (!inj.fecha_alta && !lesionActiva.has(inj.player_id)) lesionActiva.set(inj.player_id, inj);
  });

  const visibles = categorias?.length ? CATEGORIAS_PARTIDO.filter((c) => categorias.includes(c)) : CATEGORIAS_PARTIDO;

  return visibles
    .map((categoria) => (jornada?.partidos || []).find((p) => p.categoria === categoria))
    .filter(Boolean)
    .map((partido) => {
      const { categoria } = partido;
      const fecha = fechaPartido(partido, jornada);
      const suspendidos = getSuspensionMap(jornadas, jornada.id, categoria);

      const plantel = players
        .filter((p) => !p.status || p.status === 'activo')
        .filter((p) => (p.categoria_juego || p.categoria) === categoria)
        .sort(porNombre);

      const disponibles = [];
      const noDisponibles = [];

      plantel.forEach((player) => {
        const motivos = [];
        const susp = suspendidos.get(player.id);
        if (susp) motivos.push({ tipo: 'suspendido', texto: `Suspendido (${susp.reason})` });

        const lesion = lesionActiva.get(player.id);
        if (lesion) {
          const vuelve = lesion.fecha_retorno_estimada ? `, vuelve ${formatDate(lesion.fecha_retorno_estimada)}` : '';
          const texto = detalleLesion ? `Lesión: ${lesion.tipo || 'sin tipo'}` : 'Lesionado';
          motivos.push({ tipo: 'lesionado', texto: `${texto}${vuelve}` });
        }

        if (isFichaVencida(player, fecha)) {
          motivos.push({
            tipo: 'ficha',
            texto: player.ficha_medica_hasta ? `Ficha vencida (${formatDate(player.ficha_medica_hasta)})` : 'Sin ficha médica',
          });
        }

        const edad = isPlayerOverAge(player, categoria, appSettings);
        if (edad.overAge) motivos.push({ tipo: 'edad', texto: `Excede edad (nac. ${edad.birthYear}, mín. ${edad.minYear})` });

        if (motivos.length) noDisponibles.push({ player, motivos });
        else disponibles.push(player);
      });

      return { categoria, fecha, disponibles, noDisponibles };
    });
}

const EMOJI = { suspendido: '🚫', lesionado: '🏥', ficha: '🩺', edad: '⚠️' };

/** Título del parte: "Nacional · Apertura · J5 (23/11/2026)". */
export function tituloParte(jornada) {
  return `${jornada?.rivales?.name || 'Rival'} · ${jornadaLabel(jornada || {})} (${formatDate(jornada?.fecha)})`;
}

/**
 * Texto plano del parte, listo para pegar en WhatsApp o Telegram
 * (*negrita* funciona en WhatsApp; en Telegram se ve con asteriscos).
 * De los disponibles va solo la cantidad: la lista completa es muy larga.
 */
export function parteComoTexto(jornada, parte) {
  const lineas = [`*Parte de disponibilidad — ${tituloParte(jornada)}*`];
  parte.forEach(({ categoria, fecha, disponibles, noDisponibles }) => {
    lineas.push('', `*${categoria}* (${formatDate(fecha)}) — ${disponibles.length} disponibles, ${noDisponibles.length} no disponibles`);
    if (noDisponibles.length) {
      noDisponibles.forEach(({ player, motivos }) => {
        lineas.push(`• ${nombre(player)}: ${motivos.map((m) => `${EMOJI[m.tipo]} ${m.texto}`).join(' · ')}`);
      });
    } else {
      lineas.push('• Todo el plantel disponible');
    }
  });
  return lineas.join('\n');
}
