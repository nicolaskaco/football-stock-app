// Generado desde src/utils — no editar a mano: corré npm run sync:shared.
/**
 * Motor de estadísticas por jugador.
 *
 * Todo se deriva de un único "match log" por jugador (`buildPlayerMatchLog`),
 * construido desde el payload de `database.getJornadas()`. Los selectores de
 * abajo son puros y solo reciben ese log, así ningún cruce vuelve a recorrer
 * `jornadas` por su cuenta. Única excepción: `getRecordSinConvocar`, que
 * necesita justamente los partidos que el log deja afuera.
 *
 * Dos particularidades de los datos que todo este archivo respeta:
 *  - `partido_eventos.minuto` es nullable (PartidoForm guarda el minuto 0 como
 *    null), así que las métricas por minuto solo cuentan eventos con minuto.
 *  - `goles_local` / `goles_visitante` son nullables cuando el marcador todavía
 *    no se cargó → `resultado` queda en null y el partido no entra en ningún
 *    cruce G/E/P.
 */

import { fechaPartido } from './dateUtils.js';
import { CATEGORIAS_PARTIDO } from './constants.js';

// ─── Marcador ────────────────────────────────────────────────────────────────

/**
 * ¿Los goles de Peñarol van en goles_local? Sí de Local y en cancha Neutral
 * (por convención, Neutral se guarda como Local); solo de Visitante van en goles_visitante.
 */
export const capEsLocal = (escenario) => escenario !== 'Visitante';

/**
 * Orienta el marcador de un partido desde la perspectiva de CAP y calcula el
 * resultado. Compartido con EstadisticasTab para que ambas superficies usen
 * exactamente el mismo criterio.
 *
 * Devuelve { capGoles, rivalGoles, resultado } donde resultado es
 * 'G' | 'E' | 'P' | null (null si falta alguno de los dos marcadores).
 */
export function resolveMarcador(partido) {
  const local = capEsLocal(partido.escenario);
  const capGoles   = local ? partido.goles_local     : partido.goles_visitante;
  const rivalGoles = local ? partido.goles_visitante : partido.goles_local;

  let resultado = null;
  if (capGoles != null && rivalGoles != null) {
    resultado = capGoles > rivalGoles ? 'G' : capGoles < rivalGoles ? 'P' : 'E';
  }

  return { capGoles, rivalGoles, resultado };
}

/** "Apertura · J5"; Semifinal / Final se muestran sin la "J". */
export const jornadaLabel = ({ fase, numero_jornada }) => {
  if (!numero_jornada) return fase || '-';
  const prefijo = Number.isNaN(Number(numero_jornada)) ? '' : 'J';
  return fase ? `${fase} · ${prefijo}${numero_jornada}` : `${prefijo}${numero_jornada}`;
};

/**
 * Datos de la jornada y del resultado del equipo para una fila de historial
 * (PlayerForm, PlayerCardHistoryModal). `partido` puede faltar (suspensión en
 * una jornada sin partido cargado).
 */
export const partidoInfo = (jornada, partido) => {
  const { capGoles, rivalGoles, resultado } = partido ? resolveMarcador(partido) : {};
  return {
    fecha: (partido && fechaPartido(partido, jornada)) || jornada?.fecha,
    fase: jornada?.fase || null,
    numero_jornada: jornada?.numero_jornada || null,
    rival: jornada?.rivales?.name || '-',
    categoria: partido?.categoria,
    resultado: resultado || null,
    marcador: resultado ? `${capGoles} - ${rivalGoles}` : null,
  };
};

/**
 * Goles de CAP en un partido agrupados por jugador: [{ name, count }].
 * Compartido por las vistas Por Rival y Por Cancha de EstadisticasTab.
 */
export function groupGoleadores(partido) {
  const golesMap = {};
  (partido.partido_eventos || [])
    .filter((e) => e.tipo === 'gol')
    .forEach((e) => {
      const pp = (partido.partido_players || []).find((p) => p.player_id === e.player_id);
      const name = pp?.players?.name_visual || pp?.players?.name || '?';
      golesMap[e.player_id] = { name, count: (golesMap[e.player_id]?.count || 0) + 1 };
    });
  return Object.values(golesMap);
}

// ─── Match log ───────────────────────────────────────────────────────────────

/**
 * Construye el log cronológico (ascendente) de partidos de un jugador.
 *
 * @param {Array}  jornadas   payload de database.getJornadas()
 * @param {string} playerId
 * @param {object} opts       { categoria, year } — filtros opcionales.
 *                            `categoria` filtra por la categoría del PARTIDO
 *                            (mismo criterio que EstadisticasTab), no por la
 *                            categoría de ficha del jugador.
 * @returns {Array<MatchRecord>}
 */
/**
 * Minutos jugados en un partido. null si el partido no tiene `duracion`
 * (partidos cargados antes de registrar cambios): así no se inventan 90'
 * para quien quizás salió antes.
 */
export function calcMinutos(partido, pp, rojas = []) {
  const duracion = partido.duracion == null ? null : Number(partido.duracion);
  if (!duracion) return null;
  const rojaMin = rojas[0]?.minuto == null ? null : Number(rojas[0].minuto);
  const fin = pp.minuto_salida ?? rojaMin ?? duracion;
  const inicio = pp.tipo === 'titular' ? 0 : pp.minuto_entrada;
  if (inicio == null) return 0; // suplente que no entró
  return Math.max(0, Math.min(fin, duracion) - inicio);
}

export function buildPlayerMatchLog(jornadas = [], playerId, { categoria = null, year = null } = {}) {
  if (!playerId) return [];

  const log = [];

  jornadas.forEach((jornada) => {
    const fechaYear = jornada.fecha ? new Date(jornada.fecha).getFullYear() : null;
    if (year && fechaYear !== Number(year)) return;

    (jornada.partidos || []).forEach((partido) => {
      if (categoria && partido.categoria !== categoria) return;

      const pp = (partido.partido_players || []).find((x) => x.player_id === playerId);
      if (!pp) return; // no fue convocado a este partido

      const { capGoles, rivalGoles, resultado } = resolveMarcador(partido);

      const eventos = (partido.partido_eventos || []).filter((e) => e.player_id === playerId);
      const goles     = eventos.filter((e) => e.tipo === 'gol');
      const amarillas = eventos.filter((e) => e.tipo === 'amarilla');
      const rojas     = eventos.filter((e) => e.tipo === 'roja');

      log.push({
        partido_id: partido.id,
        jornada_id: jornada.id,
        fecha: jornada.fecha,
        year: fechaYear,
        rival: jornada.rivales?.name || '—',
        rival_id: jornada.rival_id || null,
        fase: jornada.fase || null,
        numero_jornada: jornada.numero_jornada || null,

        categoria: partido.categoria,
        escenario: partido.escenario,
        cesped: partido.cesped,
        cancha: partido.cancha || null,

        capGoles,
        rivalGoles,
        resultado,

        tipo: pp.tipo,
        posicion: pp.posicion || null,

        goles: goles.length,
        golesMinutos: goles.map((e) => (e.minuto == null ? null : Number(e.minuto))),
        amarillas: amarillas.length,
        amarillaMinuto: amarillas.length ? (amarillas[0].minuto == null ? null : Number(amarillas[0].minuto)) : null,
        rojas: rojas.length,
        rojaMinuto: rojas.length ? (rojas[0].minuto == null ? null : Number(rojas[0].minuto)) : null,
        rojaFechas: rojas.length ? (rojas[0].fechas_suspension || 1) : null,

        minutos: calcMinutos(partido, pp, rojas),
        minutoEntrada: pp.minuto_entrada ?? null,
        minutoSalida: pp.minuto_salida ?? null,
        duracion: partido.duracion == null ? null : Number(partido.duracion),
      });
    });
  });

  return log
    .map((m) => ({ ...m, jugo: jugo(m) }))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

// ─── Record (G/E/P) ──────────────────────────────────────────────────────────

/**
 * Récord del equipo sobre un subconjunto del log. Solo cuenta partidos con
 * marcador cargado, para que los porcentajes no se diluyan con partidos sin
 * resultado.
 *
 * `pj` es siempre el número de partidos VÁLIDOS (con resultado), que es el
 * tamaño de muestra que la UI debe mostrar junto al porcentaje.
 *
 * `pctPuntos` (3 por victoria, 1 por empate, sobre 3 × pj) es la métrica que
 * muestra la UI: a diferencia de `pctVictorias`, no trata el empate como una
 * derrota.
 */
export function getRecord(log = []) {
  const validos = log.filter((m) => m.resultado != null);
  const g = validos.filter((m) => m.resultado === 'G').length;
  const e = validos.filter((m) => m.resultado === 'E').length;
  const p = validos.filter((m) => m.resultado === 'P').length;
  const pj = validos.length;

  return {
    pj,
    g,
    e,
    p,
    pctVictorias: pj > 0 ? (g / pj) * 100 : null,
    pctPuntos: pj > 0 ? ((3 * g + e) / (3 * pj)) * 100 : null,
  };
}

// ─── Lo básico ───────────────────────────────────────────────────────────────

export function getTotales(log = []) {
  const pj = log.length;
  const titular  = log.filter((m) => m.tipo === 'titular').length;
  const suplente = log.filter((m) => m.tipo === 'suplente').length;
  const goles     = log.reduce((s, m) => s + m.goles, 0);
  const amarillas = log.reduce((s, m) => s + m.amarillas, 0);
  const rojas     = log.reduce((s, m) => s + m.rojas, 0);
  const conMinutos = log.filter((m) => m.minutos != null);
  const minutos = conMinutos.reduce((s, m) => s + m.minutos, 0);

  return {
    pj,
    titular,
    suplente,
    pctTitularidad: pj > 0 ? (titular / pj) * 100 : null,
    goles,
    amarillas,
    rojas,
    golesPorPartido: pj > 0 ? goles / pj : 0,
    minutos,
    partidosConMinutos: conMinutos.length,
  };
}

// ─── Minutos ─────────────────────────────────────────────────────────────────

/**
 * ¿Entró a la cancha? Un partido sin minutos cargados (null) cuenta como jugado, y el que hizo
 * un gol jugó aunque falte su minuto de entrada.
 */
export const jugo = (m) => m.minutos !== 0 || (m.goles || 0) > 0;

const promedio = (nums) => (nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null);

/**
 * Minutos y participación sobre un log (buildPlayerMatchLog, o filas con la misma forma:
 * { tipo, minutos, minutoEntrada, minutoSalida, duracion, goles }).
 * - jugados: entró (un partido sin minutos cargados cuenta como jugado); sinJugar: convocado
 *   que no entró.
 * - completos: titular que jugó toda la duración, sin salir ni ser expulsado.
 * - reemplazado / ingresos: titular que salió / suplente que entró, con el minuto promedio.
 * - minPorGol y golesPor90 solo con los partidos que tienen minutos; G/90 pide 90' o más.
 * @param minutosPosibles  minutos que jugó su(s) categoría(s) (ver minutosPosibles), para el %
 */
export function getMinutos(log = [], minutosPosibles = null) {
  const conDato = log.filter((m) => m.minutos != null);
  const minutos = conDato.reduce((s, m) => s + m.minutos, 0);
  const titulares = conDato.filter((m) => m.tipo === 'titular');
  const reemplazos = titulares.filter((m) => m.minutoSalida != null);
  const ingresos = conDato.filter((m) => m.tipo === 'suplente' && m.minutoEntrada != null && m.minutos > 0);
  const golesConDato = conDato.reduce((s, m) => s + (m.goles || 0), 0);
  return {
    minutos,
    partidosConMinutos: conDato.length,
    jugados: log.filter(jugo).length,
    sinJugar: log.filter((m) => !jugo(m)).length,
    completos: titulares.filter((m) => m.minutoSalida == null && m.minutos >= m.duracion).length,
    reemplazado: reemplazos.length,
    minSalidaProm: promedio(reemplazos.map((m) => Number(m.minutoSalida))),
    ingresos: ingresos.length,
    minIngresoProm: promedio(ingresos.map((m) => Number(m.minutoEntrada))),
    minPorGol: golesConDato > 0 && minutos > 0 ? minutos / golesConDato : null,
    golesPor90: minutos >= 90 ? (golesConDato * 90) / minutos : null,
    pctMinutos: minutosPosibles > 0 ? (minutos / minutosPosibles) * 100 : null,
  };
}

/** Minutos que jugaron (suma de `duracion`) los partidos de esas categorías, opcionalmente de un año. */
export function minutosPosibles(jornadas = [], categorias = [], { year = null } = {}) {
  let total = 0;
  jornadas.forEach((j) => {
    if (year && (!j.fecha || new Date(j.fecha).getFullYear() !== Number(year))) return;
    (j.partidos || []).forEach((p) => {
      if (categorias.includes(p.categoria) && p.duracion != null) total += Number(p.duracion);
    });
  });
  return total;
}

/** Filas tipo log de un partido, una por convocado (para las tablas de Estadísticas y la rotación). */
function filasDePartido(partido) {
  const eventos = partido.partido_eventos || [];
  return (partido.partido_players || []).filter((pp) => pp.player_id).map((pp) => {
    const propios = eventos.filter((e) => e.player_id === pp.player_id);
    const rojas = propios.filter((e) => e.tipo === 'roja');
    return {
      player_id: pp.player_id,
      nombre: pp.players?.name_visual || pp.players?.name || null,
      tipo: pp.tipo,
      minutos: calcMinutos(partido, pp, rojas),
      minutoEntrada: pp.minuto_entrada ?? null,
      minutoSalida: pp.minuto_salida ?? null,
      duracion: partido.duracion == null ? null : Number(partido.duracion),
      goles: propios.filter((e) => e.tipo === 'gol').length,
      amarillas: propios.filter((e) => e.tipo === 'amarilla').length,
      rojas: rojas.length,
    };
  });
}

/**
 * Estadísticas por jugador para las tablas de Estadísticas (General, Goleadores, Tarjetas,
 * Minutos). `jornadas` ya viene filtrado por año; `categoria` filtra los partidos.
 * pj = partidos jugados (entró); convocatorias = todos en los que estuvo en la planilla.
 * El % de minutos es sobre los minutos de las categorías en las que fue convocado.
 */
export function getEstadisticasJugadores(jornadas = [], players = [], categoria = null) {
  const porJugador = new Map();
  const duracionPorCategoria = {};
  jornadas.forEach((j) => (j.partidos || []).forEach((partido) => {
    if (categoria && partido.categoria !== categoria) return;
    if (partido.duracion != null) duracionPorCategoria[partido.categoria] = (duracionPorCategoria[partido.categoria] || 0) + Number(partido.duracion);
    filasDePartido(partido).forEach((f) => {
      if (!porJugador.has(f.player_id)) porJugador.set(f.player_id, { nombre: f.nombre, categorias: new Set(), log: [] });
      const acc = porJugador.get(f.player_id);
      acc.categorias.add(partido.categoria);
      acc.log.push(f);
    });
  }));

  const byId = new Map(players.map((p) => [p.id, p]));
  return [...porJugador.entries()].map(([id, { nombre, categorias, log }]) => {
    const p = byId.get(id);
    const cats = [...categorias];
    const posibles = cats.reduce((s, c) => s + (duracionPorCategoria[c] || 0), 0);
    const min = getMinutos(log, posibles);
    const goles = log.reduce((s, m) => s + m.goles, 0);
    const amarillas = log.reduce((s, m) => s + m.amarillas, 0);
    const pj = min.jugados;
    return {
      id,
      name_visual: p?.name_visual || p?.name || nombre || '?',
      categoria: CATEGORIAS_PARTIDO.filter((c) => categorias.has(c)).join('/') || '—',
      convocatorias: log.length,
      pj,
      titular: log.filter((m) => m.tipo === 'titular').length,
      suplente: min.ingresos + log.filter((m) => m.tipo === 'suplente' && m.minutos == null).length,
      goles,
      amarillas,
      rojas: log.reduce((s, m) => s + m.rojas, 0),
      golesRatio: pj > 0 ? goles / pj : 0,
      amarillasRatio: pj > 0 ? amarillas / pj : 0,
      ...min,
      // Sin partidos con minutos no hay dato (al ordenar va al final)
      minutos: min.partidosConMinutos > 0 ? min.minutos : null,
    };
  });
}

/**
 * Rotación de una categoría en los partidos con minutos cargados: jugadores usados, cuántos
 * jugaron más de la mitad de los minutos, cambios por partido, minuto promedio del primer
 * cambio y el jugador con más minutos. null si no hay partidos con minutos.
 */
export function getRotacion(jornadas = [], categoria) {
  const partidos = jornadas.flatMap((j) => (j.partidos || []).filter((p) => p.categoria === categoria && p.duracion != null));
  if (partidos.length === 0) return null;
  const total = partidos.reduce((s, p) => s + Number(p.duracion), 0);
  const minutos = new Map();
  const nombres = new Map();
  let cambios = 0;
  const primeros = [];
  partidos.forEach((partido) => {
    const filas = filasDePartido(partido);
    filas.forEach((f) => {
      minutos.set(f.player_id, (minutos.get(f.player_id) || 0) + (f.minutos || 0));
      if (f.nombre) nombres.set(f.player_id, f.nombre);
    });
    const entradas = filas.filter((f) => f.tipo === 'suplente' && f.minutoEntrada != null && f.minutos > 0).map((f) => Number(f.minutoEntrada));
    cambios += entradas.length;
    if (entradas.length) primeros.push(Math.min(...entradas));
  });
  const usados = [...minutos.entries()].filter(([, m]) => m > 0);
  const [topId, topMin] = usados.sort((a, b) => b[1] - a[1])[0] || [null, 0];
  return {
    partidos: partidos.length,
    minutosTotales: total,
    jugadoresUsados: usados.length,
    masDeLaMitad: usados.filter(([, m]) => m > total / 2).length,
    cambiosPorPartido: cambios / partidos.length,
    minutoPrimerCambio: promedio(primeros),
    top: topId ? { player_id: topId, nombre: nombres.get(topId) || null, minutos: topMin, pct: (topMin / total) * 100 } : null,
  };
}

// ─── Tramos de minuto ────────────────────────────────────────────────────────

export const TRAMOS = [
  { key: '0-15',   label: '0-15',   min: 1,  max: 15 },
  { key: '16-30',  label: '16-30',  min: 16, max: 30 },
  { key: '31-45',  label: '31-45',  min: 31, max: 45 },
  { key: '46-60',  label: '46-60',  min: 46, max: 60 },
  { key: '61-75',  label: '61-75',  min: 61, max: 75 },
  { key: '76-90+', label: '76-90+', min: 76, max: Infinity },
];

const tramoDe = (minuto) => TRAMOS.find((t) => minuto >= t.min && minuto <= t.max) || null;

const emptyTramos = () => Object.fromEntries(TRAMOS.map((t) => [t.key, 0]));

/**
 * Goles y tarjetas por tramo del partido.
 *
 * `sinMinuto` cuenta los eventos que quedaron FUERA del gráfico por no tener
 * minuto cargado — la UI debe mostrarlo para que un gráfico vacío no se lea
 * como "no hizo goles".
 */
export function getTramos(log = []) {
  const goles = emptyTramos();
  const amarillas = emptyTramos();
  const rojas = emptyTramos();
  let golesSinMinuto = 0;
  let tarjetasSinMinuto = 0;

  log.forEach((m) => {
    m.golesMinutos.forEach((min) => {
      const t = min == null ? null : tramoDe(min);
      if (t) goles[t.key]++;
      else golesSinMinuto++;
    });

    if (m.amarillas > 0) {
      const t = m.amarillaMinuto == null ? null : tramoDe(m.amarillaMinuto);
      if (t) amarillas[t.key]++;
      else tarjetasSinMinuto++;
    }
    if (m.rojas > 0) {
      const t = m.rojaMinuto == null ? null : tramoDe(m.rojaMinuto);
      if (t) rojas[t.key]++;
      else tarjetasSinMinuto++;
    }
  });

  return { goles, amarillas, rojas, golesSinMinuto, tarjetasSinMinuto };
}

/** Versión simplificada de `getTramos`: primer tiempo vs. segundo tiempo. */
export function getTiempos(log = []) {
  const res = {
    golesPrimer: 0, golesSegundo: 0, golesSinMinuto: 0,
    tarjetasPrimer: 0, tarjetasSegundo: 0, tarjetasSinMinuto: 0,
  };

  log.forEach((m) => {
    m.golesMinutos.forEach((min) => {
      if (min == null) res.golesSinMinuto++;
      else if (min <= 45) res.golesPrimer++;
      else res.golesSegundo++;
    });

    [m.amarillas > 0 ? m.amarillaMinuto : undefined, m.rojas > 0 ? m.rojaMinuto : undefined]
      .filter((v) => v !== undefined)
      .forEach((min) => {
        if (min == null) res.tarjetasSinMinuto++;
        else if (min <= 45) res.tarjetasPrimer++;
        else res.tarjetasSegundo++;
      });
  });

  return res;
}

/** Minuto promedio de gol, sobre los goles que tienen minuto cargado. */
export function getMinutoPromedioGol(log = []) {
  const minutos = log.flatMap((m) => m.golesMinutos).filter((min) => min != null);
  if (minutos.length === 0) return { promedio: null, n: 0 };
  return {
    promedio: minutos.reduce((s, v) => s + v, 0) / minutos.length,
    n: minutos.length,
  };
}

// ─── Cruces con el resultado ─────────────────────────────────────────────────

/** Récord del equipo en los partidos donde marcó vs. donde no marcó. */
export function getCuandoMarca(log = []) {
  return {
    conGol: getRecord(log.filter((m) => m.goles > 0)),
    sinGol: getRecord(log.filter((m) => m.goles === 0)),
  };
}

/** Récord del equipo cuando arrancó de titular vs. desde el banco. */
export function getPorTipo(log = []) {
  return {
    titular:  getRecord(log.filter((m) => m.tipo === 'titular')),
    suplente: getRecord(log.filter((m) => m.tipo === 'suplente')),
  };
}

/** Récord del equipo en los partidos donde recibió tarjeta vs. donde no. */
export function getConTarjeta(log = []) {
  const conTarjeta = (m) => m.amarillas > 0 || m.rojas > 0;
  return {
    conTarjeta: getRecord(log.filter(conTarjeta)),
    sinTarjeta: getRecord(log.filter((m) => !conTarjeta(m))),
  };
}

/**
 * Récord del equipo en los partidos de la categoría del jugador en los que NO
 * fue convocado, a partir de su primera convocatoria en esa categoría (los
 * partidos anteriores a que entrara al plantel no cuentan).
 *
 * Recorre `jornadas` directamente, porque el match log solo tiene partidos
 * donde fue convocado. Cuenta cualquier ausencia (decisión técnica, lesión o
 * suspensión).
 */
export function getRecordSinConvocar(jornadas = [], playerId, categoria, { year = null } = {}) {
  if (!playerId || !categoria) return getRecord([]);

  const partidos = [];

  jornadas.forEach((jornada) => {
    if (!jornada.fecha) return;
    const fechaYear = new Date(jornada.fecha).getFullYear();
    if (year && fechaYear !== Number(year)) return;

    (jornada.partidos || []).forEach((partido) => {
      if (partido.categoria !== categoria) return;
      partidos.push({
        fecha: new Date(jornada.fecha),
        convocado: (partido.partido_players || []).some((x) => x.player_id === playerId),
        resultado: resolveMarcador(partido).resultado,
      });
    });
  });

  const fechasConvocado = partidos.filter((p) => p.convocado).map((p) => p.fecha.getTime());
  if (fechasConvocado.length === 0) return getRecord([]);
  const primeraConvocatoria = Math.min(...fechasConvocado);

  return getRecord(
    partidos.filter((p) => !p.convocado && p.fecha.getTime() >= primeraConvocatoria)
  );
}

// ─── Cruces con el contexto ──────────────────────────────────────────────────

/**
 * Bloque de contexto reutilizable: récord + producción ofensiva + disciplina
 * sobre un subconjunto del log.
 *
 * Ojo: `record.pj` cuenta solo partidos con marcador, mientras que `pjTotal`
 * cuenta todos. Los goles por partido usan `pjTotal` (no necesitan marcador).
 */
function buildContextBlock(subset) {
  const record = getRecord(subset);
  const goles     = subset.reduce((s, m) => s + m.goles, 0);
  const amarillas = subset.reduce((s, m) => s + m.amarillas, 0);
  const rojas     = subset.reduce((s, m) => s + m.rojas, 0);

  return {
    record,
    pjTotal: subset.length,
    goles,
    golesPorPartido: subset.length > 0 ? goles / subset.length : 0,
    amarillas,
    rojas,
  };
}

export const ESCENARIOS = ['Local', 'Visitante', 'Neutral'];
export const CESPEDES = ['Natural', 'Sintético'];

/** Local y Visitante siempre; Neutral solo si el jugador tiene partidos en cancha neutral. */
export function getPorEscenario(log = []) {
  return Object.fromEntries(
    ESCENARIOS
      .filter((esc) => esc !== 'Neutral' || log.some((m) => m.escenario === 'Neutral'))
      .map((esc) => [esc, buildContextBlock(log.filter((m) => m.escenario === esc))])
  );
}

export function getPorCesped(log = []) {
  return Object.fromEntries(
    CESPEDES.map((ces) => [ces, buildContextBlock(log.filter((m) => m.cesped === ces))])
  );
}

/** Las combinaciones escenario × césped que tienen partidos, p. ej. "de visitante en sintético". */
export function getCombinaciones(log = []) {
  const out = [];
  ESCENARIOS.forEach((esc) => {
    CESPEDES.forEach((ces) => {
      const subset = log.filter((m) => m.escenario === esc && m.cesped === ces);
      if (subset.length === 0) return;
      out.push({
        key: `${esc}-${ces}`,
        label: `${esc} · ${ces}`,
        ...buildContextBlock(subset),
      });
    });
  });
  return out;
}

/** Historial contra cada rival, ordenado por cantidad de partidos. */
export function getPorRival(log = []) {
  const map = new Map();

  log.forEach((m) => {
    const key = m.rival_id || m.rival;
    if (!map.has(key)) map.set(key, { rival: m.rival, matches: [] });
    map.get(key).matches.push(m);
  });

  return [...map.entries()]
    .map(([key, { rival, matches }]) => ({
      key,
      rival,
      ...buildContextBlock(matches),
    }))
    .sort((a, b) => b.pjTotal - a.pjTotal || b.goles - a.goles);
}

// ─── Rachas ──────────────────────────────────────────────────────────────────

/**
 * Racha actual (al final del log) y máxima histórica para un predicado.
 * `skip` permite ignorar partidos que no aplican (p. ej. los que no tienen
 * resultado cargado no rompen ni extienden la racha de invicto).
 */
function streak(log, predicate, skip = () => false) {
  let actual = 0;
  let maxima = 0;
  let running = 0;

  log.forEach((m) => {
    if (skip(m)) return;
    if (predicate(m)) {
      running++;
      if (running > maxima) maxima = running;
    } else {
      running = 0;
    }
  });
  actual = running;

  return { actual, maxima };
}

export function getRachas(log = []) {
  return {
    conGol:     streak(log, (m) => m.goles > 0),
    sinTarjeta: streak(log, (m) => m.amarillas === 0 && m.rojas === 0),
    invicto:    streak(
      log,
      (m) => m.resultado === 'G' || m.resultado === 'E',
      (m) => m.resultado == null
    ),
  };
}

// ─── Hitos ───────────────────────────────────────────────────────────────────

const MILESTONES = [10, 25, 50, 100];

export function getHitos(log = []) {
  const dobletes   = log.filter((m) => m.goles === 2);
  const hatTricks  = log.filter((m) => m.goles >= 3);
  const desdeBanco = log
    .filter((m) => m.tipo === 'suplente' && m.goles > 0)
    .reduce((s, m) => s + m.goles, 0);

  // Partido en el que cayó cada gol redondo, recorriendo el log en orden.
  const golesMilestone = [];
  let acumulado = 0;
  log.forEach((m) => {
    if (m.goles === 0) return;
    const antes = acumulado;
    acumulado += m.goles;
    MILESTONES.forEach((hito) => {
      if (antes < hito && acumulado >= hito) {
        golesMilestone.push({ hito, fecha: m.fecha, rival: m.rival, categoria: m.categoria });
      }
    });
  });

  return {
    dobletes: dobletes.length,
    hatTricks: hatTricks.length,
    golesDesdeBanco: desdeBanco,
    golesMilestone,
    totalGoles: acumulado,
    proximoHito: MILESTONES.find((h) => h > acumulado) || null,
  };
}

// ─── Disciplina ──────────────────────────────────────────────────────────────

/** Amarillas que disparan una suspensión (regla del campeonato juvenil). */
export const AMARILLAS_PARA_SUSPENSION = 5;

/**
 * Estado disciplinario vigente del jugador, por categoría.
 *
 * NO reimplementa el conteo: consume los mapas de `src/utils/suspensions.js`,
 * que ya contemplan el reseteo del contador por roja y por la 5ª amarilla, y
 * que son del AÑO CALENDARIO EN CURSO (por eso este bloque ignora el filtro de
 * año de la pestaña).
 *
 * @param {Map<string, Map<string, number>>} yellowCounts  getYellowCountsByCategory(jornadas)
 * @param {Map<string, Map<string, object>>} suspensions   getCurrentSuspensionsByCategory(jornadas)
 */
export function getDisciplina(yellowCounts, suspensions, playerId, categoriasJugadas = []) {
  return categoriasJugadas
    .map((cat) => {
      const amarillas = yellowCounts?.get(cat)?.get(playerId) || 0;
      const suspension = suspensions?.get(cat)?.get(playerId) || null;
      return {
        categoria: cat,
        amarillas,
        faltan: Math.max(0, AMARILLAS_PARA_SUSPENSION - amarillas),
        suspension,
      };
    })
    .filter((d) => d.amarillas > 0 || d.suspension);
}

/** Categorías distintas en las que el jugador disputó partidos, en orden. */
export function getCategoriasJugadas(log = []) {
  return [...new Set(log.map((m) => m.categoria))];
}

// ─── Formatters compartidos ──────────────────────────────────────────────────

export const fmtPct = (v) => (v == null ? '—' : `${Math.round(v)}%`);
export const fmtRatio = (v) => (v == null ? '—' : v.toFixed(2));
export const fmtMinuto = (v) => (v == null ? '—' : `${Math.round(v)}'`);
export const fmtRecord = (r) => `${r.g}-${r.e}-${r.p}`;

// ─── Comparación ─────────────────────────────────────────────────────────────

/**
 * Índices de los mejores valores de una fila comparativa.
 *   type="max" → mayor es mejor (goles, PJ)
 *   type="min" → menor es mejor (amarillas, rojas)
 * Devuelve null si todos los valores son iguales o no hay criterio.
 */
export const getBestIndices = (values, type) => {
  const nums = values.map(v => typeof v === 'number' ? v : parseFloat(v) || 0);
  if (nums.every(n => n === nums[0])) return null;
  const target = type === 'max' ? Math.max(...nums) : type === 'min' ? Math.min(...nums) : null;
  if (target === null) return null;
  const indices = new Set();
  nums.forEach((n, i) => { if (n === target) indices.add(i); });
  return indices;
};
