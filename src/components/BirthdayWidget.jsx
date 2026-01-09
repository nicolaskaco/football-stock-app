import React, { useState, useEffect } from 'react';
import { Cake, Users, Shield } from 'lucide-react';
import { database } from '../utils/database';

export const BirthdayWidget = () => {
  const [birthdays, setBirthdays] = useState([]);

  const loadBirthdays = async () => {
    const [upcomingPlayers, upcomingDirigentes] = await Promise.all([
      database.getUpcomingBirthdays(7),
      database.getUpcomingBirthdaysDirigentes(7)
    ]);

    // Combine and sort by days until birthday
    const combined = [
      ...upcomingPlayers.map(p => ({ ...p, type: 'player' })),
      ...upcomingDirigentes.map(d => ({ ...d, type: 'dirigente' }))
    ].sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

    setBirthdays(combined);
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
        {birthdays.map((person, index) => (
          <div 
            key={`${person.type}-${person.id}`} 
            className={`flex items-center justify-between border-l-4 pl-3 py-2 ${
              person.type === 'player' ? 'border-pink-400 bg-pink-50' : 'border-blue-400 bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-2 flex-1">
              {person.type === 'player' ? (
                <Users className="w-4 h-4 text-pink-600" />
              ) : (
                <Shield className="w-4 h-4 text-blue-600" />
              )}
              <div>
                <p className="font-medium">{person.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">
                    {(() => {
                      const [year, month, day] = person.date_of_birth.split('-');
                      const date = new Date(year, month - 1, day);
                      return date.toLocaleDateString('es-UY', { month: 'long', day: 'numeric' });
                    })()}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    person.type === 'player' 
                      ? 'bg-pink-100 text-pink-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {person.type === 'player' ? 'Jugador' : 'Dirigente'}
                  </span>
                </div>
              </div>
            </div>
            <span className={`text-sm font-semibold ${
              person.type === 'player' ? 'text-pink-600' : 'text-blue-600'
            }`}>
              {person.daysUntilBirthday === 0 ? '¡Hoy!' : `En ${person.daysUntilBirthday} días`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};