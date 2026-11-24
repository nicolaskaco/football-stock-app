import { useState } from 'react';
import { History, Loader2, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import { CATEGORIAS_PARTIDO } from '../utils/constants';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/dateUtils';
import { faseLabel } from '../utils/jornadas';
import { leerInforme, evaluarInformes, armarGuardado } from '../utils/cometLote';
import { agruparPorJornada, diferenciasConPlanilla, clasificarHistorico, textoMotivo } from '../utils/cometHistorico';
import { guardarImportComet } from '../utils/cometGuardar';
import { CometBulkImportPanel } from './CometBulkImportPanel';
import { DiferenciasComet } from './ui/DiferenciasComet';

// Carpetas de categorías que no son de la app (1era, 3era…): ni se leen
const CARPETA_AJENA_RE = /^([123])\s*(era|ra|da|a|ª|º)?$|^(primera|segunda|tercera)$/i;

const porCategoria = (a, b) => CATEGORIAS_PARTIDO.indexOf(a) - CATEGORIAS_PARTIDO.indexOf(b);
const plural = (n, uno, varios = `${uno}s`) => `${n} ${n === 1 ? uno : varios}`;
const tituloJornada = (j) => `${faseLabel(j)} · J${j.numero_jornada} · ${j.rivales?.name || 'Rival'} · ${formatDate(j.fecha)}`;

const ResumenHistorico = ({ res, onRevisar, onCerrar }) => {
  const guardados = res.grupos.reduce((n, g) => n + g.guardados.length, 0);
  const pendientes = res.grupos.filter((g) => g.revision.length > 0 && !g.resuelta);
  return (
    <div className="space-y-4 text-sm">
      <p className="text-gray-600 dark:text-gray-300">
        {plural(res.leidos, 'informe leído', 'informes leídos')} · {plural(guardados, 'partido guardado', 'partidos guardados')} · {plural(pendientes.length, 'jornada para revisar', 'jornadas para revisar')}
        {res.omitidos > 0 && <> · {plural(res.omitidos, 'PDF de otras categorías', 'PDF de otras categorías')} (1era, 3era) sin leer</>}
      </p>

      {res.grupos.map((g) => (
        <div key={g.jornada.id} className="border rounded-lg dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
            <span className="font-semibold text-gray-800 dark:text-gray-100 flex-1 min-w-0">{tituloJornada(g.jornada)}</span>
            {g.revision.length > 0 && (g.resuelta ? (
              <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400"><CheckCircle2 className="w-4 h-4" />Revisada</span>
            ) : (
              <button type="button" onClick={() => onRevisar(g)} className="px-3 py-1 rounded bg-yellow-400 text-black text-xs font-semibold hover:bg-yellow-300">
                Revisar {g.revision.length}
              </button>
            ))}
          </div>
          <ul className="px-3 py-2 space-y-1.5">
            {g.guardados.map((x) => (
              <li key={`g${x.categoria}`} className="flex gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span><span className="font-semibold">{x.categoria}</span>: guardado ({x.detalle})</span>
              </li>
            ))}
            {g.completos.map((cat) => (
              <li key={`c${cat}`} className="flex gap-2 text-gray-500 dark:text-gray-400">
                <MinusCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span><span className="font-semibold">{cat}</span>: ya tenía minutos y coincide con el informe (no se tocó)</span>
              </li>
            ))}
            {g.revision.map((r) => (
              <li key={`r${r.it.key}`} className={`flex gap-2 ${g.resuelta ? 'text-gray-400 dark:text-gray-500' : 'text-amber-800 dark:text-amber-200'}`}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <p><span className="font-semibold">{r.it.categoria}</span>: {r.motivos.length > 0 ? r.motivos.join(' ') : 'Hay diferencias con lo cargado.'}</p>
                  {r.diff.items.length > 0 && <DiferenciasComet items={r.diff.items} />}
                </div>
              </li>
            ))}
            {g.error && (
              <li className="flex gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                Error al guardar {g.error}. Volvé a importar la carpeta para reintentar.
              </li>
            )}
          </ul>
        </div>
      ))}

      {res.sinAsignar.length > 0 && (
        <div className="space-y-1 text-gray-600 dark:text-gray-300">
          <p className="flex gap-2 font-semibold"><MinusCircle className="w-4 h-4 shrink-0 mt-0.5" />Sin partido ({res.sinAsignar.length})</p>
          <ul className="pl-6 list-disc">
            {res.sinAsignar.map(({ item, motivo }) => (
              <li key={item.key}>
                <span className="font-semibold">{item.ruta}</span>
                {item.parsed && <> ({item.parsed.local} {item.parsed.golesLocal}-{item.parsed.golesVisitante} {item.parsed.visitante}, {item.parsed.fase || 'sin fase'} F{item.parsed.numeroFecha ?? '—'}, {formatDate(item.parsed.fecha)})</>}
                : {item.error || textoMotivo(motivo)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={onCerrar} className="w-full bg-black text-yellow-400 py-2 rounded-lg font-semibold hover:bg-gray-900">
        Listo
      </button>
    </div>
  );
};

/**
 * "Importar histórico": elegís una carpeta de informes COMET (una categoría o la carpeta con
 * todas) y cada PDF va a su jornada por rival, fase y N° de fecha. Se guardan solos los partidos
 * sin planilla y los que coinciden con lo cargado (suman cambios y minutos); los que tienen
 * diferencias quedan para revisar con las diferencias marcadas.
 */
export const CometHistoricoImportButton = ({ players = [], currentUser, setShowModal, onDataChange, onFormDirtyChange }) => {
  const [progreso, setProgreso] = useState(null);
  const { showToast } = useToast();
  const { execute } = useMutation((msg) => showToast(msg, 'error'));

  const mostrarResumen = (res) => {
    onFormDirtyChange?.(false);
    setShowModal({
      title: 'Importar histórico COMET',
      content: <ResumenHistorico res={res} onRevisar={(g) => revisar(res, g)} onCerrar={() => setShowModal(null)} />,
    });
  };

  const revisar = (res, grupo) => {
    const diferencias = Object.fromEntries(grupo.revision.map((r) => [r.it.key, r.diff.items]));
    const marcarResuelta = () => ({ ...res, grupos: res.grupos.map((g) => (g === grupo ? { ...g, resuelta: true } : g)) });
    const onSave = (lista) => execute(async () => {
      let guardados = [];
      try {
        guardados = await guardarImportComet(lista, { jornada: grupo.jornada, currentUser, historico: true });
      } catch (err) {
        guardados = err.guardados || [];
        if (guardados.length > 0) {
          // Se cortó a la mitad: se vuelve a abrir solo con los que faltan
          await onDataChange('jornadas', 'players');
          revisar(res, { ...grupo, revision: grupo.revision.filter((r) => !guardados.includes(r.it.categoria)) });
        }
        throw err;
      }
      await onDataChange('jornadas', 'players');
      showToast(`${plural(guardados.length, 'partido aprobado', 'partidos aprobados')}`, 'success');
      mostrarResumen(marcarResuelta());
    }, 'Error al guardar los informes COMET');

    setShowModal({
      title: `Revisar — ${tituloJornada(grupo.jornada)}`,
      content: (
        <CometBulkImportPanel
          jornada={grupo.jornada}
          jornadas={res.jornadas}
          players={players}
          historico
          diferencias={diferencias}
          initialItems={grupo.revision.map((r) => ({ ...r.it, incluir: false }))}
          resumen={<p className="text-sm text-gray-600 dark:text-gray-300">Marcá los que querés guardar: se reemplaza la planilla por la del informe.</p>}
          onSave={onSave}
          onCancel={() => mostrarResumen(res)}
        />
      ),
    });
  };

  const handleCarpeta = async (e) => {
    const todos = [...(e.target.files || [])];
    e.target.value = '';
    const segmentos = (f) => (f.webkitRelativePath || f.name).split('/').slice(0, -1);
    const pdfs = todos.filter((f) => /\.pdf$/i.test(f.name));
    const propios = pdfs.filter((f) => !segmentos(f).some((s) => CARPETA_AJENA_RE.test(s.trim())));
    if (propios.length === 0) {
      showToast(pdfs.length ? 'Esa carpeta solo tiene informes de otras categorías.' : 'No encontré PDF en esa carpeta.', 'error');
      return;
    }

    try {
      const leidos = [];
      for (const [i, f] of propios.entries()) {
        setProgreso(`Leyendo ${i + 1}/${propios.length}…`);
        const item = await leerInforme(f, players, { carpeta: segmentos(f).at(-1) || '' });
        leidos.push({ ...item, ruta: f.webkitRelativePath || f.name });
      }

      setProgreso('Buscando las jornadas…');
      let todas = await database.getJornadas();
      const { grupos, sinAsignar } = agruparPorJornada(leidos, todas);

      // Evaluar cada jornada y guardar los automáticos, en orden cronológico
      const resultado = [];
      let totalGuardados = 0;
      for (const [i, grupo] of grupos.entries()) {
        setProgreso(`Guardando ${i + 1}/${grupos.length}…`);
        const jornada = todas.find((j) => j.id === grupo.jornada.id) || grupo.jornada;
        const { items } = grupo;
        const evaluados = evaluarInformes(items, { jornada, jornadas: todas, players, historico: true }).map((ev) => {
          const diff = ev.preview ? diferenciasConPlanilla(ev.partido, ev.preview, players) : { items: [], hayDiferencias: false };
          return { ...ev, diff, clase: clasificarHistorico(ev, diff) };
        });
        const auto = evaluados.filter((ev) => ev.clase === 'auto');
        let guardadas = [];
        let error = null;
        if (auto.length > 0) {
          try {
            guardadas = await guardarImportComet(auto.map((ev) => armarGuardado(ev, players)), { jornada, currentUser, automatico: true, historico: true });
          } catch (err) {
            console.error('Error guardando informes COMET:', err);
            guardadas = err.guardados || [];
            error = err.message;
          }
        }
        totalGuardados += guardadas.length;
        // Lo recién guardado cuenta para las posiciones y suspensiones de las jornadas siguientes
        if (guardadas.length > 0) {
          try {
            todas = await database.getJornadas();
          } catch (err) {
            console.error('No se pudieron recargar las jornadas:', err);
          }
        }
        resultado.push({
          jornadaId: jornada.id,
          guardados: auto.filter((ev) => guardadas.includes(ev.it.categoria)).map((ev) => ({
            categoria: ev.it.categoria,
            detalle: ev.yaCargado ? `+${plural(ev.it.parsed.cambios.length, 'cambio')} con minutos` : 'planilla nueva',
          })).sort((a, b) => porCategoria(a.categoria, b.categoria)),
          completos: evaluados.filter((ev) => ev.clase === 'completo').map((ev) => ev.it.categoria).sort(porCategoria),
          revision: evaluados.filter((ev) => ev.clase === 'revision' || (ev.clase === 'auto' && !guardadas.includes(ev.it.categoria)))
            .sort((a, b) => porCategoria(a.it.categoria, b.it.categoria))
            .map((ev) => ({
              it: ev.it,
              diff: ev.diff,
              motivos: ev.motivosRevision.length > 0 ? ev.motivosRevision : ev.diff.hayDiferencias ? [] : ['No se pudo guardar.'],
            })),
          error,
          resuelta: false,
        });
      }

      // Las jornadas frescas (con lo recién guardado) para revisar el resto
      if (totalGuardados > 0) {
        await onDataChange('jornadas', 'players');
        showToast(`${plural(totalGuardados, 'partido cargado', 'partidos cargados')} del COMET`, 'success');
      }
      const porId = new Map(todas.map((j) => [j.id, j]));
      mostrarResumen({
        leidos: leidos.length,
        omitidos: pdfs.length - propios.length,
        jornadas: todas,
        grupos: resultado.map((r, i) => ({ ...r, jornada: porId.get(r.jornadaId) || grupos[i].jornada })),
        sinAsignar,
      });
    } catch (err) {
      console.error('Error importando el histórico COMET:', err);
      showToast(`Error importando la carpeta: ${err.message}`, 'error');
    } finally {
      setProgreso(null);
    }
  };

  // Elegir una carpeta no funciona en el celular: el botón solo aparece en la computadora
  return (
    <label
      title="Elegí la carpeta de informes COMET de una categoría (o la que tiene todas) para cargar los partidos viejos"
      className={`hidden sm:flex items-center gap-2 bg-white text-black border border-yellow-400 px-4 py-2 rounded-lg font-medium cursor-pointer hover:bg-yellow-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 ${progreso ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {progreso ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
      <span>{progreso || 'Importar histórico'}</span>
      <input type="file" webkitdirectory="" multiple className="hidden" onChange={handleCarpeta} disabled={!!progreso} />
    </label>
  );
};
