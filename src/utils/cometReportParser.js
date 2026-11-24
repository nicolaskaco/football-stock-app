/**
 * Parser del "Informe del partido" que exporta COMET (AUF) en PDF.
 *
 * Hay dos formatos:
 * - "web": la página de COMET impresa desde el navegador. Dos columnas (local a la izquierda,
 *   visitante a la derecha) y secciones con título centrado (ALINEACIONES, SUBSTITUCIONES…).
 *   A veces la alineación trae el COMET ID de cada jugador y a veces, en su lugar, los
 *   minutos de sus incidencias.
 * - "itext": el PDF que generaba COMET antes (casi todo el Apertura 2026). Una sola tabla de
 *   alineación, los cambios en la fila del suplente ("(10) 84"), los goles en una grilla
 *   Resultado / Goleador/Min y las tarjetas en un párrafo.
 *
 * Se trabaja con los fragmentos de texto y su posición (x, y) en vez de con texto plano,
 * porque copiar el texto de un PDF a dos columnas mezcla los equipos.
 *
 * `extractPdfPages` es lo único que depende de pdfjs (y del navegador);
 * `parseCometPages` es puro, así se puede probar con cualquier extracción.
 */

const SECCIONES = [
  { re: /^([ÁA]RBITROS Y )?OFICIALES DE(L)? PARTIDO$/, key: 'oficiales' },
  { re: /^ALINEACIONES$/, key: 'titulares' },
  { re: /^SUB?STITUCIONES$/, key: 'sustituciones' }, // banco o cambios, según el orden
  { re: /^CUERPO T[ÉE]CNICO$/, key: 'cuerpo_tecnico' },
  { re: /^DISCIPLINARIO$/, key: 'disciplinario' },
  { re: /^TARJETAS? AMARILLAS?$/, key: 'amarillas' },
  { re: /^TARJETAS? ROJAS?/, key: 'rojas' },
  { re: /^(DOBLE|SEGUNDA) AMARILLA/, key: 'rojas' },
  { re: /^GOLES$/, key: 'goles' },
  { re: /^RESUMEN DEL PARTIDO$/, key: 'resumen' },
];

const PENAROL_RE = /PE[ÑN]AROL/i;
const ROW_TOLERANCE = 3;
const MINUTO_RE = /^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?'?$/;
// Roles del cuerpo técnico: sus tarjetas no son de jugadores
const STAFF_RE = /t[ée]cnico|entrenador|preparador|m[ée]dico|kinesi[óo]logo|fisioterapeuta|delegado|utilero|masajista/i;

/** Extrae los fragmentos de texto de cada página del PDF (solo navegador). */
export async function extractPdfPages(file) {
  // Build "legacy": trae polyfills para Safari/iOS más viejos (el moderno usa APIs muy nuevas)
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const { width } = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    pages.push({
      width,
      items: content.items
        .filter((it) => it.str && it.str.trim())
        .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0 })),
    });
  }
  return pages;
}

export async function parseCometReport(file) {
  return parseCometPages(await extractPdfPages(file));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Agrupa fragmentos en renglones (misma y), ordenados de arriba hacia abajo. */
function groupRows(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  sorted.forEach((it) => {
    const row = rows.find((r) => Math.abs(r.y - it.y) <= ROW_TOLERANCE && r.page === it.page);
    if (row) row.items.push(it);
    else rows.push({ y: it.y, page: it.page, items: [it] });
  });
  rows.forEach((r) => r.items.sort((a, b) => a.x - b.x));
  return rows;
}

/** Une fragmentos contiguos; pdfjs a veces corta una palabra en dos ("WAL" + "TER"). */
function joinItems(items) {
  let out = '';
  let prevEnd = null;
  items.forEach((it) => {
    const gap = prevEnd == null ? Infinity : it.x - prevEnd;
    out += prevEnd != null && gap > 1.5 ? ` ${it.str}` : it.str;
    prevEnd = it.x + it.w;
  });
  return out.replace(/\s+/g, ' ').trim();
}

const isCentered = (it, width) => Math.abs(it.x + it.w / 2 - width / 2) < width * 0.12;

// Los íconos de COMET salen como glifos sin letras ni números
const tieneTexto = (s) => /[\p{L}\p{N}]/u.test(s);

/** "VICENTE CARRERAS, JOAQUIN SANTIAGO" → "Vicente Carreras, Joaquin Santiago" */
export function titleCase(s) {
  return (s || '').toLowerCase().replace(/(^|[\s,'-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
}

// Partículas que forman parte del primer apellido ("DE LOS SANTOS", "SAN MARTIN", "DA SILVA")
const PARTICULAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'DA', 'DAS', 'DO', 'DOS', 'SAN', 'SANTA', 'VAN', 'VON', 'DI']);

/**
 * Nombre de un oficial en el formato de los partidos cargados:
 * "VICENTE CARRERAS, JOAQUIN SANTIAGO" → "Joaquin Vicente"
 * (primer nombre + primer apellido, conservando partículas: "DE LOS SANTOS X, JUAN" → "Juan De Los Santos").
 */
export function formatOficial(raw) {
  const [apellidos, nombres] = (raw || '').split(',').map((x) => x.trim());
  if (!nombres) return titleCase(apellidos);
  const words = apellidos.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < words.length - 1 && PARTICULAS.has(words[i].toUpperCase())) i++;
  const primerApellido = words.slice(0, i + 1).join(' ');
  const primerNombre = nombres.split(/\s+/)[0];
  return titleCase(`${primerNombre} ${primerApellido}`);
}

/** "45'", "90+3'", "90 + 3", "84" → minuto (los descuentos se suman). */
const parseMinuto = (s, { conApostrofe = true } = {}) => {
  const str = String(s).trim();
  if (conApostrofe && !str.endsWith("'")) return null;
  const m = str.match(MINUTO_RE);
  return m ? Number(m[1]) + (m[2] ? Number(m[2]) : 0) : null;
};

// Minutos sueltos en la alineación ("55'", "46', 86'"): son íconos de incidencias
const esMinutos = (s) => /^\d{1,3}(\+\d{1,2})?'(\s*,\s*\d{1,3}(\+\d{1,2})?')*$/.test(s.trim());

/** "TORNEO APERTURA 4A 2026" → 'Apertura' */
export function faseDelTorneo(torneo) {
  if (/APERTURA/i.test(torneo || '')) return 'Apertura';
  if (/CLAUSURA/i.test(torneo || '')) return 'Clausura';
  return null;
}

/**
 * Renglón de alineación: dorsal · nombre · [AR|CP] · [COMET ID]
 * En la versión web sin ID, en lugar del ID vienen los minutos de sus incidencias.
 */
function parsePlayerRow(row) {
  const items = row.items.filter((it) => tieneTexto(it.str) && !/^(AR|CP)$/.test(it.str.trim()) && !esMinutos(it.str));
  if (items.length < 2) return null;
  const dorsal = items[0].str.trim();
  if (!/^\d{1,2}$/.test(dorsal)) return null;
  // El ID a veces viene con otro número o el club de origen: "3576649/39761623"
  const idMatch = items[items.length - 1].str.trim().match(/^(\d{5,9})(?:\/.*)?$/);
  const nombre = joinItems(items.slice(1, idMatch ? -1 : undefined));
  if (!nombre || !/\p{L}/u.test(nombre)) return null;
  return { dorsal: Number(dorsal), nombre, cometId: idMatch ? idMatch[1] : null };
}

const primerPalabra = (s) => sinTildesMayus(s).replace(/^\d+\s*/, '').split(/[\s,]+/)[0] || '';
const sinTildesMayus = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

/** ¿La incidencia "17 LARROSA LATORRE, LAUTARO" es de un jugador de la alineación de Peñarol? */
function esDePenarol(incidencia, byDorsal) {
  const p = byDorsal.get(incidencia.dorsal);
  return !!p && primerPalabra(p.nombre) === primerPalabra(incidencia.detalle);
}

/** Avisos comunes: titulares y goles contra el marcador. */
function cerrar(result, { autogolesAFavor = 0 } = {}) {
  const { titulares, goles, escenario, golesLocal, golesVisitante, warnings } = result;
  if (titulares.length === 0) throw new Error('No se encontró la alineación de Peñarol en el informe.');
  if (titulares.length !== 11) warnings.push(`Se leyeron ${titulares.length} titulares (se esperaban 11).`);
  const golesPenarol = escenario === 'Local' ? golesLocal : golesVisitante;
  if (goles.length + autogolesAFavor !== golesPenarol) {
    warnings.push(`El marcador dice ${golesPenarol} gol${golesPenarol === 1 ? '' : 'es'} de Peñarol y se leyeron ${goles.length} del detalle. Revisá los goles a mano.`);
  }
  return { ...result, fase: faseDelTorneo(result.torneo) };
}

// ─── Parser ─────────────────────────────────────────────────────────────────

/**
 * @param {Array<{width:number, items:Array<{str,x,y,w}>}>} pages
 * @returns datos del partido; jugadores, cambios y tarjetas solo de Peñarol.
 */
export function parseCometPages(pages) {
  if (!pages?.length) throw new Error('El PDF no tiene páginas.');
  const esItext = pages.some((p) => p.items.some((it) => /^Goleador\/Min/.test(it.str.trim())))
    && pages.some((p) => p.items.some((it) => /^Equipo A$/.test(it.str.trim())));
  return esItext ? parseItext(pages) : parseWeb(pages);
}

/** Formato web (la página de COMET impresa). */
function parseWeb(pages) {
  const warnings = [];

  // Asigna cada fragmento a una sección según el título centrado que tiene arriba.
  // El primer SUB/SUSTITUCIONES después de ALINEACIONES es el banco; el siguiente, los cambios.
  let current = 'encabezado';
  let seenBanco = false;
  const tagged = []; // { ...item, page, width, section }
  pages.forEach((page, pageIndex) => {
    const sorted = [...page.items].sort((a, b) => b.y - a.y || a.x - b.x);
    sorted.forEach((it) => {
      const text = it.str.trim();
      // Encabezado y pie de página de COMET
      if (/^COMET - /.test(text) || /Impreso por:/.test(text) || /^Informe del partido:/.test(text) || /^P[áa]gina$/.test(text)) return;
      if (isCentered(it, page.width)) {
        const sec = SECCIONES.find((s) => s.re.test(text.toUpperCase()));
        if (sec) {
          if (sec.key === 'sustituciones') {
            current = !seenBanco && current === 'titulares' ? 'suplentes' : 'cambios';
            if (current === 'suplentes') seenBanco = true;
          } else {
            current = sec.key;
          }
          return;
        }
      }
      tagged.push({ ...it, str: text, page: pageIndex, width: page.width, section: current });
    });
  });

  const inSection = (key) => tagged.filter((it) => it.section === key);
  const side = (it) => (it.x < it.width / 2 ? 'local' : 'visitante');

  // ── Encabezado: "ALBION 0:0 PEÑAROL" (a veces con asterisco: "9:1*")
  const header = inSection('encabezado').filter((it) => it.page === 0);
  const scoreItem = header.find((it) => /^\d{1,2}\s*:\s*\d{1,2}\s*\*?$/.test(it.str));
  if (!scoreItem) throw new Error('No se encontró el marcador. ¿Es un informe de partido de COMET?');
  const sameLine = header.filter((it) => Math.abs(it.y - scoreItem.y) <= 6 && it !== scoreItem && !/^(N\/A|J|AR)$/.test(it.str));
  const local = joinItems(sameLine.filter((it) => it.x < scoreItem.x));
  const visitante = joinItems(sameLine.filter((it) => it.x > scoreItem.x));
  const [golesLocal, golesVisitante] = scoreItem.str.replace('*', '').split(':').map((n) => Number(n.trim()));

  const penarolSide = PENAROL_RE.test(local) ? 'local' : PENAROL_RE.test(visitante) ? 'visitante' : null;
  if (!penarolSide) throw new Error(`No se encontró a Peñarol en el partido (${local} vs ${visitante}).`);
  const escenario = penarolSide === 'local' ? 'Local' : 'Visitante';
  const isPenarol = (it) => side(it) === penarolSide;

  // ── Datos sueltos del encabezado (etiqueta "X:" y valor a la derecha)
  const headerValue = (labelRe) => {
    const label = header.find((it) => labelRe.test(it.str));
    if (!label) return null;
    const value = header
      .filter((it) => Math.abs(it.y - label.y) <= ROW_TOLERANCE && it.x > label.x && it.x - label.x < it.width / 2 && tieneTexto(it.str))
      .sort((a, b) => a.x - b.x)[0];
    return value?.str || null;
  };
  const fechaRaw = headerValue(/^Fecha\/Hora:?$/);
  const fechaMatch = fechaRaw?.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  const fecha = fechaMatch ? `${fechaMatch[3]}-${fechaMatch[2]}-${fechaMatch[1]}` : null;
  const categoriaEdad = headerValue(/^Categor[íi]a de edad:?$/);
  const numeroFechaRaw = headerValue(/^Fecha:?$/);
  const numeroFecha = /^\d{1,2}$/.test(numeroFechaRaw || '') ? Number(numeroFechaRaw) : null;
  const torneo = header.find((it) => /^TORNEO\b/i.test(it.str))?.str || null;

  // ── Oficiales: "Árbitro" + ": APELLIDO, NOMBRE"
  const oficiales = {};
  groupRows(inSection('oficiales')).forEach((row) => {
    row.items.forEach((it, i) => {
      const value = row.items[i + 1];
      if (!value || !value.str.startsWith(':')) return;
      const nombre = formatOficial(value.str.replace(/^:\s*/, ''));
      if (/^[ÁA]rbitro$/i.test(it.str)) oficiales.arbitro = nombre;
      else if (/^1/.test(it.str)) oficiales.primerLinea = nombre;
      else if (/^2/.test(it.str)) oficiales.segundaLinea = nombre;
    });
  });

  // ── Titulares y banco
  const parsePlayers = (key) => groupRows(inSection(key).filter(isPenarol)).map(parsePlayerRow).filter(Boolean);
  const titulares = parsePlayers('titulares');
  const suplentes = parsePlayers('suplentes');

  const byDorsal = new Map([...titulares, ...suplentes].map((p) => [p.dorsal, p]));

  // ── Cambios: minuto · dorsal sale · nombre · dorsal entra · nombre.
  // Los nombres largos ocupan dos renglones, así que se usa el dorsal.
  const cambiosItems = inSection('cambios').filter(isPenarol);
  const cambios = [];
  cambiosItems.filter((it) => parseMinuto(it.str) != null).forEach((minItem) => {
    const dorsales = cambiosItems
      .filter((it) => it.page === minItem.page && Math.abs(it.y - minItem.y) <= ROW_TOLERANCE && it.x > minItem.x && /^\d{1,2}$/.test(it.str))
      .sort((a, b) => a.x - b.x);
    if (dorsales.length < 2) {
      warnings.push(`No se pudo leer el cambio del minuto ${minItem.str}.`);
      return;
    }
    const sale = Number(dorsales[0].str);
    const entra = Number(dorsales[1].str);
    if (!byDorsal.has(sale) || !byDorsal.has(entra)) warnings.push(`El cambio del minuto ${minItem.str} usa dorsales que no están en la planilla (${sale} → ${entra}).`);
    cambios.push({ minuto: parseMinuto(minItem.str), sale, entra });
  });

  // ── Tarjetas y goles: minuto · "DORSAL APELLIDO, NOMBRE" (con el motivo debajo)
  const parseIncidencias = (key, sideFilter = isPenarol) => {
    const items = inSection(key).filter(sideFilter);
    const out = [];
    // A veces COMET no tiene el minuto y pone una sigla ("AM"): la tarjeta va sin minuto
    const isMarker = (it) => parseMinuto(it.str) != null || /^[A-Z]{1,3}$/.test(it.str);
    items.filter(isMarker).forEach((minItem) => {
      const cerca = items.filter((it) => it.page === minItem.page && Math.abs(it.y - minItem.y) <= 8 && it.x > minItem.x);
      const texto = cerca.filter((it) => /^\d{1,2}\b/.test(it.str)).sort((a, b) => b.y - a.y)[0];
      const autogol = cerca.some((it) => /autogol|en contra/i.test(it.str));
      const m = texto?.str.match(/^(\d{1,2})\b/);
      if (!m) {
        // Tarjeta a alguien del cuerpo técnico: nombre sin dorsal y su rol
        const esStaff = cerca.some((it) => STAFF_RE.test(it.str)) || cerca.some((it) => /^\p{L}[^,]*,/u.test(it.str));
        if (!esStaff) warnings.push(`No se pudo leer el jugador de la incidencia "${minItem.str}".`);
        return;
      }
      out.push({ minuto: parseMinuto(minItem.str), dorsal: Number(m[1]), detalle: texto.str, autogol });
    });
    return out;
  };
  const sinAutogol = ({ autogol, ...rest }) => rest; // eslint-disable-line no-unused-vars
  const tarjetas = [
    ...parseIncidencias('amarillas').map((t) => ({ ...sinAutogol(t), tipo: 'amarilla' })),
    ...parseIncidencias('rojas').map((t) => ({ ...sinAutogol(t), tipo: 'roja' })),
  ];
  // Autogoles: COMET no siempre los pone en la misma columna, así que se mira quién lo hizo.
  // Si el dorsal y el apellido son de la alineación de Peñarol, fue en contra; si no, a favor.
  const golesPenarol = parseIncidencias('goles');
  const autogoles = [...golesPenarol, ...parseIncidencias('goles', (it) => !isPenarol(it))].filter((g) => g.autogol);
  const autogolesAFavor = autogoles.filter((g) => !esDePenarol(g, byDorsal)).length;
  const goles = golesPenarol.filter((g) => !g.autogol).map(sinAutogol);

  return cerrar({
    formato: 'web',
    torneo,
    local,
    visitante,
    escenario,
    golesLocal,
    golesVisitante,
    categoriaEdad,
    fecha,
    numeroFecha,
    arbitro: oficiales.arbitro || null,
    primerLinea: oficiales.primerLinea || null,
    segundaLinea: oficiales.segundaLinea || null,
    titulares,
    suplentes,
    cambios,
    tarjetas,
    goles,
    warnings,
  }, { autogolesAFavor });
}

/** Formato iText (el PDF que exportaba COMET antes). */
function parseItext(pages) {
  const warnings = [];
  const all = pages.flatMap((page, pageIndex) => page.items
    .map((it) => ({ ...it, str: it.str.trim(), page: pageIndex, width: page.width }))
    .filter((it) => it.str && !/^COMET - /.test(it.str) && !/Impreso por:/.test(it.str)));
  const rows = groupRows(all).sort((a, b) => a.page - b.page || b.y - a.y);
  const rowText = (r) => joinItems(r.items);
  const findRow = (re, from = 0) => rows.findIndex((r, i) => i >= from && r.items.some((it) => re.test(it.str)));

  // ── Encabezado: "PEÑAROL - ALBION" y debajo "2:0 (1:0)"
  const scoreIdx = rows.findIndex((r) => r.page === 0 && r.items.some((it) => /^\d{1,2}\s*:\s*\d{1,2}\s*\*?(\s*\(.*\))?$/.test(it.str)));
  if (scoreIdx < 1) throw new Error('No se encontró el marcador. ¿Es un informe de partido de COMET?');
  const scoreStr = rows[scoreIdx].items.map((it) => it.str).join(' ');
  const [, gl, gv] = scoreStr.match(/(\d{1,2})\s*:\s*(\d{1,2})/);
  const golesLocal = Number(gl);
  const golesVisitante = Number(gv);
  const equipos = rowText(rows[scoreIdx - 1]).split(/\s+-\s+/);
  const local = (equipos[0] || '').trim();
  const visitante = equipos.slice(1).join(' - ').trim();
  const penarolSide = PENAROL_RE.test(local) ? 'local' : PENAROL_RE.test(visitante) ? 'visitante' : null;
  if (!penarolSide) throw new Error(`No se encontró a Peñarol en el partido (${local} vs ${visitante}).`);
  const escenario = penarolSide === 'local' ? 'Local' : 'Visitante';
  const width = pages[0].width;
  const isPenarol = (it) => (it.x < width / 2) === (penarolSide === 'local');

  const valor = (re) => {
    for (const it of all) {
      const m = it.str.match(re);
      if (m) return (m[1] || '').trim();
    }
    return null;
  };
  const fechaMatch = valor(/^Fecha\/hora:\s*(.*)$/i)?.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  const fecha = fechaMatch ? `${fechaMatch[3]}-${fechaMatch[2]}-${fechaMatch[1]}` : null;
  const numeroFechaRaw = valor(/^Fecha:\s*(\d{1,2})$/);
  const numeroFecha = numeroFechaRaw ? Number(numeroFechaRaw) : null;
  const categoriaEdad = valor(/^Categor[íi]a de edad:\s*(.*)$/i) || null;
  const torneo = all.find((it) => it.page === 0 && /^TORNEO\b/i.test(it.str))?.str || null;
  const oficial = (re) => {
    const v = valor(re);
    return v ? formatOficial(v) : null;
  };

  // ── Alineación: desde "Equipo A" hasta el cuerpo técnico. Primero los titulares y,
  // después de un salto, los suplentes. El cambio va en la fila del que entra: "(10) 84".
  const inicio = findRow(/^Equipo A$/);
  const jugadores = [];
  for (let i = inicio + 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.items.some((it) => /^Director t[ée]cnico$|^Resultado$/.test(it.str))) break;
    const mine = r.items.filter(isPenarol);
    const cambioIt = mine.find((it) => /^\(\d{1,2}\)\s*\d/.test(it.str));
    const p = parsePlayerRow({ items: mine.filter((it) => it !== cambioIt) });
    if (!p) continue;
    const cm = cambioIt?.str.match(/^\((\d{1,2})\)\s*(\d{1,3}(?:\s*\+\s*\d{1,2})?)/);
    jugadores.push({ ...p, y: r.y, page: r.page, cambio: cm ? { sale: Number(cm[1]), minuto: parseMinuto(cm[2], { conApostrofe: false }) } : null });
  }
  // El salto entre titulares y suplentes es más grande que el interlineado normal
  let corte = jugadores.findIndex((p, i) => i > 0 && (p.page !== jugadores[i - 1].page ? false : jugadores[i - 1].y - p.y > 16));
  if (corte === -1) corte = Math.min(11, jugadores.length);
  const limpio = ({ dorsal, nombre, cometId }) => ({ dorsal, nombre, cometId });
  const titulares = jugadores.slice(0, corte).map(limpio);
  const suplentes = jugadores.slice(corte).map(limpio);
  const cambios = jugadores.slice(corte).filter((p) => p.cambio).map((p) => ({ minuto: p.cambio.minuto, sale: p.cambio.sale, entra: p.dorsal }));
  const byDorsal = new Map(jugadores.map((p) => [p.dorsal, p]));
  cambios.forEach((c) => {
    if (!byDorsal.has(c.sale)) warnings.push(`El cambio del minuto ${c.minuto}' usa un dorsal que no está en la planilla (${c.sale} → ${c.entra}).`);
  });

  // ── Goles: cada columna de "Resultado" es un gol; el lado que sube dice de quién es.
  // Debajo, "dorsal minuto" en "Goleador/Min" y "PEN" o "AG" (autogol) en "PEN/AG".
  const goles = [];
  let autogolesAFavor = 0;
  let prev = [0, 0];
  rows.forEach((r, i) => {
    const label = r.items.find((it) => /^Resultado$/.test(it.str));
    if (!label) return;
    const cols = r.items.filter((it) => it.x > label.x && /^\d{1,2}:\d{1,2}$/.test(it.str));
    const golRow = rows[i + 1]?.items.some((it) => /^Goleador\/Min/.test(it.str)) ? rows[i + 1] : null;
    const penRow = rows.slice(i + 1, i + 4).find((x) => x.items.some((it) => /^PEN\/AG/.test(it.str)));
    cols.forEach((col, c) => {
      const desde = col.x - 6;
      const hasta = cols[c + 1] ? cols[c + 1].x - 6 : Infinity;
      const enCol = (row) => (row ? row.items.filter((it) => it.x >= desde && it.x < hasta && !/^(Goleador\/Min|PEN\/AG)$/.test(it.str)) : []);
      const [a, b] = col.str.split(':').map(Number);
      const anotoLocal = a > prev[0];
      prev = [a, b];
      const anotoPenarol = anotoLocal === (penarolSide === 'local');
      const esAutogol = enCol(penRow).some((it) => /\bAG\b/.test(it.str));
      if (!anotoPenarol) return;
      if (esAutogol) {
        autogolesAFavor++;
        return;
      }
      const m = enCol(golRow).map((it) => it.str).join(' ').match(/^(\d{1,2})\s+(\d{1,3}(?:\s*\+\s*\d{1,2})?)/);
      if (!m) {
        warnings.push(`No se pudo leer el goleador del ${col.str}.`);
        return;
      }
      goles.push({ minuto: parseMinuto(m[2], { conApostrofe: false }), dorsal: Number(m[1]), detalle: `${m[1]} ${byDorsal.get(Number(m[1]))?.nombre || ''}`.trim() });
    });
  });

  // ── Tarjetas: párrafo "PEÑAROL: 8 PEREIRA, ESTEBAN (28 - Conducta antideportiva); RIVAL: …"
  const ETIQUETA_RE = /^(Tarjetas|Expulsiones|Advertencias|Resumen del partido|PEN:)/;
  // El párrafo puede venir justificado, con cada palabra en un fragmento ("Tarjetas" + "amarillas:"),
  // así que la etiqueta se busca en el texto del renglón y no en un fragmento suelto
  const parrafo = (re) => {
    const idx = rows.findIndex((r) => re.test(rowText(r)));
    if (idx === -1) return '';
    const partes = [];
    for (let i = idx; i < rows.length; i++) {
      if (i > idx && ETIQUETA_RE.test(rowText(rows[i]))) break;
      partes.push(rowText(rows[i]));
    }
    return partes.join(' ').replace(re, '').replace(/\s+/g, ' ').trim();
  };
  const parseTarjetas = (texto, tipo) => {
    const out = [];
    let equipoActual = null;
    texto.split(';').forEach((entrada) => {
      const m = entrada.match(/^\s*(?:([^:();]+?):\s*)?(\d{1,2})\s+([^()]+?)\s*\(([^)]*)\)/);
      if (!m) return;
      if (m[1]) equipoActual = m[1];
      if (!PENAROL_RE.test(equipoActual || '')) return;
      const minutoStr = m[4].split(' - ')[0].trim();
      out.push({ minuto: parseMinuto(minutoStr, { conApostrofe: false }), dorsal: Number(m[2]), detalle: `${m[2]} ${m[3]}`, tipo });
    });
    return out;
  };
  const tarjetas = [
    ...parseTarjetas(parrafo(/^Tarjetas\s+amarillas:\s*/i), 'amarilla'),
    ...parseTarjetas(parrafo(/^Tarjetas\s+rojas:\s*/i), 'roja'),
  ];

  return cerrar({
    formato: 'itext',
    torneo,
    local,
    visitante,
    escenario,
    golesLocal,
    golesVisitante,
    categoriaEdad,
    fecha,
    numeroFecha,
    arbitro: oficial(/^[ÁA]rbitro:\s*(.*)$/),
    primerLinea: oficial(/^1°?\s*asistente:\s*(.*)$/i),
    segundaLinea: oficial(/^2°?\s*asistente:\s*(.*)$/i),
    titulares,
    suplentes,
    cambios,
    tarjetas,
    goles,
    warnings,
  }, { autogolesAFavor });
}
