import { useState } from 'react';
import { FileUp, AlertTriangle, Loader2, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { CATEGORIAS_PARTIDO } from '../utils/constants';
import { parseCometReport } from '../utils/cometReportParser';
import { categoriaDeArchivo, categoriaDelTorneo, filasParaRevisar, aplicarComet } from '../utils/cometApply';
import { initialFormData, initialTitulares, initialEventos, armarPartidoParaGuardar } from '../utils/partidoFormState';
import { getSuspensionMap } from '../utils/suspensions';
import { fechaPartido, fechaPartidoDefault } from '../utils/dateUtils';
import { CometMatchTable } from './CometMatchTable';

const fmtFecha = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

/**
 * Importación de todos los informes COMET de una jornada de una vez. Cada PDF va al partido
 * de su categoría (la del nombre del archivo; si no tiene, la del torneo del informe).
 * Se revisan los jugadores de cada uno y se guardan juntos los partidos marcados.
 *
 * onSave (async) recibe [{ partido, archivo, data, titularesData, suplentesData, eventosData, cometIds }]
 */
export const CometBulkImportPanel = ({ jornada, jornadas = [], players = [], onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // { key, archivo, parsed, error, categoria, rows, incluir (null = automático), abierto }
  const [items, setItems] = useState([]);

  const partidoDe = (categoria) => (jornada.partidos || []).find((p) => p.categoria === categoria) || null;

  const handleFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (files.length === 0) return;
    setLoading(true);
    const nuevos = [];
    for (const file of files) {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      try {
        const parsed = await parseCometReport(file);
        const categoria = categoriaDeArchivo(file.name) || categoriaDelTorneo(parsed.torneo) || '';
        nuevos.push({
          key, archivo: file.name, parsed, error: null, categoria,
          rows: categoria ? filasParaRevisar(parsed, players, categoria) : [],
          incluir: null, abierto: false,
        });
      } catch (err) {
        console.error('Error leyendo informe COMET:', err);
        nuevos.push({ key, archivo: file.name, parsed: null, error: err.message || 'No se pudo leer el PDF.', categoria: '', rows: [], incluir: false, abierto: false });
      }
    }
    // Volver a elegir un archivo ya cargado lo reemplaza
    setItems((prev) => [...prev.filter((it) => !nuevos.some((n) => n.key === it.key)), ...nuevos]);
    setLoading(false);
  };

  const updateItem = (key, patch) => setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const updateRow = (key) => (i, patch) => setItems((prev) => prev.map((it) => (
    it.key === key ? { ...it, rows: it.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) } : it
  )));
  const changeCategoria = (it, categoria) => updateItem(it.key, {
    categoria,
    rows: categoria && it.parsed ? filasParaRevisar(it.parsed, players, categoria) : [],
    incluir: null,
  });
  const quitar = (key) => setItems((prev) => prev.filter((it) => it.key !== key));

  // Estado base del partido + informe aplicado (misma lógica que el import individual)
  const preparar = (it, partido) => {
    const base = {
      formData: initialFormData(partido, fechaPartidoDefault(jornada.fecha, it.categoria)),
      titulares: initialTitulares(partido),
      eventos: initialEventos(partido),
    };
    const suspendedMap = getSuspensionMap(jornadas, jornada.id, it.categoria, { ajustes: partido.partido_suspension_ajustes || [] });
    return aplicarComet({ ...it.parsed, rows: it.rows }, { partido, categoria: it.categoria, ...base, jornadas, players, suspendedMap });
  };

  const conteoCategoria = items.reduce((acc, it) => (it.categoria ? { ...acc, [it.categoria]: (acc[it.categoria] || 0) + 1 } : acc), {});

  const evaluados = items.map((it) => {
    const partido = it.categoria ? partidoDe(it.categoria) : null;
    const bloqueos = [];
    const avisos = [];
    if (it.error) bloqueos.push(it.error);
    else if (!it.categoria) bloqueos.push('No encontré la categoría en el nombre del archivo ni en el informe: elegila.');
    else if (!partido) bloqueos.push(`Esta jornada no tiene partido de ${it.categoria}.`);
    if (it.categoria && conteoCategoria[it.categoria] > 1) bloqueos.push(`Hay más de un informe para ${it.categoria}: quitá el que sobra.`);
    const sinAsignar = it.rows.filter((r) => !r.player_id).length;
    if (sinAsignar > 0) bloqueos.push(`${sinAsignar} jugador${sinAsignar === 1 ? '' : 'es'} sin asignar: elegilos en la tabla o importalo desde "Editar" en ese partido.`);
    const dudosos = it.rows.filter((r) => r.player_id && r.status === 'dudoso').length;

    if (it.parsed) {
      const catArchivo = categoriaDeArchivo(it.archivo);
      const catTorneo = categoriaDelTorneo(it.parsed.torneo);
      if (catArchivo && catTorneo && catArchivo !== catTorneo) {
        avisos.push(`El archivo dice ${catArchivo} pero el informe es de ${catTorneo} (${it.parsed.torneo}).`);
      }
      avisos.push(...it.parsed.warnings);
    }
    if (partido) {
      const fecha = fechaPartido(partido, jornada);
      if (it.parsed?.fecha && fecha && it.parsed.fecha !== fecha) {
        avisos.push(`La fecha del informe (${fmtFecha(it.parsed.fecha)}) no coincide con la del partido (${fmtFecha(fecha)}).`);
      }
      if ((partido.partido_players || []).length > 0) avisos.push('Este partido ya tiene planilla cargada: se va a reemplazar.');
    }
    if (dudosos > 0) avisos.push(`${dudosos} match${dudosos === 1 ? '' : 'es'} para revisar.`);

    const puede = bloqueos.length === 0;
    let preview = null;
    if (puede) {
      preview = preparar(it, partido);
      avisos.push(...preview.avisos);
    }
    const incluido = puede && (it.incluir ?? dudosos === 0);
    return { it, partido, bloqueos, avisos, puede, incluido, preview, dudosos };
  });

  const aGuardar = evaluados.filter((e) => e.incluido);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(aGuardar.map(({ it, partido, preview }) => ({
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
    })));
    setIsSaving(false);
  };

  const ordenados = [...evaluados].sort((a, b) => CATEGORIAS_PARTIDO.indexOf(a.it.categoria) - CATEGORIAS_PARTIDO.indexOf(b.it.categoria));

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Elegí los PDF del informe COMET de esta jornada (podés elegir varios a la vez). Cada uno va al partido de la categoría que dice el nombre del archivo.
      </p>

      <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-yellow-400 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/20 text-sm text-gray-700 dark:text-gray-200">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
        {loading ? 'Leyendo PDFs…' : items.length ? 'Agregar más PDFs' : 'Elegí los PDF de los informes'}
        <input type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={handleFiles} disabled={loading || isSaving} />
      </label>

      {ordenados.map(({ it, bloqueos, avisos, puede, incluido, preview, dudosos }) => {
        const golesCap = it.parsed ? (it.parsed.escenario === 'Local' ? it.parsed.golesLocal : it.parsed.golesVisitante) : null;
        const golesRival = it.parsed ? (it.parsed.escenario === 'Local' ? it.parsed.golesVisitante : it.parsed.golesLocal) : null;
        const asignados = it.rows.filter((r) => r.player_id).length;
        return (
          <div key={it.key} className={`border rounded-lg overflow-hidden dark:border-gray-700 ${incluido ? 'border-green-400 dark:border-green-700' : ''}`}>
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800">
              <input
                type="checkbox"
                checked={incluido}
                disabled={!puede || isSaving}
                onChange={(e) => updateItem(it.key, { incluir: e.target.checked })}
                className="w-4 h-4 accent-yellow-400 cursor-pointer"
                title={puede ? 'Incluir al guardar' : 'Resolvé los problemas para poder incluirlo'}
              />
              <select
                value={it.categoria}
                onChange={(e) => changeCategoria(it, e.target.value)}
                disabled={!it.parsed || isSaving}
                className="px-2 py-1 border rounded text-sm font-bold dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">Categoría…</option>
                {CATEGORIAS_PARTIDO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate min-w-0 flex-1" title={it.archivo}>{it.archivo}</span>
              {it.parsed && (
                <span className="px-2 py-0.5 rounded-full text-sm font-bold bg-gray-900 text-yellow-400">
                  {golesCap} - {golesRival}
                </span>
              )}
              {it.parsed && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {asignados}/{it.rows.length} jugadores{dudosos > 0 ? ` · ${dudosos} a revisar` : ''}
                </span>
              )}
              {incluido && <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />}
              <button type="button" onClick={() => quitar(it.key)} disabled={isSaving} className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 px-1">
                Quitar
              </button>
            </div>

            {(bloqueos.length > 0 || avisos.length > 0) && (
              <ul className="px-3 py-2 space-y-1 text-sm">
                {bloqueos.map((b, i) => (
                  <li key={`b${i}`} className="flex gap-2 text-red-700 dark:text-red-300"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{b}</li>
                ))}
                {avisos.map((a, i) => (
                  <li key={`a${i}`} className="flex gap-2 text-amber-800 dark:text-amber-200"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{a}</li>
                ))}
              </ul>
            )}

            {it.parsed && it.categoria && (
              <div className="px-3 pb-3">
                <button
                  type="button"
                  onClick={() => updateItem(it.key, { abierto: !it.abierto })}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  {it.abierto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {it.abierto ? 'Ocultar jugadores' : 'Revisar jugadores'}
                </button>
                {it.abierto && (
                  <div className="mt-2 space-y-2">
                    {preview && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Titulares: {preview.titulares.filter((t) => t.player_id).map((t) => {
                          const p = players.find((x) => x.id === t.player_id);
                          return `${p?.name_visual || p?.name || '—'}${t.posicion ? ` (${t.posicion})` : ''}`;
                        }).join(' · ')}
                      </p>
                    )}
                    <CometMatchTable rows={it.rows} players={players} categoria={it.categoria} onUpdateRow={updateRow(it.key)} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={aGuardar.length === 0 || isSaving || loading}
          className="flex-1 bg-black text-yellow-400 py-2 rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Guardando…' : `Guardar ${aGuardar.length} partido${aGuardar.length === 1 ? '' : 's'}`}
        </button>
        <button type="button" onClick={onCancel} disabled={isSaving} className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-800">
          Cancelar
        </button>
      </div>
      {items.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Se reemplazan titulares, suplentes, minutos, tarjetas, resultado y árbitros de cada partido marcado. Las posiciones se completan solas: revisalas después desde "Editar".
        </p>
      )}
    </div>
  );
};
