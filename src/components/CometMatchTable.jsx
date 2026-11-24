import React from 'react';

const STATUS_BADGE = {
  id:        { label: 'COMET ID', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  nombre:    { label: 'Nombre',   cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  dudoso:    { label: 'Revisar',  cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  manual:    { label: 'Manual',   cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  sin_match: { label: 'Sin match', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

/**
 * Tabla de revisión de los jugadores de un informe COMET: cada renglón del informe con el
 * jugador asignado (editable) y si se guarda su COMET ID. La usan CometImportPanel y
 * CometBulkImportPanel.
 */
export const CometMatchTable = ({ rows, players = [], categoria, onUpdateRow }) => {
  const updateRow = onUpdateRow;

  const activos = players
    .filter((p) => !p.status || p.status === 'activo')
    .sort((a, b) => {
      const aPropia = a.categoria === categoria || a.categoria_juego === categoria ? 0 : 1;
      const bPropia = b.categoria === categoria || b.categoria_juego === categoria ? 0 : 1;
      if (aPropia !== bPropia) return aPropia - bPropia;
      return (a.name_visual || a.name).localeCompare(b.name_visual || b.name);
    });

  const optionsFor = (row) => {
    const usadosEnOtras = new Set(rows.filter((r) => r !== row && r.player_id).map((r) => r.player_id));
    const candidatos = row.candidatos.map((id) => players.find((p) => p.id === id)).filter(Boolean);
    const resto = activos.filter((p) => !row.candidatos.includes(p.id));
    return [...candidatos, ...resto].filter((p) => !usadosEnOtras.has(p.id) || p.id === row.player_id);
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white dark:bg-gray-900 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Informe</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Jugador</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap" title="Guardar el COMET ID en el jugador elegido">Guardar ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((r, i) => {
            const badge = STATUS_BADGE[r.player_id ? r.status : 'sin_match'];
            const showRolHeader = i === 0 || rows[i - 1].rol !== r.rol;
            return (
              <React.Fragment key={`${r.rol}-${r.dorsal}`}>
                {showRolHeader && (
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <td colSpan={4} className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {r.rol === 'titular' ? 'Titulares' : 'Suplentes'}
                    </td>
                  </tr>
                )}
                <tr className={!r.player_id ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                  <td className="px-2 py-2 text-gray-500 font-mono">{r.dorsal}</td>
                  <td className="px-2 py-2">
                    <p className="text-gray-800 dark:text-gray-100">{r.nombre}</p>
                    <p className="text-xs text-gray-400 font-mono">{r.cometId ? `COMET ${r.cometId}` : 'Sin COMET ID'}</p>
                  </td>
                  <td className="px-2 py-2 min-w-[12rem]">
                    <div className="flex items-center gap-2">
                      <select
                        value={r.player_id}
                        onChange={(e) => updateRow(i, { player_id: e.target.value, status: e.target.value ? 'manual' : 'sin_match', saveComet: true })}
                        className="flex-1 min-w-0 px-2 py-1 border rounded text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
                      >
                        <option value="">— Sin asignar —</option>
                        {optionsFor(r).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name_visual || p.name}{p.categoria_juego || p.categoria ? ` (${p.categoria_juego || p.categoria})` : ''}
                          </option>
                        ))}
                      </select>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {r.status === 'id' && r.player_id ? (
                      <span className="text-xs text-gray-400">ya guardado</span>
                    ) : !r.cometId ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={!!r.player_id && r.saveComet}
                        disabled={!r.player_id}
                        onChange={(e) => updateRow(i, { saveComet: e.target.checked })}
                        className="w-4 h-4 accent-yellow-400 cursor-pointer"
                      />
                    )}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
