import React, { useState } from 'react';
import { Calendar, MapPin, Users, Trophy, Shield, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExportConfigModal } from './ExportConfigModal';
import { AlertModal } from './AlertModal';

export const TorneoDetailView = ({ torneo }) => {

  const [showExportConfig, setShowExportConfig] = useState(false);
  const [exportFields, setExportFields] = useState({
    name: true,
    name_visual: false,
    gov_id: true,
    categoria: true,
    posicion: true,
    date_of_birth: true
  });
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'info' });

  const toggleExportField = (field) => {
    setExportFields(prev => ({ ...prev, [field]: !prev[field] }));
  };


  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-UY', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return '-';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return `${days} día${days !== 1 ? 's' : ''}`;
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '', 'height=800,width=1000');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${torneo.name} - Detalles del Torneo</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              padding: 40px;
              background: #f9fafb;
              color: #1f2937;
              line-height: 1.6;
            }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            
            /* Header */
            .header { 
              background: linear-gradient(to right, #111827, #000);
              color: #fbbf24;
              padding: 24px;
              border-radius: 8px;
              margin-bottom: 24px;
            }
            .header h1 { 
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .trophy { display: inline-block; width: 32px; height: 32px; }
            .category-badge { 
              display: inline-block;
              padding: 4px 12px;
              background: #fbbf24;
              color: #111827;
              border-radius: 16px;
              font-size: 14px;
              font-weight: 600;
            }
            
            /* Section */
            .section { 
              background: white;
              padding: 24px;
              border-radius: 8px;
              margin-bottom: 24px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .section-title { 
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid #fbbf24;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            /* Info Grid */
            .info-grid { 
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 24px;
              margin-top: 16px;
            }
            .info-item { display: flex; align-items: flex-start; gap: 12px; }
            .info-icon { color: #2563eb; margin-top: 4px; }
            .info-label { font-size: 14px; color: #6b7280; margin-bottom: 4px; }
            .info-value { font-size: 18px; font-weight: 600; color: #1f2937; }
            
            /* Dirigentes */
            .dirigentes-grid { 
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-top: 16px;
            }
            .dirigente-card { 
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 12px;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 8px;
            }
            .dirigente-avatar { 
              width: 40px;
              height: 40px;
              background: #2563eb;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 18px;
              flex-shrink: 0;
            }
            .dirigente-name { font-weight: 600; color: #111827; font-size: 14px; }
            .dirigente-role { color: #6b7280; font-size: 13px; margin-top: 2px; }
            .small-badge { 
              display: inline-block;
              padding: 2px 8px;
              background: #dbeafe;
              color: #1e40af;
              border-radius: 12px;
              font-size: 11px;
              margin-top: 4px;
            }
            
            /* Players */
            .players-grid { 
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-top: 16px;
            }
            .player-card { 
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 12px;
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 8px;
            }
            .player-number { 
              width: 40px;
              height: 40px;
              background: #16a34a;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 14px;
              flex-shrink: 0;
            }
            .player-name { font-weight: 600; color: #111827; font-size: 13px; }
            .player-badges { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
            .badge-blue { background: #dbeafe; color: #1e40af; }
            .badge-purple { background: #e9d5ff; color: #6b21a8; }
            
            /* Stats */
            .stats-section { 
              background: linear-gradient(to right, #eff6ff, #f0fdf4);
              padding: 24px;
              border-radius: 8px;
              margin-bottom: 24px;
            }
            .stats-grid { 
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              margin-top: 16px;
            }
            .stat-box { text-align: center; }
            .stat-number { 
              font-size: 36px;
              font-weight: bold;
              line-height: 1;
            }
            .stat-label { 
              color: #6b7280;
              font-size: 14px;
              margin-top: 8px;
            }
            
            .empty-state { 
              text-align: center;
              color: #6b7280;
              padding: 32px;
              font-size: 14px;
            }
            
            @media print {
              body { background: white; padding: 0; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>
                <span class="trophy">🏆</span>
                ${torneo.name}
              </h1>
              ${torneo.categoria ? `<span class="category-badge">${torneo.categoria}</span>` : ''}
            </div>
            
            <div class="section">
              <h3 class="section-title">Información General</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-icon">📍</div>
                  <div>
                    <div class="info-label">País</div>
                    <div class="info-value">${torneo.country || '-'}</div>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-icon">📍</div>
                  <div>
                    <div class="info-label">Ciudad</div>
                    <div class="info-value">${torneo.city || '-'}</div>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-icon">📅</div>
                  <div>
                    <div class="info-label">Fecha Inicio</div>
                    <div class="info-value">${formatDate(torneo.start_date)}</div>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-icon">📅</div>
                  <div>
                    <div class="info-label">Fecha Fin</div>
                    <div class="info-value">${formatDate(torneo.end_date)}</div>
                  </div>
                </div>
                <div class="info-item" style="grid-column: span 2;">
                  <div class="info-icon">🏆</div>
                  <div>
                    <div class="info-label">Duración</div>
                    <div class="info-value">${getDuration(torneo.start_date, torneo.end_date)}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h3 class="section-title">
                🛡️ Dirigentes (${torneo.torneo_dirigentes?.length || 0})
              </h3>
              ${torneo.torneo_dirigentes && torneo.torneo_dirigentes.length > 0 
                ? `<div class="dirigentes-grid">
                    ${torneo.torneo_dirigentes.map(td => `
                      <div class="dirigente-card">
                        <div class="dirigente-avatar">${td.dirigentes?.name?.charAt(0) || '?'}</div>
                        <div>
                          <div class="dirigente-name">${td.dirigentes?.name || 'Sin nombre'}</div>
                          ${td.dirigentes?.rol ? `<div class="dirigente-role">${td.dirigentes.rol}</div>` : ''}
                          ${td.dirigentes?.categoria ? `<span class="small-badge">${td.dirigentes.categoria}</span>` : ''}
                        </div>
                      </div>
                    `).join('')}
                  </div>`
                : '<div class="empty-state">No hay dirigentes asignados</div>'
              }
            </div>
            
            <div class="section">
              <h3 class="section-title">
                👥 Jugadores (${torneo.torneo_players?.length || 0})
              </h3>
              ${torneo.torneo_players && torneo.torneo_players.length > 0
                ? `<div class="players-grid">
                    ${torneo.torneo_players
                      .sort((a, b) => a.players?.name.localeCompare(b.players?.name))
                      .map((tp, idx) => `
                      <div class="player-card">
                        <div class="player-number">${idx + 1}</div>
                        <div style="flex: 1; min-width: 0;">
                          <div class="player-name">${tp.players?.name || 'Sin nombre'}</div>
                          <div class="player-badges">
                            ${tp.players?.categoria ? `<span class="small-badge badge-blue">${tp.players.categoria}</span>` : ''}
                            ${tp.players?.posicion ? `<span class="small-badge badge-purple">${tp.players.posicion}</span>` : ''}
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>`
                : '<div class="empty-state">No hay jugadores asignados</div>'
              }
            </div>
            
            <div class="stats-section">
              <h3 class="section-title">Estadísticas</h3>
              <div class="stats-grid">
                <div class="stat-box">
                  <div class="stat-number" style="color: #2563eb;">${torneo.torneo_dirigentes?.length || 0}</div>
                  <div class="stat-label">Dirigentes</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number" style="color: #16a34a;">${torneo.torneo_players?.length || 0}</div>
                  <div class="stat-label">Jugadores</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number" style="color: #9333ea;">${getDuration(torneo.start_date, torneo.end_date)}</div>
                  <div class="stat-label">Duración</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number" style="color: #ea580c;">${torneo.categoria || '-'}</div>
                  <div class="stat-label">Categoría</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleExportPlayersToExcel = () => {
    if (!torneo.torneo_players || torneo.torneo_players.length === 0) {

      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'No hay jugadores para exportar',
        type: 'warning'
      });
      return;
    }

    const fieldLabels = {
      name: 'Nombre Completo',
      name_visual: 'Nombre Visual',
      gov_id: 'Cédula',
      categoria: 'Categoría',
      posicion: 'Posición',
      date_of_birth: 'Fecha de Nacimiento'
    };

    const exportData = torneo.torneo_players
      .map(tp => tp.players)
      .filter(p => p)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(player => {
        const row = {};
        
        Object.keys(exportFields).forEach(field => {
          if (exportFields[field]) {
            const label = fieldLabels[field];
            
            switch(field) {
              case 'name':
                row[label] = player.name;
                break;
              case 'name_visual':
                row[label] = player.name_visual || player.name || '';
                break;
              case 'gov_id':
                row[label] = player.gov_id;
                break;
              case 'categoria':
                row[label] = player.categoria;
                break;
              case 'posicion':
                row[label] = player.posicion || '';
                break;
              case 'date_of_birth':
                if (player.date_of_birth) {
                  const [year, month, day] = player.date_of_birth.split('-');
                  row[label] = `${day}/${month}/${year}`;
                } else {
                  row[label] = '';
                }
                break;
              default:
                break;
            }
          }
        });
        
        return row;
      });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jugadores');

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `${torneo.name.replace(/[^a-z0-9]/gi, '_')}_jugadores_${date}_${time}.xlsx`;

    XLSX.writeFile(workbook, filename);
    
    setShowExportConfig(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-black text-yellow-400 p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8" />
            <h2 className="text-3xl font-bold">{torneo.name}</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowExportConfig(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold transition-colors"
              title="Exportar jugadores a Excel"
            >
              <Download className="w-5 h-5" />
              Excel Jugadores ({torneo.torneo_players?.length || 0})
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg hover:bg-yellow-500 font-semibold transition-colors"
              title="Exportar a PDF"
            >
              <Download className="w-5 h-5" />
              Exportar PDF
            </button>
          </div>
        </div>
        {torneo.categoria && (
            <span className="inline-block px-3 py-1 bg-yellow-400 text-gray-900 rounded-full text-sm font-semibold">
            {torneo.categoria}
            </span>
        )}
        </div>

      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-yellow-400">
          Información General
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">País</p>
              <p className="text-lg font-semibold">{torneo.country || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Ciudad</p>
              <p className="text-lg font-semibold">{torneo.city || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-green-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Fecha Inicio</p>
              <p className="text-lg font-semibold">{formatDate(torneo.start_date)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-red-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Fecha Fin</p>
              <p className="text-lg font-semibold">{formatDate(torneo.end_date)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 md:col-span-2">
            <Trophy className="w-5 h-5 text-purple-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Duración</p>
              <p className="text-lg font-semibold">{getDuration(torneo.start_date, torneo.end_date)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Funcionarios */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-yellow-400">
          <Users className="w-6 h-6 text-yellow-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Funcionarios ({torneo.torneo_funcionarios?.length || 0})
          </h3>
        </div>
        {torneo.torneo_funcionarios && torneo.torneo_funcionarios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {torneo.torneo_funcionarios.map((tf, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="w-10 h-10 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold">
                  {tf.employees?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{tf.employees?.name || 'Sin nombre'}</p>
                  {tf.employees?.role && (
                    <p className="text-sm text-gray-600">{tf.employees.role}</p>
                  )}
                  {tf.employees?.categoria && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                      {tf.employees.categoria}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No hay funcionarios asignados</p>
        )}
      </div>

      {/* Dirigentes */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-yellow-400">
          <Shield className="w-6 h-6 text-zinc-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Dirigentes ({torneo.torneo_dirigentes?.length || 0})
          </h3>
        </div>
        {torneo.torneo_dirigentes && torneo.torneo_dirigentes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {torneo.torneo_dirigentes.map((td, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 border border-zinc-200 rounded-lg">
                <div className="w-10 h-10 bg-zinc-600 text-white rounded-full flex items-center justify-center font-bold">
                  {td.dirigentes?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{td.dirigentes?.name || 'Sin nombre'}</p>
                  {td.dirigentes?.rol && (
                    <p className="text-sm text-gray-600">{td.dirigentes.rol}</p>
                  )}
                  {td.dirigentes?.categoria && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {td.dirigentes.categoria}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No hay dirigentes asignados</p>
        )}
      </div>

      {/* Players */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-yellow-400">
          <Users className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Jugadores ({torneo.torneo_players?.length || 0})
          </h3>
        </div>
        {torneo.torneo_players && torneo.torneo_players.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {torneo.torneo_players
              .sort((a, b) => a.players?.name.localeCompare(b.players?.name))
              .map((tp, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{tp.players?.name || 'Sin nombre'}</p>
                    <div className="flex gap-1 mt-1">
                      {tp.players?.categoria && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {tp.players.categoria}
                        </span>
                      )}
                      {tp.players?.posicion && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
                          {tp.players.posicion}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No hay jugadores asignados</p>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Estadísticas</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {torneo.torneo_funcionarios?.length || 0}
            </p>
            <p className="text-sm text-gray-600">Funcionarios</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {torneo.torneo_dirigentes?.length || 0}
            </p>
            <p className="text-sm text-gray-600">Dirigentes</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {torneo.torneo_players?.length || 0}
            </p>
            <p className="text-sm text-gray-600">Jugadores</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {getDuration(torneo.start_date, torneo.end_date)}
            </p>
            <p className="text-sm text-gray-600">Duración</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {torneo.categoria || '-'}
            </p>
            <p className="text-sm text-gray-600">Categoría</p>
          </div>
        </div>
      </div>
      {showExportConfig && (
        <ExportConfigModal
          selectedPlayers={torneo.torneo_players?.map(tp => tp.player_id) || []}
          exportFields={exportFields}
          toggleExportField={toggleExportField}
          onClose={() => setShowExportConfig(false)}
          onExport={handleExportPlayersToExcel}
        />
      )}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};