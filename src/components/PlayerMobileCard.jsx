import React from 'react';
import { Phone } from 'lucide-react';

// Compact player card shown instead of the players table on small screens.
// Presentational only: PlayersTab passes the shared icons, badges and action buttons.
export function PlayerMobileCard({ player, selected, onToggleSelect, onView, statusIcons, categoriaBadge, total, actions }) {
  const showFullName = player.name_visual && player.name_visual !== player.name;

  return (
    <div className={`bg-white rounded-lg shadow p-3 border ${selected ? 'border-yellow-400' : 'border-transparent'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 w-4 h-4 shrink-0 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          aria-label={`Seleccionar ${player.name}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={onView}
              className="text-left font-semibold break-words hover:text-blue-700 hover:underline"
            >
              {player.name_visual || player.name}
            </button>
            {statusIcons}
          </div>
          {showFullName && (
            <div className="text-xs text-gray-500 dark:text-gray-400 break-words">({player.name})</div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="inline-flex items-center">{categoriaBadge}</span>
            {player.posicion && <span className="text-gray-700 dark:text-gray-300">{player.posicion}</span>}
            <span className="ml-auto">{total}</span>
          </div>

          {player.celular && (
            <a
              href={`tel:${String(player.celular).replace(/[^\d+]/g, '')}`}
              className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400"
            >
              <Phone className="w-3.5 h-3.5" />
              {player.celular}
            </a>
          )}

          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
