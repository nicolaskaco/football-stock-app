import { useState } from 'react';
import { FileUp, X, AlertTriangle, Loader2 } from 'lucide-react';
import { parseCometReport } from '../utils/cometReportParser';
import { categoriaDelTorneo, filasParaRevisar } from '../utils/cometApply';
import { CometMatchTable } from './CometMatchTable';

/**
 * Vista previa de un informe COMET: lee el PDF, cruza jugadores y deja
 * corregir los matches antes de volcarlos en el PartidoForm.
 */
export const CometImportPanel = ({ categoria, players = [], fechaJornada = null, onApply, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [rows, setRows] = useState([]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await parseCometReport(file);
      setParsed(result);
      setRows(filasParaRevisar(result, players, categoria));
    } catch (err) {
      console.error('Error leyendo informe COMET:', err);
      setParsed(null);
      setRows([]);
      setError(err.message || 'No se pudo leer el PDF.');
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (i, patch) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // Avisos que dependen del partido abierto, no del PDF
  const avisos = parsed ? [...parsed.warnings] : [];
  if (parsed) {
    const catTorneo = categoriaDelTorneo(parsed.torneo);
    if (catTorneo && catTorneo !== categoria) avisos.unshift(`El informe es de ${catTorneo} (${parsed.torneo}) y este partido es de ${categoria}.`);
    if (parsed.fecha && fechaJornada && parsed.fecha !== fechaJornada.slice(0, 10)) {
      avisos.push(`La fecha del informe (${parsed.fecha.split('-').reverse().join('/')}) no coincide con la de la jornada.`);
    }
    const sinMatch = rows.filter((r) => !r.player_id).length;
    if (sinMatch > 0) avisos.push(`${sinMatch} jugador${sinMatch === 1 ? '' : 'es'} sin asignar: van a quedar vacíos en la planilla.`);
  }

  const golesPenarol = parsed ? (parsed.escenario === 'Local' ? parsed.golesLocal : parsed.golesVisitante) : null;
  const golesRival = parsed ? (parsed.escenario === 'Local' ? parsed.golesVisitante : parsed.golesLocal) : null;
  const dorsalNombre = (dorsal) => rows.find((r) => r.dorsal === dorsal)?.nombre || `#${dorsal}`;

  return (
    <div className="border-2 border-dashed border-yellow-400 rounded-lg p-4 space-y-4 bg-yellow-50 dark:bg-yellow-900/10">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-800">Importar planilla COMET</h3>
        <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Cerrar">
          <X className="w-4 h-4" />
        </button>
      </div>

      <label className="flex items-center justify-center gap-2 px-4 py-3 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
        {loading ? 'Leyendo PDF…' : parsed ? 'Elegir otro PDF' : 'Elegí el PDF del informe del partido'}
        <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFile} disabled={loading} />
      </label>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 rounded p-2">{error}</p>
      )}

      {parsed && (
        <>
          {/* Resumen del partido */}
          <div className="bg-white rounded-lg p-3 text-sm space-y-1">
            <p className="font-semibold text-gray-800">
              {parsed.local} {parsed.golesLocal} – {parsed.golesVisitante} {parsed.visitante}
            </p>
            <p className="text-gray-600">
              Peñarol {golesPenarol} – {golesRival} Rival · {parsed.escenario}
              {parsed.torneo && <> · {parsed.torneo}</>}
            </p>
            {parsed.arbitro && (
              <p className="text-gray-600">
                Árbitro: {parsed.arbitro}
                {parsed.primerLinea && <> · 1ª: {parsed.primerLinea}</>}
                {parsed.segundaLinea && <> · 2ª: {parsed.segundaLinea}</>}
              </p>
            )}
            {parsed.cambios.length > 0 && (
              <p className="text-gray-600">
                Cambios: {parsed.cambios.map((c) => `${c.minuto}' ${dorsalNombre(c.sale).split(',')[0]} → ${dorsalNombre(c.entra).split(',')[0]}`).join(' · ')}
              </p>
            )}
            {(parsed.tarjetas.length > 0 || parsed.goles.length > 0) && (
              <p className="text-gray-600">
                {parsed.goles.map((g) => `⚽ ${g.minuto}' ${dorsalNombre(g.dorsal).split(',')[0]}`).join(' · ')}
                {parsed.goles.length > 0 && parsed.tarjetas.length > 0 && ' · '}
                {parsed.tarjetas.map((t) => `${t.tipo === 'roja' ? '🟥' : '🟨'} ${t.minuto}' ${dorsalNombre(t.dorsal).split(',')[0]}`).join(' · ')}
              </p>
            )}
          </div>

          {avisos.length > 0 && (
            <ul className="text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200 rounded p-2 space-y-1">
              {avisos.map((a, i) => (
                <li key={i} className="flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{a}</li>
              ))}
            </ul>
          )}

          <CometMatchTable rows={rows} players={players} categoria={categoria} onUpdateRow={updateRow} />

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => onApply({ ...parsed, rows })}
              className="flex-1 bg-black text-yellow-400 py-2 rounded-lg font-semibold hover:bg-gray-900"
            >
              Aplicar a la planilla
            </button>
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Se reemplazan titulares, suplentes, minutos de cambios y tarjetas. El partido no se guarda hasta que toques “Guardar Partido”.
          </p>
        </>
      )}
    </div>
  );
};
