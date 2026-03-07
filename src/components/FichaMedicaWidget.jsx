import React, { useState, useEffect } from 'react';
import { Stethoscope } from 'lucide-react';
import { database } from '../utils/database';

export const FichaMedicaWidget = ({ currentUser }) => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const categorias = currentUser?.categoria?.length > 0 ? currentUser.categoria : null;
    database.getPlayersWithExpiredFichaMedica(categorias)
      .then((data) => {
        // Already ordered by ficha_medica_hasta ascending from DB
        setPlayers(data);
      })
      .catch(() => {});
  }, []);

  if (players.length === 0) return null;

  const expiredCount = players.filter((p) => p.expired).length;
  const soonCount = players.filter((p) => p.expiringSoon).length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
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
      <div className="space-y-3">
        {players.map((player) => {
          const isExpired = player.expired;
          const borderColor = isExpired ? 'border-red-400' : 'border-orange-400';
          const bgColor = isExpired ? 'bg-red-50' : 'bg-orange-50';
          const textColor = isExpired ? 'text-red-600' : 'text-orange-600';
          const label = isExpired ? 'Venció' : 'Vence';
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between border-l-4 ${borderColor} ${bgColor} pl-3 py-2`}
            >
              <div>
                <p className="font-medium">{player.name_visual || player.name}</p>
                <p className="text-xs text-gray-500">{player.categoria}</p>
              </div>
              <span className={`text-sm font-semibold ${textColor}`}>
                {label}: {new Date(player.ficha_medica_hasta + 'T00:00:00').toLocaleDateString('es-UY')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
