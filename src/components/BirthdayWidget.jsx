// BirthdayWidget.jsx
import React, { useState, useEffect } from 'react';
import { Cake } from 'lucide-react';
import { database } from '../utils/database';

export const BirthdayWidget = () => {
  const [birthdays, setBirthdays] = useState([]);

  const loadBirthdays = async () => {
    const upcoming = await database.getUpcomingBirthdays(7);
    setBirthdays(upcoming);
  };

  useEffect(() => {
    loadBirthdays();
  }, []);

  if (birthdays.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Cake className="w-6 h-6 text-pink-600" />
        <h3 className="text-lg font-bold">Próximos Cumpleaños</h3>
      </div>
      <div className="space-y-3">
        {birthdays.map(player => (
          <div key={player.id} className="flex items-center justify-between border-l-4 border-pink-400 pl-3 py-2">
            <div>
              <p className="font-medium">{player.name}</p>
              <p className="text-sm text-gray-600">
                {new Date(player.date_of_birth).toLocaleDateString('es-UY', { month: 'long', day: 'numeric' })}
              </p>
            </div>
            <span className="text-sm font-semibold text-pink-600">
              {player.daysUntilBirthday === 0 ? '¡Hoy!' : `En ${player.daysUntilBirthday} días`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};