import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Trophy, Download, Eye, Info } from 'lucide-react';
import { formatDate, todayISO } from '../utils/dateUtils';
import { TorneoForm } from '../forms/TorneoForm';
import { TorneoDetailView } from '../components/TorneoDetailView';
import { database } from '../utils/database';
import * as XLSX from 'xlsx';
import { SearchInput } from './ui/SearchInput';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { AlertModal } from './AlertModal';
import { useMutation } from '../hooks/useMutation';
import { ConfirmModal } from './ConfirmModal';
import { useAlertModal } from '../hooks/useAlertModal';

const ORDINALS = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo','13vo','14vo','15vo','16vo'];
function getOrdinal(pos) {
  return ORDINALS[parseInt(pos, 10) - 1] ?? `${pos}°`;
}
function ResultadoBadge({ torneo }) {
  if (torneo.resultado_playoff === 'campeon')
    return <span className="px-2 py-0.5 text-xs font-bold bg-yellow-400 text-gray-900 rounded-full border border-yellow-500">Campeón</span>;
  if (torneo.resultado_playoff === 'subcampeon')
    return <span className="px-2 py-0.5 text-xs font-bold bg-gray-200 text-gray-700 rounded-full border border-gray-400">Subcampeón</span>;
  if (torneo.posicion_resultado)
    return <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">{getOrdinal(torneo.posicion_resultado)}</span>;
  return <span className="text-gray-400 text-xs">-</span>;
}

export const TorneosTab = ({ torneos = [], dirigentes = [], players = [], employees = [], setShowModal, onDataChange, currentUser, onFormDirtyChange }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('t_search') || '';
  const setSearchTerm = (v) => setSearchParams(prev => {
    const p = new URLSearchParams(prev);
    v ? p.set('t_search', v) : p.delete('t_search');
    return p;
  });
  const [inputValue, setInputValue] = useDebouncedSearch(searchTerm, setSearchTerm);
  const { alertModal, showAlert, closeAlert } = useAlertModal();
  const { execute } = useMutation((msg) => showAlert('Error', msg, 'error'));
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canEditTorneo = currentUser?.canEditTorneo || false;
  //const canViewTorneo = currentUser?.canViewTorneo || false;

  // Safety check
  const safeTorneos = Array.isArray(torneos) ? torneos : [];

  // Year filter
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years = [...new Set(
      safeTorneos.map((t) => t.start_date ? new Date(t.start_date).getFullYear() : null).filter(Boolean)
    )].sort((a, b) => b - a);
    if (!years.includes(currentYear)) years.unshift(currentYear);
    return years;
  }, [safeTorneos]);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Filter torneos
  const filtered = safeTorneos
    .filter((t) => t.start_date && new Date(t.start_date).getFullYear() === selectedYear)
    .filter((t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.city && t.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.country && t.country.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const handleAdd = (torneo, dirigenteIds, playerIds, employeeIds) => execute(async () => {
    const torneoData = {
      name: torneo.name,
      country: torneo.country,
      city: torneo.city,
      categoria: torneo.categoria,
      start_date: torneo.start_date,
      end_date: torneo.end_date,
      posicion_resultado: torneo.posicion_resultado || null,
      resultado_playoff: torneo.resultado_playoff || null,
      comentario_resultado: torneo.comentario_resultado || null,
    };

    await database.addTorneo(torneoData, dirigenteIds, playerIds, employeeIds);
    await onDataChange('torneos');
    setShowModal(null);
  }, 'Error agregando torneo', 'Torneo agregado correctamente');

  const handleEdit = (torneo, dirigenteIds, playerIds, employeeIds) => execute(async () => {
    const torneoData = {
      name: torneo.name,
      country: torneo.country,
      city: torneo.city,
      categoria: torneo.categoria,
      start_date: torneo.start_date,
      end_date: torneo.end_date,
      posicion_resultado: torneo.posicion_resultado || null,
      resultado_playoff: torneo.resultado_playoff || null,
      comentario_resultado: torneo.comentario_resultado || null,
    };
    await database.updateTorneo(torneo.id, torneoData, dirigenteIds, playerIds, employeeIds);
    await onDataChange('torneos');
    setShowModal(null);
  }, 'Error actualizando torneo', 'Torneo actualizado correctamente');

  const handleDelete = (id) => setConfirmDelete(id);

  const handleConfirmDelete = () => {
    showAlert('Aviso', 'Comunicarse con Kaco antes de borrar un torneo', 'error');
  };

  const handleExportToExcel = () => {
    const exportData = filtered.map(torneo => ({
      'Nombre': torneo.name,
      'País': torneo.country || '-',
      'Ciudad': torneo.city || '-',
      'Categoría': torneo.categoria || '-',
      'Fecha Inicio': torneo.start_date || '-',
      'Fecha Fin': torneo.end_date || '-',
      'Dirigentes': torneo.torneo_dirigentes?.map(td => td.dirigentes?.name).join(', ') || '-',
      'Jugadores': torneo.torneo_players?.length || 0,
      'Funcionarios': torneo.torneo_funcionarios?.map(tf => tf.employees?.name).join(', ') || '-',
      'Posición': torneo.posicion_resultado ? getOrdinal(torneo.posicion_resultado) : '-',
      'Resultado Playoff': torneo.resultado_playoff === 'campeon' ? 'Campeón' : torneo.resultado_playoff === 'subcampeon' ? 'Subcampeón' : '-',
      'Comentario': torneo.comentario_resultado || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Torneos');

    const now = new Date();
    const date = todayISO();
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `torneos_${date}_${time}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Torneos</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            Exportar a Excel
          </button>
          {canEditTorneo && (
            <button
              onClick={() => setShowModal({
                title: "Agregar Nuevo Torneo",
                content: <TorneoForm onSubmit={handleAdd} dirigentes={dirigentes} players={players} employees={employees} onDirtyChange={onFormDirtyChange} />
              })}
              className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              <Plus className="w-5 h-5" />
              Agregar Torneo
            </button>
          )}
        </div>
      </div>

      {/* Summary Section */}
      {filtered.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">Resumen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Torneos</p>
              <p className="text-2xl font-bold text-blue-600">{filtered.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Próximos Torneos</p>
              <p className="text-2xl font-bold text-green-600">
                {filtered.filter(t => t.start_date && new Date(t.start_date) > new Date()).length}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Torneos Activos</p>
              <p className="text-2xl font-bold text-purple-600">
                {filtered.filter(t => {
                  if (!t.start_date || !t.end_date) return false;
                  const now = new Date();
                  return new Date(t.start_date) <= now && new Date(t.end_date) >= now;
                }).length}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow mb-6 p-4 flex flex-col sm:flex-row gap-3 items-center">
        <SearchInput
          value={inputValue}
          onChange={setInputValue}
          placeholder="Buscar por nombre, ciudad o país..."
          className="w-full"
        />
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-gray-500 font-medium">Año:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                País/Ciudad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Fechas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Dirigentes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Jugadores
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Funcionarios
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Resultado
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(torneo => (
              <tr key={torneo.id} className="hover:bg-gray-50">
                <td
                  className="px-6 py-4 font-medium cursor-pointer hover:text-purple-600 hover:underline"
                  onClick={() => setShowModal({
                    title: torneo.name,
                    content: <TorneoDetailView torneo={torneo} />
                  })}
                >{torneo.name}</td>
                <td className="px-6 py-4 text-sm">
                  {torneo.country && torneo.city ? `${torneo.country} - ${torneo.city}` : torneo.country || torneo.city || '-'}
                </td>
                <td className="px-6 py-4">
                  {torneo.categoria ? (
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                      {torneo.categoria}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {formatDate(torneo.start_date)} - {formatDate(torneo.end_date)}
                </td>
                <td className="px-6 py-4 text-sm">
                  {torneo.torneo_dirigentes && torneo.torneo_dirigentes.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {torneo.torneo_dirigentes.slice(0, 2).map((td, idx) => (
                        <span key={idx} className="text-xs">
                          {td.dirigentes?.name}
                        </span>
                      ))}
                      {torneo.torneo_dirigentes.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{torneo.torneo_dirigentes.length - 2} más
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                    {torneo.torneo_players?.length || 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {torneo.torneo_funcionarios && torneo.torneo_funcionarios.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {torneo.torneo_funcionarios.slice(0, 2).map((tf, idx) => (
                        <span key={idx} className="text-xs">
                          {tf.employees?.name}
                        </span>
                      ))}
                      {torneo.torneo_funcionarios.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{torneo.torneo_funcionarios.length - 2} más
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <ResultadoBadge torneo={torneo} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowModal({
                        title: torneo.name,
                        content: <TorneoDetailView torneo={torneo} />
                      })}
                      className="text-purple-600 hover:text-purple-800"
                      title="Ver detalles completos"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    {canEditTorneo && (
                      <>
                        <button
                          onClick={() => setShowModal({
                            title: `Editar Torneo: ${torneo.name}`,
                            content: <TorneoForm torneo={torneo} onSubmit={(t, d, p, e) => handleEdit({ ...t, id: torneo.id }, d, p, e)} dirigentes={dirigentes} players={players} employees={employees} onDirtyChange={onFormDirtyChange} />
                          })}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(torneo.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron torneos</p>
          </div>
        )}
      </div>
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
        title="Eliminar Torneo"
        message="¿Estás seguro de que quieres eliminar este torneo?"
        confirmText="Continuar"
        type="warning"
      />
    </div>
  );
};