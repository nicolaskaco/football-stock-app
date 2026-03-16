import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Menu, X, Moon, Sun, Loader2 } from 'lucide-react';
import logo from '../logo.jpeg';
import { Modal } from './Modal';
import { NotificationCenter } from './NotificationCenter';
import { useDarkMode } from '../context/DarkModeContext';

// Lazy-loaded tab components — each chunk is downloaded only when the tab is first opened
const OverviewTab = lazy(() => import('./OverviewTab').then(m => ({ default: m.OverviewTab })));
const InventoryTab = lazy(() => import('./InventoryTab').then(m => ({ default: m.InventoryTab })));
const EmployeesTab = lazy(() => import('./EmployeesTab').then(m => ({ default: m.EmployeesTab })));
const DistributionsTab = lazy(() => import('./DistributionsTab').then(m => ({ default: m.DistributionsTab })));
const PlayersTab = lazy(() => import('./PlayersTab').then(m => ({ default: m.PlayersTab })));
const PlayersTabViatico = lazy(() => import('./PlayersTabViatico').then(m => ({ default: m.PlayersTabViatico })));
const ReportsTab = lazy(() => import('./ReportsTab').then(m => ({ default: m.ReportsTab })));
const DirigentesTab = lazy(() => import('./DirigentesTab').then(m => ({ default: m.DirigentesTab })));
const TorneosTab = lazy(() => import('./TorneosTab').then(m => ({ default: m.TorneosTab })));
const ComisionesTab = lazy(() => import('./ComisionesTab').then(m => ({ default: m.ComisionesTab })));
const ChangeRequestsTab = lazy(() => import('./ChangeRequestsTab').then(m => ({ default: m.ChangeRequestsTab })));
const RivalesTab = lazy(() => import('./RivalesTab').then(m => ({ default: m.RivalesTab })));
const PartidosTab = lazy(() => import('./PartidosTab').then(m => ({ default: m.PartidosTab })));
const ConfiguracionTab = lazy(() => import('./ConfiguracionTab').then(m => ({ default: m.ConfiguracionTab })));
const EstadisticasTab = lazy(() => import('./EstadisticasTab').then(m => ({ default: m.EstadisticasTab })));
const TesoreroTab = lazy(() => import('./TesoreroTab').then(m => ({ default: m.TesoreroTab })));

const TabFallback = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
  </div>
);

export const AdminDashboard = ({
  employees,
  inventory,
  distributions,
  players,
  dirigentes,
  torneos,
  comisiones,
  rivales,
  jornadas,
  injuries = [],
  appSettings = {},
  pendingChangeRequests = [],
  onLogout,
  onDataChange,
  currentUser
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab) => setSearchParams(prev => {
    const p = new URLSearchParams(prev);
    p.set('tab', tab);
    return p;
  });
  const [showModal, setShowModal] = useState(null);
  const [modalIsDirty, setModalIsDirty] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { dark, toggle: toggleDark } = useDarkMode();

  useEffect(() => {
    if (!showModal) setModalIsDirty(false);
  }, [showModal]);

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
  const canViewChangeRequests = ['admin', 'ejecutivo', 'presidente', 'presidente_categoria', 'delegado', 'comision'].includes(currentUser?.role);
  const canAccessRopa = currentUser?.canAccessRopa || false;
  const canSeeRopaWidgets = currentUser?.canSeeRopaWidgets || false;
  const canViewPartidos = currentUser?.canViewPartidos || false;
  const canAccessTesorero = currentUser?.canAccessTesorero || false;
  const isAdmin = currentUser?.role === 'admin';
  const tabEnabled = (key) => appSettings[key] === 'true';

  // Rest of your code stays the same...
  const tabs = [
    { id: 'overview',       label: 'Resumen',        show: true },
    { id: 'inventory',      label: 'Inventario',     show: canAccessRopa && tabEnabled('inventario_tab_enabled') },
    { id: 'employees',      label: 'Funcionarios',   show: canAccessRopa },
    { id: 'players',        label: 'Jugadores',      show: canAccessPlayers },
    { id: 'players_viatico',label: 'Viáticos',       show: canAccessViaticos },
    { id: 'tesorero',       label: 'Tesorero',       show: canAccessTesorero },
    { id: 'change_requests',label: 'Solicitudes',    show: canViewChangeRequests },
    { id: 'distributions',  label: 'Distribuciones', show: canAccessRopa && tabEnabled('distribuciones_tab_enabled') },
    { id: 'dirigentes',     label: 'Dirigentes',     show: canAccessDirigentes },
    { id: 'torneos',        label: 'Torneos',         show: canViewTorneo },
    { id: 'comisiones',     label: 'Comisiones',     show: canViewComisiones },
    { id: 'rivales',        label: 'Rivales',         show: canViewPartidos && tabEnabled('rivales_tab_enabled') },
    { id: 'partidos',       label: 'Partidos',        show: canViewPartidos },
    { id: 'reports',        label: 'Reportes',        show: canAccessRopa && tabEnabled('reportes_tab_enabled') },
    { id: 'estadisticas',   label: 'Estadísticas',   show: canViewPartidos && tabEnabled('estadisticas_tab_enabled') },
    { id: 'configuracion',  label: 'Configuración',  show: isAdmin },
  ];

  // Filter visible tabs
  const visibleTabs = tabs.filter(tab => tab.show);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMenuOpen(true)}
                className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center gap-2 hover:opacity-80 transition"
                aria-label="Ir a Resumen"
              >
                <img
                  src={logo}
                  alt="Ropa CAP logo"
                  className="w-8 h-8 object-contain"
                />
                <h1 className="text-xl font-bold text-gray-800">CAP</h1>
              </button>
              <span className="sm:hidden text-sm font-medium text-gray-500 truncate max-w-[120px]">
                {visibleTabs.find(t => t.id === activeTab)?.label}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:inline text-sm text-gray-700">
                👤 {currentUser?.email || currentUser?.name || 'Usuario'}
              </span>
              <button
                onClick={toggleDark}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
                title={dark ? 'Modo claro' : 'Modo oscuro'}
              >
                {dark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              <NotificationCenter
                currentUser={currentUser}
                players={players}
                injuries={injuries}
                setActiveTab={setActiveTab}
              />
              <button 
                onClick={onLogout} 
                className="px-2 sm:px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                <span className="hidden sm:inline">Cerrar sesión</span>
                <span className="sm:hidden">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="hidden sm:flex gap-2 mb-6 overflow-x-auto">
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

        <Suspense fallback={<TabFallback />}>
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
            canSeeRopaWidgets={canSeeRopaWidgets}
            currentUser={currentUser}
            jornadas={jornadas}
            injuries={injuries}
            canViewPartidos={canViewPartidos}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            onFormDirtyChange={setModalIsDirty}
          />
        )}
        {activeTab === 'inventory' && canAccessRopa && (
          <InventoryTab
            inventory={inventory}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            onFormDirtyChange={setModalIsDirty}
          />
        )}
        {activeTab === 'employees' && canAccessRopa && (
          <EmployeesTab
            employees={employees}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            onFormDirtyChange={setModalIsDirty}
          />
        )}
        {activeTab === 'distributions' && canAccessRopa && (
          <DistributionsTab
            distributions={distributions}
            employees={employees}
            inventory={inventory}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            onFormDirtyChange={setModalIsDirty}
          />
        )}
        {activeTab === 'players_viatico' && canAccessViaticos && (
          <PlayersTabViatico
            players={players}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            currentUser={currentUser}
            onFormDirtyChange={setModalIsDirty}
            appSettings={appSettings}
            pendingChangeRequests={pendingChangeRequests}
          />
        )}
        {activeTab === 'players' && canAccessPlayers && (
          <PlayersTab
            players={players}
            injuries={injuries}
            jornadas={jornadas}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            currentUser={currentUser}
            onFormDirtyChange={setModalIsDirty}
            appSettings={appSettings}
            pendingChangeRequests={pendingChangeRequests}
          />
        )}
        {activeTab === 'change_requests' && canViewChangeRequests && (
          <ChangeRequestsTab
            currentUser={currentUser}
            appSettings={appSettings}
          />
        )}
        {activeTab === 'dirigentes' && canAccessDirigentes && (
          <DirigentesTab
            dirigentes={dirigentes}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            onFormDirtyChange={setModalIsDirty}
            currentUser={currentUser}
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
            onFormDirtyChange={setModalIsDirty}
          />
        )}
        {activeTab === 'comisiones' && canViewComisiones && (
          <ComisionesTab
            comisiones={comisiones}
            dirigentes={dirigentes}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            currentUser={currentUser}
            onFormDirtyChange={setModalIsDirty}
          />
        )}
        {activeTab === 'rivales' && canViewPartidos && (
          <RivalesTab
            rivales={rivales}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            currentUser={currentUser}
            onFormDirtyChange={setModalIsDirty}
          />
        )}
        {activeTab === 'partidos' && canViewPartidos && (
          <PartidosTab
            jornadas={jornadas}
            rivales={rivales}
            players={players}
            injuries={injuries}
            setShowModal={setShowModal}
            onDataChange={onDataChange}
            currentUser={currentUser}
            onFormDirtyChange={setModalIsDirty}
          />
        )}
        {activeTab === 'reports' && canAccessRopa && (
          <ReportsTab
            distributions={distributions}
            employees={employees}
            inventory={inventory}
          />
        )}
        {activeTab === 'estadisticas' && canViewPartidos && (
          <EstadisticasTab
            jornadas={jornadas}
            players={players}
          />
        )}
        {activeTab === 'tesorero' && canAccessTesorero && (
          <TesoreroTab
            players={players}
            appSettings={appSettings}
            onDataChange={onDataChange}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'configuracion' && isAdmin && (
          <ConfiguracionTab
            appSettings={appSettings}
            onDataChange={onDataChange}
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
        </Suspense>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 sm:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-0 left-0 h-full w-64 bg-white z-50 shadow-xl flex flex-col sm:hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <span className="font-bold text-gray-800">Menú</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-black text-yellow-400'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </>
      )}

      {showModal && (
        <Modal
          onClose={() => setShowModal(null)}
          title={showModal.title}
          isDirty={modalIsDirty}
        >
          {showModal.content}
        </Modal>
      )}
    </div>
  );
};