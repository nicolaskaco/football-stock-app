import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { CATEGORIAS_PARTIDO } from '../utils/constants';
import { FilterButtonGroup } from './ui/FilterButtonGroup';

const isSuspended = (amarillas) => amarillas > 0 && amarillas % 5 === 0;

const buildCardStats = (jornadas, players) => {
  const currentYear = new Date().getFullYear();
  const map = {};

  players.forEach((p) => {
    map[p.id] = {
      name: p.name_visual || p.name,
      categoria: p.categoria,
      amarillas: 0,
      rojas: 0,
    };
  });

  jornadas
    .filter((j) => new Date(j.fecha).getFullYear() === currentYear)
    .forEach((jornada) => {
      (jornada.partidos || []).forEach((partido) => {
        (partido.partido_eventos || []).forEach((e) => {
          if (!e.player_id || !map[e.player_id]) return;
          if (e.tipo === 'amarilla') map[e.player_id].amarillas++;
          if (e.tipo === 'roja') map[e.player_id].rojas++;
        });
      });
    });

  return Object.entries(map)
    .map(([id, s]) => ({ id, ...s }))
    .filter((s) => s.amarillas > 0 || s.rojas > 0)
    .sort((a, b) => b.amarillas - a.amarillas || b.rojas - a.rojas);
};

const exportToExcel = (allRows) => {
  const wb = XLSX.utils.book_new();
  const year = new Date().getFullYear();

  CATEGORIAS_PARTIDO.forEach((cat) => {
    const rows = allRows
      .filter((r) => r.categoria === cat)
      .sort((a, b) => b.amarillas - a.amarillas || b.rojas - a.rojas);

    const wsData = [
      ['Jugador', 'Amarillas', 'Rojas', 'Estado'],
      ...rows.map((r) => [
        r.name,
        r.amarillas,
        r.rojas,
        isSuspended(r.amarillas) ? 'SUSPENDIDO' : '',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, cat);
  });

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  XLSX.writeFile(wb, `Tarjetas_${dd}-${mm}-${yyyy}.xlsx`);
};

export const TarjetasTab = ({ jornadas = [], players = [], currentUser }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterCat = searchParams.get('t_cat') || null;

  const setFilterCat = (v) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (!v) p.delete('t_cat');
      else p.set('t_cat', v);
      return p;
    });
  };

  const allRows = useMemo(() => buildCardStats(jornadas, players), [jornadas, players]);

  const visibleCats = useMemo(() => {
    if (!currentUser?.categoria || currentUser.categoria.length === 0) {
      return CATEGORIAS_PARTIDO;
    }
    return CATEGORIAS_PARTIDO.filter((c) => currentUser.categoria.includes(c));
  }, [currentUser]);

  const rows = useMemo(() => {
    return allRows.filter((r) => {
      const matchesCat = filterCat ? r.categoria === filterCat : visibleCats.includes(r.categoria);
      return matchesCat;
    });
  }, [allRows, filterCat, visibleCats]);

  const exportRows = useMemo(() => {
    return allRows.filter((r) => visibleCats.includes(r.categoria));
  }, [allRows, visibleCats]);

  const year = new Date().getFullYear();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Tarjetas {year}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Acumulado de tarjetas en partidos del año {year}
          </p>
        </div>
        <button
          onClick={() => exportToExcel(exportRows)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <FilterButtonGroup
          options={visibleCats}
          value={filterCat}
          onChange={setFilterCat}
          label="Categoría:"
          allLabel="Todas"
        />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No hay tarjetas registradas{filterCat ? ` para ${filterCat}` : ''} en {year}.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Jugador</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-center">🟨 Amarillas</th>
                <th className="px-4 py-3 text-center">🟥 Rojas</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.categoria}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-semibold text-sm">
                      {row.amarillas}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.rojas > 0 ? (
                      <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold text-sm">
                        {row.rojas}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isSuspended(row.amarillas) ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold tracking-wide">
                        SUSPENDIDO
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
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
