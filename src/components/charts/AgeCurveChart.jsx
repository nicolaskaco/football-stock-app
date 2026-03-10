import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { CATEGORIAS } from '../../utils/constants';
import { calculateAge } from '../../utils/dateUtils';

const COLORS = {
  '3era': '#3B82F6',
  '4ta': '#8B5CF6',
  '5ta': '#10B981',
  'S16': '#F59E0B',
  '6ta': '#EF4444',
  '7ma': '#EC4899',
  'Sub13': '#605259',
};

export const AgeCurveChart = ({ players = [], categoriaFiltro }) => {
  const data = useMemo(() => {
    const ageMap = {};

    players.forEach(p => {
      if (!p.date_of_birth) return;
      if (categoriaFiltro && p.categoria !== categoriaFiltro) return;
      const age = calculateAge(p.date_of_birth);
      if (age === '-') return;
      const key = String(age);
      if (!ageMap[key]) ageMap[key] = { edad: key, total: 0 };
      CATEGORIAS.forEach(cat => {
        if (!ageMap[key][cat]) ageMap[key][cat] = 0;
      });
      if (CATEGORIAS.includes(p.categoria)) {
        ageMap[key][p.categoria]++;
      }
      ageMap[key].total++;
    });

    return Object.values(ageMap).sort((a, b) => Number(a.edad) - Number(b.edad));
  }, [players, categoriaFiltro]);

  if (data.length === 0) return <p className="text-center text-gray-500 py-8">No hay datos de edad.</p>;

  const categoriasPresent = CATEGORIAS.filter(cat => data.some(d => d[cat] > 0));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Distribución de Edades</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="edad" tick={{ fontSize: 12 }} label={{ value: 'Edad', position: 'insideBottom', offset: -2, fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {categoriasPresent.map(cat => (
            <Bar key={cat} dataKey={cat} name={cat} stackId="a" fill={COLORS[cat] || '#6B7280'} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
