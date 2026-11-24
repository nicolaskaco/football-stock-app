// Comandos de consulta del bot. Cada uno recibe el contexto (cliente service-role, permisos
// del usuario vinculado, argumentos y la fecha de hoy en Uruguay) y devuelve el HTML de la
// respuesta. El cliente es service-role, así que los filtros de permisos se aplican acá
// (categorias visibles igual que la RLS de players; ver logica.ts).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { escapeHTML as e } from "../_shared/telegram.ts";
import {
  CATEGORIAS, CATEGORIAS_FICHA, COMANDOS, type Permisos,
  categoriasVisibles, comandosDe, ddmm, ddmmyyyy, diasParaCumple, edad, fechaPartido, jornadaLabel,
  marcador, nombreCoincide, normalizar, ordenCategoria, parseAnio, parseCategoria, rivalBuscado,
  separarCategoria, sumarDias, veCategoria,
} from "./logica.ts";

export type Contexto = { db: SupabaseClient; perm: Permisos; args: string[]; resto: string; hoy: string };

// Filas de PostgREST sin tipar (el cliente no tiene los tipos generados de la base)
// deno-lint-ignore no-explicit-any
type Fila = any;

const VENTANA_FICHA_DIAS = 30;
const DIAS_CUMPLES = 7;
const MAX_COINCIDENCIAS = 8;
const ICONO_RESULTADO: Record<string, string> = { G: "✅", E: "🟰", P: "❌" };

const nombre = (p: Fila | null | undefined) => e(p?.name_visual || p?.name || "—");
const catEfectiva = (p: Fila) => p.categoria_juego || p.categoria || "";
const catLabel = (p: Fila) =>
  e(p.categoria || "—") + (p.categoria_juego && p.categoria_juego !== p.categoria ? ` (juega en ${e(p.categoria_juego)})` : "");
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const diaSemana = (iso: string) => DIAS_SEMANA[new Date(`${iso.slice(0, 10)}T12:00:00Z`).getUTCDay()];

async function q<T = Fila[]>(promesa: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promesa;
  if (error) throw new Error(error.message);
  return data as T;
}

/** Jugadores que el usuario puede ver (como la RLS de players), no ocultos. */
async function jugadoresVisibles(ctx: Contexto, columnas: string, { soloActivos = true } = {}) {
  let consulta = ctx.db.from("players").select(columnas).eq("hide_player", false);
  if (soloActivos) consulta = consulta.or("status.is.null,status.eq.activo");
  const visibles = categoriasVisibles(ctx.perm);
  if (visibles) consulta = consulta.in("categoria", visibles);
  return await q(consulta);
}

/** La categoría pedida, o un mensaje de error si no la ve. */
function categoriaPermitida(ctx: Contexto, categoria: string | null): string | null {
  if (categoria && !veCategoria(categoriasVisibles(ctx.perm), categoria)) {
    return `No tenés acceso a los jugadores de ${e(categoria)}.`;
  }
  return null;
}

const agruparPorCategoria = (jugadores: Fila[], cat: (p: Fila) => string = (p) => p.categoria || "") => {
  const grupos = new Map<string, Fila[]>();
  for (const p of jugadores) {
    const c = cat(p) || "Sin categoría";
    grupos.set(c, [...(grupos.get(c) || []), p]);
  }
  return [...grupos.entries()].sort(([a], [b]) => ordenCategoria(a, b));
};

const porNombre = (a: Fila, b: Fila) => normalizar(a.name_visual || a.name).localeCompare(normalizar(b.name_visual || b.name));

// ── Jugadores ───────────────────────────────────────────────────────

async function nacidos(ctx: Contexto) {
  const { categoria, otros } = separarCategoria(ctx.args);
  const anio = parseAnio(otros[0]);
  if (!anio) return `Decime el año: <code>${COMANDOS.nacidos.uso}</code>`;
  const sinAcceso = categoriaPermitida(ctx, categoria);
  if (sinAcceso) return sinAcceso;

  const jugadores = (await jugadoresVisibles(ctx, "name, name_visual, categoria, categoria_juego, date_of_birth"))
    .filter((p) => p.date_of_birth?.startsWith(String(anio)))
    .filter((p) => !categoria || p.categoria === categoria || p.categoria_juego === categoria);
  const titulo = `🎂 <b>Nacidos en ${anio}</b>${categoria ? ` en ${e(categoria)}` : ""}`;
  if (jugadores.length === 0) return `${titulo}: ninguno.`;

  const grupos = agruparPorCategoria(jugadores).map(([cat, js]) =>
    `<b>${e(cat)}</b> (${js.length})\n${js.sort(porNombre).map((p) =>
      `• ${nombre(p)}${p.categoria_juego && p.categoria_juego !== p.categoria ? ` (juega en ${e(p.categoria_juego)})` : ""}`).join("\n")}`);
  return `${titulo}: ${jugadores.length}\n\n${grupos.join("\n\n")}`;
}

async function categoria(ctx: Contexto) {
  const cat = parseCategoria(ctx.args[0]);
  if (!cat) return `Decime la categoría: <code>${COMANDOS.categoria.uso}</code> (${CATEGORIAS.join(", ")})`;
  const sinAcceso = categoriaPermitida(ctx, cat);
  if (sinAcceso) return sinAcceso;

  const jugadores = (await jugadoresVisibles(ctx, "name, name_visual, categoria, categoria_juego, posicion, date_of_birth"))
    .filter((p) => p.categoria === cat)
    .sort(porNombre);
  if (jugadores.length === 0) return `No hay jugadores activos en ${e(cat)}.`;
  const lineas = jugadores.map((p) => {
    const datos = [p.posicion, p.date_of_birth?.slice(0, 4)].filter(Boolean).map(e).join(" · ");
    const juega = p.categoria_juego && p.categoria_juego !== p.categoria ? ` (juega en ${e(p.categoria_juego)})` : "";
    return `• ${nombre(p)}${datos ? ` — ${datos}` : ""}${juega}`;
  });
  return `👥 <b>Plantel de ${e(cat)}</b>: ${jugadores.length}\n${lineas.join("\n")}`;
}

async function jugador(ctx: Contexto) {
  if (!ctx.resto) return `Decime el nombre: <code>${COMANDOS.jugador.uso}</code>`;
  const todos = await jugadoresVisibles(
    ctx,
    "id, name, name_visual, categoria, categoria_juego, posicion, date_of_birth, status, ficha_medica_hasta",
    { soloActivos: false },
  );
  const encontrados = todos.filter((p) => nombreCoincide(ctx.resto, p.name, p.name_visual)).sort(porNombre);
  if (encontrados.length === 0) return `No encontré a ningún jugador con "${e(ctx.resto)}".`;
  if (encontrados.length > 3) {
    const lista = encontrados.slice(0, MAX_COINCIDENCIAS).map((p) => `• ${nombre(p)} (${e(p.categoria || "—")})`).join("\n");
    const mas = encontrados.length > MAX_COINCIDENCIAS ? `\n… y ${encontrados.length - MAX_COINCIDENCIAS} más` : "";
    return `Encontré ${encontrados.length} jugadores, afiná la búsqueda:\n${lista}${mas}`;
  }

  const ids = encontrados.map((p) => p.id);
  const anio = ctx.hoy.slice(0, 4);
  const verFicha = COMANDOS.fichas.permiso(ctx.perm);
  const verPartidos = !!ctx.perm.can_view_partidos;
  const [lesiones, convocatorias, eventos] = await Promise.all([
    q(ctx.db.from("player_injuries").select("player_id, tipo, fecha_inicio, fecha_retorno_estimada").in("player_id", ids).is("fecha_alta", null)),
    verPartidos
      ? q(ctx.db.from("partido_players").select("player_id, tipo, partidos!inner(fecha)").in("player_id", ids)
        .gte("partidos.fecha", `${anio}-01-01`).lte("partidos.fecha", `${anio}-12-31`))
      : Promise.resolve([] as Fila[]),
    verPartidos
      ? q(ctx.db.from("partido_eventos").select("player_id, tipo, partidos!inner(fecha)").in("player_id", ids)
        .gte("partidos.fecha", `${anio}-01-01`).lte("partidos.fecha", `${anio}-12-31`))
      : Promise.resolve([] as Fila[]),
  ]);

  const fichas = encontrados.map((p) => {
    const lineas = [`👤 <b>${nombre(p)}</b>${p.name_visual && p.name_visual !== p.name ? ` (${e(p.name)})` : ""}`];
    lineas.push(`Categoría: ${catLabel(p)}${p.posicion ? ` · ${e(p.posicion)}` : ""}`);
    if (p.date_of_birth) lineas.push(`Nacimiento: ${ddmmyyyy(p.date_of_birth)} (${edad(p.date_of_birth, ctx.hoy)} años)`);
    if (p.status && p.status !== "activo") lineas.push(`Estado: <b>${e(p.status)}</b>`);
    for (const l of lesiones.filter((l) => l.player_id === p.id)) {
      const tipo = ctx.perm.role === "admin" && l.tipo ? ` (${e(l.tipo)})` : "";
      lineas.push(`🏥 Lesionado${tipo} desde el ${ddmm(l.fecha_inicio)}${l.fecha_retorno_estimada ? `, retorno estimado ${ddmm(l.fecha_retorno_estimada)}` : ""}`);
    }
    if (verFicha && CATEGORIAS_FICHA.includes(catEfectiva(p))) {
      const f = p.ficha_medica_hasta;
      lineas.push(`🩺 Ficha médica: ${f ? `${f < ctx.hoy ? "<b>vencida</b> el" : "vence el"} ${ddmmyyyy(f)}` : "sin cargar"}`);
    }
    if (verPartidos) {
      const conv = convocatorias.filter((c) => c.player_id === p.id);
      const ev = eventos.filter((x) => x.player_id === p.id);
      const cuenta = (tipo: string) => ev.filter((x) => x.tipo === tipo).length;
      lineas.push(`⚽ ${anio}: ${plural(conv.length, "convocatoria", "convocatorias")} (${conv.filter((c) => c.tipo === "titular").length} de titular) · ${plural(cuenta("gol"), "gol", "goles")} · 🟨 ${cuenta("amarilla")} · 🟥 ${cuenta("roja")}`);
    }
    return lineas.join("\n");
  });
  return fichas.join("\n\n");
}

async function lesionados(ctx: Contexto) {
  const { categoria } = separarCategoria(ctx.args);
  const sinAcceso = categoriaPermitida(ctx, categoria);
  if (sinAcceso) return sinAcceso;
  const visibles = categoriasVisibles(ctx.perm);
  const lesiones = (await q(ctx.db.from("player_injuries")
    .select("tipo, fecha_inicio, fecha_retorno_estimada, players!inner(name, name_visual, categoria, categoria_juego, hide_player, status)")
    .is("fecha_alta", null)
    .order("fecha_inicio", { ascending: true })))
    .filter((l) => !l.players.hide_player && (!l.players.status || l.players.status === "activo"))
    .filter((l) => veCategoria(visibles, l.players.categoria))
    .filter((l) => !categoria || catEfectiva(l.players) === categoria);
  const titulo = `🏥 <b>Lesionados</b>${categoria ? ` de ${e(categoria)}` : ""}`;
  if (lesiones.length === 0) return `${titulo}: ninguno 💪`;

  const grupos = agruparPorCategoria(lesiones.map((l) => ({ ...l.players, lesion: l })), catEfectiva).map(([cat, js]) =>
    `<b>${e(cat)}</b>\n${js.map((p) => {
      const l = p.lesion;
      const tipo = ctx.perm.role === "admin" && l.tipo ? ` (${e(l.tipo)})` : "";
      const retorno = l.fecha_retorno_estimada
        ? ` · retorno ${ddmm(l.fecha_retorno_estimada)}${l.fecha_retorno_estimada < ctx.hoy ? " ⚠️ vencido" : ""}`
        : "";
      return `• ${nombre(p)}${tipo}: desde ${ddmm(l.fecha_inicio)}${retorno}`;
    }).join("\n")}`);
  return `${titulo}: ${lesiones.length}\n\n${grupos.join("\n\n")}`;
}

async function cumples(ctx: Contexto) {
  const jugadores = (await jugadoresVisibles(ctx, "name, name_visual, categoria, date_of_birth"))
    .map((p) => ({ ...p, dias: diasParaCumple(p.date_of_birth, ctx.hoy) }))
    .filter((p) => p.dias !== null && p.dias <= DIAS_CUMPLES)
    .sort((a, b) => a.dias - b.dias || porNombre(a, b));
  if (jugadores.length === 0) return `🎂 Nadie cumple años en los próximos ${DIAS_CUMPLES} días.`;
  const lineas = jugadores.map((p) => {
    const fecha = sumarDias(ctx.hoy, p.dias);
    const cuando = p.dias === 0 ? "<b>hoy</b>" : p.dias === 1 ? "mañana" : `${diaSemana(fecha)} ${ddmm(fecha)}`;
    return `• ${cuando}: ${nombre(p)} (${e(p.categoria || "—")}) cumple ${edad(p.date_of_birth, fecha)}`;
  });
  return `🎂 <b>Cumpleaños de los próximos ${DIAS_CUMPLES} días</b>\n${lineas.join("\n")}`;
}

// ── Partidos ────────────────────────────────────────────────────────

const SELECT_JORNADA = `id, fecha, fase, numero_jornada, rivales(name), torneos(name),
  partidos(id, categoria, fecha, escenario, cesped, cancha, goles_local, goles_visitante,
    partido_eventos(tipo, players(name, name_visual)))`;

const conFechas = (j: Fila): Fila => ({
  ...j,
  partidos: (j.partidos || [])
    .map((p: Fila) => ({ ...p, fechaReal: fechaPartido(p, j) }))
    .sort((a: Fila, b: Fila) => ordenCategoria(a.categoria, b.categoria)),
});

const lineaResultado = (p: Fila) => {
  const { cap, rival, resultado } = marcador(p);
  if (resultado === null) return `• ${e(p.categoria)}: sin resultado`;
  const goles = new Map<string, number>();
  for (const ev of p.partido_eventos || []) {
    if (ev.tipo === "gol") goles.set(nombre(ev.players), (goles.get(nombre(ev.players)) || 0) + 1);
  }
  const autores = [...goles.entries()].map(([n, c]) => (c > 1 ? `${n} (${c})` : n)).join(", ");
  return `• ${e(p.categoria)}: ${cap}-${rival} ${ICONO_RESULTADO[resultado]}${autores ? ` ⚽ ${autores}` : ""}`;
};

const encabezadoJornada = (j: Fila) =>
  [jornadaLabel(j), j.torneos?.name].filter((x) => x && x !== "-").map(e).join(" · ");

async function proximo(ctx: Contexto) {
  const { categoria } = separarCategoria(ctx.args);
  const jornadas = (await q(ctx.db.from("jornadas").select(SELECT_JORNADA)
    .gte("fecha", sumarDias(ctx.hoy, -30)).order("fecha", { ascending: true })))
    .map(conFechas)
    .map((j) => ({
      ...j,
      pendientes: j.partidos.filter((p: Fila) =>
        p.fechaReal >= ctx.hoy && marcador(p).resultado === null && (!categoria || p.categoria === categoria)),
    }))
    .filter((j) => j.pendientes.length > 0)
    .sort((a, b) => a.pendientes[0].fechaReal.localeCompare(b.pendientes[0].fechaReal));
  const j = jornadas[0];
  if (!j) return `No hay partidos${categoria ? ` de ${e(categoria)}` : ""} programados.`;

  const lineas = [...j.pendientes]
    .sort((a: Fila, b: Fila) => a.fechaReal.localeCompare(b.fechaReal) || ordenCategoria(a.categoria, b.categoria))
    .map((p: Fila) => {
      const lugar = [p.escenario, p.cesped, p.cancha].filter(Boolean).map(e).join(" · ");
      return `• ${e(p.categoria)}: ${diaSemana(p.fechaReal)} ${ddmm(p.fechaReal)}${lugar ? ` — ${lugar}` : ""}`;
    });
  const encabezado = encabezadoJornada(j);
  return `📅 <b>Próxima jornada: vs ${e(j.rivales?.name || "—")}</b>${encabezado ? `\n${encabezado}` : ""}\n${lineas.join("\n")}`;
}

async function resultado(ctx: Contexto) {
  const { categoria } = separarCategoria(ctx.args);
  const jornadas = (await q(ctx.db.from("jornadas").select(SELECT_JORNADA)
    .lte("fecha", sumarDias(ctx.hoy, 1)).order("fecha", { ascending: false }).limit(20)))
    .map(conFechas)
    .map((j) => ({ ...j, partidos: j.partidos.filter((p: Fila) => !categoria || p.categoria === categoria) }));
  const j = jornadas.find((j) => j.partidos.some((p: Fila) => marcador(p).resultado !== null));
  if (!j) return `No encontré resultados cargados${categoria ? ` de ${e(categoria)}` : ""}.`;
  const encabezado = encabezadoJornada(j);
  return `🏟️ <b>vs ${e(j.rivales?.name || "—")}</b> (${ddmmyyyy(j.fecha)})${encabezado ? `\n${encabezado}` : ""}\n${j.partidos.map(lineaResultado).join("\n")}`;
}

async function contra(ctx: Contexto) {
  if (!ctx.resto) return `Decime el rival: <code>${COMANDOS.contra.uso}</code>`;
  const rivales = await q(ctx.db.from("rivales").select("id, name"));
  const exacto = rivales.filter((r) => normalizar(r.name) === normalizar(ctx.resto));
  const candidatos = exacto.length ? exacto : rivales.filter((r) => rivalBuscado(ctx.resto, r.name));
  if (candidatos.length === 0) return `No encontré el rival "${e(ctx.resto)}".`;
  if (candidatos.length > 1) {
    return `¿Cuál de estos?\n${candidatos.map((r) => `• <code>/contra ${e(r.name)}</code>`).join("\n")}`;
  }
  const rival = candidatos[0];
  const jornadas = (await q(ctx.db.from("jornadas").select(SELECT_JORNADA).eq("rival_id", rival.id).order("fecha", { ascending: false })))
    .map(conFechas);
  if (jornadas.length === 0) return `No hay jornadas contra ${e(rival.name)}.`;

  const totales = new Map<string, { G: number; E: number; P: number; gf: number; gc: number }>();
  for (const j of jornadas) {
    for (const p of j.partidos) {
      const { cap, rival: gc, resultado } = marcador(p);
      if (resultado === null) continue;
      const t = totales.get(p.categoria) || { G: 0, E: 0, P: 0, gf: 0, gc: 0 };
      t[resultado as "G" | "E" | "P"] += 1;
      t.gf += cap!;
      t.gc += gc!;
      totales.set(p.categoria, t);
    }
  }
  const resumen = [...totales.entries()].sort(([a], [b]) => ordenCategoria(a, b))
    .map(([cat, t]) => `• ${e(cat)}: ${t.G}G ${t.E}E ${t.P}P (goles ${t.gf}-${t.gc})`);
  const ULTIMAS = 6;
  const detalle = jornadas.slice(0, ULTIMAS).map((j) => {
    const partidos = j.partidos.map((p: Fila) => {
      const m = marcador(p);
      return m.resultado ? `${e(p.categoria)} ${m.cap}-${m.rival} ${ICONO_RESULTADO[m.resultado]}` : `${e(p.categoria)} —`;
    });
    return `<b>${ddmmyyyy(j.fecha)}</b> ${e(jornadaLabel(j))}\n${partidos.join(" · ")}`;
  });
  return [
    `🆚 <b>Historial contra ${e(rival.name)}</b> (${plural(jornadas.length, "jornada", "jornadas")})`,
    resumen.length ? `\n${resumen.join("\n")}` : "\nSin resultados cargados.",
    `\n<b>Últimas ${Math.min(ULTIMAS, jornadas.length)}</b>\n${detalle.join("\n")}`,
  ].join("\n");
}

/** Eventos del año (con la categoría del partido), agrupados por categoría y jugador. */
async function eventosDelAnio(ctx: Contexto, tipos: string[]) {
  const { categoria, otros } = separarCategoria(ctx.args);
  const anio = parseAnio(otros[0]) ?? Number(ctx.hoy.slice(0, 4));
  let consulta = ctx.db.from("partido_eventos")
    .select("tipo, player_id, players(name, name_visual), partidos!inner(categoria, fecha)")
    .in("tipo", tipos)
    .gte("partidos.fecha", `${anio}-01-01`).lte("partidos.fecha", `${anio}-12-31`);
  if (categoria) consulta = consulta.eq("partidos.categoria", categoria);
  const eventos = await q(consulta);

  const porCategoria = new Map<string, Map<string, { nombre: string; [tipo: string]: number | string }>>();
  for (const ev of eventos) {
    if (!tipos.includes(ev.tipo)) continue;
    const cat = ev.partidos.categoria;
    const jugadores = porCategoria.get(cat) || new Map();
    const fila = jugadores.get(ev.player_id) || { nombre: nombre(ev.players) };
    fila[ev.tipo] = ((fila[ev.tipo] as number) || 0) + 1;
    jugadores.set(ev.player_id, fila);
    porCategoria.set(cat, jugadores);
  }
  return { categoria, anio, porCategoria: [...porCategoria.entries()].sort(([a], [b]) => ordenCategoria(a, b)) };
}

async function goleadores(ctx: Contexto) {
  const { categoria, anio, porCategoria } = await eventosDelAnio(ctx, ["gol"]);
  const titulo = `⚽ <b>Goleadores ${anio}</b>${categoria ? ` de ${e(categoria)}` : ""}`;
  if (porCategoria.length === 0) return `${titulo}: no hay goles cargados.`;
  const top = categoria ? 15 : 5;
  const bloques = porCategoria.map(([cat, jugadores]) => {
    const lista = [...jugadores.values()].sort((a, b) => (b.gol as number) - (a.gol as number) || String(a.nombre).localeCompare(String(b.nombre)));
    const total = lista.reduce((s, j) => s + (j.gol as number), 0);
    return `<b>${e(cat)}</b> (${plural(total, "gol", "goles")})\n${lista.slice(0, top).map((j, i) => `${i + 1}. ${j.nombre} — ${j.gol}`).join("\n")}`;
  });
  return `${titulo}\n\n${bloques.join("\n\n")}`;
}

async function tarjetas(ctx: Contexto) {
  const { categoria, anio, porCategoria } = await eventosDelAnio(ctx, ["amarilla", "roja"]);
  const titulo = `🟨 <b>Tarjetas ${anio}</b>${categoria ? ` de ${e(categoria)}` : ""}`;
  if (porCategoria.length === 0) return `${titulo}: no hay tarjetas cargadas.`;
  const top = categoria ? 20 : 8;
  const n = (j: Fila, t: string) => (j[t] as number) || 0;
  const bloques = porCategoria.map(([cat, jugadores]) => {
    const lista = [...jugadores.values()].sort((a, b) =>
      n(b, "roja") * 2 + n(b, "amarilla") - (n(a, "roja") * 2 + n(a, "amarilla")) || String(a.nombre).localeCompare(String(b.nombre)));
    const am = lista.reduce((s, j) => s + n(j, "amarilla"), 0);
    const ro = lista.reduce((s, j) => s + n(j, "roja"), 0);
    const filas = lista.slice(0, top).map((j) =>
      `• ${j.nombre} — ${[n(j, "amarilla") ? `🟨${n(j, "amarilla")}` : "", n(j, "roja") ? `🟥${n(j, "roja")}` : ""].filter(Boolean).join(" ")}`);
    return `<b>${e(cat)}</b> (🟨${am} 🟥${ro})\n${filas.join("\n")}`;
  });
  return `${titulo}\n\n${bloques.join("\n\n")}\n\n<i>Para las suspensiones mirá la app: dependen de las fechas cumplidas.</i>`;
}

// ── Administración ──────────────────────────────────────────────────

async function fichas(ctx: Contexto) {
  const { categoria } = separarCategoria(ctx.args);
  const sinAcceso = categoriaPermitida(ctx, categoria);
  if (sinAcceso) return sinAcceso;
  const limite = sumarDias(ctx.hoy, VENTANA_FICHA_DIAS);
  const jugadores = (await jugadoresVisibles(ctx, "name, name_visual, categoria, categoria_juego, ficha_medica_hasta"))
    .filter((p) => CATEGORIAS_FICHA.includes(catEfectiva(p)))
    .filter((p) => !categoria || catEfectiva(p) === categoria);

  const bloques = agruparPorCategoria(jugadores, catEfectiva).flatMap(([cat, js]) => {
    const porFecha = (a: Fila, b: Fila) => a.ficha_medica_hasta.localeCompare(b.ficha_medica_hasta);
    const vencidas = js.filter((p) => p.ficha_medica_hasta && p.ficha_medica_hasta < ctx.hoy).sort(porFecha);
    const porVencer = js.filter((p) => p.ficha_medica_hasta && p.ficha_medica_hasta >= ctx.hoy && p.ficha_medica_hasta <= limite).sort(porFecha);
    const sinFicha = js.filter((p) => !p.ficha_medica_hasta).sort(porNombre);
    if (!vencidas.length && !porVencer.length && !sinFicha.length) return [];
    const lineas = [`<b>${e(cat)}</b>`];
    if (vencidas.length) lineas.push(`❌ Vencidas: ${vencidas.map((p) => `${nombre(p)} (${ddmm(p.ficha_medica_hasta)})`).join(", ")}`);
    if (porVencer.length) lineas.push(`⏳ Vencen pronto: ${porVencer.map((p) => `${nombre(p)} (${ddmm(p.ficha_medica_hasta)})`).join(", ")}`);
    if (sinFicha.length) lineas.push(`➖ Sin ficha: ${sinFicha.map(nombre).join(", ")}`);
    return [lineas.join("\n")];
  });
  const titulo = `🩺 <b>Fichas médicas</b>${categoria ? ` de ${e(categoria)}` : ""} (vencidas o por vencer en ${VENTANA_FICHA_DIAS} días)`;
  return bloques.length ? `${titulo}\n\n${bloques.join("\n\n")}` : `${titulo}: todas vigentes ✅`;
}

const ORDEN_ESTADO = ["En Progreso", "Sin Comenzar", "Sin Asignar"];
const ORDEN_PRIORIDAD = ["Urgente", "Muy Alta", "Alta", "Media", "Baja"];
const MAX_TAREAS = 40;

async function tareas(ctx: Contexto) {
  const lista = await q(ctx.db.from("tareas")
    .select("titulo, prioridad, estado, asignado_nombre, fecha_estimada_completo")
    .neq("estado", "Completado"));
  if (lista.length === 0) return "✅ No hay tareas abiertas.";
  const orden = (arr: string[], v: string) => (arr.indexOf(v) === -1 ? 99 : arr.indexOf(v));
  const ordenadas = [...lista].sort((a, b) =>
    orden(ORDEN_ESTADO, a.estado) - orden(ORDEN_ESTADO, b.estado) || orden(ORDEN_PRIORIDAD, a.prioridad) - orden(ORDEN_PRIORIDAD, b.prioridad));
  const bloques: string[] = [];
  for (const estado of [...new Set(ordenadas.slice(0, MAX_TAREAS).map((t) => t.estado))]) {
    const filas = ordenadas.slice(0, MAX_TAREAS).filter((t) => t.estado === estado).map((t) => {
      const extra = [t.prioridad, t.asignado_nombre, t.fecha_estimada_completo ? `para el ${ddmm(t.fecha_estimada_completo)}` : null]
        .filter(Boolean).map(e).join(" · ");
      const atrasada = t.fecha_estimada_completo && t.fecha_estimada_completo < ctx.hoy ? " ⚠️" : "";
      return `• ${e(t.titulo)}${extra ? ` — ${extra}` : ""}${atrasada}`;
    });
    bloques.push(`<b>${e(estado)}</b>\n${filas.join("\n")}`);
  }
  const mas = lista.length > MAX_TAREAS ? `\n\n… y ${lista.length - MAX_TAREAS} más en la app.` : "";
  return `📋 <b>Tareas abiertas</b>: ${lista.length}\n\n${bloques.join("\n\n")}${mas}`;
}

// ── Ayuda ───────────────────────────────────────────────────────────

export function ayuda(ctx: Pick<Contexto, "perm">) {
  const lineas = comandosDe(ctx.perm).map((c) => `${e(COMANDOS[c].uso)} — ${e(COMANDOS[c].descripcion)}`);
  return [
    "🤖 <b>Consultas disponibles</b>",
    lineas.join("\n"),
    "",
    `Categorías: ${CATEGORIAS.join(", ")} (también "quinta", "5", "sub16").`,
  ].join("\n");
}

export const EJECUTORES: Record<string, (ctx: Contexto) => Promise<string> | string> = {
  nacidos, categoria, jugador, lesionados, cumples, proximo, resultado, contra, goleadores, tarjetas, fichas, tareas, ayuda,
};
