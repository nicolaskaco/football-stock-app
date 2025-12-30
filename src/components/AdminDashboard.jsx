import React, { useState } from 'react';
import { Package } from 'lucide-react';
import logo from '../assets/logo.jpeg';
import { Modal } from './Modal';
import { OverviewTab } from './OverviewTab';
import { InventoryTab } from './InventoryTab';
import { EmployeesTab } from './EmployeesTab';
import { DistributionsTab } from './DistributionsTab';
import { PlayersTab } from './PlayersTab';
import { ReportsTab } from './ReportsTab';

export const AdminDashboard = ({ 
  employees, 
  inventory, 
  distributions, 
  players, 
  onLogout, 
  onDataChange  // Make sure this is here
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(null);

  const lowStockItems = inventory.filter(item => item.quantity <= item.min_stock);
  const totalEmployees = employees.length;
  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const activeDistributions = distributions.filter(d => !d.return_date && !d.return_date).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Ropa CAP logo"
                className="w-8 h-8 object-contain"
              />
              <h1 className="text-xl font-bold text-gray-800">Ropa CAP</h1>
            </div>
            <button 
              onClick={onLogout} 
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['overview', 'inventory', 'employees', 'distributions', 'players', 'reports'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                activeTab === tab ? 'bg-black text-yellow-400' : 'bg-white text-gray-600'
              }`}
            >
              {tab === 'overview' && 'Resumen'}
              {tab === 'inventory' && 'Inventario'}
              {tab === 'employees' && 'Funcionarios'}
              {tab === 'players' && 'Jugadores'}
              {tab === 'distributions' && 'Distribuciones'}
              {tab === 'reports' && 'Reportes'}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <OverviewTab 
            lowStockItems={lowStockItems} 
            totalEmployees={totalEmployees} 
            totalItems={totalItems} 
            activeDistributions={activeDistributions} 
            setActiveTab={setActiveTab} 
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab 
            inventory={inventory} 
            setShowModal={setShowModal}
            onDataChange={onDataChange}  // Add this
          />
        )}
        {activeTab === 'employees' && (
          <EmployeesTab 
            employees={employees} 
            setShowModal={setShowModal}
            onDataChange={onDataChange}  // Add this
          />
        )}
        {activeTab === 'distributions' && (
          <DistributionsTab 
            distributions={distributions} 
            employees={employees} 
            inventory={inventory} 
            setShowModal={setShowModal}
            onDataChange={onDataChange}  // Add this
          />
        )}
        {activeTab === 'reports' && (
          <ReportsTab 
            distributions={distributions} 
            employees={employees} 
            inventory={inventory} 
          />
        )}
        {activeTab === 'players' && (
          <PlayersTab 
            players={players} 
            setShowModal={setShowModal}
            onDataChange={onDataChange}
          />
        )}
      </div>

      {showModal && (
        <Modal 
          onClose={() => setShowModal(null)}
          title={showModal.title}
        >
          {showModal.content}
        </Modal>
      )}
    </div>
  );
};