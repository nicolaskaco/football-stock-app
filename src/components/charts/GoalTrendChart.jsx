import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CATEGORIAS_PARTIDO } from '../../utils/constants';

const COLORS = {
  '4ta': '#3B82F6',
  '5ta': '#8B5CF6',
  'S16': '#10B981',
  '6ta': '#F59E0B',
  '7ma': '#EF4444',
};

export const GoalTrendChart = ({ jornadas = [], categoriaFiltro }) => {
  const data = useMemo(() => {
    const jornadaMap = {};

    jornadas.forEach((jornada) => {
      const key = jornada.numero_jornada || jornada.fecha;
      if (!jornadaMap[key]) {
        jornadaMap[key] = { jornada: key, fecha: jornada.fecha };
        CATEGORIAS_PARTIDO.forEach(cat => { jornadaMap[key][cat] = 0; });
      }

      (jornada.partidos || []).forEach((partido) => {
        if (categoriaFiltro && partido.categoria !== categoriaFiltro) return;
        const goles = (partido.partido_eventos || []).filter(e => e.tipo === 'gol').length;
        if (CATEGORIAS_PARTIDO.includes(partido.categoria)) {
          jornadaMap[key][partido.categoria] += goles;
        }
      });
    });

    return Object.values(jornadaMap).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [jornadas, categoriaFiltro]);

  if (data.length === 0) return <p className="text-center text-gray-500 py-8">No hay datos de goles.</p>;

  const categoriasToShow = categoriaFiltro
    ? [categoriaFiltro]
    : CATEGORIAS_PARTIDO.filter(cat => data.some(d => d[cat] > 0));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Tendencia de Goles por Jornada</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="jornada" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {categoriasToShow.map(cat => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={COLORS[cat] || '#6B7280'}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
