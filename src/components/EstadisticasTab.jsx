import React, { useMemo, useState } from 'react';
import { CATEGORIAS_PARTIDO, FASES_CAMPEONATO } from '../utils/constants';
import { formatDate } from '../utils/dateUtils';
import { useTableSort, thClass } from '../hooks/useTableSort.jsx';
import { FilterButtonGroup } from './ui/FilterButtonGroup';

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

const GeneralTable = ({ data }) => {
  const { handleSort, sortFn, SortIcon } = useTableSort('pj');
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
                <th className={`${thClass} text-center`} onClick={() => handleSort('amarillas')}>🟨 <SortIcon col="amarillas" /></th>
                <th className={`${thClass} text-center`} onClick={() => handleSort('rojas')}>🟥 <SortIcon col="rojas" /></th>
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
                  <td className="px-3 py-2 text-center text-gray-700">{s.amarillas > 0 ? s.amarillas : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.rojas > 0 ? s.rojas : <span className="text-gray-300">—</span>}</td>
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

// ─── Main component ──────────────────────────────────────────────────────────

export const EstadisticasTab = ({ jornadas = [], players = [] }) => {
  const [subTab, setSubTab] = useState('general');

  // Jugadores filters
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [search, setSearch] = useState('');

  // Rivales filters
  const [faseFiltro, setFaseFiltro] = useState(null);
  const [categoriaFiltroRivales, setCategoriaFiltroRivales] = useState(null);

  const allStats = useMemo(
    () => buildStats(jornadas, players, categoriaFiltro),
    [jornadas, players, categoriaFiltro]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStats.filter((s) => !q || s.name_visual.toLowerCase().includes(q));
  }, [allStats, search]);

  const partidoRows = useMemo(
    () => buildPartidoRows(jornadas, categoriaFiltroRivales, faseFiltro),
    [jornadas, categoriaFiltroRivales, faseFiltro]
  );

  const isJugadoresTab = ['general', 'goleadores', 'tarjetas'].includes(subTab);
  const isRivalesTab   = subTab === 'rivales';

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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Estadísticas</h2>
        <p className="text-sm text-gray-500 mt-1">Rendimiento de jugadores y resultados frente a rivales.</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {subTabBtn('general',     'General')}
        {subTabBtn('goleadores',  'Goleadores')}
        {subTabBtn('tarjetas',    'Tarjetas')}
        {subTabBtn('rivales', 'Por Rival')}
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
      {isRivalesTab && (
        <ResultadosFilters
          faseFiltro={faseFiltro}
          onFaseFiltro={setFaseFiltro}
          categoriaFiltro={categoriaFiltroRivales}
          onCategoriaFiltro={setCategoriaFiltroRivales}
        />
      )}

      {/* Tables */}
      {subTab === 'general'      && <GeneralTable          data={filtered} />}
      {subTab === 'goleadores'   && <GoleadoresTable        data={filtered.filter((s) => s.goles > 0)} />}
      {subTab === 'tarjetas'     && <TarjetasTable          data={filtered.filter((s) => s.amarillas > 0 || s.rojas > 0)} />}
      {subTab === 'rivales' && <RivalesTable data={partidoRows} faseFiltro={faseFiltro} />}
    </div>
  );
};
