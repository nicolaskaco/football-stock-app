import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TRAMOS } from '../../utils/playerStats';
import { useChartPalette } from '../../hooks/useChartPalette';

/**
 * Barras por tramo del partido (0-15 … 76-90+).
 *
 * `series` es [{ name, tramos }] donde `tramos` es el objeto { '0-15': n, ... }
 * que devuelve `getTramos`. Con una sola serie muestra la ficha individual;
 * con 2-3 series muestra la comparación agrupada.
 */
export const GolesPorTramoChart = ({ series = [], title = 'Goles por Tramo del Partido', height = 300 }) => {
  const palette = useChartPalette();

  const data = TRAMOS.map((t) => {
    const point = { tramo: t.label };
    series.forEach((s) => { point[s.name] = s.tramos?.[t.key] || 0; });
    return point;
  });

  const hayDatos = data.some((d) => series.some((s) => d[s.name] > 0));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{title}</h3>
      {!hayDatos ? (
        <p className="text-center text-gray-500 py-8">Sin datos con minuto registrado</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="tramo" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} fill={palette[i % palette.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
