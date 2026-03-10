import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CATEGORIAS_PARTIDO } from '../../utils/constants';

export const CardDistributionChart = ({ jornadas = [], categoriaFiltro }) => {
  const data = useMemo(() => {
    const map = {};
    CATEGORIAS_PARTIDO.forEach(cat => { map[cat] = { categoria: cat, amarillas: 0, rojas: 0 }; });

    jornadas.forEach((jornada) => {
      (jornada.partidos || []).forEach((partido) => {
        if (categoriaFiltro && partido.categoria !== categoriaFiltro) return;
        if (!map[partido.categoria]) return;
        (partido.partido_eventos || []).forEach((e) => {
          if (e.tipo === 'amarilla') map[partido.categoria].amarillas++;
          if (e.tipo === 'roja') map[partido.categoria].rojas++;
        });
      });
    });

    return Object.values(map).filter(d => d.amarillas > 0 || d.rojas > 0);
  }, [jornadas, categoriaFiltro]);

  if (data.length === 0) return <p className="text-center text-gray-500 py-8">No hay datos de tarjetas.</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Tarjetas por Categoría</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="amarillas" name="Amarillas" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          <Bar dataKey="rojas" name="Rojas" fill="#EF4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
