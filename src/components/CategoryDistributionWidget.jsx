import React, { useState, useEffect } from 'react';
import { Users, PieChart } from 'lucide-react';

export const CategoryDistributionWidget = ({ players }) => {
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    calculateCategoryDistribution();
  }, [players]);

  const calculateCategoryDistribution = () => {
    const categorias = ['3era', '4ta', '5ta', 'S16', '6ta', '7ma', 'Sub13'];
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#605259'];

    const counts = categorias.map((cat, index) => ({
      categoria: cat,
      count: players.filter(p => p.categoria === cat).length,
      color: colors[index]
    }));

    const total = counts.reduce((sum, c) => sum + c.count, 0);
    const withPercentage = counts.map(c => ({
      ...c,
      percentage: total > 0 ? ((c.count / total) * 100).toFixed(1) : 0
    }));

    setCategoryData(withPercentage);
  };

  const total = categoryData.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-6 h-6 text-purple-600" />
        <h3 className="text-lg font-bold">Distribución por Categoría</h3>
      </div>

      <div className="mb-6">
        <div className="flex h-8 rounded-lg overflow-hidden">
          {categoryData.map((cat, index) => (
            cat.count > 0 && (
              <div
                key={index}
                className="flex items-center justify-center text-white text-xs font-semibold"
                style={{ 
                  width: `${cat.percentage}%`,
                  backgroundColor: cat.color
                }}
                title={`${cat.categoria}: ${cat.count} jugadores (${cat.percentage}%)`}
              >
                {cat.percentage > 8 && cat.categoria}
              </div>
            )
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categoryData.map((cat, index) => (
          <div key={index} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm font-medium">{cat.categoria}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold">{cat.count}</span>
              <span className="text-xs text-gray-500 ml-1">({cat.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t text-center">
        <span className="text-2xl font-bold text-gray-900">{total}</span>
        <p className="text-sm text-gray-600">Total de Jugadores</p>
      </div>
    </div>
  );
};