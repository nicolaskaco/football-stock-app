// /pregunta: filtros de jugadores que arma la IA a partir de una pregunta en lenguaje natural.
// La IA solo propone el filtro (JSON). Acá se valida contra una lista blanca y los permisos del
// usuario, y se aplica sobre los datos: los números y las comparaciones los hace este código,
// nunca la IA. Es lógica pura (sin red), con tests en filtros.test.ts.

import {
  CATEGORIAS, CATEGORIAS_FICHA, ROLES_FICHA, type Permisos, categoriasVisibles, ddmmyyyy, edad, normalizar, pesos, miles,
  sumarDias, textoViatico, complementoEfectivo,
} from "./logica.ts";
import { DEPARTAMENTOS, PLAYER_STATUS_LABELS, POSICIONES_JUGADOR } from "../_shared/app/constants.js";

export const ESTADOS = ["activo", ...Object.keys(PLAYER_STATUS_LABELS)];
export const MAX_RESULTADOS = 30;
const DIAS_FICHA_DEFAULT = 30;

export type Rango = { min: number | null; max: number | null };
export const CAMPOS_STATS = ["goles", "amarillas", "rojas", "minutos", "convocatorias", "titular"] as const;
export const CAMPOS_VIATICO = ["viatico_total", "viatico", "complemento"] as const;
/** Al ordenar de mayor a menor por estos campos sin un rango, se excluyen los que tienen 0. */
export const CAMPOS_SIN_CERO = ["goles", "amarillas", "rojas"] as const;
type CampoStats = typeof CAMPOS_STATS[number];
type CampoViatico = typeof CAMPOS_VIATICO[number];
export const CAMPOS_ORDEN = [...CAMPOS_STATS, ...CAMPOS_VIATICO, "vianda", "edad", "nacimiento", "nombre"] as const;
type CampoOrden = typeof CAMPOS_ORDEN[number];

export type Filtro = {
  categorias: string[];
  categorias_juego: string[];
  posiciones: string[];
  anios_nacimiento: number[];
  nacimiento_desde: string | null;
  nacimiento_hasta: string | null;
  mes_nacimiento_desde: number | null;
  mes_nacimiento_hasta: number | null;
  edad: Rango;
  cumple_mes: number | null;
  estados: string[];
  departamentos: string[];
  casita: boolean | null;
  vianda_min: number | null;
  ficha: "vencida" | "por_vencer" | "sin_ficha" | null;
  ficha_dias: number | null;
  anio_stats: number | null;
  goles: Rango;
  amarillas: Rango;
  rojas: Rango;
  minutos: Rango;
  convocatorias: Rango;
  titular: Rango;
  suspendido_hoy: boolean | null;
  viatico_total: Rango;
  viatico: Rango;
  complemento: Rango;
  contrato: boolean | null;
  caso_especial: boolean | null;
  orden: { campo: CampoOrden | null; descendente: boolean | null };
};

// ── Esquema para la IA ──────────────────────────────────────────────
// Structured outputs limita los parámetros opcionales (24) y los de tipo unión (16, anyOf o
// ["x","null"]). Por eso todo es requerido y sin uniones: "sin valor" se expresa con un
// centinela que validarFiltro convierte en null (-1 en enteros, "" en textos y fechas,
// "cualquiera" en sí/no, "ninguna"/"ninguno" en los enum).

/** Centinelas de "sin valor" que usa la IA. */
export const SIN_ENTERO = -1;
const rango = { type: "object", properties: { min: { type: "integer" }, max: { type: "integer" } }, required: ["min", "max"], additionalProperties: false };
const lista = (items: Record<string, unknown>) => ({ type: "array", items });
const fecha = { type: "string" };
const bool = { type: "string", enum: ["si", "no", "cualquiera"] };
const entero = { type: "integer" };

const PROPIEDADES_FILTRO: Record<string, unknown> = {
  categorias: lista({ type: "string", enum: CATEGORIAS }),
  categorias_juego: lista({ type: "string", enum: CATEGORIAS }),
  posiciones: lista({ type: "string", enum: POSICIONES_JUGADOR }),
  anios_nacimiento: lista({ type: "integer" }),
  nacimiento_desde: fecha,
  nacimiento_hasta: fecha,
  mes_nacimiento_desde: entero,
  mes_nacimiento_hasta: entero,
  edad: rango,
  cumple_mes: entero,
  estados: lista({ type: "string", enum: ESTADOS }),
  departamentos: lista({ type: "string", enum: DEPARTAMENTOS }),
  casita: bool,
  vianda_min: entero,
  ficha: { type: "string", enum: ["vencida", "por_vencer", "sin_ficha", "ninguna"] },
  ficha_dias: entero,
  anio_stats: entero,
  ...Object.fromEntries([...CAMPOS_STATS, ...CAMPOS_VIATICO].map((c) => [c, rango])),
  suspendido_hoy: bool,
  contrato: bool,
  caso_especial: bool,
  orden: {
    type: "object",
    properties: { campo: { type: "string", enum: [...CAMPOS_ORDEN, "ninguno"] }, descendente: bool },
    required: ["campo", "descendente"],
    additionalProperties: false,
  },
};

/** JSON schema de la respuesta de la IA: { entendido, aclaracion, filtro }. */
export const ESQUEMA_RESPUESTA_IA = {
  type: "object",
  properties: {
    entendido: { type: "boolean" },
    aclaracion: { type: "string" },
    filtro: { type: "object", properties: PROPIEDADES_FILTRO, required: Object.keys(PROPIEDADES_FILTRO), additionalProperties: false },
  },
  required: ["entendido", "aclaracion", "filtro"],
  additionalProperties: false,
};

// ── Validación ──────────────────────────────────────────────────────

const RANGO_VACIO: Rango = { min: null, max: null };
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const enteroValido = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | null => {
  const n = typeof v === "number" ? v : Number.NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
const rangoValido = (v: unknown): Rango => {
  const r = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { min: enteroValido(r.min), max: enteroValido(r.max) };
};
const boolValido = (v: unknown): boolean | null => (typeof v === "boolean" ? v : v === "si" ? true : v === "no" ? false : null);
const fechaValida = (v: unknown): string | null => (typeof v === "string" && FECHA_ISO.test(v) ? v : null);
/** Los valores de la lista que están en `validos` (sin tildes ni mayúsculas), con su forma canónica. */
const enLista = (v: unknown, validos: readonly string[]): string[] => {
  if (!Array.isArray(v)) return [];
  const porClave = new Map(validos.map((x) => [normalizar(x), x]));
  return [...new Set(v.map((x) => porClave.get(normalizar(x))).filter((x): x is string => !!x))];
};
const usaRango = (r: Rango) => r.min != null || r.max != null;

export const usaStats = (f: Filtro) =>
  CAMPOS_STATS.some((c) => usaRango(f[c])) || f.suspendido_hoy != null ||
  (f.orden.campo != null && (CAMPOS_STATS as readonly string[]).includes(f.orden.campo));
export const usaViatico = (f: Filtro) =>
  CAMPOS_VIATICO.some((c) => usaRango(f[c])) || f.contrato != null || f.caso_especial != null ||
  (f.orden.campo != null && (CAMPOS_VIATICO as readonly string[]).includes(f.orden.campo));

/** true si el filtro no pide nada (ni siquiera una categoría). */
export function filtroVacio(f: Filtro) {
  return !f.categorias.length && !f.categorias_juego.length && !f.posiciones.length && !f.anios_nacimiento.length &&
    !f.nacimiento_desde && !f.nacimiento_hasta && f.mes_nacimiento_desde == null && f.mes_nacimiento_hasta == null &&
    !usaRango(f.edad) && f.cumple_mes == null && !f.estados.length && !f.departamentos.length && f.casita == null &&
    f.vianda_min == null && f.ficha == null && !usaStats(f) && !usaViatico(f);
}

export type ResultadoValidacion = { ok: true; filtro: Filtro } | { ok: false; error: string };

/**
 * Limpia el filtro que propuso la IA (lista blanca de valores y tipos) y aplica los permisos:
 * categorías del usuario, estadísticas con permiso de Partidos, viático solo por privado y con
 * permiso de Viáticos, ficha médica solo para los roles que la ven.
 */
export function validarFiltro(crudo: unknown, perm: Permisos, { enGrupo }: { enGrupo: boolean }): ResultadoValidacion {
  const c = (crudo && typeof crudo === "object" ? crudo : {}) as Record<string, unknown>;
  const ordenCrudo = (c.orden && typeof c.orden === "object" ? c.orden : {}) as Record<string, unknown>;
  const mes = (v: unknown) => enteroValido(v, 1, 12);
  const filtro: Filtro = {
    categorias: enLista(c.categorias, CATEGORIAS),
    categorias_juego: enLista(c.categorias_juego, CATEGORIAS),
    posiciones: enLista(c.posiciones, POSICIONES_JUGADOR),
    anios_nacimiento: Array.isArray(c.anios_nacimiento)
      ? [...new Set(c.anios_nacimiento.map((a) => enteroValido(a, 1950, 2100)).filter((a): a is number => a != null))]
      : [],
    nacimiento_desde: fechaValida(c.nacimiento_desde),
    nacimiento_hasta: fechaValida(c.nacimiento_hasta),
    mes_nacimiento_desde: mes(c.mes_nacimiento_desde),
    mes_nacimiento_hasta: mes(c.mes_nacimiento_hasta),
    edad: rangoValido(c.edad),
    cumple_mes: mes(c.cumple_mes),
    estados: enLista(c.estados, ESTADOS),
    departamentos: enLista(c.departamentos, DEPARTAMENTOS),
    casita: boolValido(c.casita),
    vianda_min: enteroValido(c.vianda_min),
    ficha: c.ficha === "vencida" || c.ficha === "por_vencer" || c.ficha === "sin_ficha" ? c.ficha : null,
    ficha_dias: enteroValido(c.ficha_dias, 1, 365),
    anio_stats: enteroValido(c.anio_stats, 2000, 2100),
    goles: rangoValido(c.goles),
    amarillas: rangoValido(c.amarillas),
    rojas: rangoValido(c.rojas),
    minutos: rangoValido(c.minutos),
    convocatorias: rangoValido(c.convocatorias),
    titular: rangoValido(c.titular),
    suspendido_hoy: boolValido(c.suspendido_hoy),
    viatico_total: rangoValido(c.viatico_total),
    viatico: rangoValido(c.viatico),
    complemento: rangoValido(c.complemento),
    contrato: boolValido(c.contrato),
    caso_especial: boolValido(c.caso_especial),
    orden: {
      campo: (CAMPOS_ORDEN as readonly string[]).includes(String(ordenCrudo.campo)) ? ordenCrudo.campo as CampoOrden : null,
      descendente: boolValido(ordenCrudo.descendente),
    },
  };

  // "Con más goles / amarillas / rojas" ordena de mayor a menor: sin un rango pedido, se listan solo
  // los que tienen al menos 1 (los de 0 no responden la pregunta). En partidos y minutos sí van los de 0.
  const campoOrden = filtro.orden.campo;
  if (campoOrden && (CAMPOS_SIN_CERO as readonly string[]).includes(campoOrden) && filtro.orden.descendente !== false) {
    const campo = campoOrden as typeof CAMPOS_SIN_CERO[number];
    if (!usaRango(filtro[campo])) filtro[campo] = { min: 1, max: null };
  }

  if (filtroVacio(filtro)) return { ok: false, error: "No encontré qué filtrar en la pregunta." };

  const visibles = categoriasVisibles(perm);
  const ajenas = [...filtro.categorias, ...filtro.categorias_juego].filter((cat) => visibles && !visibles.includes(cat));
  if (ajenas.length) return { ok: false, error: `No tenés acceso a ${[...new Set(ajenas)].join(", ")}.` };

  if (usaStats(filtro) && !perm.can_view_partidos) return { ok: false, error: "Para preguntar por partidos, goles o tarjetas necesitás permiso de Partidos." };
  if (usaViatico(filtro)) {
    if (!perm.can_access_viatico) return { ok: false, error: "No tenés permiso para consultar viáticos." };
    if (enGrupo) return { ok: false, error: "🔒 Las preguntas sobre viáticos van por privado: escribime directamente." };
  }
  if (filtro.ficha && !(perm.can_access_widgets && ROLES_FICHA.includes(perm.role ?? ""))) {
    return { ok: false, error: "No tenés permiso para consultar fichas médicas." };
  }
  return { ok: true, filtro };
}

// ── Aplicación ──────────────────────────────────────────────────────

export type Jugador = {
  id: string; name: string; name_visual?: string | null; categoria?: string | null; categoria_juego?: string | null;
  posicion?: string | null; date_of_birth?: string | null; status?: string | null; departamento?: string | null;
  casita?: boolean | null; vianda?: number | null; ficha_medica_hasta?: string | null;
  viatico?: number | null; complemento?: number | null; contrato?: boolean | null;
  complemento_override?: number | null; complemento_override_expira?: string | null; incluir_viatico_export?: boolean | null;
};
/** Estadísticas del período (= getEstadisticasJugadores). Sin fila: no jugó (todo 0). */
export type StatsJugador = { goles: number; amarillas: number; rojas: number; minutos: number | null; convocatorias: number; titular: number };
export type Resultado = { jugador: Jugador; valores: Partial<Record<CampoOrden, number | string | null>> };

const SIN_STATS: StatsJugador = { goles: 0, amarillas: 0, rojas: 0, minutos: 0, convocatorias: 0, titular: 0 };
const catEfectiva = (p: Jugador) => p.categoria_juego || p.categoria || "";
const nombreDe = (p: Jugador) => p.name_visual || p.name;

const enRango = (v: number | null, r: Rango) => {
  if (!usaRango(r)) return true;
  if (v == null) return false;
  return (r.min == null || v >= r.min) && (r.max == null || v <= r.max);
};

/**
 * Montos de viático. El total es lo que se paga (= montoViatico del export de Tesorero/Finanzas y
 * textoViatico del bot): viático + complemento efectivo; con contrato 0, salvo caso especial
 * (contrato + incluir_viatico_export), que cobra el complemento base.
 */
export function montosViatico(p: Jugador, hoy: string) {
  const viatico = Number(p.viatico || 0);
  const comp = complementoEfectivo(p, hoy).valor;
  const total = p.contrato ? (p.incluir_viatico_export ? Number(p.complemento || 0) : 0) : viatico + comp;
  return { viatico_total: total, viatico, complemento: comp };
}

/** Jugadores que cumplen el filtro, con los valores que se usan para ordenar y mostrar. */
export function filtrarJugadores(
  jugadores: Jugador[],
  filtro: Filtro,
  { hoy, stats = new Map(), suspendidos = new Set() }: { hoy: string; stats?: Map<string, StatsJugador>; suspendidos?: Set<string> },
): Resultado[] {
  const estados = filtro.estados.length ? filtro.estados : ["activo"];
  const limiteFicha = sumarDias(hoy, filtro.ficha_dias ?? DIAS_FICHA_DEFAULT);
  const deptos = new Set(filtro.departamentos.map(normalizar));
  const resultados: Resultado[] = [];

  for (const p of jugadores) {
    if (!estados.includes(p.status || "activo")) continue;
    if (filtro.categorias.length && !filtro.categorias.includes(p.categoria || "")) continue;
    if (filtro.categorias_juego.length && !filtro.categorias_juego.includes(p.categoria_juego || "")) continue;
    if (filtro.posiciones.length && !filtro.posiciones.includes(p.posicion || "")) continue;
    if (deptos.size && !deptos.has(normalizar(p.departamento || ""))) continue;
    if (filtro.casita != null && !!p.casita !== filtro.casita) continue;
    if (filtro.vianda_min != null && Number(p.vianda || 0) < filtro.vianda_min) continue;

    const nac = p.date_of_birth?.slice(0, 10) || null;
    const usaNacimiento = filtro.anios_nacimiento.length || filtro.nacimiento_desde || filtro.nacimiento_hasta ||
      filtro.mes_nacimiento_desde != null || filtro.mes_nacimiento_hasta != null || filtro.cumple_mes != null || usaRango(filtro.edad);
    if (usaNacimiento && !nac) continue;
    if (nac) {
      const anio = Number(nac.slice(0, 4));
      const mesNac = Number(nac.slice(5, 7));
      if (filtro.anios_nacimiento.length && !filtro.anios_nacimiento.includes(anio)) continue;
      if (filtro.nacimiento_desde && nac < filtro.nacimiento_desde) continue;
      if (filtro.nacimiento_hasta && nac > filtro.nacimiento_hasta) continue;
      if (filtro.mes_nacimiento_desde != null && mesNac < filtro.mes_nacimiento_desde) continue;
      if (filtro.mes_nacimiento_hasta != null && mesNac > filtro.mes_nacimiento_hasta) continue;
      if (filtro.cumple_mes != null && mesNac !== filtro.cumple_mes) continue;
    }
    const anios = edad(nac, hoy);
    if (!enRango(anios, filtro.edad)) continue;

    if (filtro.ficha) {
      if (!CATEGORIAS_FICHA.includes(catEfectiva(p))) continue;
      const f = p.ficha_medica_hasta?.slice(0, 10) || null;
      if (filtro.ficha === "sin_ficha" && f) continue;
      if (filtro.ficha === "vencida" && !(f && f < hoy)) continue;
      if (filtro.ficha === "por_vencer" && !(f && f >= hoy && f <= limiteFicha)) continue;
    }

    const s = stats.get(p.id) ?? SIN_STATS;
    if (CAMPOS_STATS.some((c: CampoStats) => !enRango(s[c], filtro[c]))) continue;
    if (filtro.suspendido_hoy != null && suspendidos.has(p.id) !== filtro.suspendido_hoy) continue;

    const montos = montosViatico(p, hoy);
    if (CAMPOS_VIATICO.some((c: CampoViatico) => !enRango(montos[c], filtro[c]))) continue;
    if (filtro.contrato != null && !!p.contrato !== filtro.contrato) continue;
    if (filtro.caso_especial != null && !!(p.contrato && p.incluir_viatico_export) !== filtro.caso_especial) continue;

    resultados.push({
      jugador: p,
      valores: { ...s, ...montos, vianda: Number(p.vianda || 0), edad: anios, nacimiento: nac, nombre: normalizar(nombreDe(p)) },
    });
  }
  return ordenarResultados(resultados, filtro);
}

/** Campo por el que se ordena: el pedido, o el primer filtro numérico, o la fecha de nacimiento, o el nombre. */
export function campoDeOrden(f: Filtro): { campo: CampoOrden; descendente: boolean } {
  if (f.orden.campo) return { campo: f.orden.campo, descendente: f.orden.descendente ?? !["nombre", "nacimiento", "edad"].includes(f.orden.campo) };
  for (const c of [...CAMPOS_STATS, ...CAMPOS_VIATICO] as const) {
    // Con solo un máximo ("menos de 200 minutos") se ordena de menor a mayor
    if (usaRango(f[c])) return { campo: c, descendente: f[c].min != null || f[c].max == null };
  }
  if (f.vianda_min != null) return { campo: "vianda", descendente: true };
  if (usaRango(f.edad)) return { campo: "edad", descendente: false };
  if (f.anios_nacimiento.length || f.nacimiento_desde || f.nacimiento_hasta || f.mes_nacimiento_desde != null ||
    f.mes_nacimiento_hasta != null || f.cumple_mes != null) return { campo: "nacimiento", descendente: false };
  return { campo: "nombre", descendente: false };
}

export function ordenarResultados(resultados: Resultado[], f: Filtro): Resultado[] {
  const { campo, descendente } = campoDeOrden(f);
  const clave = (r: Resultado) => (campo === "nacimiento" && f.cumple_mes != null ? String(r.valores.nacimiento ?? "").slice(5) : r.valores[campo]);
  return [...resultados].sort((a, b) => {
    const va = clave(a), vb = clave(b);
    // Sin dato (minutos sin cargar) al final
    if ((va == null) !== (vb == null)) return va == null ? 1 : -1;
    let cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va ?? "").localeCompare(String(vb ?? ""));
    if (descendente) cmp = -cmp;
    return cmp || String(a.valores.nombre).localeCompare(String(b.valores.nombre));
  });
}

// ── Texto de la respuesta ───────────────────────────────────────────

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ETIQUETAS: Record<CampoStats | CampoViatico, [string, string]> = {
  goles: ["gol", "goles"], amarillas: ["amarilla", "amarillas"], rojas: ["roja", "rojas"], minutos: ["minuto", "minutos"],
  convocatorias: ["convocatoria", "convocatorias"], titular: ["partido de titular", "partidos de titular"],
  viatico_total: ["viático total", "viático total"], viatico: ["viático", "viático"], complemento: ["complemento", "complemento"],
};
const esPlata = (c: string) => (CAMPOS_VIATICO as readonly string[]).includes(c);
const fmt = (c: string, n: number) => (esPlata(c) ? pesos(n) : miles(n));

const textoRango = (c: CampoStats | CampoViatico, r: Rango) => {
  const [uno, varios] = ETIQUETAS[c];
  const et = (n: number) => (esPlata(c) ? uno : n === 1 ? uno : varios);
  if (r.min != null && r.max != null) return r.min === r.max ? `${fmt(c, r.min)} ${et(r.min)}` : `entre ${fmt(c, r.min)} y ${fmt(c, r.max)} ${varios}`;
  if (r.min != null) return `${esPlata(c) ? `${uno} desde` : "al menos"} ${fmt(c, r.min)}${esPlata(c) ? "" : ` ${et(r.min)}`}`;
  return `${esPlata(c) ? `${uno} hasta` : "como mucho"} ${fmt(c, r.max!)}${esPlata(c) ? "" : ` ${et(r.max!)}`}`;
};

/** Criterio aplicado, para que se entienda qué se buscó: "5ta · al menos 8 amarillas · 2026 · solo activos". */
export function describirCriterio(f: Filtro, { anio, visibles }: { anio: number; visibles: string[] | null }): string {
  const partes: string[] = [];
  if (f.categorias.length) partes.push(f.categorias.join(", "));
  else partes.push(visibles ? `tus categorías (${visibles.join(", ")})` : "todas las categorías");
  if (f.categorias_juego.length) partes.push(`juegan en ${f.categorias_juego.join(", ")}`);
  if (f.posiciones.length) partes.push(f.posiciones.join(", ").toLowerCase());
  if (f.anios_nacimiento.length) partes.push(`nacidos en ${f.anios_nacimiento.join(", ")}`);
  if (f.nacimiento_desde || f.nacimiento_hasta) {
    partes.push(`nacidos ${f.nacimiento_desde ? `desde el ${ddmmyyyy(f.nacimiento_desde)}` : ""}${f.nacimiento_desde && f.nacimiento_hasta ? " " : ""}${f.nacimiento_hasta ? `hasta el ${ddmmyyyy(f.nacimiento_hasta)}` : ""}`);
  }
  if (f.mes_nacimiento_desde != null || f.mes_nacimiento_hasta != null) {
    partes.push(`nacidos entre ${MESES[(f.mes_nacimiento_desde ?? 1) - 1]} y ${MESES[(f.mes_nacimiento_hasta ?? 12) - 1]}`);
  }
  if (f.cumple_mes != null) partes.push(`cumplen en ${MESES[f.cumple_mes - 1]}`);
  if (usaRango(f.edad)) {
    const { min, max } = f.edad;
    partes.push(min != null && max != null ? (min === max ? `${min} años` : `entre ${min} y ${max} años`) : min != null ? `${min} años o más` : `${max} años o menos`);
  }
  if (f.departamentos.length) partes.push(f.departamentos.join(", "));
  if (f.casita != null) partes.push(f.casita ? "en la casita" : "fuera de la casita");
  if (f.vianda_min != null) partes.push(`${f.vianda_min}+ viandas`);
  if (f.ficha) partes.push(f.ficha === "vencida" ? "ficha vencida" : f.ficha === "sin_ficha" ? "sin ficha médica" : `ficha vence en ${f.ficha_dias ?? DIAS_FICHA_DEFAULT} días`);
  for (const c of [...CAMPOS_STATS, ...CAMPOS_VIATICO] as const) if (usaRango(f[c])) partes.push(textoRango(c, f[c]));
  if (f.suspendido_hoy != null) partes.push(f.suspendido_hoy ? "suspendidos hoy" : "no suspendidos");
  if (f.contrato != null) partes.push(f.contrato ? "con contrato" : "sin contrato");
  if (f.caso_especial != null) partes.push(f.caso_especial ? "casos especiales" : "sin caso especial");
  if (usaStats(f)) partes.push(String(f.anio_stats ?? anio));
  partes.push(f.estados.length ? f.estados.join(", ") : "solo activos");
  return partes.join(" · ");
}

/** Dato que acompaña a cada jugador en la lista (los valores filtrados u ordenados). */
export function detalleResultado(r: Resultado, f: Filtro, hoy: string): string {
  const partes: string[] = [];
  const v = r.valores;
  const ordenPor = campoDeOrden(f).campo;
  for (const c of CAMPOS_STATS) {
    if (!usaRango(f[c]) && ordenPor !== c) continue;
    const n = v[c] as number | null;
    if (c === "amarillas") partes.push(`${n ?? 0} 🟨`);
    else if (c === "rojas") partes.push(`${n ?? 0} 🟥`);
    else if (c === "goles") partes.push(`${n ?? 0} ⚽`);
    else if (c === "minutos") partes.push(n == null ? "sin minutos cargados" : `${miles(n)} min`);
    else partes.push(`${n ?? 0} ${ETIQUETAS[c][n === 1 ? 0 : 1]}`);
  }
  if (usaViatico(f)) partes.push(textoViatico(r.jugador, hoy));
  if (f.vianda_min != null || ordenPor === "vianda") partes.push(`${v.vianda} viandas`);
  if (ordenPor === "nacimiento" || ordenPor === "edad" || f.anios_nacimiento.length) {
    const nac = v.nacimiento as string | null;
    if (nac) partes.push(`${ddmmyyyy(nac)} (${v.edad} años)`);
  }
  if (f.ficha) partes.push(r.jugador.ficha_medica_hasta ? `ficha ${ddmmyyyy(r.jugador.ficha_medica_hasta)}` : "sin ficha");
  if (f.suspendido_hoy) partes.push("suspendido");
  if (f.departamentos.length && r.jugador.departamento) partes.push(r.jugador.departamento);
  if (f.estados.length && r.jugador.status && r.jugador.status !== "activo") partes.push(r.jugador.status);
  return partes.join(" · ");
}
