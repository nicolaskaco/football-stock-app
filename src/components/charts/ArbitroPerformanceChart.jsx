import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const ArbitroPerformanceChart = ({ jornadas = [], categoriaFiltro }) => {
  const data = useMemo(() => {
    const arbitroMap = {};

    jornadas.forEach((jornada) => {
      (jornada.partidos || []).forEach((partido) => {
        if (!partido.arbitro) return;
        if (categoriaFiltro && partido.categoria !== categoriaFiltro) return;

        const key = partido.arbitro.trim();
        if (!arbitroMap[key]) arbitroMap[key] = { arbitro: key, G: 0, E: 0, P: 0, total: 0, g_rivals: [], e_rivals: [], p_rivals: [] };

        const capGoles   = partido.escenario === 'Local' ? partido.goles_local    : partido.goles_visitante;
        const rivalGoles = partido.escenario === 'Local' ? partido.goles_visitante : partido.goles_local;
        if (capGoles == null || rivalGoles == null) return;

        const rivalName = jornada.rivales?.name || null;
        arbitroMap[key].total++;
        if (capGoles > rivalGoles) { arbitroMap[key].G++; if (rivalName) arbitroMap[key].g_rivals.push(rivalName); }
        else if (capGoles < rivalGoles) { arbitroMap[key].P++; if (rivalName) arbitroMap[key].p_rivals.push(rivalName); }
        else { arbitroMap[key].E++; if (rivalName) arbitroMap[key].e_rivals.push(rivalName); }
      });
    });

    return Object.values(arbitroMap)
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [jornadas, categoriaFiltro]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
        <p className="font-semibold text-gray-900 mb-2">{d.arbitro}</p>
        {d.G > 0 && (
          <div className="mb-1">
            <span className="font-medium text-green-700">Ganados: {d.G}</span>
            {d.g_rivals?.length > 0 && <span className="text-green-600 ml-1">({d.g_rivals.join(', ')})</span>}
          </div>
        )}
        {d.E > 0 && (
          <div className="mb-1">
            <span className="font-medium text-gray-600">Empates: {d.E}</span>
            {d.e_rivals?.length > 0 && <span className="text-gray-500 ml-1">({d.e_rivals.join(', ')})</span>}
          </div>
        )}
        {d.P > 0 && (
          <div>
            <span className="font-medium text-red-600">Perdidos: {d.P}</span>
            {d.p_rivals?.length > 0 && <span className="text-red-500 ml-1">({d.p_rivals.join(', ')})</span>}
          </div>
        )}
      </div>
    );
  };

  if (data.length === 0) return <p className="text-center text-gray-500 py-8">No hay datos de árbitros.</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Rendimiento por Árbitro</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 120 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="arbitro" tick={{ fontSize: 11 }} width={115} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="G" name="Ganados" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="E" name="Empates"  stackId="a" fill="#9CA3AF" />
          <Bar dataKey="P" name="Perdidos" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
