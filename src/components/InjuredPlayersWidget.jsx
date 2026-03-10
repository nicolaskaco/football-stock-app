import React, { useState } from 'react';
import { CATEGORIAS } from '../utils/constants';

const severityBadge = {
  leve: 'bg-yellow-100 text-yellow-800',
  moderada: 'bg-orange-100 text-orange-800',
  grave: 'bg-red-100 text-red-800',
};

export const InjuredPlayersWidget = ({ players = [], injuries = [] }) => {
  const [catFiltro, setCatFiltro] = useState(null);

  // Only active (open) injuries
  const active = injuries.filter(inj => !inj.fecha_alta);
  if (active.length === 0) return null;

  const playerMap = {};
  players.forEach(p => { playerMap[p.id] = p; });

  // Category order for sorting
  const catOrder = {};
  CATEGORIAS.forEach((c, i) => { catOrder[c] = i; });

  const rows = active
    .map(inj => ({ ...inj, player: playerMap[inj.player_id] }))
    .filter(r => r.player)
    .filter(r => !catFiltro || r.player.categoria === catFiltro)
    .sort((a, b) => {
      const catDiff = (catOrder[a.player.categoria] ?? 99) - (catOrder[b.player.categoria] ?? 99);
      if (catDiff !== 0) return catDiff;
      return new Date(a.fecha_inicio) - new Date(b.fecha_inicio);
    });

  // Categories that have active injuries (for filter pills)
  const categorias = CATEGORIAS.filter(cat =>
    active.some(inj => playerMap[inj.player_id]?.categoria === cat)
  );

  const formatDate = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-5 h-5" aria-hidden="true">
            <rect x="0" y="0" width="16" height="16" rx="2" fill="#dc2626" />
            <rect x="6" y="2" width="4" height="12" rx="0.5" fill="white" />
            <rect x="2" y="6" width="12" height="4" rx="0.5" fill="white" />
          </svg>
          Jugadores Lesionados
        </h3>
        <span className="text-sm font-bold text-red-600">{rows.length}</span>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        <button
          onClick={() => setCatFiltro(null)}
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition ${!catFiltro ? 'bg-black text-yellow-400 border-black' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
        >
          Todas
        </button>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFiltro(cat === catFiltro ? null : cat)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition ${catFiltro === cat ? 'bg-black text-yellow-400 border-black' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="space-y-2 overflow-y-auto">
        {rows.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {r.player.name_visual || r.player.name}
                <span className="ml-2 text-xs font-normal text-gray-500">{r.player.categoria}</span>
              </p>
              <p className="text-xs text-gray-500">{r.tipo} — desde {formatDate(r.fecha_inicio)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${severityBadge[r.severidad] || 'bg-gray-100 text-gray-600'}`}>
                {r.severidad}
              </span>
              {r.fecha_retorno_estimada && (
                <span className="text-xs text-gray-500">↩ {formatDate(r.fecha_retorno_estimada)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
