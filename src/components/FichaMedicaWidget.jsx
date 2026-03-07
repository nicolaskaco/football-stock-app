import React, { useState, useEffect } from 'react';
import { Stethoscope } from 'lucide-react';
import { database } from '../utils/database';

export const FichaMedicaWidget = ({ currentUser }) => {
  const [players, setPlayers] = useState([]);
  const [catFiltro, setCatFiltro] = useState(null);

  useEffect(() => {
    const categorias = currentUser?.categoria?.length > 0 ? currentUser.categoria : null;
    database.getPlayersWithExpiredFichaMedica(categorias)
      .then((data) => setPlayers(data))
      .catch(() => {});
  }, []);

  if (players.length === 0) return null;

  const CATEGORIA_ORDER = ['3era', '4ta', '5ta', 'S16', '6ta', '7ma'];
  const categorias = [...new Set(players.map((p) => p.categoria))].sort(
    (a, b) => {
      const ai = CATEGORIA_ORDER.indexOf(a);
      const bi = CATEGORIA_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    }
  );
  const filtered = catFiltro ? players.filter((p) => p.categoria === catFiltro) : players;
  const expiredCount = players.filter((p) => p.expired).length;
  const soonCount = players.filter((p) => p.expiringSoon).length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-3">
        <Stethoscope className="w-6 h-6 text-red-600" />
        <h3 className="text-lg font-bold">Carné Deportista</h3>
        <div className="ml-auto flex gap-1">
          {expiredCount > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
              {expiredCount} vencido{expiredCount !== 1 ? 's' : ''}
            </span>
          )}
          {soonCount > 0 && (
            <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
              {soonCount} próximo{soonCount !== 1 ? 's' : ''}
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
        {filtered.map((player) => {
          const isExpired = player.expired;
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between border-l-4 pl-3 py-2 ${isExpired ? 'border-red-400 bg-red-50' : 'border-orange-400 bg-orange-50'}`}
            >
              <div>
                <p className="font-medium text-sm">{player.name_visual || player.name}</p>
                <p className="text-xs text-gray-500">{player.categoria}</p>
              </div>
              <span className={`text-sm font-semibold ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                {isExpired ? 'Venció' : 'Vence'}: {new Date(player.ficha_medica_hasta + 'T00:00:00').toLocaleDateString('es-UY')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
