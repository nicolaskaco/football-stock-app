import React, { useState } from 'react';
import { Package, Users, TrendingUp, AlertCircle, FileDown } from 'lucide-react';
import { exportDashboardPDF } from '../utils/pdfExport';
import { StatCard } from './StatCard';
import { BirthdayWidget } from './BirthdayWidget';
import { SpendingTrendsWidget } from './SpendingTrendsWidget';
import { MostDistributedWidget } from './MostDistributedWidget';
import { CategoryDistributionWidget } from './CategoryDistributionWidget';
import { AgeDistributionWidget } from './AgeDistributionWidget';
import { DepartamentoWidget } from './DepartamentoWidget';
import { PendingChangeRequestsWidget } from './PendingChangeRequestsWidget';
import { FichaMedicaWidget } from './FichaMedicaWidget';
import { InjuredPlayersWidget } from './InjuredPlayersWidget';
import { CalendarioView } from './CalendarioView';
import { PartidoDetailView } from './PartidoDetailView';
import { formatDate } from '../utils/dateUtils';

export const OverviewTab = ({
  lowStockItems,
  totalEmployees,
  totalItems,
  activeDistributions,
  setActiveTab,
  players = [],
  distributions = [],
  inventory = [],
  canAccessWidgets = false,
  canSeeRopaWidgets = false,
  currentUser,
  jornadas = [],
  injuries = [],
  canViewPartidos = false,
  setShowModal,
  onDataChange,
  onFormDirtyChange,
}) => {
  const canEditPartidos = currentUser?.canEditPartidos || false;

  // Scope analytics widgets to the user's accessible categories.
  // Cross-category players can appear in the global list (via partido RLS),
  // so we filter them out here to avoid leaking data in home page widgets.
  const visiblePlayers = currentUser?.categoria?.length > 0
    ? players.filter(p => currentUser.categoria.includes(p.categoria_juego || p.categoria))
    : players;

  const openDetail = (jornada) => {
    setShowModal({
      title: `${jornada.rivales?.name || 'Rival'} — ${formatDate(jornada.fecha)}`,
      content: (
        <PartidoDetailView
          jornada={jornada}
          players={players}
          injuries={injuries}
          canEdit={canEditPartidos}
          setShowModal={setShowModal}
          onDataChange={onDataChange}
          onFormDirtyChange={onFormDirtyChange}
          reopenDetail={openDetail}
        />
      ),
    });
  };
  // Check if user can see change requests
  const canViewChangeRequests = ['admin', 'ejecutivo', 'presidente'].includes(currentUser?.role);

  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await exportDashboardPDF({
        players: visiblePlayers,
        injuries,
        distributions,
        inventory,
        currentUser,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Vista General</h2>
        {canAccessWidgets && (
          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-yellow-400 rounded-lg hover:bg-black disabled:opacity-50 text-sm font-medium"
          >
            <FileDown className="w-4 h-4" />
            {exportingPDF ? 'Generando...' : 'Exportar PDF'}
          </button>
        )}
      </div>
      
      {/* Pending Change Requests Alert - Show at the top for high visibility */}
      {canViewChangeRequests && (
        <div className="mb-8">
          <PendingChangeRequestsWidget setActiveTab={setActiveTab} />
        </div>
      )}

      {/* Calendario de Partidos */}
      {canViewPartidos && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Calendario de Partidos</h3>
            <button
              onClick={() => setActiveTab('partidos')}
              className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
            >
              Ver todos →
            </button>
          </div>
          <CalendarioView jornadas={jornadas} onJornadaClick={openDetail} />
        </div>
      )}

      {/* Existing Stats Cards */}
      {canSeeRopaWidgets && (
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
      )}

      {/* Analytics Widgets Grid */}
      {canAccessWidgets && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-start">
          <BirthdayWidget currentUser={currentUser} />
          {['admin','ejecutivo','presidente','presidente_categoria','delegado','comision'].includes(currentUser?.role) && <FichaMedicaWidget currentUser={currentUser} onDataChange={onDataChange} />}
          {currentUser?.role === 'admin' && <InjuredPlayersWidget players={visiblePlayers} injuries={injuries} setShowModal={setShowModal} onDataChange={onDataChange} currentUser={currentUser} />}
          <SpendingTrendsWidget players={visiblePlayers} />
          <CategoryDistributionWidget players={visiblePlayers} />
          <AgeDistributionWidget players={visiblePlayers} />
          <DepartamentoWidget players={visiblePlayers} />
        </div>
      )}
    </div>
  );
};