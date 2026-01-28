import React, { useState, useEffect } from 'react';
import { Package, TrendingUp } from 'lucide-react';

export const MostDistributedWidget = ({ distributions, inventory }) => {
  const [topItems, setTopItems] = useState([]);

  useEffect(() => {
    calculateTopItems();
  }, [distributions, inventory]);

  const calculateTopItems = () => {
    const itemCounts = {};

    distributions.forEach(dist => {
      if (!itemCounts[dist.item_id]) {
        const item = inventory.find(i => i.id === dist.item_id);
        itemCounts[dist.item_id] = {
          name: item?.name || 'Desconocido',
          count: 0,
          returned: 0
        };
      }
      itemCounts[dist.item_id].count++;
      if (dist.return_date) {
        itemCounts[dist.item_id].returned++;
      }
    });

    const sorted = Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setTopItems(sorted);
  };

  const maxCount = topItems[0]?.count || 1;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-6 h-6 text-stone-600" />
        <h3 className="text-lg font-bold">Artículos Más Distribuidos</h3>
      </div>

      <div className="space-y-4">
        {topItems.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{item.name}</span>
              <div className="text-right">
                <span className="text-gray-900 font-semibold">{item.count}</span>
                <span className="text-gray-500 text-xs ml-2">
                  ({item.returned} devueltos)
                </span>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-stone-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {topItems.length === 0 && (
        <p className="text-gray-500 text-center py-4">No hay distribuciones registradas</p>
      )}
    </div>
  );
};