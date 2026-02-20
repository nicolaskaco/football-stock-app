import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Users, Download, ArrowUpDown, ArrowUp, ArrowDown, History, Utensils, Eye } from 'lucide-react';
import { PlayerFormViatico } from '../forms/PlayerFormViatico';
import { database } from '../utils/database';
import * as XLSX from 'xlsx';
import { PlayerHistoryModal } from './PlayerHistoryModal';
import { ExportConfigModal } from './ExportConfigModal';
import { ChangeRequestModal } from '../components/ChangeRequestModal';
import { AlertModal } from './AlertModal';
import { useMutation } from '../hooks/useMutation';

export const PlayersTabViatico = ({ players = [], setShowModal, onDataChange, currentUser, onFormDirtyChange }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('v_search') || '';
  const filterCategoria = searchParams.get('v_cat') || 'all';
  const sortConfig = {
    key: searchParams.get('v_sort') || null,
    direction: searchParams.get('v_dir') || 'asc',
  };

  const setParam = (key, value, defaultValue) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (value === null || value === undefined || value === defaultValue || value === '') {
        p.delete(key);
      } else {
        p.set(key, String(value));
      }
      return p;
    });
  };

  const setSearchTerm = (v) => setParam('v_search', v, '');
  const setFilterCategoria = (v) => setParam('v_cat', v, 'all');
  const setSortConfig = ({ key, direction }) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      key ? p.set('v_sort', key) : p.delete('v_sort');
      direction && direction !== 'asc' ? p.set('v_dir', direction) : p.delete('v_dir');
      return p;
    });
  };

  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'info' });
  const { execute } = useMutation((msg) =>
    setAlertModal({ isOpen: true, title: 'Error', message: msg, type: 'error' })
  );

  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [showExportConfig, setShowExportConfig] = useState(false);
  const [exportFields, setExportFields] = useState({
    name: true,
    name_visual: false,
    gov_id: true,
    categoria: true,
    date_of_birth: false,
    contrato: true,
    viatico: false,
    complemento: false,
    total: true,
    bank: true,
    bank_account: true
  });

  const categorias = ['3era', '4ta', '5ta', 'S16', '6ta', '7ma', 'Sub13'];
  const canDirectEdit = ['admin', 'ejecutivo', 'presidente'].includes(currentUser?.role);

  // Add safety check
  const safePlayers = Array.isArray(players) ? players : [];

  // Filter players
  const filtered = safePlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.name_visual && p.name_visual.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          p.gov_id.toLowerCase().includes(searchTerm.toLowerCase());


    // Check if user is 3era-only user
    const is3eraOnlyUser = currentUser?.categoria?.length === 1 && currentUser.categoria[0] === '3era';
    
    // Modified categoria filter
    const matchesCategoria = filterCategoria === 'all' 
      ? (is3eraOnlyUser ? true : p.categoria !== '3era')  // Include 3era only for 3era-only users
      : p.categoria === filterCategoria;
    
    return matchesSearch && matchesCategoria;
  });

  const handleSelectAll = () => {
    if (selectedPlayers.length === sortedPlayers.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(sortedPlayers.map(p => p.id));
    }
  };

  const handleSelectPlayer = (playerId) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const toggleExportField = (field) => {
    setExportFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Calculate age
  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate total for a player
  const calculateTotal = (player) => {
    if (player.contrato) return 0;
    return (player.viatico || 0) + (player.complemento || 0);
  };

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort the filtered data
  const sortedPlayers = [...filtered].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue, bValue;

    if (sortConfig.key === 'complemento') {
      console.error('Sorting complemento:', a.name, a.complemento, typeof a.complemento);
    }

    switch (sortConfig.key) {
      case 'name':
        aValue = (a.name_visual || a.name).toLowerCase();
        bValue = (b.name_visual || b.name).toLowerCase();
        break;
      case 'gov_id':
        aValue = a.gov_id.toLowerCase();
        bValue = b.gov_id.toLowerCase();
        break;
      case 'age':
        aValue = calculateAge(a.date_of_birth);
        bValue = calculateAge(b.date_of_birth);
        break;
      case 'categoria':
        aValue = categorias.indexOf(a.categoria);
        bValue = categorias.indexOf(b.categoria);
        break;
      case 'contrato':
        aValue = a.contrato ? 1 : 0;
        bValue = b.contrato ? 1 : 0;
        break;
      case 'viatico':
        // Players with contract go first (treated as -1), then sort by actual viatico value
        if (a.contrato && b.contrato) return 0;
        if (a.contrato) return sortConfig.direction === 'asc' ? -1 : 1;
        if (b.contrato) return sortConfig.direction === 'asc' ? 1 : -1;
        aValue = Number(a.viatico) || 0;
        bValue = Number(b.viatico) || 0;
        break;
      case 'complemento':
        // Players with contract go first (treated as -1), then sort by actual complemento value
        if (a.contrato && b.contrato) return 0;
        if (a.contrato) return sortConfig.direction === 'asc' ? -1 : 1;
        if (b.contrato) return sortConfig.direction === 'asc' ? 1 : -1;
        aValue = Number(a.complemento) || 0;
        bValue = Number(b.complemento) || 0;
        break;
      case 'total':
        // Players with contract go first (treated as -1), then sort by actual total value
        if (a.contrato && b.contrato) return 0;
        if (a.contrato) return sortConfig.direction === 'asc' ? -1 : 1;
        if (b.contrato) return sortConfig.direction === 'asc' ? 1 : -1;
        aValue = calculateTotal(a);
        bValue = calculateTotal(b);
        break;
      case 'bank':
        aValue = a.bank || '';
        bValue = b.bank || '';
        break;
      default:
        return 0;
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Render sort icon
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const handleAdd = (player) => execute(async () => {
    await database.addPlayer(player);
    await onDataChange('players');
    setShowModal(null);
  }, 'Error agregando jugador');

  const handleEdit = async (player, needsChangeRequest = false) => {
    if (needsChangeRequest) {
      setShowModal(null);
      setShowChangeRequestModal(player);
      return;
    }
    execute(async () => {
      await database.updatePlayer(player.id, player, currentUser?.email);
      await onDataChange('players');
      setShowModal(null);
    }, 'Error actualizando jugador');
  };

  const handleCreateChangeRequest = (player, newValues, notes) => execute(async () => {
    await database.createPlayerChangeRequest(
      player.id,
      currentUser?.email,
      {
        viatico: player.viatico,
        complemento: player.complemento,
        contrato: player.contrato
      },
      newValues,
      notes
    );
    setShowChangeRequestModal(null);
    setAlertModal({
      isOpen: true,
      title: 'Éxito',
      message: 'Solicitud de cambio enviada exitosamente. Será revisada por un administrador',
      type: 'success'
    });
  }, 'Error creando solicitud');

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este jugador?')) {
      execute(async () => {
        await database.deletePlayer(id);
        await onDataChange('players');
      }, 'Error eliminando jugador');
    }
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    if (selectedPlayers.length === 0) {

      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Selecciona al menos un jugador para exportar',
        type: 'warning'
      });
      return;
    }

    const fieldLabels = {
      name: 'Nombre Completo',
      name_visual: 'Nombre Visual',
      gov_id: 'Cédula',
      categoria: 'Categoría',
      date_of_birth: 'Fecha de Nacimiento',
      contrato: 'Contrato',
      viatico: 'Viático',
      complemento: 'Complemento',
      total: 'Total',
      bank: 'Banco',
      bank_account: 'Cuenta Bancaria'
    };

    const playersToExport = sortedPlayers.filter(p => selectedPlayers.includes(p.id));
    
    const exportData = playersToExport.map(player => {
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
            case 'date_of_birth':
              row[label] = player.date_of_birth || '';
              break;
            case 'contrato':
              row[label] = player.contrato ? 'Sí' : 'No';
              break;
            case 'viatico':
              row[label] = player.contrato ? 'Contrato' : (player.viatico || 0);
              break;
            case 'complemento':
              row[label] = player.contrato ? 'Contrato' : (player.complemento || 0);
              break;
            case 'total':
              row[label] = player.contrato ? 'Contrato' : calculateTotal(player);
              break;
            case 'bank':
              row[label] = player.bank || '';
              break;
            case 'bank_account':
              row[label] = player.bank_account || '';
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
    const filename = `jugadores_viatico_${date}_${time}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    
    setShowExportConfig(false);
    setSelectedPlayers([]);
  };

  const is3eraOnlyUser = currentUser?.categoria?.length === 1 && currentUser.categoria[0] === '3era';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Jugadores</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              if (selectedPlayers.length === 0) {

                setAlertModal({
                  isOpen: true,
                  title: 'Error',
                  message: 'Selecciona al menos un jugador para exportar',
                  type: 'warning'
                });
                return;
              }
              setShowExportConfig(true);
            }}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            Exportar a Excel {selectedPlayers.length > 0 && `(${selectedPlayers.length})`}
          </button>
        </div>
      </div>
      {/* Summary Section */}
      {sortedPlayers.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Resumen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Jugadores</p>
              <p className="text-2xl font-bold text-blue-600">{sortedPlayers.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Con Contrato</p>
              <p className="text-2xl font-bold text-green-600">
                {sortedPlayers.filter(p => p.contrato).length}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Viáticos/Complementos</p>
              <p className="text-2xl font-bold text-purple-600">
                ${sortedPlayers
                  .filter(p => !p.contrato)
                  .reduce((sum, p) => sum + calculateTotal(p), 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
            
      <div className="bg-white rounded-lg shadow mb-6 mt-6 p-4">
        <div className="flex gap-4 flex-wrap">
          <input 
            type="text" 
            placeholder="Buscar por nombre o cédula..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg" 
          />
          <select 
            value={filterCategoria} 
            onChange={(e) => setFilterCategoria(e.target.value)} 
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">
              {is3eraOnlyUser ? 'Todas las Categorías' : 'Todas las Categorías (excepto 3era)'}
            </option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={selectedPlayers.length === sortedPlayers.length && sortedPlayers.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th 
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Nombre
                  <SortIcon columnKey="name" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('gov_id')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Cédula
                  <SortIcon columnKey="gov_id" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('age')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Edad
                  <SortIcon columnKey="age" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('categoria')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Categoría
                  <SortIcon columnKey="categoria" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('contrato')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Contrato
                  <SortIcon columnKey="contrato" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('viatico')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Viático
                  <SortIcon columnKey="viatico" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('complemento')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Complemento
                  <SortIcon columnKey="complemento" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('total')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Total
                  <SortIcon columnKey="total" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('bank')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Banco
                  <SortIcon columnKey="bank" />
                </div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedPlayers.map(player => (
              <tr key={player.id} className="hover:bg-gray-50">
                <td className="px-3 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(player.id)}
                    onChange={() => handleSelectPlayer(player.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 font-medium">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="font-semibold whitespace-nowrap">{player.name_visual || player.name}</div>
                      {player.name_visual && player.name_visual !== player.name && (
                        <div className="text-xs text-gray-500 mt-1">({player.name})</div>
                      )}
                    </div>
                    {(player.vianda || 0) > 0 && (
                      <Utensils className="w-4 h-4 text-amber-600 flex-shrink-0" title={`${player.vianda} vianda(s)`} />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{player.gov_id}</td>
                <td className="px-6 py-4 text-sm">{calculateAge(player.date_of_birth)} años</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                    {player.categoria}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {player.contrato ? (
                    <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                      Sí
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                      No
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {player.contrato ? '-' : `$${player.viatico.toLocaleString()}`}
                </td>
                <td className="px-6 py-4 text-sm">
                  {player.contrato ? '-' : `$${player.complemento.toLocaleString()}`}
                </td>
                <td className="px-6 py-4 text-sm">
                  {player.contrato ? (
                    <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                      Contrato
                    </span>
                  ) : (
                    <span className="font-semibold">${calculateTotal(player).toLocaleString()}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">{player.bank || '-'}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    
                    
                    <button 
                      onClick={() => setShowModal({
                        title: `Ver Jugador: ${player.name}`,
                        content: <PlayerFormViatico player={player} onSubmit={() => {}} currentUser={currentUser} readOnly={true} />
                      })} 
                      className="text-blue-600 hover:text-blue-800"
                      title="Ver información"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {canDirectEdit ? (
                      <button 
                        onClick={() => setShowModal({
                          title: `Editar Jugador: ${player.name}`,
                          content: <PlayerFormViatico player={player} onSubmit={handleEdit} currentUser={currentUser} onDirtyChange={onFormDirtyChange} />
                        })} 
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => setShowChangeRequestModal(player)}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Solicitar cambio"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => setShowHistoryModal({ playerId: player.id, playerName: player.name })}
                      className="text-purple-600 hover:text-purple-800"
                      title="Ver historial"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedPlayers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron jugadores</p>
          </div>
        )}
      </div>
      {showHistoryModal && (
        <PlayerHistoryModal
          playerId={showHistoryModal.playerId}
          playerName={showHistoryModal.playerName}
          onClose={() => setShowHistoryModal(null)}
        />
      )}
      {showExportConfig && (
        <ExportConfigModal
          selectedPlayers={selectedPlayers}
          exportFields={exportFields}
          toggleExportField={toggleExportField}
          onClose={() => setShowExportConfig(false)}
          onExport={handleExportToExcel}
        />
      )}
      {showChangeRequestModal && (
        <ChangeRequestModal
          player={showChangeRequestModal}
          currentValues={{
            viatico: showChangeRequestModal.viatico,
            complemento: showChangeRequestModal.complemento,
            contrato: showChangeRequestModal.contrato
          }}
          onSubmit={(newValues, notes) => handleCreateChangeRequest(showChangeRequestModal, newValues, notes)}
          onClose={() => setShowChangeRequestModal(null)}
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