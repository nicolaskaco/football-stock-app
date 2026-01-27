import React, { useState } from 'react';
import { Package } from 'lucide-react';
import logo from '../logo.jpeg';
import { Modal } from './Modal';
import { OverviewTab } from './OverviewTab';
import { InventoryTab } from './InventoryTab';
import { EmployeesTab } from './EmployeesTab';
import { DistributionsTab } from './DistributionsTab';
import { PlayersTab } from './PlayersTab';
import { PlayersTabViatico } from './PlayersTabViatico';
import { ReportsTab } from './ReportsTab';
import { DirigentesTab } from './DirigentesTab';
import { TorneosTab } from './TorneosTab';
import { ComisionesTab } from './ComisionesTab';

export const AdminDashboard = ({ 
  employees, 
  inventory, 
  distributions, 
  players, 
  dirigentes, 
  torneos,
  comisiones,
  onLogout, 
  onDataChange, 
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(null);

  const lowStockItems = inventory.filter(item => item.quantity <= item.min_stock);
  const totalEmployees = employees.length;
  const activeDistributions = distributions.filter(d => !d.return_date);
  const totalItems = activeDistributions.reduce((sum, dist) => sum + dist.quantity, 0);

  // Use the permission from currentUser instead of hardcoded emails
  const canAccessPlayers = currentUser?.canAccessPlayers || false;
  const canAccessViaticos = currentUser?.canAccessViaticos || false;
  const canAccessWidgets = currentUser?.canAccessWidgets || false;
  const canAccessDirigentes = currentUser?.canAccessDirigentes || false;
  const canViewTorneo = currentUser?.canViewTorneo || false;
  const canViewComisiones = currentUser?.canViewComisiones || false;
  //const canEditComision = currentUser?.canEditComision || false;

  // Rest of your code stays the same...
  const tabs = [
    { id: 'overview', label: 'Resumen', show: true },
    { id: 'inventory', label: 'Inventario', show: true },
    { id: 'employees', label: 'Funcionarios', show: true },
    { id: 'players', label: 'Jugadores', show: canAccessPlayers },
    { id: 'players_viatico', label: 'Viáticos', show: canAccessViaticos },
    { id: 'distributions', label: 'Distribuciones', show: true },
    { id: 'dirigentes', label: 'Dirigentes', show: canAccessDirigentes },
    { id: 'torneos', label: 'Torneos', show: canViewTorneo },
    { id: 'comisiones', label: 'Comisiones', show: canViewComisiones },
    { id: 'reports', label: 'Reportes', show: true }
  ];

  // Filter visible tabs
  const visibleTabs = tabs.filter(tab => tab.show);

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
              <h1 className="text-xl font-bold text-gray-800">App interna CAP</h1>
            </div>
            <button 
              onClick={onLogout} 
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {visibleTabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                activeTab === tab.id ? 'bg-black text-yellow-400' : 'bg-white text-gray-600'
              }`}
            >
              {tab.label}
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
            players={players}
            distributions={distributions}
            inventory={inventory}
            canAccessWidgets={canAccessWidgets}
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
        {activeTab === 'players_viatico' && canAccessViaticos && (
          <PlayersTabViatico 
            players={players} 
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'players' && canAccessPlayers && (
          <PlayersTab 
            players={players} 
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'dirigentes' && canAccessDirigentes && (
          <DirigentesTab 
            dirigentes={dirigentes} 
            setShowModal={setShowModal}
            onDataChange={onDataChange}
          />
        )}
        {activeTab === 'torneos' && canViewTorneo && (
          <TorneosTab 
            torneos={torneos}
            dirigentes={dirigentes}
            players={players}
            employees={employees}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'comisiones' && canViewComisiones && (
          <ComisionesTab 
            comisiones={comisiones}
            dirigentes={dirigentes}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsTab 
            distributions={distributions} 
            employees={employees} 
            inventory={inventory} 
          />
        )}
        {/* Show access denied message if trying to access restricted tab */}
        {activeTab === 'players' && !canAccessPlayers && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Acceso Restringido</h3>
            <p className="text-gray-600">No tienes permiso para acceder a esta sección.</p>
          </div>
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