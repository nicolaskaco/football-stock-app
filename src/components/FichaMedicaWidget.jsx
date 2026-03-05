import React, { useState, useEffect } from 'react';
import { Stethoscope } from 'lucide-react';
import { database } from '../utils/database';

export const FichaMedicaWidget = ({ currentUser }) => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const categorias = currentUser?.categoria?.length > 0 ? currentUser.categoria : null;
    database.getPlayersWithExpiredFichaMedica(categorias)
      .then(setPlayers)
      .catch(() => {});
  }, []);

  if (players.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="w-6 h-6 text-red-600" />
        <h3 className="text-lg font-bold">Carné Deportista Vencido</h3>
        <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
          {players.length}
        </span>
      </div>
      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between border-l-4 border-red-400 bg-red-50 pl-3 py-2"
          >
            <div>
              <p className="font-medium">{player.name_visual || player.name}</p>
              <p className="text-xs text-gray-500">{player.categoria}</p>
            </div>
            <span className="text-sm font-semibold text-red-600">
              Venció: {new Date(player.ficha_medica_hasta + 'T00:00:00').toLocaleDateString('es-UY')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
