import React from 'react';
import { Package, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { StatCard } from './StatCard';
import { BirthdayWidget } from './BirthdayWidget';
import { SpendingTrendsWidget } from './SpendingTrendsWidget';
import { MostDistributedWidget } from './MostDistributedWidget';
import { CategoryDistributionWidget } from './CategoryDistributionWidget';
import { AgeDistributionWidget } from './AgeDistributionWidget';
import { DepartamentoWidget } from './DepartamentoWidget';

export const OverviewTab = ({ 
  lowStockItems, 
  totalEmployees, 
  totalItems, 
  activeDistributions, 
  setActiveTab,
  players = [],
  distributions = [],
  inventory = [],
  canAccessWidgets = false
}) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Vista General</h2>
    
    {/* Existing Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <StatCard 
        icon={<TrendingUp className="w-8 h-8" />} 
        label="Ropa Entregada en activo" 
        value={totalItems} 
        color="purple" 
      />
      <StatCard 
        icon={<Users className="w-8 h-8" />} 
        label="Total Funcionarios" 
        value={totalEmployees} 
        color="green" 
      />
      <StatCard 
        icon={<AlertCircle className="w-8 h-8" />} 
        label="Alerta bajo Stock" 
        value={lowStockItems.length} 
        color="red" 
      />
    </div>

    {/* Analytics Widgets Grid */}
    {canAccessWidgets && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <BirthdayWidget />
        <SpendingTrendsWidget players={players} />
        <CategoryDistributionWidget players={players} />
        <AgeDistributionWidget players={players} />
        <DepartamentoWidget players={players} />
      </div>
    )}

    {/* Keep MostDistributedWidget outside - it's inventory related, not player related */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <MostDistributedWidget distributions={distributions} inventory={inventory} />
    </div>

    {/* Low Stock Alert */}
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