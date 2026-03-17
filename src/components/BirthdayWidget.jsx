import React, { useState } from 'react';
import { useMountEffect } from '../hooks/useMountEffect';
import { Cake, Users, Shield } from 'lucide-react';
import { database } from '../utils/database';
import { formatBirthday } from '../utils/dateUtils';

export const BirthdayWidget = ({ currentUser }) => {
  const [birthdays, setBirthdays] = useState([]);

  const loadBirthdays = async () => {
    const categorias = currentUser?.categoria?.length > 0 ? currentUser.categoria : null;
    const [upcomingPlayers, upcomingDirigentes] = await Promise.all([
      database.getUpcomingBirthdays(7, categorias),
      database.getUpcomingBirthdaysDirigentes(7)
    ]);

    // Combine and sort by days until birthday
    const combined = [
      ...upcomingPlayers.map(p => ({ ...p, type: 'player' })),
      ...upcomingDirigentes.map(d => ({ ...d, type: 'dirigente' }))
    ].sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

    setBirthdays(combined);
  };

  useMountEffect(() => {
    loadBirthdays();
  });

  if (birthdays.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Cake className="w-6 h-6 text-yellow-600" />
        <h3 className="text-lg font-bold dark:text-white">Próximos Cumpleaños</h3>
      </div>
      <div className="space-y-3">
        {birthdays.map((person, index) => (
          <div
            key={`${person.type}-${person.id}`}
            className={`flex items-center justify-between border-l-4 pl-3 py-2 ${
              person.type === 'player'
                ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                : 'border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20'
            }`}
          >
            <div className="flex items-center gap-2 flex-1">
              {person.type === 'player' ? (
                <Users className="w-4 h-4 text-yellow-600" />
              ) : (
                <Shield className="w-4 h-4 text-cyan-600" />
              )}
            <div>
              <p className="font-medium dark:text-white">{person.name_visual || person.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatBirthday(person.date_of_birth)}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  person.type === 'player'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200'
                    : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-800 dark:text-cyan-100'
                }`}>
                  {person.type === 'player' ? 'Jugador' : 'Dirigente'}
                </span>
                </div>
              </div>
            </div>
            <span className={`text-sm font-semibold ${
              person.type === 'player' ? 'text-yellow-600 dark:text-yellow-400' : 'text-cyan-600 dark:text-cyan-400'
            }`}>
              {person.daysUntilBirthday === 0 
                ? '¡Hoy!' 
                : `En ${person.daysUntilBirthday} ${person.daysUntilBirthday === 1 ? 'día' : 'días'}`
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};