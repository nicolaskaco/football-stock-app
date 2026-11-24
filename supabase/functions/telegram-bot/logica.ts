// Lógica pura del bot de consultas (sin Deno ni red): parseo de mensajes, permisos,
// categorías, fechas y marcadores. La usan comandos.ts e index.ts y la prueba Vitest
// (logica.test.ts), así que no puede importar nada por URL.

export const CATEGORIAS = ["3era", "4ta", "5ta", "S16", "6ta", "7ma", "Sub13"]; // = constants.js
export const CATEGORIAS_FICHA = ["3era", "4ta", "5ta", "S16", "6ta", "7ma"]; // con ficha médica (sin Sub13)
export const ROLES_FICHA = ["admin", "ejecutivo", "presidente", "presidente_categoria", "delegado", "comision"]; // = FichaMedicaWidget

export type Permisos = {
  email: string;
  role: string | null;
  categoria: string[] | null;
  can_access_players: boolean | null;
  can_view_partidos: boolean | null;
  can_access_widgets: boolean | null;
  can_access_tareas: boolean | null;
  can_access_viatico: boolean | null;
};

/** Minúsculas y sin tildes (= normalizeSearchText de textUtils.js). */
export const normalizar = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * "/goleadores@CapBot 5ta 2026" →
 *   { comando: "goleadores", destinatario: "capbot", args: ["5ta", "2026"], resto: "5ta 2026" }.
 * `destinatario` es el bot nombrado después de "@" (en minúsculas), o null.
 * Un texto que no empieza con "/" devuelve comando null.
 */
export function parseMensaje(texto: string | null | undefined) {
  const limpio = String(texto ?? "").trim();
  // El nombre acepta "-" ("/jugador-completo"), que Telegram no permite en el menú: se pasa a "_"
  const m = limpio.match(/^\/([\p{L}_-]+)(?:@(\S+))?(?:\s+([\s\S]*))?$/u);
  if (!m) return { comando: null, destinatario: null, args: [] as string[], resto: limpio };
  const resto = (m[3] || "").trim();
  return {
    comando: normalizar(m[1]).replace(/-/g, "_"),
    destinatario: m[2] ? m[2].toLowerCase() : null,
    args: resto ? resto.split(/\s+/) : [],
    resto,
  };
}

/** ¿El comando es para este bot? Sin "@" sí; con "@otro" no. Sin usuario configurado, acepta cualquiera. */
export const esParaEsteBot = (destinatario: string | null, usuarioBot: string | null | undefined) =>
  !destinatario || !usuarioBot || destinatario === usuarioBot.replace(/^@/, "").toLowerCase();

const PALABRAS_CATEGORIA: Record<string, string> = {
  tercera: "3era", cuarta: "4ta", quinta: "5ta", sexta: "6ta", septima: "7ma", setima: "7ma",
};
const ORDINAL: Record<string, string> = { "3": "3era", "4": "4ta", "5": "5ta", "6": "6ta", "7": "7ma" };

/** "5ta", "5", "5a", "quinta", "S16", "sub-16", "sub13"… → categoría canónica, o null. */
export function parseCategoria(token: string | null | undefined): string | null {
  const t = normalizar(token).replace(/[\s_-]+/g, "").replace(/[ªº°]/g, "");
  if (!t) return null;
  if (/^(sub|s)16$/.test(t)) return "S16";
  if (/^(sub|s)13$/.test(t)) return "Sub13";
  if (PALABRAS_CATEGORIA[t]) return PALABRAS_CATEGORIA[t];
  const m = t.match(/^([3-7])(era|ra|ta|ma|a)?$/);
  return m ? ORDINAL[m[1]] : null;
}

/** Separa la categoría (si alguno de los args lo es) del resto: ["5ta", "2008"] → { categoria: "5ta", otros: ["2008"] }. */
export function separarCategoria(args: string[]) {
  let categoria: string | null = null;
  const otros: string[] = [];
  for (const a of args) {
    const c: string | null = categoria ? null : parseCategoria(a);
    if (c) categoria = c;
    else otros.push(a);
  }
  return { categoria, otros };
}

/**
 * Categorías de jugadores que ve el usuario, igual que la RLS de `players`:
 * admin o categoria vacía → null (todas).
 */
export function categoriasVisibles(p: Pick<Permisos, "role" | "categoria">): string[] | null {
  if (p.role === "admin") return null;
  return p.categoria && p.categoria.length > 0 ? p.categoria : null;
}

export const veCategoria = (visibles: string[] | null, categoria: string | null | undefined) =>
  visibles === null || (!!categoria && visibles.includes(categoria));

export const ordenCategoria = (a: string | null | undefined, b: string | null | undefined) => {
  const ia = CATEGORIAS.indexOf(a ?? ""), ib = CATEGORIAS.indexOf(b ?? "");
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
};

// ── Comandos y permisos ─────────────────────────────────────────────

type Permiso = (p: Permisos) => boolean;
const jugadores: Permiso = (p) => !!p.can_access_players;
const partidos: Permiso = (p) => !!p.can_view_partidos;
const fichas: Permiso = (p) => !!p.can_access_widgets && ROLES_FICHA.includes(p.role ?? "");
const tareas: Permiso = (p) => !!p.can_access_tareas;
const todos: Permiso = () => true;

/** Comandos de consulta: nombre → uso, descripción y quién lo puede usar. El orden es el de /ayuda. */
export const COMANDOS: Record<string, { uso: string; descripcion: string; permiso: Permiso }> = {
  nacidos: { uso: "/nacidos 2008 [categoría]", descripcion: "Jugadores nacidos ese año, con su categoría", permiso: jugadores },
  categoria: { uso: "/categoria 5ta", descripcion: "Plantel de una categoría", permiso: jugadores },
  jugador: { uso: "/jugador Pérez", descripcion: "Datos de un jugador", permiso: jugadores },
  ficha: { uso: "/ficha Pérez", descripcion: "Ficha completa de un jugador (por privado)", permiso: jugadores },
  lesionados: { uso: "/lesionados [categoría]", descripcion: "Lesionados sin alta", permiso: jugadores },
  cumples: { uso: "/cumples", descripcion: "Cumpleaños de los próximos 7 días", permiso: jugadores },
  proximo: { uso: "/proximo", descripcion: "Próxima jornada", permiso: partidos },
  parte: { uso: "/parte [categoría]", descripcion: "Disponibles y no disponibles para la próxima jornada", permiso: partidos },
  resultado: { uso: "/resultado", descripcion: "Resultados de la última jornada jugada", permiso: partidos },
  contra: { uso: "/contra Nacional", descripcion: "Historial contra un rival", permiso: partidos },
  goleadores: { uso: "/goleadores [categoría] [año]", descripcion: "Goleadores del año", permiso: partidos },
  tarjetas: { uso: "/tarjetas [categoría] [año]", descripcion: "Amarillas y rojas del año", permiso: partidos },
  fichas: { uso: "/fichas [categoría]", descripcion: "Fichas médicas vencidas o por vencer en 30 días", permiso: fichas },
  tareas: { uso: "/tareas", descripcion: "Tareas abiertas", permiso: tareas },
  ayuda: { uso: "/ayuda", descripcion: "Esta lista", permiso: todos },
};

/** Alias en inglés o con otra forma que Telegram muestra en el menú. */
export const ALIAS: Record<string, string> = {
  help: "ayuda", start: "ayuda", proxima: "proximo", resultados: "resultado", cumpleanos: "cumples",
  jugador_completo: "ficha", jugadorcompleto: "ficha",
};

export const comandosDe = (p: Permisos) => Object.keys(COMANDOS).filter((c) => COMANDOS[c].permiso(p));

/** Código de vinculación que genera la app (8 caracteres hex, ver generar_codigo_telegram). */
export const parseCodigo = (s: string | null | undefined) => {
  const c = String(s ?? "").trim().toUpperCase();
  return /^[0-9A-F]{8}$/.test(c) ? c : null;
};

// ── Fechas ──────────────────────────────────────────────────────────

/** 'YYYY-MM-DD…' → 'DD/MM' */
export const ddmm = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");
/** 'YYYY-MM-DD…' → 'DD/MM/YYYY' */
export const ddmmyyyy = (iso: string | null | undefined) => (iso ? `${ddmm(iso)}/${iso.slice(0, 4)}` : "—");

export const sumarDias = (iso: string, dias: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
};

/** Edad cumplida a la fecha `hoy` (ambas 'YYYY-MM-DD'). */
export function edad(nacimiento: string | null | undefined, hoy: string): number | null {
  if (!nacimiento) return null;
  const [y, m, d] = nacimiento.slice(0, 10).split("-").map(Number);
  const [hy, hm, hd] = hoy.split("-").map(Number);
  return hy - y - (hm < m || (hm === m && hd < d) ? 1 : 0);
}

/**
 * Días que faltan para el próximo cumpleaños (0 = hoy). Un 29/02 se festeja el 28/02 en años no bisiestos.
 */
export function diasParaCumple(nacimiento: string | null | undefined, hoy: string): number | null {
  if (!nacimiento) return null;
  const [, m, d] = nacimiento.slice(0, 10).split("-").map(Number);
  const [hy] = hoy.split("-").map(Number);
  const hoyMs = Date.parse(`${hoy}T00:00:00Z`);
  for (const anio of [hy, hy + 1]) {
    const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
    const dia = m === 2 && d === 29 && !bisiesto ? 28 : d;
    const ms = Date.UTC(anio, m - 1, dia);
    if (ms >= hoyMs) return Math.round((ms - hoyMs) / 86400_000);
  }
  return null;
}

/** Año de 4 cifras razonable (1990–2100) o null. */
export const parseAnio = (s: string | null | undefined) => {
  const n = Number(s);
  return /^\d{4}$/.test(String(s ?? "")) && n >= 1990 && n <= 2100 ? n : null;
};

// ── Partidos ────────────────────────────────────────────────────────

/** = resolveMarcador de playerStats.js: Local y Neutral guardan los goles de CAP en goles_local. */
export function marcador(p: { escenario: string | null; goles_local: number | null; goles_visitante: number | null }) {
  const local = p.escenario !== "Visitante";
  const cap = local ? p.goles_local : p.goles_visitante;
  const rival = local ? p.goles_visitante : p.goles_local;
  const resultado = cap != null && rival != null ? (cap > rival ? "G" : cap < rival ? "P" : "E") : null;
  return { cap, rival, resultado };
}

/** = jornadaLabel de playerStats.js: "Apertura · J5"; Semifinal / Final sin la "J". */
export function jornadaLabel({ fase, numero_jornada }: { fase: string | null; numero_jornada: string | null }) {
  if (!numero_jornada) return fase || "-";
  const prefijo = Number.isNaN(Number(numero_jornada)) ? "" : "J";
  return fase ? `${fase} · ${prefijo}${numero_jornada}` : `${prefijo}${numero_jornada}`;
}

/** Fecha de un partido: la suya o la de la jornada (la 4ta juega el día anterior, salvo en jornadas de una sola categoría). */
export function fechaPartido(p: { fecha: string | null; categoria: string }, jornada: { fecha: string; partidos?: unknown[] }) {
  if (p.fecha) return p.fecha.slice(0, 10);
  const unaSola = (jornada.partidos?.length ?? 0) === 1;
  return p.categoria === "4ta" && !unaSola ? sumarDias(jornada.fecha.slice(0, 10), -1) : jornada.fecha.slice(0, 10);
}

/** Palabras significativas de un nombre de rival (= palabrasClave de cometApply.js, sin las genéricas). */
const GENERICAS = new Set(["club", "atletico", "football", "futbol", "fc", "de", "del", "cs", "sc", "ca", "cd", "social", "deportivo", "sporting", "y"]);
const palabras = (s: string) => normalizar(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !GENERICAS.has(w));

/** ¿El texto buscado ("nacional", "river") corresponde al rival de la app ("Nacional", "River Plate")? */
export function rivalBuscado(busqueda: string, nombreRival: string) {
  const buscadas = palabras(busqueda);
  if (buscadas.length === 0) return false;
  const rival = palabras(nombreRival);
  return buscadas.every((b) => rival.some((r) => r.startsWith(b)));
}

/** ¿Todas las palabras de la búsqueda aparecen (como inicio de palabra) en el nombre? Sin tildes. */
export function nombreCoincide(busqueda: string, ...nombres: (string | null | undefined)[]) {
  const buscadas = normalizar(busqueda).split(/\s+/).filter(Boolean);
  if (buscadas.length === 0) return false;
  const palabrasNombre = nombres.flatMap((n) => normalizar(n).split(/[^a-z0-9]+/).filter(Boolean));
  return buscadas.every((b) => palabrasNombre.some((w) => w.startsWith(b)));
}

// ── Jugador: viático, documento y minutos ───────────────────────────

/** 12000 → "$ 12.000" */
export const pesos = (n: number | null | undefined) =>
  `$ ${Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

type DatosViatico = {
  viatico?: number | null; complemento?: number | null; contrato?: boolean | null;
  complemento_override?: number | null; complemento_override_expira?: string | null;
  incluir_viatico_export?: boolean | null;
};

/** = getComplementoEfectivo de playerUtils.js: el override vale hasta su fecha de vencimiento inclusive. */
export function complementoEfectivo(p: DatosViatico, hoy: string) {
  const override = p.complemento_override != null && !!p.complemento_override_expira && p.complemento_override_expira.slice(0, 10) >= hoy;
  return { valor: override ? Number(p.complemento_override) : Number(p.complemento || 0), override };
}

/**
 * Línea de viático (= montoViatico / calculateTotal de la app):
 * - contrato + caso especial (incluir_viatico_export): "Contrato + Complemento $ 4.000", con el complemento
 *   base (sin override), igual que lo que se paga en el export de Tesorero / Finanzas;
 * - contrato: "Contrato";
 * - si no, viático + complemento efectivo, con el detalle cuando tiene los dos.
 */
export function textoViatico(p: DatosViatico, hoy: string) {
  const comp = complementoEfectivo(p, hoy);
  const temporal = comp.override && p.complemento_override_expira ? ` (complemento temporal hasta el ${ddmm(p.complemento_override_expira)})` : "";
  if (p.contrato) return p.incluir_viatico_export ? `Contrato + Complemento ${pesos(p.complemento)}` : "Contrato";
  const viatico = Number(p.viatico || 0);
  const detalle = viatico > 0 && comp.valor > 0 ? ` (${pesos(viatico)} viático + ${pesos(comp.valor)} complemento)` : "";
  return `${pesos(viatico + comp.valor)}${detalle}${temporal}`;
}

/** Etiqueta del documento según `tipo_documento`. */
export function etiquetaDocumento(tipo: string | null | undefined) {
  if (!tipo || /c[ée]dula/i.test(tipo)) return "Cédula";
  if (/pasaporte/i.test(tipo)) return "Pasaporte";
  return "Documento";
}

/**
 * Minutos jugados en un partido (= calcMinutos de playerStats.js). null si el partido no tiene
 * `duracion` (sin cambios cargados); 0 si el suplente no entró.
 */
export function minutosJugados(
  duracion: number | null | undefined,
  pp: { tipo: string; minuto_entrada?: number | null; minuto_salida?: number | null },
  rojaMinuto: number | null = null,
) {
  const dur = duracion == null ? null : Number(duracion);
  if (!dur) return null;
  const fin = pp.minuto_salida ?? rojaMinuto ?? dur;
  const inicio = pp.tipo === "titular" ? 0 : pp.minuto_entrada;
  if (inicio == null) return 0;
  return Math.max(0, Math.min(fin, dur) - inicio);
}
