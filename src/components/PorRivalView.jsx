import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CATEGORIAS_PARTIDO, FASES_CAMPEONATO } from '../utils/constants';
import { formatDate } from '../utils/dateUtils';
import { resolveMarcador, groupGoleadores } from '../utils/playerStats';
import { useTableSort, thClass } from '../hooks/useTableSort.jsx';
import { RivalBadge } from './ui/RivalBadge';
import { ResultadoBadge } from './ui/ResultadoBadge';

// ─── Stats helpers ───────────────────────────────────────────────────────────

const PUNTOS = { G: 3, E: 1, P: 0 };
const SIN_ORDEN = 999;

const emptyRecord = () => ({ pts: 0, posibles: 0, pj: 0, g: 0, e: 0, p: 0 });

const addResultado = (rec, resultado) => {
  rec.pj++;
  rec.pts += PUNTOS[resultado];
  rec.posibles += PUNTOS.G;
  rec[resultado.toLowerCase()]++;
};

const sumRecords = (a, b) => ({
  pts: a.pts + b.pts,
  posibles: a.posibles + b.posibles,
  pj: a.pj + b.pj,
  g: a.g + b.g,
  e: a.e + b.e,
  p: a.p + b.p,
});

// Semifinal / Final: se muestran en el detalle pero no suman puntos.
const esPlayoff = (numero) => numero != null && numero !== '' && Number.isNaN(Number(numero));

const numeroOrden = (jornada) => {
  const n = Number(jornada.numero_jornada);
  return jornada.numero_jornada && !Number.isNaN(n) ? n : SIN_ORDEN;
};

const compareJornadas = (a, b) =>
  FASES_CAMPEONATO.indexOf(a.fase) - FASES_CAMPEONATO.indexOf(b.fase)
  || Number(a.esPlayoff) - Number(b.esPlayoff)
  || numeroOrden(a) - numeroOrden(b)
  || String(a.fecha || '').localeCompare(String(b.fecha || ''));

/**
 * Agrupa las jornadas por rival y calcula los puntos de CAP (3 por victoria,
 * 1 por empate) por fase y en total. Solo cuentan los partidos con marcador.
 */
const buildRivalStats = (jornadas, categoriaFiltro) => {
  const map = {};

  jornadas.forEach((jornada) => {
    if (!jornada.rival_id || !FASES_CAMPEONATO.includes(jornada.fase)) return;
    if (!map[jornada.rival_id]) {
      map[jornada.rival_id] = {
        rival_id: jornada.rival_id,
        rival: jornada.rivales,
        name: jornada.rivales?.name || '—',
        fases: Object.fromEntries(FASES_CAMPEONATO.map((f) => [f, emptyRecord()])),
        total: emptyRecord(),
        porCategoria: {},
        jornadas: [],
      };
    }
    const stat = map[jornada.rival_id];
    const playoff = esPlayoff(jornada.numero_jornada);
    const record = emptyRecord();
    const partidos = {};

    (jornada.partidos || []).forEach((partido) => {
      if (categoriaFiltro && partido.categoria !== categoriaFiltro) return;
      const marcador = resolveMarcador(partido);
      partidos[partido.categoria] = {
        escenario: partido.escenario,
        ...marcador,
        goleadores: groupGoleadores(partido),
      };
      if (!marcador.resultado || playoff) return;

      if (!stat.porCategoria[partido.categoria]) stat.porCategoria[partido.categoria] = emptyRecord();
      [record, stat.fases[jornada.fase], stat.total, stat.porCategoria[partido.categoria]]
        .forEach((rec) => addResultado(rec, marcador.resultado));
    });

    stat.jornadas.push({
      id: jornada.id,
      fase: jornada.fase,
      numero_jornada: jornada.numero_jornada || null,
      fecha: jornada.fecha,
      esPlayoff: playoff,
      record,
      partidos,
    });
  });

  return Object.values(map).map((stat) => {
    const jornadasOrdenadas = [...stat.jornadas].sort(compareJornadas);
    const regulares = jornadasOrdenadas.filter((j) => !j.esPlayoff);

    // Una columna por jornada; la fase sin jornada regular queda como columna vacía.
    const columnas = FASES_CAMPEONATO.flatMap((fase) => {
      const deLaFase = jornadasOrdenadas.filter((j) => j.fase === fase);
      const cols = deLaFase.map((jornada) => ({ key: jornada.id, fase, jornada }));
      return deLaFase.some((j) => !j.esPlayoff)
        ? cols
        : [{ key: `sin-${fase}`, fase, jornada: null }, ...cols];
    });

    const ptsFase = (fase) => (stat.fases[fase].pj > 0 ? stat.fases[fase].pts : null);

    return {
      ...stat,
      jornadas: jornadasOrdenadas,
      columnas,
      // Orden del fixture: N° de jornada del Apertura y, si no hay, la del Clausura.
      orden: regulares.length > 0 ? numeroOrden(regulares[0]) : SIN_ORDEN,
      pj: stat.total.pj,
      ptsApertura: ptsFase('Apertura'),
      ptsClausura: ptsFase('Clausura'),
      ptsTotal: stat.total.pj > 0 ? stat.total.pts : null,
    };
  });
};

// ─── Small pieces ────────────────────────────────────────────────────────────

// Mismo criterio que la columna Pts de Partidos (verde con más de 10 sobre 15,
// rojo con menos de 7 sobre 15), llevado a proporción de los puntos posibles.
const puntosColor = ({ pts, posibles }) => {
  if (pts * 15 > posibles * 10) return 'text-green-600';
  if (pts * 15 < posibles * 7) return 'text-red-600';
  return 'text-gray-900';
};

const Puntos = ({ record, bold = false }) => {
  if (!record || record.pj === 0) return <span className="text-gray-400">—</span>;
  return (
    <span className="whitespace-nowrap">
      <span className={`${bold ? 'font-bold' : 'font-semibold'} ${puntosColor(record)}`}>{record.pts}</span>
      <span className="text-xs text-gray-400">/{record.posibles}</span>
    </span>
  );
};

const GEP = ({ record }) => {
  if (!record || record.pj === 0) return <span className="text-gray-400">—</span>;
  return (
    <span className="whitespace-nowrap font-medium">
      <span className="text-green-600">{record.g}</span>
      <span className="text-gray-400">-</span>
      <span className="text-gray-500">{record.e}</span>
      <span className="text-gray-400">-</span>
      <span className="text-red-600">{record.p}</span>
    </span>
  );
};

const Chevron = ({ open }) => (open
  ? <ChevronDown className="w-4 h-4 text-gray-500" aria-hidden="true" />
  : <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />);

const jornadaLabel = (jornada) => {
  if (!jornada.numero_jornada) return jornada.fase;
  return jornada.esPlayoff
    ? `${jornada.fase} · ${jornada.numero_jornada}`
    : `${jornada.fase} · J${jornada.numero_jornada}`;
};

const PartidoCell = ({ partido }) => {
  if (!partido) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${partido.escenario === 'Local' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
        {partido.escenario}
      </span>
      <ResultadoBadge resultado={partido.resultado} capGoles={partido.capGoles} rivalGoles={partido.rivalGoles} />
      {partido.goleadores.length > 0 && (
        <span className="text-xs text-gray-700">
          {partido.goleadores.map((g) => (
            <span key={g.name} className="mr-2 whitespace-nowrap">
              {g.name}
              <span className="text-green-700 font-semibold"> ⚽{g.count > 1 && `×${g.count}`}</span>
            </span>
          ))}
        </span>
      )}
    </div>
  );
};

const ColumnaHeader = ({ col }) => {
  if (!col.jornada) {
    return (
      <>
        <div className="font-semibold text-gray-700">{col.fase}</div>
        <div className="text-xs font-normal text-gray-400">Sin jugar</div>
      </>
    );
  }
  return (
    <>
      <div className="font-semibold text-gray-700">{jornadaLabel(col.jornada)}</div>
      <div className="text-xs font-normal text-gray-500">
        {formatDate(col.jornada.fecha)}
        {col.jornada.esPlayoff
          ? ' · no suma puntos'
          : col.jornada.record.pj > 0 && <> · <Puntos record={col.jornada.record} /> pts</>}
      </div>
    </>
  );
};

// Detalle de un rival: categorías × jornadas. En mobile, un bloque por jornada.
const RivalDetail = ({ stat, categorias }) => (
  <>
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">Cat</th>
            {stat.columnas.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left align-top"><ColumnaHeader col={col} /></th>
            ))}
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {categorias.map((cat) => (
            <tr key={cat}>
              <td className="px-3 py-2 text-xs font-semibold text-gray-600">{cat}</td>
              {stat.columnas.map((col) => (
                <td key={col.key} className="px-3 py-2"><PartidoCell partido={col.jornada?.partidos[cat]} /></td>
              ))}
              <td className="px-3 py-2 text-center"><Puntos record={stat.porCategoria[cat]} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="md:hidden space-y-4">
      {stat.columnas.filter((col) => col.jornada).map((col) => (
        <div key={col.key}>
          <div className="text-sm mb-1"><ColumnaHeader col={col} /></div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {categorias.map((cat) => (
              <div key={cat} className="flex items-start gap-3 py-1.5">
                <span className="w-8 shrink-0 pt-0.5 text-xs font-semibold text-gray-600">{cat}</span>
                <div className="min-w-0"><PartidoCell partido={col.jornada.partidos[cat]} /></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </>
);

// ─── View ────────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: 'orden', label: 'N° de jornada' },
  { key: 'name', label: 'Rival' },
  { key: 'ptsTotal', label: 'Puntos totales' },
  { key: 'ptsApertura', label: 'Puntos Apertura' },
  { key: 'ptsClausura', label: 'Puntos Clausura' },
];

export const PorRivalView = ({ jornadas = [], categoriaFiltro = null }) => {
  const { handleSort, SortIcon, sortKey, sortDir } = useTableSort('orden', 'asc');
  const [expanded, setExpanded] = useState(() => new Set());

  const stats = useMemo(() => buildRivalStats(jornadas, categoriaFiltro), [jornadas, categoriaFiltro]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...stats].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let primary;
      // Los rivales sin puntos cargados van siempre al final.
      if (av == null || bv == null) primary = Number(av == null) - Number(bv == null);
      else if (typeof av === 'string') primary = dir * av.localeCompare(bv);
      else primary = dir * (av - bv);
      return primary || a.orden - b.orden || a.name.localeCompare(b.name);
    });
  }, [stats, sortKey, sortDir]);

  const totals = useMemo(() => ({
    fases: Object.fromEntries(FASES_CAMPEONATO.map((fase) => [
      fase,
      stats.reduce((acc, s) => sumRecords(acc, s.fases[fase]), emptyRecord()),
    ])),
    total: stats.reduce((acc, s) => sumRecords(acc, s.total), emptyRecord()),
  }), [stats]);

  const categorias = categoriaFiltro ? [categoriaFiltro] : CATEGORIAS_PARTIDO;
  const allExpanded = sorted.length > 0 && sorted.every((s) => expanded.has(s.rival_id));

  const toggle = (rivalId) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(rivalId)) next.delete(rivalId);
    else next.add(rivalId);
    return next;
  });

  const toggleAll = () => setExpanded(allExpanded ? new Set() : new Set(sorted.map((s) => s.rival_id)));

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <p className="text-center text-gray-500 py-12">No hay datos para mostrar.</p>
      </div>
    );
  }

  const numeroBadge = (stat) => stat.orden !== SIN_ORDEN && (
    <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">{stat.orden}</span>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          Puntos sobre los posibles: 3 por victoria y 1 por empate, sumando todas las categorías. Semifinal y Final no suman.
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
        >
          {allExpanded ? 'Contraer todo' : 'Expandir todo'}
        </button>
      </div>

      {/* Mobile: tarjetas */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center gap-2">
          <label htmlFor="por-rival-orden" className="text-xs text-gray-500">Ordenar por</label>
          <select
            id="por-rival-orden"
            value={sortKey}
            onChange={(e) => handleSort(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {SORT_OPTIONS.map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
          </select>
        </div>

        {sorted.map((stat) => {
          const open = expanded.has(stat.rival_id);
          return (
            <div key={stat.rival_id} className="bg-white rounded-lg shadow">
              <button
                type="button"
                onClick={() => toggle(stat.rival_id)}
                aria-expanded={open}
                className="w-full px-4 py-3 text-left space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Chevron open={open} />
                  <RivalBadge rival={stat.rival} />
                  <span className="flex-1 min-w-0 break-words font-medium text-gray-900">{stat.name}</span>
                  <Puntos record={stat.total} bold />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-6 text-xs text-gray-500">
                  {numeroBadge(stat)}
                  <span>Ap <Puntos record={stat.fases.Apertura} /></span>
                  <span>Cl <Puntos record={stat.fases.Clausura} /></span>
                  <span>G-E-P <GEP record={stat.total} /></span>
                </div>
              </button>
              {open && (
                <div className="px-4 pb-4 pt-3 border-t border-gray-200">
                  <RivalDetail stat={stat} categorias={categorias} />
                </div>
              )}
            </div>
          );
        })}

        <div className="bg-black text-yellow-400 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center justify-between font-bold">
            <span>Total</span>
            <span>{totals.total.pts}<span className="text-xs font-normal">/{totals.total.posibles}</span></span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs">
            <span>Ap {totals.fases.Apertura.pts}/{totals.fases.Apertura.posibles}</span>
            <span>Cl {totals.fases.Clausura.pts}/{totals.fases.Clausura.posibles}</span>
            <span>G-E-P {totals.total.g}-{totals.total.e}-{totals.total.p}</span>
          </div>
        </div>
      </div>

      {/* Desktop: tabla */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-8 px-2 py-2" />
                <th className={`${thClass} text-center w-10`} onClick={() => handleSort('orden')}># <SortIcon col="orden" /></th>
                <th className={`${thClass} text-left`} onClick={() => handleSort('name')}>Rival <SortIcon col="name" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('pj')}>PJ <SortIcon col="pj" /></th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase text-center whitespace-nowrap">G-E-P</th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('ptsApertura')}>Apertura <SortIcon col="ptsApertura" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('ptsClausura')}>Clausura <SortIcon col="ptsClausura" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('ptsTotal')}>Total <SortIcon col="ptsTotal" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sorted.map((stat) => {
                const open = expanded.has(stat.rival_id);
                return (
                  <React.Fragment key={stat.rival_id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggle(stat.rival_id)}>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggle(stat.rival_id); }}
                          aria-expanded={open}
                          aria-label={`${open ? 'Contraer' : 'Expandir'} ${stat.name}`}
                          className="align-middle"
                        >
                          <Chevron open={open} />
                        </button>
                      </td>
                      <td className="px-2 py-2 text-center">{numeroBadge(stat) || <span className="text-gray-400">—</span>}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 font-medium text-gray-900">
                          <RivalBadge rival={stat.rival} />
                          <span>{stat.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">{stat.total.pj || '—'}</td>
                      <td className="px-3 py-2 text-center"><GEP record={stat.total} /></td>
                      <td className="px-3 py-2 text-center"><Puntos record={stat.fases.Apertura} /></td>
                      <td className="px-3 py-2 text-center"><Puntos record={stat.fases.Clausura} /></td>
                      <td className="px-3 py-2 text-center"><Puntos record={stat.total} bold /></td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 px-4 py-3 pl-12">
                          <RivalDetail stat={stat} categorias={categorias} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
              <tr>
                <td />
                <td />
                <td className="px-3 py-2 text-gray-900">Total</td>
                <td className="px-3 py-2 text-center text-gray-700">{totals.total.pj || '—'}</td>
                <td className="px-3 py-2 text-center"><GEP record={totals.total} /></td>
                <td className="px-3 py-2 text-center"><Puntos record={totals.fases.Apertura} bold /></td>
                <td className="px-3 py-2 text-center"><Puntos record={totals.fases.Clausura} bold /></td>
                <td className="px-3 py-2 text-center"><Puntos record={totals.total} bold /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
