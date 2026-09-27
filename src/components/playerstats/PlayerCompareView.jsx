import React, { useMemo } from 'react';
import { Download, Copy } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  buildPlayerMatchLog,
  getTotales, getTramos, getTiempos, getMinutoPromedioGol,
  getRecord, getCuandoMarca, getPorTipo, getConTarjeta,
  getPorEscenario, getPorCesped, getRachas, getHitos, getCategoriasJugadas,
  TRAMOS, fmtPct, fmtRatio, fmtMinuto, getBestIndices,
} from '../../utils/playerStats';
import { Row, SectionHeader } from './CompareRow';
import { GolesPorTramoChart } from '../charts/GolesPorTramoChart';
import { useChartPalette, contrastText } from '../../hooks/useChartPalette';

/** Clases estáticas para que Tailwind las incluya en el build. */
const GRID_COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3' };

/**
 * Porcentaje para la tabla comparativa. Devuelve el string ya formateado con
 * su tamaño de muestra; por debajo del umbral agrega un asterisco, explicado
 * en la nota al pie.
 */
const pctCell = (record, minMuestra) => {
  if (!record || record.pj === 0) return '—';
  const chica = record.pj < minMuestra;
  return `${fmtPct(record.pctVictorias)} (n=${record.pj})${chica ? ' *' : ''}`;
};

export const PlayerCompareView = ({
  players = [],
  jornadas = [],
  categoria = null,
  year = null,
  minMuestra = 5,
}) => {
  const names = players.map((p) => p.name_visual || p.name);
  const palette = useChartPalette();

  const data = useMemo(
    () =>
      players.map((p) => {
        const log = buildPlayerMatchLog(jornadas, p.id, { categoria, year });
        return {
          player: p,
          log,
          totales: getTotales(log),
          tramos: getTramos(log),
          tiempos: getTiempos(log),
          minutoPromedio: getMinutoPromedioGol(log),
          record: getRecord(log),
          cuandoMarca: getCuandoMarca(log),
          porTipo: getPorTipo(log),
          conTarjeta: getConTarjeta(log),
          porEscenario: getPorEscenario(log),
          porCesped: getPorCesped(log),
          rachas: getRachas(log),
          hitos: getHitos(log),
          categoriasJugadas: getCategoriasJugadas(log),
        };
      }),
    [players, jornadas, categoria, year]
  );

  const hayMuestraChica = data.some((d) =>
    [d.record, d.cuandoMarca.conGol, d.cuandoMarca.sinGol, d.porTipo.titular, d.porTipo.suplente,
     d.conTarjeta.conTarjeta, d.conTarjeta.sinTarjeta,
     d.porEscenario.Local.record, d.porEscenario.Visitante.record,
     d.porCesped.Natural.record, d.porCesped['Sintético'].record]
      .some((r) => r.pj > 0 && r.pj < minMuestra)
  );

  /** Filas planas (label + valores por jugador), compartidas por la tabla y la exportación. */
  const exportRows = useMemo(() => {
    const rows = [];
    const push = (campo, values) =>
      rows.push({ Campo: campo, ...Object.fromEntries(names.map((n, i) => [n, values[i]])) });

    push('Totales', names.map(() => ''));
    push('PJ', data.map((d) => d.totales.pj));
    push('Goles', data.map((d) => d.totales.goles));
    push('Goles/Partido', data.map((d) => fmtRatio(d.totales.golesPorPartido)));
    push('Amarillas', data.map((d) => d.totales.amarillas));
    push('Rojas', data.map((d) => d.totales.rojas));
    push('Titular', data.map((d) => d.totales.titular));
    push('Suplente', data.map((d) => d.totales.suplente));
    push('% Titularidad', data.map((d) => fmtPct(d.totales.pctTitularidad)));

    push('Por Minuto', names.map(() => ''));
    TRAMOS.forEach((t) => push(`Goles ${t.label}`, data.map((d) => d.tramos.goles[t.key])));
    push('Goles 1er Tiempo', data.map((d) => d.tiempos.golesPrimer));
    push('Goles 2do Tiempo', data.map((d) => d.tiempos.golesSegundo));
    push('Minuto Promedio de Gol', data.map((d) => fmtMinuto(d.minutoPromedio.promedio)));

    push('Cruces con el Resultado', names.map(() => ''));
    push('Récord (G-E-P)', data.map((d) => `${d.record.g}-${d.record.e}-${d.record.p}`));
    push('% Victorias', data.map((d) => pctCell(d.record, minMuestra)));
    push('% Victorias cuando marca', data.map((d) => pctCell(d.cuandoMarca.conGol, minMuestra)));
    push('% Victorias cuando no marca', data.map((d) => pctCell(d.cuandoMarca.sinGol, minMuestra)));
    push('% Victorias de titular', data.map((d) => pctCell(d.porTipo.titular, minMuestra)));
    push('% Victorias de suplente', data.map((d) => pctCell(d.porTipo.suplente, minMuestra)));
    push('% Victorias con tarjeta', data.map((d) => pctCell(d.conTarjeta.conTarjeta, minMuestra)));
    push('% Victorias sin tarjeta', data.map((d) => pctCell(d.conTarjeta.sinTarjeta, minMuestra)));

    push('Cruces con el Contexto', names.map(() => ''));
    ['Local', 'Visitante'].forEach((esc) => {
      push(`Goles/PJ ${esc}`, data.map((d) => fmtRatio(d.porEscenario[esc].golesPorPartido)));
      push(`% Victorias ${esc}`, data.map((d) => pctCell(d.porEscenario[esc].record, minMuestra)));
    });
    ['Natural', 'Sintético'].forEach((ces) => {
      push(`Goles/PJ ${ces}`, data.map((d) => fmtRatio(d.porCesped[ces].golesPorPartido)));
      push(`% Victorias ${ces}`, data.map((d) => pctCell(d.porCesped[ces].record, minMuestra)));
    });

    push('Rachas y Logros', names.map(() => ''));
    push('Racha con gol (máx.)', data.map((d) => d.rachas.conGol.maxima));
    push('Racha sin tarjeta (máx.)', data.map((d) => d.rachas.sinTarjeta.maxima));
    push('Racha invicto (máx.)', data.map((d) => d.rachas.invicto.maxima));
    push('Dobletes', data.map((d) => d.hitos.dobletes));
    push('Hat-tricks', data.map((d) => d.hitos.hatTricks));
    push('Goles desde el banco', data.map((d) => d.hitos.golesDesdeBanco));

    return rows;
  }, [data, names, minMuestra]);

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparación');
    XLSX.writeFile(wb, `estadisticas_${names.join('_vs_')}.xlsx`);
  };

  const handleCopyClipboard = async () => {
    const headers = ['Campo', ...names];
    const lines = [headers.join('\t')];
    exportRows.forEach((row) => lines.push(headers.map((h) => row[h] ?? '').join('\t')));
    await navigator.clipboard.writeText(lines.join('\n'));
  };

  /**
   * Filas de la comparación como datos, compartidas por la tabla (desktop) y
   * la vista apilada (mobile). Las filas de porcentaje llevan `records` para
   * que cada vista muestre el tamaño de muestra a su manera.
   */
  const sections = useMemo(() => {
    const row = (label, values, highlight, format) => ({ label, values, highlight, format });
    const cruce = (label, pick) => {
      const records = data.map(pick);
      return {
        label,
        values: records.map((r) => (r.pj > 0 ? r.pctVictorias : 0)),
        highlight: 'max',
        records,
      };
    };

    return [
      {
        title: 'Totales',
        rows: [
          row('PJ',              data.map((d) => d.totales.pj), 'max'),
          row('Goles',           data.map((d) => d.totales.goles), 'max'),
          row('Goles / Partido', data.map((d) => d.totales.golesPorPartido), 'max', fmtRatio),
          row('Amarillas',       data.map((d) => d.totales.amarillas), 'min'),
          row('Rojas',           data.map((d) => d.totales.rojas), 'min'),
          row('Titular',         data.map((d) => d.totales.titular), 'max'),
          row('Suplente',        data.map((d) => d.totales.suplente)),
          row('% Titularidad',   data.map((d) => d.totales.pctTitularidad ?? 0), 'max', fmtPct),
        ],
      },
      {
        title: 'Por Minuto',
        rows: [
          ...TRAMOS.map((t) => row(`Goles ${t.label}`, data.map((d) => d.tramos.goles[t.key]), 'max')),
          row('Goles 1er Tiempo',       data.map((d) => d.tiempos.golesPrimer), 'max'),
          row('Goles 2do Tiempo',       data.map((d) => d.tiempos.golesSegundo), 'max'),
          row('Minuto Promedio de Gol', data.map((d) => d.minutoPromedio.promedio), undefined, fmtMinuto),
        ],
      },
      {
        title: 'Cruces con el Resultado',
        rows: [
          row('Récord (G-E-P)', data.map((d) => `${d.record.g}-${d.record.e}-${d.record.p}`)),
          cruce('% Victorias',                 (d) => d.record),
          cruce('% Victorias cuando marca',    (d) => d.cuandoMarca.conGol),
          cruce('% Victorias cuando no marca', (d) => d.cuandoMarca.sinGol),
          cruce('% Victorias de titular',      (d) => d.porTipo.titular),
          cruce('% Victorias de suplente',     (d) => d.porTipo.suplente),
          cruce('% Victorias con tarjeta',     (d) => d.conTarjeta.conTarjeta),
          cruce('% Victorias sin tarjeta',     (d) => d.conTarjeta.sinTarjeta),
        ],
      },
      {
        title: 'Cruces con el Contexto',
        rows: [
          ...['Local', 'Visitante'].flatMap((esc) => [
            row(`Goles/PJ ${esc}`, data.map((d) => d.porEscenario[esc].golesPorPartido), 'max', fmtRatio),
            cruce(`% Victorias ${esc}`, (d) => d.porEscenario[esc].record),
          ]),
          ...['Natural', 'Sintético'].flatMap((ces) => [
            row(`Goles/PJ ${ces}`, data.map((d) => d.porCesped[ces].golesPorPartido), 'max', fmtRatio),
            cruce(`% Victorias ${ces}`, (d) => d.porCesped[ces].record),
          ]),
        ],
      },
      {
        title: 'Rachas y Logros',
        rows: [
          row('Racha con gol (máx.)',     data.map((d) => d.rachas.conGol.maxima), 'max'),
          row('Racha sin tarjeta (máx.)', data.map((d) => d.rachas.sinTarjeta.maxima), 'max'),
          row('Racha invicto (máx.)',     data.map((d) => d.rachas.invicto.maxima), 'max'),
          row('Dobletes',                 data.map((d) => d.hitos.dobletes), 'max'),
          row('Hat-tricks',               data.map((d) => d.hitos.hatTricks), 'max'),
          row('Goles desde el banco',     data.map((d) => d.hitos.golesDesdeBanco), 'max'),
        ],
      },
    ];
  }, [data]);

  const colSpan = players.length + 1;
  const gridCols = GRID_COLS[players.length] || GRID_COLS[3];

  const notaMuestraChica = hayMuestraChica && (
    <p className="text-xs text-amber-600 mt-3">
      * Muestra chica: menos de {minMuestra} partidos. El porcentaje puede engañar.
    </p>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={handleCopyClipboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          title="Copiar al portapapeles"
        >
          <Copy className="w-4 h-4" />
          <span className="hidden sm:inline">Copiar</span>
        </button>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          title="Exportar a Excel"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Excel</span>
        </button>
      </div>

      {/* ── Mobile: filas apiladas, sin scroll horizontal ───────────── */}
      <div className="sm:hidden bg-white rounded-lg shadow px-3 pb-3">
        <div className={`sticky top-0 z-10 bg-white grid ${gridCols} gap-2 py-3 border-b-2 border-gray-200`}>
          {data.map((d, i) => (
            <div key={d.player.id} className="flex flex-col items-center gap-1 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                style={{
                  backgroundColor: palette[i % palette.length],
                  color: contrastText(palette[i % palette.length]),
                }}
              >
                {names[i].charAt(0)}
              </div>
              <span className="w-full text-xs font-bold text-gray-900 text-center truncate">{names[i]}</span>
              <span className="text-[11px] text-gray-500 truncate">
                {d.categoriasJugadas.join('/') || d.player.categoria || '—'}
              </span>
            </div>
          ))}
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <div className="pt-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-yellow-400">
              {section.title}
            </div>
            {section.rows.map((r) => (
              <MobileCompareRow
                key={r.label}
                row={r}
                gridCols={gridCols}
                palette={palette}
                minMuestra={minMuestra}
              />
            ))}
          </div>
        ))}

        {notaMuestraChica}
      </div>

      {/* ── Desktop: tabla ──────────────────────────────────────────── */}
      <div className="hidden sm:block bg-white rounded-lg shadow p-4 overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 pr-4 w-44"></th>
              {data.map((d, i) => (
                <th key={d.player.id} className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                      style={{
                        backgroundColor: palette[i % palette.length],
                        color: contrastText(palette[i % palette.length]),
                      }}
                    >
                      {names[i].charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{names[i]}</span>
                    <span className="text-xs text-gray-500">
                      {d.categoriasJugadas.join('/') || d.player.categoria || '—'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <React.Fragment key={section.title}>
                <SectionHeader title={section.title} colSpan={colSpan} />
                {section.rows.map((r) => (
                  <Row
                    key={r.label}
                    label={r.label}
                    values={r.values}
                    highlight={r.highlight}
                    format={r.records ? (_v, i) => pctCell(r.records[i], minMuestra) : r.format}
                  />
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {notaMuestraChica}
      </div>

      <GolesPorTramoChart
        series={data.map((d, i) => ({ name: names[i], tramos: d.tramos.goles }))}
        title="Goles por Tramo — Comparación"
      />
    </div>
  );
};

/**
 * Fila apilada para mobile: el label ocupa su propia línea y los valores van
 * debajo, uno por jugador, alineados con la leyenda fija de arriba. En las
 * filas de porcentaje el tamaño de muestra va en una segunda línea.
 */
const MobileCompareRow = ({ row, gridCols, palette, minMuestra }) => {
  const best = row.highlight ? getBestIndices(row.values, row.highlight) : null;

  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <div className="text-xs font-medium text-gray-500 mb-1.5">{row.label}</div>
      <div className={`grid ${gridCols} gap-2`}>
        {row.values.map((v, i) => {
          const record = row.records?.[i];
          const isBest = best && best.has(i);
          return (
            <div
              key={i}
              className={`rounded-md border-t-2 py-1.5 px-1 text-center ${isBest ? 'bg-green-50' : 'bg-gray-50'}`}
              style={{ borderTopColor: palette[i % palette.length] }}
            >
              <div className={`text-sm font-semibold ${isBest ? 'text-green-700' : 'text-gray-900'}`}>
                {record
                  ? (record.pj > 0 ? fmtPct(record.pctVictorias) : '—')
                  : (row.format ? row.format(v, i) : v)}
              </div>
              {record && record.pj > 0 && (
                <div className="text-[11px] text-gray-400">
                  n={record.pj}
                  {record.pj < minMuestra && <span className="ml-0.5 font-bold text-amber-600">*</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
