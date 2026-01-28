import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

export const DepartamentoWidget = ({ players }) => {
  const [topDepartamentos, setTopDepartamentos] = useState([]);

  useEffect(() => {
    calculateDepartamentos();
  }, [players]);

  const calculateDepartamentos = () => {
    const deptCounts = {};

    players.forEach(player => {
      const dept = player.departamento || 'Sin especificar';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const sorted = Object.entries(deptCounts)
      .map(([dept, count]) => ({ dept, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const totalPlayers = players.length; // Changed: total of ALL players
    const withPercentage = sorted.map(d => ({
      ...d,
      percentage: totalPlayers > 0 ? ((d.count / totalPlayers) * 100).toFixed(1) : 0
    }));

    setTopDepartamentos(withPercentage);
  };

  const maxCount = topDepartamentos[0]?.count || 1;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-6 h-6 text-violet-800" />
        <h3 className="text-lg font-bold">Top Departamentos</h3>
      </div>

      <div className="space-y-3">
        {topDepartamentos.map((dept, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{dept.dept}</span>
              <div>
                <span className="text-gray-900 font-semibold">{dept.count}</span>
                <span className="text-gray-500 text-xs ml-2">({dept.percentage}%)</span>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-violet-800 h-full rounded-full transition-all duration-300"
                style={{ width: `${(dept.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {topDepartamentos.length === 0 && (
        <p className="text-gray-500 text-center py-4">No hay datos de departamentos</p>
      )}
    </div>
  );
};