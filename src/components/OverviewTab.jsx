import React from 'react';
import { Package, Users, TrendingDown, AlertCircle } from 'lucide-react';
import { StatCard } from './StatCard';

export const OverviewTab = ({ 
  lowStockItems, 
  totalEmployees, 
  totalItems, 
  activeDistributions, 
  setActiveTab 
}) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Vista General</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard 
        icon={<Package className="w-8 h-8" />} 
        label="Total Ropa entregada" 
        value={totalItems} 
        color="black" 
      />
      <StatCard 
        icon={<Users className="w-8 h-8" />} 
        label="Total Funcionarios" 
        value={totalEmployees} 
        color="green" 
      />
      <StatCard 
        icon={<TrendingDown className="w-8 h-8" />} 
        label="Ropa Entregada en activo" 
        value={activeDistributions} 
        color="purple" 
      />
      <StatCard 
        icon={<AlertCircle className="w-8 h-8" />} 
        label="Alerta bajo Stock" 
        value={lowStockItems.length} 
        color="red" 
      />
    </div>
    {lowStockItems.length > 0 && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Alerta Stock Bajo</h3>
        </div>
        <div className="space-y-2">
          {lowStockItems.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded">
              <div>
                <span className="font-medium text-gray-800">{item.name}</span>
                <span className="text-sm text-gray-600 ml-2">Size {item.size}</span>
              </div>
              <span className="text-red-600 font-semibold">
                {item.quantity} / {item.min_stock} min
              </span>
            </div>
          ))}
        </div>
        <button 
          onClick={() => setActiveTab('inventory')} 
          className="mt-4 text-sm text-yellow-600 hover:text-yellow-700 font-medium"
        >
          Ver Inventario →
        </button>
      </div>
    )}
  </div>
);