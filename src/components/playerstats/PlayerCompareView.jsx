import React, { useMemo } from 'react';
import { Download, Copy } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  buildPlayerMatchLog,
  getTotales, getTramos, getTiempos, getMinutoPromedioGol,
  getRecord, getCuandoMarca, getPorTipo, getConTarjeta,
  getPorEscenario, getPorCesped, getRachas, getHitos, getCategoriasJugadas,
  TRAMOS, fmtPct, fmtRatio, fmtMinuto,
} from '../../utils/playerStats';
import { Row, SectionHeader } from './CompareRow';
import { GolesPorTramoChart } from '../charts/GolesPorTramoChart';

const COLORS = ['#D4A017', '#1F2937', '#0D9488'];

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

  const colSpan = players.length + 1;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={handleCopyClipboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          title="Copiar al portapapeles"
        >
          <Copy className="w-4 h-4" />
          Copiar
        </button>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          title="Exportar a Excel"
        >
          <Download className="w-4 h-4" />
          Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 pr-4 w-44"></th>
              {data.map((d, i) => (
                <th key={d.player.id} className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
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
            <SectionHeader title="Totales" colSpan={colSpan} />
            <Row label="PJ"             values={data.map((d) => d.totales.pj)}     highlight="max" />
            <Row label="Goles"          values={data.map((d) => d.totales.goles)}  highlight="max" />
            <Row label="Goles / Partido" values={data.map((d) => d.totales.golesPorPartido)} highlight="max" format={fmtRatio} />
            <Row label="Amarillas"      values={data.map((d) => d.totales.amarillas)} highlight="min" />
            <Row label="Rojas"          values={data.map((d) => d.totales.rojas)}     highlight="min" />
            <Row label="Titular"        values={data.map((d) => d.totales.titular)}   highlight="max" />
            <Row label="Suplente"       values={data.map((d) => d.totales.suplente)} />
            <Row label="% Titularidad"  values={data.map((d) => d.totales.pctTitularidad ?? 0)} highlight="max" format={fmtPct} />

            <SectionHeader title="Por Minuto" colSpan={colSpan} />
            {TRAMOS.map((t) => (
              <Row key={t.key} label={`Goles ${t.label}`} values={data.map((d) => d.tramos.goles[t.key])} highlight="max" />
            ))}
            <Row label="Goles 1er Tiempo" values={data.map((d) => d.tiempos.golesPrimer)}  highlight="max" />
            <Row label="Goles 2do Tiempo" values={data.map((d) => d.tiempos.golesSegundo)} highlight="max" />
            <Row label="Minuto Promedio de Gol" values={data.map((d) => d.minutoPromedio.promedio)} format={fmtMinuto} />

            <SectionHeader title="Cruces con el Resultado" colSpan={colSpan} />
            <Row label="Récord (G-E-P)" values={data.map((d) => `${d.record.g}-${d.record.e}-${d.record.p}`)} />
            <CruceRow label="% Victorias" data={data} pick={(d) => d.record} minMuestra={minMuestra} />
            {[
              ['% Victorias cuando marca',    (d) => d.cuandoMarca.conGol],
              ['% Victorias cuando no marca', (d) => d.cuandoMarca.sinGol],
              ['% Victorias de titular',      (d) => d.porTipo.titular],
              ['% Victorias de suplente',     (d) => d.porTipo.suplente],
              ['% Victorias con tarjeta',     (d) => d.conTarjeta.conTarjeta],
              ['% Victorias sin tarjeta',     (d) => d.conTarjeta.sinTarjeta],
            ].map(([label, pick]) => (
              <CruceRow key={label} label={label} data={data} pick={pick} minMuestra={minMuestra} />
            ))}

            <SectionHeader title="Cruces con el Contexto" colSpan={colSpan} />
            {['Local', 'Visitante'].map((esc) => (
              <React.Fragment key={esc}>
                <Row label={`Goles/PJ ${esc}`} values={data.map((d) => d.porEscenario[esc].golesPorPartido)} highlight="max" format={fmtRatio} />
                <CruceRow label={`% Victorias ${esc}`} data={data} pick={(d) => d.porEscenario[esc].record} minMuestra={minMuestra} />
              </React.Fragment>
            ))}
            {['Natural', 'Sintético'].map((ces) => (
              <React.Fragment key={ces}>
                <Row label={`Goles/PJ ${ces}`} values={data.map((d) => d.porCesped[ces].golesPorPartido)} highlight="max" format={fmtRatio} />
                <CruceRow label={`% Victorias ${ces}`} data={data} pick={(d) => d.porCesped[ces].record} minMuestra={minMuestra} />
              </React.Fragment>
            ))}

            <SectionHeader title="Rachas y Logros" colSpan={colSpan} />
            <Row label="Racha con gol (máx.)"     values={data.map((d) => d.rachas.conGol.maxima)}     highlight="max" />
            <Row label="Racha sin tarjeta (máx.)" values={data.map((d) => d.rachas.sinTarjeta.maxima)} highlight="max" />
            <Row label="Racha invicto (máx.)"     values={data.map((d) => d.rachas.invicto.maxima)}    highlight="max" />
            <Row label="Dobletes"                 values={data.map((d) => d.hitos.dobletes)}           highlight="max" />
            <Row label="Hat-tricks"               values={data.map((d) => d.hitos.hatTricks)}          highlight="max" />
            <Row label="Goles desde el banco"     values={data.map((d) => d.hitos.golesDesdeBanco)}    highlight="max" />
          </tbody>
        </table>

        {hayMuestraChica && (
          <p className="text-xs text-amber-600 mt-3">
            * Muestra chica: menos de {minMuestra} partidos. El porcentaje puede engañar.
          </p>
        )}
      </div>

      <GolesPorTramoChart
        series={data.map((d, i) => ({ name: names[i], tramos: d.tramos.goles }))}
        title="Goles por Tramo — Comparación"
      />
    </div>
  );
};

/**
 * Fila de porcentaje con tamaño de muestra: resalta el mejor por el valor
 * numérico, pero muestra el texto con (n=X) y el asterisco de muestra chica.
 */
const CruceRow = ({ label, data, pick, minMuestra }) => {
  const records = data.map(pick);
  return (
    <Row
      label={label}
      values={records.map((r) => (r.pj > 0 ? r.pctVictorias : 0))}
      highlight="max"
      format={(_v, i) => pctCell(records[i], minMuestra)}
    />
  );
};
