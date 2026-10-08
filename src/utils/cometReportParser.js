/**
 * Parser del "Informe del partido" que exporta COMET (AUF) en PDF.
 *
 * El PDF tiene dos columnas (local a la izquierda, visitante a la derecha) y
 * secciones con título centrado. Se trabaja con los fragmentos de texto y su
 * posición (x, y) en vez de con texto plano, porque copiar el texto de un PDF
 * a dos columnas mezcla los equipos.
 *
 * `extractPdfPages` es lo único que depende de pdfjs (y del navegador);
 * `parseCometPages` es puro, así se puede probar con cualquier extracción.
 */

const SECCIONES = [
  { re: /^OFICIALES DE PARTIDO$/, key: 'oficiales' },
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
    const row = rows.find((r) => Math.abs(r.y - it.y) <= ROW_TOLERANCE);
    if (row) row.items.push(it);
    else rows.push({ y: it.y, items: [it] });
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

/** "VICENTE CARRERAS, JOAQUIN SANTIAGO" → "Vicente Carreras, Joaquin Santiago" */
export function titleCase(s) {
  return (s || '').toLowerCase().replace(/(^|[\s,'-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
}

const parseMinuto = (s) => {
  const m = String(s).match(/^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?'$/);
  return m ? Number(m[1]) + (m[2] ? Number(m[2]) : 0) : null;
};

/** Renglón de alineación: dorsal · nombre · [AR|CP] · COMET ID */
function parsePlayerRow(row) {
  const items = row.items.filter((it) => !/^(AR|CP)$/.test(it.str.trim()));
  if (items.length < 3) return null;
  const dorsal = items[0].str.trim();
  const cometId = items[items.length - 1].str.trim();
  if (!/^\d{1,2}$/.test(dorsal) || !/^\d{5,9}$/.test(cometId)) return null;
  const nombre = joinItems(items.slice(1, -1));
  if (!nombre) return null;
  return { dorsal: Number(dorsal), nombre, cometId };
}

// ─── Parser ─────────────────────────────────────────────────────────────────

/**
 * @param {Array<{width:number, items:Array<{str,x,y,w}>}>} pages
 * @returns datos del partido; jugadores, cambios y tarjetas solo de Peñarol.
 */
export function parseCometPages(pages) {
  if (!pages?.length) throw new Error('El PDF no tiene páginas.');
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

  // ── Encabezado: "ALBION 0:0 PEÑAROL"
  const header = inSection('encabezado').filter((it) => it.page === 0);
  const scoreItem = header.find((it) => /^\d{1,2}\s*:\s*\d{1,2}$/.test(it.str));
  if (!scoreItem) throw new Error('No se encontró el marcador. ¿Es un informe de partido de COMET?');
  const sameLine = header.filter((it) => Math.abs(it.y - scoreItem.y) <= 6 && it !== scoreItem && !/^(N\/A|J|AR)$/.test(it.str));
  const local = joinItems(sameLine.filter((it) => it.x < scoreItem.x));
  const visitante = joinItems(sameLine.filter((it) => it.x > scoreItem.x));
  const [golesLocal, golesVisitante] = scoreItem.str.split(':').map((n) => Number(n.trim()));

  const penarolSide = PENAROL_RE.test(local) ? 'local' : PENAROL_RE.test(visitante) ? 'visitante' : null;
  if (!penarolSide) throw new Error(`No se encontró a Peñarol en el partido (${local} vs ${visitante}).`);
  const escenario = penarolSide === 'local' ? 'Local' : 'Visitante';
  const isPenarol = (it) => side(it) === penarolSide;

  // ── Datos sueltos del encabezado (etiqueta "X:" y valor a la derecha)
  const headerValue = (labelRe) => {
    const label = header.find((it) => labelRe.test(it.str));
    if (!label) return null;
    const value = header
      .filter((it) => Math.abs(it.y - label.y) <= ROW_TOLERANCE && it.x > label.x && it.x - label.x < it.width / 2)
      .sort((a, b) => a.x - b.x)[0];
    return value?.str || null;
  };
  const fechaRaw = headerValue(/^Fecha\/Hora:?$/);
  const fechaMatch = fechaRaw?.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  const fecha = fechaMatch ? `${fechaMatch[3]}-${fechaMatch[2]}-${fechaMatch[1]}` : null;
  const categoriaEdad = headerValue(/^Categor[íi]a de edad:?$/);
  const torneo = header.find((it) => /^TORNEO\b/i.test(it.str))?.str || null;

  // ── Oficiales: "Árbitro" + ": APELLIDO, NOMBRE"
  const oficiales = {};
  groupRows(inSection('oficiales')).forEach((row) => {
    row.items.forEach((it, i) => {
      const value = row.items[i + 1];
      if (!value || !value.str.startsWith(':')) return;
      const nombre = titleCase(value.str.replace(/^:\s*/, ''));
      if (/^[ÁA]rbitro$/i.test(it.str)) oficiales.arbitro = nombre;
      else if (/^1/.test(it.str)) oficiales.primerLinea = nombre;
      else if (/^2/.test(it.str)) oficiales.segundaLinea = nombre;
    });
  });

  // ── Titulares y banco
  const parsePlayers = (key) => groupRows(inSection(key).filter(isPenarol)).map(parsePlayerRow).filter(Boolean);
  const titulares = parsePlayers('titulares');
  const suplentes = parsePlayers('suplentes');
  if (titulares.length === 0) throw new Error('No se encontró la alineación de Peñarol en el informe.');
  if (titulares.length !== 11) warnings.push(`Se leyeron ${titulares.length} titulares (se esperaban 11).`);

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
  const parseIncidencias = (key) => {
    const items = inSection(key).filter(isPenarol);
    const out = [];
    // A veces COMET no tiene el minuto y pone una sigla ("AM"): la tarjeta va sin minuto
    const isMarker = (it) => parseMinuto(it.str) != null || /^[A-Z]{1,3}$/.test(it.str);
    items.filter(isMarker).forEach((minItem) => {
      const texto = items
        .filter((it) => it.page === minItem.page && Math.abs(it.y - minItem.y) <= 8 && it.x > minItem.x && /^\d{1,2}\b/.test(it.str))
        .sort((a, b) => b.y - a.y)[0];
      const m = texto?.str.match(/^(\d{1,2})\b/);
      if (!m) {
        warnings.push(`No se pudo leer el jugador de la incidencia "${minItem.str}".`);
        return;
      }
      out.push({ minuto: parseMinuto(minItem.str), dorsal: Number(m[1]), detalle: texto.str });
    });
    return out;
  };
  const tarjetas = [
    ...parseIncidencias('amarillas').map((t) => ({ ...t, tipo: 'amarilla' })),
    ...parseIncidencias('rojas').map((t) => ({ ...t, tipo: 'roja' })),
  ];
  const goles = parseIncidencias('goles').filter((g) => !/en contra/i.test(g.detalle));

  const golesPenarol = penarolSide === 'local' ? golesLocal : golesVisitante;
  if (goles.length !== golesPenarol) {
    warnings.push(`El marcador dice ${golesPenarol} gol${golesPenarol === 1 ? '' : 'es'} de Peñarol y se leyeron ${goles.length} del detalle. Revisá los goles a mano.`);
  }

  return {
    torneo,
    local,
    visitante,
    escenario,
    golesLocal,
    golesVisitante,
    categoriaEdad,
    fecha,
    arbitro: oficiales.arbitro || null,
    primerLinea: oficiales.primerLinea || null,
    segundaLinea: oficiales.segundaLinea || null,
    titulares,
    suplentes,
    cambios,
    tarjetas,
    goles,
    warnings,
  };
}
