import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '../hooks/useMutation';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { CATEGORIAS, POSICIONES_JUGADOR } from '../utils/constants';
import { todayISO, calculateAge } from '../utils/dateUtils';
import { calculateTotal } from '../utils/playerUtils';
import { Plus, Edit2, Trash2, Users, Download, History, Eye, Type, Stethoscope, Upload, Settings2 } from 'lucide-react';
import { ViandaIcons } from './ui/ViandaIcons';
import { SortIcon } from './ui/SortIcon';
import { FichaMedicaIcon } from './ui/FichaMedicaIcon';
import { InjuryIcon } from './ui/InjuryIcon';
import { SearchInput } from './ui/SearchInput';
import { NameVisualEditor } from '../components/NameVisualEditor';
import { PlayerForm } from '../forms/PlayerForm';
import { database } from '../utils/database';
import * as XLSX from 'xlsx';
import { PlayerHistoryModal } from './PlayerHistoryModal';
import { ExportConfigModal } from './ExportConfigModal';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';
import { useAlertModal } from '../hooks/useAlertModal';
import { BulkActionModal } from './BulkActionModal';
import { ImportPreviewModal } from './ImportPreviewModal';
import { InjuryForm } from '../forms/InjuryForm';
import { PlayerComparisonModal } from './PlayerComparisonModal';
import { ChangeRequestModal } from './ChangeRequestModal';

export const PlayersTab = ({ players = [], injuries = [], jornadas = [], setShowModal, onDataChange, currentUser, onFormDirtyChange, appSettings = {}, pendingChangeRequests = [] }) => {
  const isAdmin = currentUser?.role === 'admin';
  const viaticosCongelados = appSettings['viaticos_congelados'] === 'true';
  const pendingPlayerIds = new Set(pendingChangeRequests.map(r => r.player_id));
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(null);
  // Build a map: player_id -> active (open) injury
  const activeInjuryMap = {};
  injuries.forEach(inj => {
    if (!inj.fecha_alta && !activeInjuryMap[inj.player_id]) activeInjuryMap[inj.player_id] = inj;
  });
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
  const [inputValue, setInputValue] = useDebouncedSearch(searchTerm, setSearchTerm);
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
  const { alertModal, showAlert, closeAlert } = useAlertModal();
  const { execute } = useMutation((msg) => showAlert('Error', msg, 'error'));
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [fichaMedicaLoading, setFichaMedicaLoading] = useState(null);
  const [bulkFichaProgress, setBulkFichaProgress] = useState(null); // { current, total } while running
  const [showBulkAction, setShowBulkAction] = useState(null); // { action, changes, columns }
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleCreateChangeRequest = (player, newValues, notes) => execute(async () => {
    const alreadyPending = await database.hasPendingChangeRequest(player.id);
    if (alreadyPending) {
      throw new Error('Ya existe una solicitud pendiente para este jugador. Debe ser resuelta antes de enviar una nueva.');
    }
    await database.createPlayerChangeRequest(
      player.id,
      currentUser?.email,
      { viatico: player.viatico, complemento: player.complemento, contrato: player.contrato },
      newValues,
      notes
    );
    setShowChangeRequestModal(null);
    onDataChange('pendingChangeRequests');
  }, 'Error creando solicitud', 'Solicitud enviada. Será revisada por un administrador');

  const handleCheckFichaMedica = async (player) => {
    if (!player.gov_id) {
      showAlert('Sin cédula', 'Este jugador no tiene cédula registrada', 'warning');
      return;
    }
    setFichaMedicaLoading(player.id);
    try {
      const result = await database.checkFichaMedica(player.gov_id, player.tipo_documento);
      if (!result.found) {
        showAlert('Sin resultados', `No se encontró carné para cédula ${player.gov_id}`, 'info');
      } else {
        const fichaFutbol = result.fichas.find(f => ['FÚTBOL', 'FUTBOL'].includes(f.deporte.toUpperCase()));
        if (fichaFutbol) {
          await database.saveFichaMedicaHasta(player.id, fichaFutbol.hasta);
          onDataChange('players');
        }
        const alertType = fichaFutbol ? (fichaFutbol.vencido ? 'error' : 'success') : 'info';
        const content = result.fichas.length > 0
          ? (
            <div className="space-y-3">
              {result.fichas.map((f, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="font-semibold text-gray-800 mb-1">{f.deporte}</div>
                  <div className="text-sm">Desde: {f.desde}</div>
                  <div className={`text-sm font-medium ${f.vencido ? 'text-red-600' : 'text-green-700'}`}>
                    Hasta: {f.hasta} — {f.vencido ? '❌ Vencido' : '✅ Vigente'}
                  </div>
                </div>
              ))}
            </div>
          )
          : 'Sin disciplinas registradas';
        showAlert(result.nombre, content, alertType);
      }
    } catch {
      showAlert('Error', 'No se pudo consultar el carné del deportista (SND)', 'error');
    } finally {
      setFichaMedicaLoading(null);
    }
  };

  const openInjuryModal = (player) => {
    const activeInjury = activeInjuryMap[player.id] || null;
    const playerName = player.name_visual || player.name;

    const handleSaveInjury = async (payload) => {
      await execute(async () => {
        if (activeInjury) {
          await database.updateInjury(activeInjury.id, payload);
        } else {
          payload.created_by = currentUser?.email || 'Unknown';
          await database.addInjury(payload);
        }
        await onDataChange('injuries');
        setShowModal(null);
      }, 'Error guardando lesión', activeInjury ? 'Lesión actualizada' : 'Lesión registrada');
    };

    const handleDischarge = async () => {
      await execute(async () => {
        await database.dischargeInjury(activeInjury.id);
        await onDataChange('injuries');
        setShowModal(null);
      }, 'Error dando de alta', 'Jugador dado de alta');
    };

    setShowModal({
      title: activeInjury ? `Lesión: ${playerName}` : `Registrar Lesión: ${playerName}`,
      content: (
        <div>
          <InjuryForm
            injury={activeInjury}
            playerId={player.id}
            playerName={playerName}
            onSubmit={handleSaveInjury}
          />
          {activeInjury && !activeInjury.fecha_alta && (
            <button
              type="button"
              onClick={handleDischarge}
              className="w-full mt-3 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Dar de Alta
            </button>
          )}
        </div>
      ),
    });
  };

  const handleBulkFichaMedica = async () => {
    const players = sortedPlayers.filter(p => selectedPlayers.includes(p.id));
    const total = players.length;
    const results = { updated: [], notFound: [], sinCedula: [], error: [] };

    setBulkFichaProgress({ current: 0, total });
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      setBulkFichaProgress({ current: i + 1, total });
      if (!player.gov_id) {
        results.sinCedula.push(player.name_visual || player.name);
        continue;
      }
      try {
        const result = await database.checkFichaMedica(player.gov_id, player.tipo_documento);
        if (!result.found) {
          results.notFound.push(player.name_visual || player.name);
        } else if (result.fichas.length > 0) {
          const fichaFutbol = result.fichas.find(f => ['FÚTBOL', 'FUTBOL'].includes(f.deporte.toUpperCase()));
          if (fichaFutbol) {
            await database.saveFichaMedicaHasta(player.id, fichaFutbol.hasta);
            results.updated.push(player.name_visual || player.name);
          } else {
            results.notFound.push(player.name_visual || player.name);
          }
        } else {
          results.notFound.push(player.name_visual || player.name);
        }
      } catch {
        results.error.push(player.name_visual || player.name);
      }
      if (i < players.length - 1) await new Promise(r => setTimeout(r, 500));
    }

    setBulkFichaProgress(null);
    onDataChange('players');

    const content = (
      <div className="space-y-3 text-sm">
        {results.updated.length > 0 && (
          <div><span className="font-semibold text-green-700">✅ Actualizados ({results.updated.length}):</span> {results.updated.join(', ')}</div>
        )}
        {results.notFound.length > 0 && (
          <div><span className="font-semibold text-gray-600">🔍 No encontrados en SND ({results.notFound.length}):</span> {results.notFound.join(', ')}</div>
        )}
        {results.sinCedula.length > 0 && (
          <div><span className="font-semibold text-orange-600">⚠️ Sin cédula ({results.sinCedula.length}):</span> {results.sinCedula.join(', ')}</div>
        )}
        {results.error.length > 0 && (
          <div><span className="font-semibold text-red-600">❌ Error ({results.error.length}):</span> {results.error.join(', ')}</div>
        )}
      </div>
    );
    showAlert('Resultado actualización ficha médica', content, results.error.length > 0 ? 'error' : 'success');
  };
  const defaultExportFields = {
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
  };
  const [exportFields, setExportFields] = useState(() => {
    try {
      const saved = localStorage.getItem('cap_export_fields');
      return saved ? { ...defaultExportFields, ...JSON.parse(saved) } : defaultExportFields;
    } catch {
      return defaultExportFields;
    }
  });

  const canEditPlayers = currentUser?.canEditPlayers || false;
  const canEditNameVisual = currentUser?.canEditNameVisual || false;

  const categorias = CATEGORIAS;

  // Add safety check
  const safePlayers = Array.isArray(players) ? players : [];

  // Filter players
  const filtered = safePlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.name_visual && p.name_visual.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          p.gov_id.toLowerCase().includes(searchTerm.toLowerCase());

    // Check if user is 3era-only user
    const is3eraOnlyUser = currentUser?.categoria?.length === 1 && currentUser.categoria[0] === '3era';

    const efectivaCat = p.categoria_juego || p.categoria;

    // Modified categoria filter
    const matchesCategoria = filterCategoria === 'all'
      ? (is3eraOnlyUser ? true : efectivaCat !== '3era')  // Include 3era only for 3era-only users
      : efectivaCat === filterCategoria;

    const matchesCasita = !filterCasita || p.casita === true;
    const matchesContrato = !filterContrato || p.contrato === true;

    // Availability filter
    const filterDisp = searchParams.get('p_disp') || 'all';
    const hasActiveInjury = !!activeInjuryMap[p.id];
    const matchesDisp = filterDisp === 'all' || (filterDisp === 'lesionados' ? hasActiveInjury : !hasActiveInjury);

    // Add permission-based categoria filter (uses playing category)
    const hasAccessToCategoria = !currentUser?.categoria ||
                                  currentUser.categoria.length === 0 ||
                                  currentUser.categoria.includes(efectivaCat);

    return matchesSearch && matchesCategoria && matchesCasita && matchesContrato && matchesDisp && hasAccessToCategoria;
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
    setExportFields(prev => {
      const updated = { ...prev, [field]: !prev[field] };
      localStorage.setItem('cap_export_fields', JSON.stringify(updated));
      return updated;
    });
  };

  // calculateAge imported from dateUtils

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
        const posicionOrder = POSICIONES_JUGADOR.map(p => p.toLowerCase());
        
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
        aValue = categorias.indexOf(a.categoria_juego || a.categoria);
        bValue = categorias.indexOf(b.categoria_juego || b.categoria);
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

  const handleAdd = (player) => execute(async () => {
    await database.addPlayer(player);
    await onDataChange('players');
    setShowModal(null);
  }, 'Error agregando jugador', 'Jugador agregado correctamente');

  const handleEdit = (player) => execute(async () => {
    await database.updatePlayer(player.id, player, currentUser?.email);
    await onDataChange('players');
    setShowModal(null);
  }, 'Error actualizando jugador', 'Jugador actualizado correctamente');

  const handleDelete = (id) => setConfirmDelete(id);

  const handleConfirmDelete = () => {
    showAlert('Aviso', 'Comunicarse con Kaco antes de borrar un jugador', 'error');
  };

  const prepareBulkAction = (action) => {
    setShowBulkMenu(false);
    const selected = sortedPlayers.filter(p => selectedPlayers.includes(p.id));
    if (selected.length === 0) {
      showAlert('Error', 'Selecciona al menos un jugador', 'warning');
      return;
    }

    let changes, columns;
    switch (action) {
      case 'categoria': {
        setShowCategoryPicker(true);
        return;
      }
      case 'casita': {
        const newVal = !selected.every(p => p.casita);
        changes = selected.filter(p => p.casita !== newVal).map(p => ({
          id: p.id,
          name: p.name_visual || p.name,
          before: { casita: p.casita },
          after: { casita: newVal },
        }));
        columns = [
          { key: 'name', label: 'Jugador', render: (r) => r.name },
          { key: 'casita', label: 'Residencia' },
        ];
        break;
      }
      case 'hide': {
        changes = selected.map(p => ({
          id: p.id,
          name: p.name_visual || p.name,
          before: { hide_player: false },
          after: { hide_player: true },
        }));
        columns = [
          { key: 'name', label: 'Jugador', render: (r) => r.name },
          { key: 'hide_player', label: 'Ocultar' },
        ];
        break;
      }
      default: return;
    }
    if (!changes || changes.length === 0) {
      showAlert('Sin cambios', 'Ningún jugador requiere modificación', 'info');
      return;
    }
    setShowBulkAction({ action, changes, columns });
  };

  const handleBulkConfirm = () => execute(async () => {
    const { action, changes } = showBulkAction;
    const ids = changes.map(c => c.id);
    const fields = changes[0].after;
    await database.bulkUpdatePlayers(ids, fields);
    await onDataChange('players');
    setShowBulkAction(null);
    setSelectedPlayers([]);
  }, 'Error actualizando jugadores', `${showBulkAction?.changes.length} jugador${showBulkAction?.changes.length !== 1 ? 'es' : ''} actualizado${showBulkAction?.changes.length !== 1 ? 's' : ''}`);

  const handleCategorySelect = (newCat) => {
    setShowCategoryPicker(false);
    const selected = sortedPlayers.filter(p => selectedPlayers.includes(p.id));
    const changes = selected.filter(p => p.categoria !== newCat).map(p => ({
      id: p.id,
      name: p.name_visual || p.name,
      before: { categoria: p.categoria },
      after: { categoria: newCat },
    }));
    if (changes.length === 0) {
      showAlert('Sin cambios', 'Ningún jugador requiere modificación', 'info');
      return;
    }
    const columns = [
      { key: 'name', label: 'Jugador', render: (r) => r.name },
      { key: 'categoria', label: 'Categoría' },
    ];
    setShowBulkAction({ action: 'categoria', changes, columns });
  };

  const handleImportConfirm = async (players) => {
    await execute(async () => {
      await database.bulkAddPlayers(players);
      await onDataChange('players');
      setShowImportModal(false);
    }, 'Error importando jugadores', `${players.length} jugador${players.length !== 1 ? 'es' : ''} importado${players.length !== 1 ? 's' : ''} correctamente`);
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

      showAlert('Error', 'Selecciona al menos un jugador para exportar', 'warning');
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
    const date = todayISO();
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">Gestión de Jugadores</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              if (selectedPlayers.length === 0) {

                showAlert('Error', 'Selecciona al menos un jugador para exportar', 'warning');
                return;
              }
              setShowExportConfig(true);
            }}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
            title="Exportar a Excel"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Exportar</span>
            {selectedPlayers.length > 0 && `(${selectedPlayers.length})`}
          </button>
          {selectedPlayers.length >= 2 && selectedPlayers.length <= 3 && (
            <button
              onClick={() => {
                const selected = players.filter(p => selectedPlayers.includes(p.id));
                setShowModal({
                  title: 'Comparar Jugadores',
                  content: <PlayerComparisonModal players={selected} jornadas={jornadas} injuries={injuries} />
                });
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 text-sm"
              title="Comparar jugadores"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Comparar</span> ({selectedPlayers.length})
            </button>
          )}
          {selectedPlayers.length >= 2 && (
            <button
              onClick={handleBulkFichaMedica}
              disabled={!!bulkFichaProgress}
              className="flex items-center gap-2 bg-teal-600 text-white px-3 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm"
              title="Consultar ficha médica"
            >
              {bulkFichaProgress ? (
                <>
                  <span className="w-4 h-4 block animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {bulkFichaProgress.current}/{bulkFichaProgress.total}
                </>
              ) : (
                <>
                  <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Ficha médica</span> ({selectedPlayers.length})
                </>
              )}
            </button>
          )}
          {canEditPlayers && selectedPlayers.length >= 1 && (
            <div className="relative">
              <button
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm"
                title="Acción masiva"
              >
                <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Acción masiva</span> ({selectedPlayers.length})
              </button>
              {showBulkMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[200px]">
                  <button onClick={() => prepareBulkAction('categoria')} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">Cambiar categoría</button>
                  <button onClick={() => prepareBulkAction('casita')} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">Toggle residencia</button>
                  <button onClick={() => prepareBulkAction('hide')} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600">Ocultar jugadores</button>
                </div>
              )}
            </div>
          )}
          {canEditPlayers && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 bg-green-700 text-white px-3 py-2 rounded-lg hover:bg-green-800 text-sm"
              title="Importar jugadores"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Importar</span>
            </button>
          )}
          {canEditPlayers && (
            <button 
              onClick={() => setShowModal({
                title: "Agregar Nuevo Jugador",
                content: <PlayerForm onSubmit={handleAdd} currentUser={currentUser} onDirtyChange={onFormDirtyChange} appSettings={appSettings} />
              })} 
              className="flex items-center gap-2 bg-black text-yellow-400 px-3 py-2 rounded-lg hover:bg-gray-800 text-sm"
              title="Agregar jugador"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Agregar</span>
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
          <SearchInput
            value={inputValue}
            onChange={setInputValue}
            placeholder="Buscar por nombre o cédula..."
            className="flex-1 min-w-[180px]"
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
          {isAdmin && (
            <select
              value={searchParams.get('p_disp') || 'all'}
              onChange={(e) => setParam('p_disp', e.target.value, 'all')}
              className="px-4 py-2 border rounded-lg bg-gray-50 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="disponibles">Disponibles</option>
              <option value="lesionados">Lesionados</option>
            </select>
          )}
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
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none sticky left-0 z-10 bg-gray-50 border-r border-gray-200"
              >
                <div className="flex items-center gap-2">
                  Nombre
                  <SortIcon sortConfig={sortConfig} columnKey="name" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('celular')}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Celular
                  <SortIcon sortConfig={sortConfig} columnKey="celular" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('posicion')}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Posición
                  <SortIcon sortConfig={sortConfig} columnKey="posicion" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('categoria')}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Categoría
                  <SortIcon sortConfig={sortConfig} columnKey="categoria" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('departamento')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Departamento/País
                  <SortIcon sortConfig={sortConfig} columnKey="departamento" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('casita')}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Residencia
                  <SortIcon sortConfig={sortConfig} columnKey="casita" />
                </div>
              </th>
              {/*<th 
                onClick={() => handleSort('vianda')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Vianda
                  <SortIcon sortConfig={sortConfig} columnKey="vianda" />
                </div>
              </th>*/}
              <th 
                onClick={() => handleSort('total')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Total
                  <SortIcon sortConfig={sortConfig} columnKey="total" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('representante')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-1">
                  Representante
                  <SortIcon sortConfig={sortConfig} columnKey="representante" />
                </div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedPlayers.map(player => (
              <tr key={player.id} className="hover:bg-gray-50 group">
                <td className="px-3 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(player.id)}
                    onChange={() => handleSelectPlayer(player.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-4 font-medium sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-200 max-w-[160px] sm:max-w-none">
                  <div>
                    <div className="flex items-center gap-1 font-semibold min-w-0">
                      <button
                        className="text-left truncate sm:overflow-visible sm:whitespace-normal hover:text-blue-700 hover:underline cursor-pointer"
                        onClick={() => setShowModal({
                          title: `Ver Jugador: ${player.name}`,
                          content: <PlayerForm player={player} onSubmit={() => {}} readOnly={true} currentUser={currentUser} injuries={injuries.filter(i => i.player_id === player.id).sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))} jornadas={jornadas} appSettings={appSettings}
                            onRequestChange={currentUser?.role === 'presidente_categoria' && !viaticosCongelados ? () => {
                              setShowModal(null);
                              setShowChangeRequestModal(player);
                            } : null}
                            hasPendingRequest={pendingPlayerIds.has(player.id)}
                          />
                        })}
                      >
                        {player.name_visual || player.name}
                      </button>
                      <FichaMedicaIcon hasta={player.ficha_medica_hasta} />
                      {activeInjuryMap[player.id] && <InjuryIcon injury={activeInjuryMap[player.id]} />}
                      <ViandaIcons count={player.vianda} />
                    </div>
                    {player.name_visual && player.name_visual !== player.name && (
                      <div className="text-xs text-gray-500 mt-1 truncate sm:overflow-visible sm:whitespace-normal">({player.name})</div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-sm">{player.celular}</td>
                <td className="px-3 py-4 text-sm">{player.posicion}</td>
                <td className="px-3 py-4">
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                    {player.categoria_juego || player.categoria}
                  </span>
                  {player.categoria_juego && player.categoria_juego !== player.categoria && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full whitespace-nowrap" title="Categoría de cobro">
                      💰 {player.categoria}
                    </span>
                  )}
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
                            content: <PlayerForm player={player} onSubmit={handleEdit} currentUser={currentUser} onDirtyChange={onFormDirtyChange} injuries={injuries.filter(i => i.player_id === player.id).sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))} jornadas={jornadas} appSettings={appSettings} />
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
                            content: <PlayerForm player={player} onSubmit={() => {}} readOnly={true} currentUser={currentUser} injuries={injuries.filter(i => i.player_id === player.id).sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))} jornadas={jornadas} appSettings={appSettings} />
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
                      <button
                        onClick={() => handleCheckFichaMedica(player)}
                        disabled={fichaMedicaLoading === player.id}
                        className="text-teal-600 hover:text-teal-800 disabled:opacity-40"
                        title="Consultar carné deportista (SND)"
                      >
                        {fichaMedicaLoading === player.id
                          ? <span className="w-4 h-4 block animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                          : <Stethoscope className="w-4 h-4" />}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => openInjuryModal(player)}
                          className={`hover:opacity-80 ${activeInjuryMap[player.id] ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                          title={activeInjuryMap[player.id] ? 'Ver / editar lesión' : 'Registrar lesión'}
                        >
                          <svg viewBox="0 0 16 16" className="w-4 h-4"><rect x="0" y="0" width="16" height="16" rx="2" fill={activeInjuryMap[player.id] ? '#dc2626' : 'currentColor'} /><rect x="6" y="2" width="4" height="12" rx="0.5" fill="white" /><rect x="2" y="6" width="12" height="4" rx="0.5" fill="white" /></svg>
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
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Jugador"
        message="¿Estás seguro de que quieres eliminar este jugador?"
        confirmText="Continuar"
        type="warning"
      />
      <BulkActionModal
        isOpen={!!showBulkAction}
        onClose={() => setShowBulkAction(null)}
        onConfirm={handleBulkConfirm}
        title={`Acción masiva — ${showBulkAction?.changes.length || 0} jugador${(showBulkAction?.changes.length || 0) !== 1 ? 'es' : ''}`}
        changes={showBulkAction?.changes}
        columns={showBulkAction?.columns}
      />
      <ImportPreviewModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onConfirm={handleImportConfirm}
        existingPlayers={safePlayers}
      />
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
      {showCategoryPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Seleccionar categoría</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4">Elegí la nueva categoría para los {selectedPlayers.length} jugador{selectedPlayers.length !== 1 ? 'es' : ''} seleccionado{selectedPlayers.length !== 1 ? 's' : ''}:</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIAS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className="px-4 py-3 border-2 rounded-lg text-sm font-semibold hover:bg-yellow-50 hover:border-yellow-400 transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowCategoryPicker(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};