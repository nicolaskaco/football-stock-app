import { parseCometReport } from './cometReportParser';
import { categoriaDeArchivo, categoriaDelTorneo, filasParaRevisar, aplicarComet } from './cometApply';
import { initialFormData, initialTitulares, initialEventos, armarPartidoParaGuardar } from './partidoFormState';
import { getSuspensionMap } from './suspensions';
import { fechaPartido, fechaPartidoDefault } from './dateUtils';

/**
 * Varios informes COMET contra los partidos de una jornada: lectura, evaluación y armado
 * de lo que se guarda. Lo usan CometBulkImportPanel (revisión) y CometAutoImportButton
 * (carga automática).
 */

const fmtFecha = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

/** Nombre del rival según el informe (el equipo que no es Peñarol). */
export const rivalDelInforme = (parsed) => (parsed.escenario === 'Local' ? parsed.visitante : parsed.local);

/**
 * Lee un PDF y lo deja listo para evaluar.
 * @returns item { key, archivo, parsed, error, categoria, rows, incluir (null = automático), abierto }
 */
export async function leerInforme(file, players) {
  const key = `${file.name}-${file.size}-${file.lastModified}`;
  try {
    const parsed = await parseCometReport(file);
    const categoria = categoriaDeArchivo(file.name) || categoriaDelTorneo(parsed.torneo) || '';
    return {
      key, archivo: file.name, parsed, error: null, categoria,
      rows: categoria ? filasParaRevisar(parsed, players, categoria) : [],
      incluir: null, abierto: false,
    };
  } catch (err) {
    console.error('Error leyendo informe COMET:', err);
    return { key, archivo: file.name, parsed: null, error: err.message || 'No se pudo leer el PDF.', categoria: '', rows: [], incluir: false, abierto: false };
  }
}

/**
 * Evalúa cada informe contra su partido.
 * - bloqueos: impiden guardarlo.
 * - avisos: todo lo que se muestra (incluye la sugerencia de posiciones).
 * - motivosRevision: lo que impide guardarlo sin que alguien lo mire (carga automática).
 * - yaCargado: el partido ya tiene planilla.
 */
export function evaluarInformes(items, { jornada, jornadas = [], players = [] }) {
  const partidoDe = (categoria) => (jornada.partidos || []).find((p) => p.categoria === categoria) || null;
  const conteoCategoria = items.reduce((acc, it) => (it.categoria ? { ...acc, [it.categoria]: (acc[it.categoria] || 0) + 1 } : acc), {});

  return items.map((it) => {
    const partido = it.categoria ? partidoDe(it.categoria) : null;
    const bloqueos = [];
    const avisos = [];
    const motivosRevision = [];
    if (it.error) bloqueos.push(it.error);
    else if (!it.categoria) bloqueos.push('No encontré la categoría en el nombre del archivo ni en el informe: elegila.');
    else if (!partido) bloqueos.push(`Esta jornada no tiene partido de ${it.categoria}.`);
    if (it.categoria && conteoCategoria[it.categoria] > 1) bloqueos.push(`Hay más de un informe para ${it.categoria}: quitá el que sobra.`);
    const sinAsignar = it.rows.filter((r) => !r.player_id).length;
    if (sinAsignar > 0) bloqueos.push(`${sinAsignar} jugador${sinAsignar === 1 ? '' : 'es'} sin asignar: elegilos en la tabla o importalo desde "Editar" en ese partido.`);
    const dudosos = it.rows.filter((r) => r.player_id && r.status === 'dudoso').length;

    const revisar = (msg) => { avisos.push(msg); motivosRevision.push(msg); };
    if (it.parsed) {
      const catArchivo = categoriaDeArchivo(it.archivo);
      const catTorneo = categoriaDelTorneo(it.parsed.torneo);
      if (catArchivo && catTorneo && catArchivo !== catTorneo) {
        revisar(`El archivo dice ${catArchivo} pero el informe es de ${catTorneo} (${it.parsed.torneo}).`);
      }
      it.parsed.warnings.forEach(revisar);
    }
    const yaCargado = !!partido && (partido.partido_players || []).length > 0;
    if (partido) {
      const fecha = fechaPartido(partido, jornada);
      if (it.parsed?.fecha && fecha && it.parsed.fecha !== fecha) {
        revisar(`La fecha del informe (${fmtFecha(it.parsed.fecha)}) no coincide con la del partido (${fmtFecha(fecha)}).`);
      }
      if (yaCargado) avisos.push('Este partido ya tiene planilla cargada: se va a reemplazar.');
    }
    if (dudosos > 0) revisar(`${dudosos} match${dudosos === 1 ? '' : 'es'} para revisar.`);

    const puede = bloqueos.length === 0;
    let preview = null;
    if (puede) {
      const base = {
        formData: initialFormData(partido, fechaPartidoDefault(jornada.fecha, it.categoria)),
        titulares: initialTitulares(partido),
        eventos: initialEventos(partido),
      };
      const suspendedMap = getSuspensionMap(jornadas, jornada.id, it.categoria, { ajustes: partido.partido_suspension_ajustes || [] });
      preview = aplicarComet({ ...it.parsed, rows: it.rows }, { partido, categoria: it.categoria, ...base, jornadas, players, suspendedMap });
      avisos.push(...preview.avisos);
      if (preview.suspendidosQueJugaron.length > 0) motivosRevision.push('Jugó un jugador que figura como suspendido.');
      if (preview.suplentesDeMas > 0) motivosRevision.push(`El informe trae ${preview.suplentesDeMas} suplente${preview.suplentesDeMas === 1 ? '' : 's'} de más.`);
    }
    motivosRevision.unshift(...bloqueos);
    const incluido = puede && (it.incluir ?? dudosos === 0);
    return { it, partido, bloqueos, avisos, motivosRevision, puede, incluido, preview, dudosos, yaCargado };
  });
}

/** Argumentos de guardado (ver guardarImportComet) de un informe evaluado que se puede guardar. */
export const armarGuardado = ({ it, partido, preview }, players) => ({
  partido,
  archivo: it.archivo,
  ...armarPartidoParaGuardar({
    formData: preview.formData,
    titulares: preview.titulares,
    suplentes: preview.suplentes,
    eventos: preview.eventos,
    players,
    categoria: it.categoria,
  }),
});
