import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATEGORIAS_PARTIDO, FASES_CAMPEONATO, CANCHAS_LOCAL } from '../utils/constants';
import { formatDate } from '../utils/dateUtils';
import { useTableSort, thClass } from '../hooks/useTableSort.jsx';
import { FilterButtonGroup } from './ui/FilterButtonGroup';
import { GoalTrendChart } from './charts/GoalTrendChart';
import { CardDistributionChart } from './charts/CardDistributionChart';
import { AgeCurveChart } from './charts/AgeCurveChart';
import { RivalPerformanceChart } from './charts/RivalPerformanceChart';
import { ArbitroPerformanceChart } from './charts/ArbitroPerformanceChart';

// ─── Player stats helpers ────────────────────────────────────────────────────

const buildStats = (jornadas, players, categoriaFiltro) => {
  const map = {};

  players.forEach((p) => {
    map[p.id] = {
      name_visual: p.name_visual || p.name,
      categoriasSet: new Set(),
      pj: 0,
      titular: 0,
      suplente: 0,
      goles: 0,
      amarillas: 0,
      rojas: 0,
    };
  });

  jornadas.forEach((jornada) => {
    (jornada.partidos || []).forEach((partido) => {
      if (categoriaFiltro && partido.categoria !== categoriaFiltro) return;

      (partido.partido_players || []).forEach((pp) => {
        if (!pp.player_id) return;
        if (!map[pp.player_id]) {
          map[pp.player_id] = {
            name_visual: pp.players?.name_visual || pp.players?.name || '?',
            categoriasSet: new Set(),
            pj: 0, titular: 0, suplente: 0, goles: 0, amarillas: 0, rojas: 0,
          };
        }
        map[pp.player_id].categoriasSet.add(partido.categoria);
        map[pp.player_id].pj++;
        if (pp.tipo === 'titular')  map[pp.player_id].titular++;
        if (pp.tipo === 'suplente') map[pp.player_id].suplente++;
      });

      (partido.partido_eventos || []).forEach((e) => {
        if (!e.player_id || !map[e.player_id]) return;
        if (e.tipo === 'gol')      map[e.player_id].goles++;
        if (e.tipo === 'amarilla') map[e.player_id].amarillas++;
        if (e.tipo === 'roja')     map[e.player_id].rojas++;
      });
    });
  });

  return Object.entries(map)
    .map(([id, s]) => {
      const { categoriasSet, ...rest } = s;
      const categoria = CATEGORIAS_PARTIDO
        .filter((c) => categoriasSet.has(c))
        .join('/') || '—';
      return {
        id,
        ...rest,
        categoria,
        golesRatio:     s.pj > 0 ? (s.goles / s.pj).toFixed(2)     : '0.00',
        amarillasRatio: s.pj > 0 ? (s.amarillas / s.pj).toFixed(2) : '0.00',
      };
    })
    .filter((s) => s.pj > 0 || s.goles > 0 || s.amarillas > 0 || s.rojas > 0);
};

// ─── Convocatorias by year helper ────────────────────────────────────────────

const buildConvocatoriasByYear = (jornadas, categoriaFiltro) => {
  const result = {}; // { player_id: { year: { total, titular, suplente } } }
  jornadas.forEach((jornada) => {
    if (!jornada.fecha) return;
    const year = new Date(jornada.fecha).getFullYear();
    (jornada.partidos || []).forEach((partido) => {
      if (categoriaFiltro && partido.categoria !== categoriaFiltro) return;
      (partido.partido_players || []).forEach((pp) => {
        if (!pp.player_id) return;
        if (!result[pp.player_id]) result[pp.player_id] = {};
        if (!result[pp.player_id][year]) result[pp.player_id][year] = { total: 0, titular: 0, suplente: 0 };
        result[pp.player_id][year].total++;
        if (pp.tipo === 'titular') result[pp.player_id][year].titular++;
        else result[pp.player_id][year].suplente++;
      });
    });
  });
  return result;
};

// ─── Rivales stats helpers ───────────────────────────────────────────────────

const buildPartidoRows = (jornadas, categoriaFiltro, faseFiltro) => {
  const rows = [];
  jornadas.forEach((jornada) => {
    if (faseFiltro && jornada.fase !== faseFiltro) return;
    (jornada.partidos || []).forEach((partido) => {
      if (categoriaFiltro && partido.categoria !== categoriaFiltro) return;

      const capGoles   = partido.escenario === 'Local' ? partido.goles_local    : partido.goles_visitante;
      const rivalGoles = partido.escenario === 'Local' ? partido.goles_visitante : partido.goles_local;

      let resultado = null;
      if (capGoles != null && rivalGoles != null) {
        resultado = capGoles > rivalGoles ? 'G' : capGoles < rivalGoles ? 'P' : 'E';
      }

      // Agrupar goles por jugador
      const golesMap = {};
      (partido.partido_eventos || [])
        .filter((e) => e.tipo === 'gol')
        .forEach((e) => {
          const pp = (partido.partido_players || []).find((p) => p.player_id === e.player_id);
          const name = pp?.players?.name_visual || pp?.players?.name || '?';
          golesMap[e.player_id] = { name, count: (golesMap[e.player_id]?.count || 0) + 1 };
        });

      rows.push({
        rival: jornada.rivales?.name || '—',
        rival_id: jornada.rival_id,
        fecha: jornada.fecha,
        fase: jornada.fase,
        numero_jornada: jornada.numero_jornada || null,
        categoria: partido.categoria,
        escenario: partido.escenario,
        cancha: partido.cancha || null,
        capGoles,
        rivalGoles,
        resultado,
        goleadores: Object.values(golesMap),
        partido_id: partido.id,
      });
    });
  });
  return rows;
};

// ─── Cancha stats helper ─────────────────────────────────────────────────────

const ALL_LOCATIONS = [...CANCHAS_LOCAL, 'Visitante'];

const buildCanchaStats = (rows) => {
  const map = Object.fromEntries(
    ALL_LOCATIONS.map((loc) => [loc, { loc, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 }])
  );

  rows.forEach((row) => {
    const key =
      row.escenario === 'Local'
        ? (row.cancha && map[row.cancha] ? row.cancha : 'Ciudad Deportiva')
        : 'Visitante';
    const s = map[key];
    s.pj++;
    if (row.resultado === 'G') s.g++;
    else if (row.resultado === 'E') s.e++;
    else if (row.resultado === 'P') s.p++;
    if (row.capGoles != null) s.gf += row.capGoles;
    if (row.rivalGoles != null) s.gc += row.rivalGoles;
  });

  const localRows = CANCHAS_LOCAL.map((loc) => map[loc]);
  const localTotal = localRows.reduce(
    (acc, r) => ({
      loc: 'Local Total',
      pj: acc.pj + r.pj,
      g: acc.g + r.g,
      e: acc.e + r.e,
      p: acc.p + r.p,
      gf: acc.gf + r.gf,
      gc: acc.gc + r.gc,
    }),
    { loc: 'Local Total', pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 }
  );

  return [...localRows, localTotal, map['Visitante']];
};

// ─── Árbitro stats helper ─────────────────────────────────────────────────────

const buildArbitroStats = (jornadas, categoriaFiltro) => {
  const map = {};

  jornadas.forEach((jornada) => {
    (jornada.partidos || []).forEach((partido) => {
      if (!partido.arbitro) return;
      if (categoriaFiltro && partido.categoria !== categoriaFiltro) return;

      const key = partido.arbitro.trim();
      if (!map[key]) map[key] = { arbitro: key, pj: 0, g: 0, e: 0, p: 0, amarillas: 0, rojas: 0, g_rivals: [], e_rivals: [], p_rivals: [] };

      const s = map[key];
      s.pj++;

      const capGoles   = partido.escenario === 'Local' ? partido.goles_local    : partido.goles_visitante;
      const rivalGoles = partido.escenario === 'Local' ? partido.goles_visitante : partido.goles_local;
      const rivalName  = jornada.rivales?.name || null;

      if (capGoles != null && rivalGoles != null) {
        if (capGoles > rivalGoles) { s.g++; if (rivalName) s.g_rivals.push(rivalName); }
        else if (capGoles < rivalGoles) { s.p++; if (rivalName) s.p_rivals.push(rivalName); }
        else { s.e++; if (rivalName) s.e_rivals.push(rivalName); }
      }

      (partido.partido_eventos || []).forEach((e) => {
        if (e.tipo === 'amarilla') s.amarillas++;
        if (e.tipo === 'roja') s.rojas++;
      });
    });
  });

  return Object.values(map)
    .filter((d) => d.pj > 0)
    .map((d) => ({ ...d, efectividad: ((d.g * 3 + d.e) / (d.pj * 3)) * 100 }))
    .sort((a, b) => b.pj - a.pj);
};

// ─── Player filter ───────────────────────────────────────────────────────────

const Filters = ({ search, onSearch, categoriaFiltro, onCategoriaFiltro }) => (
  <div className="flex flex-col sm:flex-row gap-3">
    <input
      type="text"
      placeholder="Buscar jugador..."
      value={search}
      onChange={(e) => onSearch(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-full sm:w-56"
    />
    <FilterButtonGroup options={CATEGORIAS_PARTIDO} value={categoriaFiltro} onChange={onCategoriaFiltro} />
  </div>
);

// ─── Rivales filter ──────────────────────────────────────────────────────────

const ResultadosFilters = ({ faseFiltro, onFaseFiltro, categoriaFiltro, onCategoriaFiltro }) => (
  <div className="flex flex-col gap-3">
    <FilterButtonGroup options={FASES_CAMPEONATO} value={faseFiltro} onChange={onFaseFiltro} label="Fase:" />
    <FilterButtonGroup options={CATEGORIAS_PARTIDO} value={categoriaFiltro} onChange={onCategoriaFiltro} label="Cat:" />
  </div>
);

// ─── Result badge helper ─────────────────────────────────────────────────────

const ResultadoBadge = ({ resultado, capGoles, rivalGoles }) => {
  if (capGoles == null || rivalGoles == null) {
    return <span className="text-gray-400 text-xs">Sin resultado</span>;
  }
  const text = `${capGoles} - ${rivalGoles}`;
  const cls =
    resultado === 'G' ? 'bg-green-100 text-green-800' :
    resultado === 'P' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{text}</span>;
};

// ─── Player tables ───────────────────────────────────────────────────────────

const TopGoleadores = ({ stats }) => {
  const top = [...stats].sort((a, b) => b.goles - a.goles).filter((s) => s.goles > 0).slice(0, 3);
  if (top.length === 0) return null;

  const podiumOrder = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : [top[0]];
  const heights = top.length === 3 ? ['h-20', 'h-28', 'h-16'] : top.length === 2 ? ['h-20', 'h-28'] : ['h-28'];
  const medals = top.length === 1 ? ['🥇'] : ['🥈', '🥇', '🥉'];

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-2">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Top Goleadores</h3>
      <div className="flex items-end justify-center gap-4">
        {podiumOrder.map((player, i) => (
          <div key={player.id} className="flex flex-col items-center gap-2">
            <span className="text-2xl">{medals[i]}</span>
            <div className="text-center">
              <p className="font-bold text-gray-900 text-sm">{player.name_visual}</p>
              <p className="text-xs text-gray-500">{player.categoria}</p>
            </div>
            <div className={`w-20 ${heights[i]} bg-gradient-to-t from-gray-900 to-gray-700 rounded-t-lg flex items-center justify-center`}>
              <span className="text-yellow-400 font-bold text-xl">⚽ {player.goles}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const GeneralTable = ({ data, convocatoriasByYear = {}, availableYears = [] }) => {
  const { handleSort, sortFn, SortIcon } = useTableSort('pj');
  const enriched = data.map((s) => {
    const row = { ...s };
    availableYears.forEach((year) => {
      row[`conv_${year}`] = convocatoriasByYear[s.id]?.[year]?.total ?? 0;
    });
    return row;
  });
  const sorted = sortFn(enriched);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {sorted.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No hay datos para mostrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className={thClass} onClick={() => handleSort('name_visual')}>Jugador <SortIcon col="name_visual" /></th>
                <th className={thClass} onClick={() => handleSort('categoria')}>Cat <SortIcon col="categoria" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('pj')}>PJ <SortIcon col="pj" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('titular')}>T <SortIcon col="titular" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('suplente')}>S <SortIcon col="suplente" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('goles')}>Goles <SortIcon col="goles" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('amarillas')}>🟨 <SortIcon col="amarillas" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('rojas')}>🟥 <SortIcon col="rojas" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('golesRatio')}>G/PJ <SortIcon col="golesRatio" /></th>
                {availableYears.map((year) => (
                  <th key={year} className={`${thClass} text-center whitespace-nowrap`} onClick={() => handleSort(`conv_${year}`)}>
                    Conv {String(year).slice(2)} <SortIcon col={`conv_${year}`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{s.name_visual}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{s.categoria}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.pj}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.titular}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.suplente}</td>
                  <td className="px-3 py-2 text-center font-semibold text-green-700">{s.goles > 0 ? s.goles : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.amarillas > 0 ? s.amarillas : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.rojas > 0 ? s.rojas : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-center text-gray-500 text-xs">{s.goles > 0 ? s.golesRatio : <span className="text-gray-300">—</span>}</td>
                  {availableYears.map((year) => {
                    const ydata = convocatoriasByYear[s.id]?.[year];
                    return (
                      <td key={year} className="px-3 py-2 text-center text-xs whitespace-nowrap">
                        {ydata
                          ? <span className="text-gray-800">{ydata.total} <span className="text-gray-400">({ydata.titular}T/{ydata.suplente}S)</span></span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const GoleadoresTable = ({ data }) => {
  const { handleSort, sortFn, SortIcon } = useTableSort('goles');
  const sorted = sortFn(data);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {sorted.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No hay datos para mostrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className={thClass} onClick={() => handleSort('name_visual')}>Jugador <SortIcon col="name_visual" /></th>
                <th className={thClass} onClick={() => handleSort('categoria')}>Cat <SortIcon col="categoria" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('pj')}>PJ <SortIcon col="pj" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('titular')}>T <SortIcon col="titular" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('suplente')}>S <SortIcon col="suplente" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('goles')}>Goles <SortIcon col="goles" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('golesRatio')}>G/PJ <SortIcon col="golesRatio" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{s.name_visual}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{s.categoria}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.pj}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.titular}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.suplente}</td>
                  <td className="px-3 py-2 text-center font-semibold text-green-700">{s.goles > 0 ? s.goles : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-center text-gray-500 text-xs">{s.goles > 0 ? s.golesRatio : <span className="text-gray-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const TarjetasTable = ({ data }) => {
  const { handleSort, sortFn, SortIcon } = useTableSort('amarillas');
  const sorted = sortFn(data);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {sorted.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No hay datos para mostrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className={thClass} onClick={() => handleSort('name_visual')}>Jugador <SortIcon col="name_visual" /></th>
                <th className={thClass} onClick={() => handleSort('categoria')}>Cat <SortIcon col="categoria" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('pj')}>PJ <SortIcon col="pj" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('titular')}>T <SortIcon col="titular" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('suplente')}>S <SortIcon col="suplente" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('amarillas')}>🟨 <SortIcon col="amarillas" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('rojas')}>🟥 <SortIcon col="rojas" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('amarillasRatio')}>Am/PJ <SortIcon col="amarillasRatio" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{s.name_visual}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{s.categoria}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.pj}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.titular}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.suplente}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.amarillas > 0 ? s.amarillas : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.rojas > 0 ? s.rojas : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-center text-gray-500 text-xs">{s.amarillas > 0 ? s.amarillasRatio : <span className="text-gray-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Rivales tables ──────────────────────────────────────────────────────────

const catIdx = (cat) => {
  const i = CATEGORIAS_PARTIDO.indexOf(cat);
  return i === -1 ? 99 : i;
};

const RivalesTable = ({ data, faseFiltro }) => {
  const { handleSort, SortIcon, sortKey, sortDir } = useTableSort('fecha', 'desc');
  const showFase = !faseFiltro;

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let primary = 0;
      if (sortKey === 'categoria') {
        primary = sortDir === 'asc'
          ? catIdx(a.categoria) - catIdx(b.categoria)
          : catIdx(b.categoria) - catIdx(a.categoria);
      } else {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === 'string') {
          primary = sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        } else {
          primary = sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
        }
      }
      if (primary !== 0) return primary;
      return catIdx(a.categoria) - catIdx(b.categoria);
    });
  }, [data, sortKey, sortDir]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {sorted.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No hay datos para mostrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className={`${thClass} text-center w-10`} onClick={() => handleSort('numero_jornada')}># <SortIcon col="numero_jornada" /></th>
                {showFase && <th className={`${thClass} text-center`} onClick={() => handleSort('fase')}>Fase <SortIcon col="fase" /></th>}
                <th className={thClass} onClick={() => handleSort('rival')}>Rival <SortIcon col="rival" /></th>
                <th className={thClass} onClick={() => handleSort('fecha')}>Fecha <SortIcon col="fecha" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('categoria')}>Cat <SortIcon col="categoria" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('escenario')}>Esc <SortIcon col="escenario" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('resultado')}>Resultado <SortIcon col="resultado" /></th>
                <th className={thClass}>Goles CAP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((row) => (
                <tr key={row.partido_id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-center text-xs text-gray-400 w-10">{row.numero_jornada ?? '—'}</td>
                  {showFase && <td className="px-3 py-2 text-center text-xs text-gray-500">{row.fase || '—'}</td>}
                  <td className="px-3 py-2 font-medium text-gray-900">{row.rival}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{formatDate(row.fecha)}</td>
                  <td className="px-3 py-2 text-center text-xs text-gray-600">{row.categoria}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.escenario === 'Local' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {row.escenario}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <ResultadoBadge resultado={row.resultado} capGoles={row.capGoles} rivalGoles={row.rivalGoles} />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {row.goleadores.length === 0
                      ? <span className="text-gray-300">—</span>
                      : row.goleadores.map((g) => (
                          <span key={g.name} className="mr-2 whitespace-nowrap">
                            {g.name}{g.count > 1 && <span className="text-green-700 font-semibold"> ⚽×{g.count}</span>}
                            {g.count === 1 && <span className="text-green-700"> ⚽</span>}
                          </span>
                        ))
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Cancha stats table ───────────────────────────────────────────────────────

const CanchaStatsTable = ({ data }) => {
  const total = data.find((r) => r.loc === 'Local Total');
  const hasAny = data.some((r) => r.pj > 0);

  if (!hasAny) {
    return (
      <div className="bg-white rounded-lg shadow">
        <p className="text-center text-gray-500 py-12">No hay datos para mostrar.</p>
      </div>
    );
  }

  const efect = (r) =>
    r.pj > 0 ? (((r.g * 3 + r.e) / (r.pj * 3)) * 100).toFixed(1) + '%' : '—';
  const dif = (r) => {
    const d = r.gf - r.gc;
    return d > 0 ? `+${d}` : `${d}`;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Cancha / Escenario</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600">PJ</th>
              <th className="px-3 py-3 text-center font-semibold text-green-700">G</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-500">E</th>
              <th className="px-3 py-3 text-center font-semibold text-red-700">P</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600">GF</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600">GC</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600">Dif</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600">Efect.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => {
              const isLocalTotal = row.loc === 'Local Total';
              const isVisitante = row.loc === 'Visitante';
              const d = row.gf - row.gc;

              const rowBg = isLocalTotal
                ? 'bg-green-100'
                : isVisitante
                ? 'bg-blue-50'
                : 'bg-green-50';
              const nameCls = isLocalTotal
                ? 'font-bold text-green-900'
                : isVisitante
                ? 'font-semibold text-blue-900'
                : 'text-green-800';
              const greyOut = row.pj === 0 && !isLocalTotal ? 'opacity-40' : '';

              return (
                <tr key={row.loc} className={`${rowBg} ${greyOut}`}>
                  <td className={`px-4 py-3 ${nameCls}`}>
                    {isVisitante ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">Visitante</span>
                      </span>
                    ) : isLocalTotal ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-900 font-bold">Local Total</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 pl-4">
                        <span className="text-xs text-gray-400 mr-1">↳</span>
                        {row.loc}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-gray-800">{row.pj || '—'}</td>
                  <td className="px-3 py-3 text-center font-bold text-green-700">{row.pj > 0 ? row.g : '—'}</td>
                  <td className="px-3 py-3 text-center text-gray-600">{row.pj > 0 ? row.e : '—'}</td>
                  <td className="px-3 py-3 text-center font-bold text-red-600">{row.pj > 0 ? row.p : '—'}</td>
                  <td className="px-3 py-3 text-center text-gray-700">{row.pj > 0 ? row.gf : '—'}</td>
                  <td className="px-3 py-3 text-center text-gray-700">{row.pj > 0 ? row.gc : '—'}</td>
                  <td className={`px-3 py-3 text-center font-semibold ${row.pj > 0 ? (d > 0 ? 'text-green-700' : d < 0 ? 'text-red-600' : 'text-gray-500') : 'text-gray-300'}`}>
                    {row.pj > 0 ? dif(row) : '—'}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700 font-medium">{efect(row)}</td>
                </tr>
              );
            })}
          </tbody>
          {total && (
            <tfoot className="border-t-2 border-gray-300 bg-gray-50">
              <tr>
                <td colSpan={9} className="px-4 py-2 text-xs text-gray-400 italic">
                  Efect. = (Victorias×3 + Empates) / (PJ×3) × 100
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// ─── Árbitro stats table ──────────────────────────────────────────────────────

const ArbitroStatsTable = ({ data }) => {
  const { handleSort, sortFn, SortIcon } = useTableSort('pj');
  const sorted = sortFn(data);

  const efect = (r) =>
    r.pj > 0 ? (((r.g * 3 + r.e) / (r.pj * 3)) * 100).toFixed(1) + '%' : '—';

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {sorted.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No hay datos de árbitros.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className={thClass} onClick={() => handleSort('arbitro')}>Árbitro <SortIcon col="arbitro" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('pj')}>PJ <SortIcon col="pj" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('g')}>G <SortIcon col="g" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('e')}>E <SortIcon col="e" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('p')}>P <SortIcon col="p" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('amarillas')}>🟨 <SortIcon col="amarillas" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('rojas')}>🟥 <SortIcon col="rojas" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('efectividad')}>Efect. <SortIcon col="efectividad" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((row) => (
                <tr key={row.arbitro} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{row.arbitro}</td>
                  <td className="px-3 py-2 text-center font-semibold text-gray-800">{row.pj}</td>
                  <td className="px-3 py-2 text-center font-bold text-green-700">
                    {row.g > 0 ? (
                      <div>
                        <span>{row.g}</span>
                        {row.g_rivals?.length > 0 && (
                          <div className="text-xs font-normal text-green-600 whitespace-normal leading-tight mt-0.5">{row.g_rivals.join(', ')}</div>
                        )}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600">
                    {row.e > 0 ? (
                      <div>
                        <span>{row.e}</span>
                        {row.e_rivals?.length > 0 && (
                          <div className="text-xs font-normal text-gray-500 whitespace-normal leading-tight mt-0.5">{row.e_rivals.join(', ')}</div>
                        )}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-red-600">
                    {row.p > 0 ? (
                      <div>
                        <span>{row.p}</span>
                        {row.p_rivals?.length > 0 && (
                          <div className="text-xs font-normal text-red-400 whitespace-normal leading-tight mt-0.5">{row.p_rivals.join(', ')}</div>
                        )}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700">{row.amarillas > 0 ? row.amarillas : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{row.rojas > 0 ? row.rojas : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-center text-gray-700 font-medium">{efect(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

export const EstadisticasTab = ({ jornadas = [], players = [] }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const setParam = (key, value, defaultValue) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (value === null || value === undefined || value === defaultValue || value === '') {
        p.delete(key);
      } else {
        p.set(key, String(value));
      }
      return p;
    });
  };

  const subTab = searchParams.get('e_tab') || 'general';
  const setSubTab = (v) => setParam('e_tab', v, 'general');

  // Year filter
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years = [...new Set(
      jornadas.map((j) => j.fecha ? new Date(j.fecha).getFullYear() : null).filter(Boolean)
    )].sort((a, b) => b - a);
    if (!years.includes(currentYear)) years.unshift(currentYear);
    return years;
  }, [jornadas]);
  const selectedYear = Number(searchParams.get('e_year')) || currentYear;
  const setSelectedYear = (v) => setParam('e_year', v, currentYear);

  const filteredJornadas = useMemo(
    () => jornadas.filter((j) => j.fecha && new Date(j.fecha).getFullYear() === selectedYear),
    [jornadas, selectedYear]
  );

  // Jugadores filters
  const categoriaFiltro = searchParams.get('e_cat') || null;
  const setCategoriaFiltro = (v) => setParam('e_cat', v, null);
  const [search, setSearch] = useState('');

  // Rivales filters
  const [faseFiltro, setFaseFiltro] = useState(null);
  const [categoriaFiltroRivales, setCategoriaFiltroRivales] = useState(null);

  const allStats = useMemo(
    () => buildStats(filteredJornadas, players, categoriaFiltro),
    [filteredJornadas, players, categoriaFiltro]
  );

  const convocatoriasByYear = useMemo(
    () => buildConvocatoriasByYear(jornadas, categoriaFiltro),
    [jornadas, categoriaFiltro]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStats.filter((s) => !q || s.name_visual.toLowerCase().includes(q));
  }, [allStats, search]);

  const partidoRows = useMemo(
    () => buildPartidoRows(filteredJornadas, categoriaFiltroRivales, faseFiltro),
    [filteredJornadas, categoriaFiltroRivales, faseFiltro]
  );

  const arbitroStats = useMemo(
    () => buildArbitroStats(filteredJornadas, categoriaFiltroRivales),
    [filteredJornadas, categoriaFiltroRivales]
  );

  const isJugadoresTab = ['general', 'goleadores', 'tarjetas'].includes(subTab);
  const isRivalesTab   = subTab === 'rivales';
  const isCanchaTab    = subTab === 'cancha';
  const isGraficosTab  = subTab === 'graficos';
  const isArbitrosTab  = subTab === 'arbitros';

  const subTabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setSubTab(id)}
      className={`px-4 py-2 rounded-lg text-sm font-medium ${subTab === id ? 'bg-black text-yellow-400' : 'bg-white text-gray-600 border border-gray-200'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Estadísticas</h2>
          <p className="text-sm text-gray-500 mt-1">Rendimiento de jugadores y resultados frente a rivales.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Año:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {subTabBtn('general',     'General')}
        {subTabBtn('goleadores',  'Goleadores')}
        {subTabBtn('tarjetas',    'Tarjetas')}
        {subTabBtn('rivales',     'Por Rival')}
        {subTabBtn('cancha',      'Por Cancha')}
        {subTabBtn('arbitros',    'Árbitros')}
        {subTabBtn('graficos',    'Gráficos')}
      </div>

      {/* Top goleadores podium */}
      {subTab === 'goleadores' && <TopGoleadores stats={allStats} />}

      {/* Filters */}
      {isJugadoresTab && (
        <Filters
          search={search}
          onSearch={setSearch}
          categoriaFiltro={categoriaFiltro}
          onCategoriaFiltro={setCategoriaFiltro}
        />
      )}
      {(isRivalesTab || isCanchaTab || isGraficosTab) && (
        <ResultadosFilters
          faseFiltro={faseFiltro}
          onFaseFiltro={setFaseFiltro}
          categoriaFiltro={categoriaFiltroRivales}
          onCategoriaFiltro={setCategoriaFiltroRivales}
        />
      )}
      {isArbitrosTab && (
        <FilterButtonGroup
          options={CATEGORIAS_PARTIDO}
          value={categoriaFiltroRivales}
          onChange={setCategoriaFiltroRivales}
          label="Cat:"
        />
      )}

      {/* Tables */}
      {subTab === 'general'      && <GeneralTable          data={filtered} convocatoriasByYear={convocatoriasByYear} availableYears={availableYears} />}
      {subTab === 'goleadores'   && <GoleadoresTable        data={filtered.filter((s) => s.goles > 0)} />}
      {subTab === 'tarjetas'     && <TarjetasTable          data={filtered.filter((s) => s.amarillas > 0 || s.rojas > 0)} />}
      {subTab === 'rivales' && <RivalesTable data={partidoRows} faseFiltro={faseFiltro} />}
      {subTab === 'cancha'  && <CanchaStatsTable data={buildCanchaStats(partidoRows)} />}
      {isArbitrosTab && (
        <div className="space-y-6">
          <ArbitroPerformanceChart jornadas={filteredJornadas} categoriaFiltro={categoriaFiltroRivales} />
          <ArbitroStatsTable data={arbitroStats} />
        </div>
      )}

      {/* Charts tab */}
      {isGraficosTab && (
        <div className="space-y-6">
          <GoalTrendChart jornadas={filteredJornadas} categoriaFiltro={categoriaFiltroRivales} />
          <CardDistributionChart jornadas={filteredJornadas} categoriaFiltro={categoriaFiltroRivales} />
          <RivalPerformanceChart jornadas={filteredJornadas} categoriaFiltro={categoriaFiltroRivales} />
          <AgeCurveChart players={players} categoriaFiltro={categoriaFiltroRivales} />
        </div>
      )}
    </div>
  );
};
