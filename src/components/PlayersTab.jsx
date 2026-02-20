import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Users, Download, ArrowUpDown, ArrowUp, ArrowDown, History, Eye, Type, Utensils } from 'lucide-react';
import { NameVisualEditor } from '../components/NameVisualEditor';
import { PlayerForm } from '../forms/PlayerForm';
import { database } from '../utils/database';
import * as XLSX from 'xlsx';
import { PlayerHistoryModal } from './PlayerHistoryModal';
import { ExportConfigModal } from './ExportConfigModal';
import { AlertModal } from './AlertModal';

export const PlayersTab = ({ players = [], setShowModal, onDataChange, currentUser }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('p_search') || '';
  const filterCategoria = searchParams.get('p_cat') || 'all';
  const sortConfig = {
    key: searchParams.get('p_sort') || null,
    direction: searchParams.get('p_dir') || 'asc',
  };
  const filterCasita = searchParams.get('p_casita') === 'true';
  const filterContrato = searchParams.get('p_contrato') === 'true';

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

  const setSearchTerm = (v) => setParam('p_search', v, '');
  const setFilterCategoria = (v) => setParam('p_cat', v, 'all');
  const setSortConfig = ({ key, direction }) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      key ? p.set('p_sort', key) : p.delete('p_sort');
      direction && direction !== 'asc' ? p.set('p_dir', direction) : p.delete('p_dir');
      return p;
    });
  };
  const setFilterCasita = (v) => setParam('p_casita', v, false);
  const setFilterContrato = (v) => setParam('p_contrato', v, false);

  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [showExportConfig, setShowExportConfig] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'info' });
  const [exportFields, setExportFields] = useState({
    name: true,
    name_visual: false,
    gov_id: true,
    categoria: true,
    posicion: false,
    departamento: false,
    celular: false,
    email: false,
    representante: false,
    date_of_birth: false,
    casita: false,
    vianda: false,
    viatico: false,
    complemento: false,
    total: true,
    contrato: false,
    bank: false,
    bank_account: false
  });

  const canEditPlayers = currentUser?.canEditPlayers || false;
  const canEditNameVisual = currentUser?.canEditNameVisual || false;

  const categorias = ['3era', '4ta', '5ta', 'S16', '6ta', '7ma', 'Sub13'];

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

    const matchesCasita = !filterCasita || p.casita === true;
    const matchesContrato = !filterContrato || p.contrato === true;
    
    // Add permission-based categoria filter
    const hasAccessToCategoria = !currentUser?.categoria || 
                                  currentUser.categoria.length === 0 || 
                                  currentUser.categoria.includes(p.categoria);

    return matchesSearch && matchesCategoria && matchesCasita && matchesContrato && hasAccessToCategoria;
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

    switch (sortConfig.key) {
      case 'name':
        aValue = (a.name_visual || a.name).toLowerCase();
        bValue = (b.name_visual || b.name).toLowerCase();
        break;
      case 'celular':
        aValue = a.celular.toLowerCase();
        bValue = b.celular.toLowerCase();
        break;
      case 'posicion': {
        const posicionOrder = ['arquero', 'zaguero', 'lateral', 'volante', 'extremo', 'delantero'];
        
        const aPos = a.posicion ? a.posicion.toLowerCase() : '';
        const bPos = b.posicion ? b.posicion.toLowerCase() : '';
        
        // If either is empty, put it last
        if (!aPos && !bPos) return 0;
        if (!aPos) return 1;  // a goes last
        if (!bPos) return -1; // b goes last
        
        aValue = posicionOrder.indexOf(aPos);
        bValue = posicionOrder.indexOf(bPos);
        
        // If not found in order array, treat as if it were empty (put last)
        if (aValue === -1) aValue = 999;
        if (bValue === -1) bValue = 999;
        break; }
      case 'categoria':
        aValue = categorias.indexOf(a.categoria);
        bValue = categorias.indexOf(b.categoria);
        break;
      case 'departamento':
        aValue = a.departamento.toLowerCase();
        bValue = b.departamento.toLowerCase();
        break;
      case 'casita':
        // Special handling for boolean: return early to avoid affecting other cases
        if (a.casita === b.casita) return 0;
        // asc: true first, desc: false first
        return sortConfig.direction === 'asc' 
          ? (b.casita ? 1 : 0) - (a.casita ? 1 : 0)
          : (a.casita ? 1 : 0) - (b.casita ? 1 : 0);
      case 'vianda':
        aValue = Number(a.vianda) || 0;
        bValue = Number(b.vianda) || 0;
        break;
      case 'total':
        // Players with contract go first (treated as -1), then sort by actual total value
        if (a.contrato && b.contrato) return 0;
        if (a.contrato) return sortConfig.direction === 'asc' ? -1 : 1;
        if (b.contrato) return sortConfig.direction === 'asc' ? 1 : -1;
        aValue = calculateTotal(a);
        bValue = calculateTotal(b);
        break;
      case 'representante':
        aValue = a.representante || '';
        bValue = b.representante || '';
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

  const handleAdd = async (player) => {
    try {
      await database.addPlayer(player);
      await onDataChange('players');
      setShowModal(null);
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Error agregando jugador: ' + error.message);
    }
  };

  const handleEdit = async (player) => {
    try {
      await database.updatePlayer(player.id, player, currentUser?.email);
      await onDataChange('players');
      setShowModal(null);
    } catch (error) {
      console.error('Error updating player:', error);
      alert('Error actualizando jugador: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este jugador?')) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Comunicarse con Kaco antes de borrar un jugador',
        type: 'error'
      });
      return;
      /*
      try {
        await database.deletePlayer(id);
        await onDataChange();
      } catch (error) {
        console.error('Error deleting player:', error);
        alert('Error eliminando jugador: ' + error.message);
      }*/
    }
  };

  const handleEditNameVisual = async (player) => {
    setShowModal({
      title: `Editar Nombre Visual: ${player.name}`,
      content: (
        <NameVisualEditor
          player={player}
          onSave={async (nameVisual) => {
            try {
              await database.updatePlayerNameVisual(player.id, nameVisual);
              await onDataChange('players');
              setShowModal(null);
            } catch (error) {
              console.error('Error updating name visual:', error);
              alert('Error actualizando nombre visual: ' + error.message);
            }
          }}
          onClose={() => setShowModal(null)}
        />
      )
    });
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
      posicion: 'Posición',
      departamento: 'Departamento',
      celular: 'Celular',
      email: 'Email',
      representante: 'Representante',
      date_of_birth: 'Fecha de Nacimiento',
      casita: 'Residencia',
      vianda: 'Vianda',
      viatico: 'Viático',
      complemento: 'Complemento',
      total: 'Total',
      contrato: 'Contrato',
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
            case 'posicion':
              row[label] = player.posicion || '';
              break;
            case 'departamento':
              row[label] = player.departamento || '';
              break;
            case 'celular':
              row[label] = player.celular || '';
              break;
            case 'email':
              row[label] = player.email || '';
              break;
            case 'representante':
              row[label] = player.representante || '';
              break;
            case 'date_of_birth':
              row[label] = player.date_of_birth || '';
              break;
            case 'casita':
              row[label] = player.casita ? 'Sí' : 'No';
              break;
            case 'vianda':
              row[label] = player.vianda || 0;
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
            case 'contrato':
              row[label] = player.contrato ? 'Sí' : 'No';
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
    const filename = `jugadores_${date}_${time}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    
    // Close modal and clear selections
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
          {canEditPlayers && (
            <button 
              onClick={() => setShowModal({
                title: "Agregar Nuevo Jugador",
                content: <PlayerForm onSubmit={handleAdd} currentUser={currentUser} />
              })} 
              className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              <Plus className="w-5 h-5" />
              Agregar Jugador
            </button>
          )}
          
        </div>
      </div>
      {/* Summary Section */}
      {sortedPlayers.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Resumen</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Residencia</p>
              <p className="text-2xl font-bold text-yellow-600">
                {sortedPlayers.filter(p => p.casita).length}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Jugadores con Viandas</p>
              <p className="text-2xl font-bold text-orange-600">
                {sortedPlayers.filter(p => (p.vianda || 0) > 0).length}
                <span className="text-lg ml-1">
                  ({sortedPlayers.reduce((sum, p) => sum + (p.vianda || 0), 0)} viandas)
                </span>
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
        <div className="flex gap-4 flex-wrap items-center">
          <input 
            type="text" 
            placeholder="Buscar por nombre o cédula..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="flex-1 min-w-[180px] px-4 py-2 border rounded-lg" 
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
          <label className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100">
            <input 
              type="checkbox" 
              checked={filterCasita}
              onChange={(e) => setFilterCasita(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Solo Residencia</span>
          </label>
          <label className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100">
            <input 
              type="checkbox" 
              checked={filterContrato}
              onChange={(e) => setFilterContrato(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Solo Contrato</span>
          </label>
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
                onClick={() => handleSort('celular')}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Celular
                  <SortIcon columnKey="celular" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('posicion')}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Posición
                  <SortIcon columnKey="posicion" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('categoria')}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Categoría
                  <SortIcon columnKey="categoria" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('departamento')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Departamento/País
                  <SortIcon columnKey="departamento" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('casita')}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Residencia
                  <SortIcon columnKey="casita" />
                </div>
              </th>
              {/*<th 
                onClick={() => handleSort('vianda')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Vianda
                  <SortIcon columnKey="vianda" />
                </div>
              </th>*/}
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
                onClick={() => handleSort('representante')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Representante
                  <SortIcon columnKey="representante" />
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
                      <div className="flex gap-0.5" title={`${player.vianda} vianda(s)`}>
                        {[...Array(Math.min(player.vianda, 10))].map((_, i) => (
                          <Utensils key={i} className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-sm">{player.celular}</td>
                <td className="px-3 py-4 text-sm">{player.posicion}</td>
                <td className="px-3 py-4">
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                    {player.categoria}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{player.departamento || '-'}</td>
                <td className="px-3 py-4">
                  <span className={`text-xl font-bold ${player.casita ? 'text-green-600' : 'text-gray-400'}`}>
                    {player.casita ? '✓' : '☐'}
                  </span>
                </td>
                {/*<td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                    {player.vianda}
                  </span>
                </td>*/}
                <td className="px-6 py-4 text-sm">
                  {player.contrato ? (
                    <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                      Contrato
                    </span>
                  ) : (
                    <span className="font-semibold">${calculateTotal(player).toLocaleString()}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">{player.representante || '-'}</td>
                  <td className="px-3 py-4">
                    <div className="flex gap-2">
                      {canEditPlayers ? (
                        <button 
                          onClick={() => setShowModal({
                            title: `Editar Jugador: ${player.name}`,
                            content: <PlayerForm player={player} onSubmit={handleEdit} currentUser={currentUser} />
                          })} 
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => setShowModal({
                            title: `Ver Jugador: ${player.name}`,
                            content: <PlayerForm player={player} onSubmit={() => {}} readOnly={true} currentUser={currentUser} />
                          })} 
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {canEditNameVisual && (
                        <button 
                          onClick={() => handleEditNameVisual(player)}
                          className="text-indigo-600 hover:text-indigo-800"
                          title="Editar nombre visual"
                        >
                          <Type className="w-4 h-4" />
                        </button>
                      )}
                      {canEditPlayers && (
                        <button 
                          onClick={() => setShowHistoryModal({ playerId: player.id, playerName: player.name })}
                          className="text-purple-600 hover:text-purple-800"
                          title="Ver historial"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      )}
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