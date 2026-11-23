import { useState } from 'react';
import { FileDown, Loader2, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import { CATEGORIAS_PARTIDO } from '../utils/constants';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { useToast } from '../context/ToastContext';
import { formatDate, fechaPartido } from '../utils/dateUtils';
import { rivalCoincide } from '../utils/cometApply';
import { leerInforme, evaluarInformes, armarGuardado, rivalDelInforme } from '../utils/cometLote';
import { guardarImportComet } from '../utils/cometGuardar';
import { soportaCarpeta, obtenerCarpeta, leerPdfsRecientes } from '../utils/cometCarpeta';
import { CometBulkImportPanel } from './CometBulkImportPanel';

const DIAS_ANTES = 7; // se leen los PDF modificados desde 7 días antes de la jornada

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Primer día en que se jugó algún partido de la jornada (la 4ta juega el día anterior)
const primerDia = (j) => [j.fecha.slice(0, 10), ...(j.partidos || []).map((p) => fechaPartido(p, j)).filter(Boolean)].sort()[0];

/** Última jornada que ya empezó a jugarse; si todas son futuras, la más próxima. */
function ultimaJornada(jornadas = []) {
  const hoy = hoyIso();
  const conFecha = jornadas.filter((j) => j.fecha);
  const jugadas = conFecha.filter((j) => primerDia(j) <= hoy);
  const pool = jugadas.length ? jugadas : conFecha;
  return [...pool].sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.created_at || '').localeCompare(a.created_at || ''))[0] || null;
}

const porCategoria = (a, b) => CATEGORIAS_PARTIDO.indexOf(a) - CATEGORIAS_PARTIDO.indexOf(b);
const resultadoCargado = (p) => p.goles_local != null || p.goles_visitante != null;

/**
 * "Cargar COMETs": lee la carpeta de informes, toma los de la última jornada (por rival),
 * guarda solos los partidos sin dudas y deja el resto para aprobar a mano.
 */
export const CometAutoImportButton = ({ jornadas = [], players = [], currentUser, setShowModal, onDataChange, onFormDirtyChange }) => {
  const [buscando, setBuscando] = useState(false);
  const { showToast } = useToast();
  const { execute } = useMutation((msg) => showToast(msg, 'error'));

  const jornadaProps = ultimaJornada(jornadas);

  // Aprobación manual de los que quedaron para revisar
  const handleReviewSave = (fresh) => (lista) => execute(async () => {
    let guardados = [];
    try {
      guardados = await guardarImportComet(lista, { jornada: fresh, currentUser });
    } catch (err) {
      guardados = err.guardados || [];
      throw err;
    } finally {
      if (guardados.length > 0) {
        await onDataChange('jornadas', 'players');
        setShowModal(null);
      }
    }
    showToast(`${guardados.length} partido${guardados.length === 1 ? '' : 's'} aprobado${guardados.length === 1 ? '' : 's'}`, 'success');
  }, 'Error al guardar los informes COMET');

  // Cambia la carpeta guardada sin cargar nada (los datos del modal ya quedaron viejos)
  const cambiarCarpeta = async () => {
    try {
      const handle = await obtenerCarpeta({ elegirNueva: true });
      if (handle) {
        setShowModal(null);
        showToast(`Carpeta "${handle.name}" guardada: tocá Cargar COMETs de nuevo.`, 'success');
      }
    } catch (err) {
      showToast(`No se pudo abrir la carpeta: ${err.message}`, 'error');
    }
  };

  const abrirResultado = ({ fresh, todas, resumen, revision }) => {
    onFormDirtyChange?.(false);
    setShowModal({
      title: `Informes COMET — ${fresh.rivales?.name || 'Jornada'} (${formatDate(fresh.fecha)})`,
      content: revision.length > 0 ? (
        <CometBulkImportPanel
          jornada={fresh}
          jornadas={todas}
          players={players}
          initialItems={revision}
          resumen={resumen}
          onSave={handleReviewSave(fresh)}
          onCancel={() => setShowModal(null)}
        />
      ) : (
        <div className="space-y-4">
          {resumen}
          <button type="button" onClick={() => setShowModal(null)} className="w-full bg-black text-yellow-400 py-2 rounded-lg font-semibold hover:bg-gray-900">
            Listo
          </button>
        </div>
      ),
    });
  };

  const run = async () => {
    const jornada = jornadaProps;
    if (!jornada) {
      setShowModal({ title: 'Cargar COMETs', content: <p className="text-sm text-gray-700 dark:text-gray-200">No hay ninguna jornada creada.</p> });
      return;
    }
    const rival = jornada.rivales?.name || '';

    // Sin acceso a carpetas (Safari, Firefox, celular): elegir los PDF a mano
    if (!soportaCarpeta()) {
      onFormDirtyChange?.(false);
      setShowModal({
        title: `Importar informes COMET — ${rival || 'Jornada'}`,
        content: (
          <CometBulkImportPanel
            jornada={jornada}
            jornadas={jornadas}
            players={players}
            resumen={<p className="text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200 rounded p-2">Este navegador no puede leer una carpeta: elegí los PDF a mano (o usá Chrome en la computadora).</p>}
            onSave={handleReviewSave(jornada)}
            onCancel={() => setShowModal(null)}
          />
        ),
      });
      return;
    }

    let handle;
    try {
      handle = await obtenerCarpeta();
    } catch (err) {
      showToast(`No se pudo abrir la carpeta: ${err.message}`, 'error');
      return;
    }
    if (!handle) return;

    setBuscando(true);
    try {
      // Datos frescos de la BD: lo que está en memoria puede no incluir la última carga
      let todas = jornadas;
      try {
        todas = await database.getJornadas();
      } catch (err) {
        console.error('No se pudieron recargar las jornadas:', err);
      }
      const jornada = todas.find((j) => j.id === jornadaProps.id) || jornadaProps;
      const [y, m, d] = jornada.fecha.slice(0, 10).split('-').map(Number);
      const desde = new Date(y, m - 1, d - DIAS_ANTES);
      const files = await leerPdfsRecientes(handle, desde);
      const leidos = [];
      for (const f of files) leidos.push(await leerInforme(f, players));

      const ilegibles = leidos.filter((it) => !it.parsed);
      const delRival = leidos.filter((it) => it.parsed && rivalCoincide(rivalDelInforme(it.parsed), rival));
      const ignorados = leidos.length - ilegibles.length - delRival.length;

      const evaluados = evaluarInformes(delRival, { jornada, jornadas: todas, players });
      const completos = evaluados.filter((e) => e.yaCargado && resultadoCargado(e.partido));
      const pendientes = evaluados.filter((e) => !completos.includes(e));
      const auto = pendientes.filter((e) => !e.yaCargado && e.puede && e.motivosRevision.length === 0);
      const revision = pendientes.filter((e) => !auto.includes(e));

      let guardados = [];
      let errorGuardado = null;
      if (auto.length > 0) {
        try {
          guardados = await guardarImportComet(auto.map((e) => armarGuardado(e, players)), { jornada, currentUser, automatico: true });
        } catch (err) {
          console.error('Error guardando informes COMET:', err);
          guardados = err.guardados || [];
          errorGuardado = err.message;
        }
      }
      let fresh = jornada;
      if (guardados.length > 0) {
        try {
          await onDataChange('jornadas', 'players');
          todas = await database.getJornadas();
          fresh = todas.find((j) => j.id === jornada.id) || jornada;
        } catch (err) {
          console.error('Error recargando la jornada:', err);
        }
      }
      const noGuardados = auto.filter((e) => !guardados.includes(e.it.categoria));

      const motivo = (e) => [
        ...e.motivosRevision,
        ...(e.yaCargado ? ['Ya tenía planilla cargada sin resultado: confirmá si la reemplazás.'] : []),
      ].join(' ');

      const resumen = (
        <div className="space-y-2 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            Carpeta <span className="font-semibold">{handle.name}</span> · {delRival.length} informe{delRival.length === 1 ? '' : 's'} de {rival}
            {ignorados > 0 && <> · {ignorados} de otros rivales ignorado{ignorados === 1 ? '' : 's'}</>}
          </p>
          {delRival.length === 0 && (
            <p className="flex gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              No encontré informes de {rival} en la carpeta (modificados desde el {formatDate(desde.toISOString().slice(0, 10))}).
            </p>
          )}
          {guardados.length > 0 && (
            <p className="flex gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              Guardados: {[...guardados].sort(porCategoria).join(', ')}. Revisá las posiciones desde "Editar" si hace falta.
            </p>
          )}
          {errorGuardado && (
            <p className="flex gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Error al guardar {errorGuardado}. Sin guardar: {noGuardados.map((e) => e.it.categoria).join(', ')}. Volvé a tocar "Cargar COMETs".
            </p>
          )}
          {completos.length > 0 && (
            <p className="flex gap-2 text-gray-600 dark:text-gray-300">
              <MinusCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Ya cargados (no se tocaron): {completos.map((e) => e.it.categoria).sort(porCategoria).join(', ')}.
            </p>
          )}
          {revision.length > 0 && (
            <div className="text-amber-800 dark:text-amber-200 space-y-1">
              <p className="flex gap-2 font-semibold"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />Para revisar ({revision.length}): marcalos abajo y tocá Guardar.</p>
              <ul className="pl-6 list-disc">
                {revision.map((e) => <li key={e.it.key}><span className="font-semibold">{e.it.categoria || e.it.archivo}</span>: {motivo(e)}</li>)}
              </ul>
            </div>
          )}
          {ilegibles.length > 0 && (
            <p className="flex gap-2 text-gray-500 dark:text-gray-400">
              <MinusCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {ilegibles.length} PDF que no parecen informes COMET (o no se pudieron leer): {ilegibles.map((it) => it.archivo).join(', ')}.
            </p>
          )}
          <button
            type="button"
            onClick={cambiarCarpeta}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            Elegir otra carpeta
          </button>
        </div>
      );

      if (guardados.length > 0) {
        showToast(`${guardados.length} partido${guardados.length === 1 ? '' : 's'} cargado${guardados.length === 1 ? '' : 's'} del COMET`, 'success');
      }
      abrirResultado({ fresh, todas, resumen, revision: revision.map((e) => ({ ...e.it, incluir: false })) });
    } catch (err) {
      console.error('Error leyendo la carpeta COMET:', err);
      showToast(`Error leyendo la carpeta: ${err.message}`, 'error');
    } finally {
      setBuscando(false);
    }
  };

  if (!jornadaProps) return null;

  return (
    <button
      type="button"
      onClick={() => run()}
      disabled={buscando}
      title={`Carga los informes COMET de la carpeta en la última jornada (${jornadaProps.rivales?.name || ''}, ${formatDate(jornadaProps.fecha)})`}
      className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 font-medium disabled:opacity-60"
    >
      {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      <span className="hidden sm:inline">{buscando ? 'Buscando informes…' : 'Cargar COMETs'}</span>
      <span className="sm:hidden">COMET</span>
    </button>
  );
};
