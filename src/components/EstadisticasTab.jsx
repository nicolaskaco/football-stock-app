import React, { useMemo, useState } from 'react';
import { CATEGORIAS_PARTIDO } from '../utils/constants';

const buildStats = (jornadas, players, categoriaFiltro) => {
  const map = {};

  players.forEach((p) => {
    map[p.id] = {
      name_visual: p.name_visual || p.name,
      categoria: p.categoria,
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
          // Player not in players prop (e.g. filtered out) — build from nested join data
          map[pp.player_id] = {
            name_visual: pp.players?.name_visual || pp.players?.name || '?',
            categoria: pp.players?.categoria || '—',
            pj: 0, titular: 0, suplente: 0, goles: 0, amarillas: 0, rojas: 0,
          };
        }
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
    .map(([id, s]) => ({
      id,
      ...s,
      ratio: s.pj > 0 ? (s.goles / s.pj).toFixed(2) : '0.00',
    }))
    .filter((s) => s.pj > 0 || s.goles > 0);
};

const SORT_DEFAULTS = { pj: 'desc', titular: 'desc', suplente: 'desc', goles: 'desc', amarillas: 'desc', rojas: 'desc', ratio: 'desc', name_visual: 'asc', categoria: 'asc' };

const TopGoleadores = ({ stats }) => {
  const top = [...stats].sort((a, b) => b.goles - a.goles).filter((s) => s.goles > 0).slice(0, 3);
  if (top.length === 0) return null;

  const podiumOrder = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[0], top[1]] : [top[0]];
  const heights = top.length === 3 ? ['h-20', 'h-28', 'h-16'] : ['h-24', 'h-20'];
  const medals = ['🥈', '🥇', '🥉'];

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
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

export const EstadisticasTab = ({ jornadas = [], players = [] }) => {
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('goles');
  const [sortDir, setSortDir] = useState('desc');

  const allStats = useMemo(
    () => buildStats(jornadas, players, categoriaFiltro),
    [jornadas, players, categoriaFiltro]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStats.filter((s) => !q || s.name_visual.toLowerCase().includes(q));
  }, [allStats, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(SORT_DEFAULTS[key] || 'desc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-yellow-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const thClass = (col) =>
    `px-3 py-2 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Estadísticas</h2>
        <p className="text-sm text-gray-500 mt-1">
          Goles, tarjetas y partidos por jugador.
        </p>
      </div>

      <TopGoleadores stats={allStats} />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar jugador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-full sm:w-56"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoriaFiltro(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!categoriaFiltro ? 'bg-black text-yellow-400' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            Todas
          </button>
          {CATEGORIAS_PARTIDO.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaFiltro(cat === categoriaFiltro ? null : cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${categoriaFiltro === cat ? 'bg-black text-yellow-400' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {sorted.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No hay datos para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className={thClass('name_visual')} onClick={() => handleSort('name_visual')}>
                    Jugador <SortIcon col="name_visual" />
                  </th>
                  <th className={thClass('categoria')} onClick={() => handleSort('categoria')}>
                    Cat <SortIcon col="categoria" />
                  </th>
                  <th className={`${thClass('pj')} text-center`} onClick={() => handleSort('pj')}>
                    PJ <SortIcon col="pj" />
                  </th>
                  <th className={`${thClass('titular')} text-center`} onClick={() => handleSort('titular')}>
                    T <SortIcon col="titular" />
                  </th>
                  <th className={`${thClass('suplente')} text-center`} onClick={() => handleSort('suplente')}>
                    S <SortIcon col="suplente" />
                  </th>
                  <th className={`${thClass('goles')} text-center`} onClick={() => handleSort('goles')}>
                    Goles <SortIcon col="goles" />
                  </th>
                  <th className={`${thClass('amarillas')} text-center`} onClick={() => handleSort('amarillas')}>
                    🟨 <SortIcon col="amarillas" />
                  </th>
                  <th className={`${thClass('rojas')} text-center`} onClick={() => handleSort('rojas')}>
                    🟥 <SortIcon col="rojas" />
                  </th>
                  <th className={`${thClass('ratio')} text-center`} onClick={() => handleSort('ratio')}>
                    G/PJ <SortIcon col="ratio" />
                  </th>
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
                    <td className="px-3 py-2 text-center text-gray-500 text-xs">{s.goles > 0 ? s.ratio : <span className="text-gray-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
