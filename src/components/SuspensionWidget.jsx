import React, { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { CATEGORIAS_PARTIDO } from '../utils/constants';
import { getCurrentSuspensionsByCategory } from '../utils/suspensions';

const buildCardStats = (jornadas, players) => {
  const currentYear = new Date().getFullYear();
  const playerMap = {};
  players.forEach((p) => {
    playerMap[p.id] = { name: p.name_visual || p.name };
  });

  const map = {};

  jornadas
    .filter((j) => new Date(j.fecha).getFullYear() === currentYear)
    .forEach((jornada) => {
      (jornada.partidos || []).forEach((partido) => {
        const cat = partido.categoria;
        (partido.partido_eventos || []).forEach((e) => {
          if (!e.player_id || !playerMap[e.player_id]) return;
          if (e.tipo !== 'amarilla' && e.tipo !== 'roja') return;
          const key = `${e.player_id}::${cat}`;
          if (!map[key]) {
            map[key] = {
              id: e.player_id,
              name: playerMap[e.player_id].name,
              categoria: cat,
              amarillas: 0,
              rojas: 0,
            };
          }
          if (e.tipo === 'amarilla') map[key].amarillas++;
          if (e.tipo === 'roja') map[key].rojas++;
        });
      });
    });

  return Object.values(map);
};

export const SuspensionWidget = ({ jornadas = [], players = [], currentUser }) => {
  const [catFiltro, setCatFiltro] = useState(null);

  const cardStats = useMemo(() => buildCardStats(jornadas, players), [jornadas, players]);

  const suspensionsMap = useMemo(() => getCurrentSuspensionsByCategory(jornadas), [jornadas]);

  const visibleCats = useMemo(() => {
    if (!currentUser?.categoria || currentUser.categoria.length === 0) {
      return CATEGORIAS_PARTIDO;
    }
    return CATEGORIAS_PARTIDO.filter((c) => currentUser.categoria.includes(c));
  }, [currentUser]);

  const rows = useMemo(() => {
    const list = cardStats
      .filter((r) => {
        const inCats = catFiltro ? r.categoria === catFiltro : visibleCats.includes(r.categoria);
        if (!inCats) return false;
        const isSuspended = suspensionsMap.get(r.categoria)?.has(r.id);
        return r.amarillas >= 2 || isSuspended;
      })
      .map((r) => ({
        ...r,
        suspension: suspensionsMap.get(r.categoria)?.get(r.id) || null,
      }));

    list.sort((a, b) => {
      const aSusp = a.suspension ? 1 : 0;
      const bSusp = b.suspension ? 1 : 0;
      if (bSusp !== aSusp) return bSusp - aSusp;
      return b.amarillas - a.amarillas || b.rojas - a.rojas;
    });

    return list;
  }, [cardStats, suspensionsMap, catFiltro, visibleCats]);

  const suspendedCount = rows.filter((r) => r.suspension).length;

  if (rows.length === 0 && !catFiltro) return null;

  const categorias = [...new Set(cardStats
    .filter((r) => visibleCats.includes(r.categoria) && (r.amarillas >= 2 || suspensionsMap.get(r.categoria)?.has(r.id)))
    .map((r) => r.categoria)
  )].sort((a, b) => {
    const ai = CATEGORIAS_PARTIDO.indexOf(a);
    const bi = CATEGORIAS_PARTIDO.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-6 h-6 text-yellow-600" />
        <h3 className="text-lg font-bold">Suspensiones</h3>
        <div className="ml-auto flex items-center gap-1">
          {suspendedCount > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
              {suspendedCount} suspendido{suspendedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Categoria filter pills */}
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

      <div className="space-y-2 overflow-y-auto max-h-96 pr-1">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No hay jugadores con tarjetas acumuladas{catFiltro ? ` en ${catFiltro}` : ''}.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={`${row.id}::${row.categoria}`}
              className={`flex items-center justify-between border-l-4 pl-3 py-2 ${row.suspension ? 'border-red-400 bg-red-50' : 'border-yellow-400 bg-yellow-50'}`}
            >
              <div>
                <p className="font-medium text-sm">{row.name}</p>
                <p className="text-xs text-gray-500">{row.categoria}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-semibold text-xs">
                  🟨 {row.amarillas}
                </span>
                {row.rojas > 0 && (
                  <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold text-xs">
                    🟥 {row.rojas}
                  </span>
                )}
                {row.suspension && (
                  <div className="flex flex-col items-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold tracking-wide">
                      SUSPENDIDO
                    </span>
                    <span className="text-[9px] text-red-500 font-medium">
                      {row.suspension.reason}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
