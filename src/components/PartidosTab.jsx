import React, { useState } from 'react';
import { Plus, Eye, Trash2, Calendar, Pencil, List } from 'lucide-react';
import { JornadaForm } from '../forms/JornadaForm';
import { PartidoDetailView } from './PartidoDetailView';
import { CalendarioView } from './CalendarioView';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { ConfirmModal } from './ConfirmModal';
import { formatDate } from '../utils/dateUtils';
import { CATEGORIAS_PARTIDO } from '../utils/constants';

export const PartidosTab = ({ jornadas = [], rivales = [], players = [], setShowModal, onDataChange, currentUser, onFormDirtyChange }) => {
  const { execute } = useMutation();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [view, setView] = useState('lista'); // 'lista' | 'calendario'

  const canEdit = currentUser?.canEditPartidos || false;

  const handleAddJornada = (formData, escenarioBase) => execute(async () => {
    await database.addJornada(formData, escenarioBase);
    await onDataChange('jornadas');
    setShowModal(null);
  }, 'Error al crear la jornada', 'Jornada creada correctamente');

  const openEditJornada = (jornada) => {
    onFormDirtyChange(false);
    const handleEditJornada = (formData) => execute(async () => {
      await database.updateJornada(jornada.id, formData);
      await onDataChange('jornadas');
      setShowModal(null);
    }, 'Error al guardar la jornada', 'Jornada actualizada correctamente');

    setShowModal({
      title: 'Editar Jornada',
      content: (
        <JornadaForm
          rivales={rivales}
          jornada={jornada}
          onSubmit={handleEditJornada}
        />
      ),
    });
  };

  const handleDelete = (id) => execute(async () => {
    await database.deleteJornada(id);
    await onDataChange('jornadas');
    setConfirmDelete(null);
  }, 'Error al eliminar la jornada', 'Jornada eliminada correctamente');

  const openNewJornada = () => {
    onFormDirtyChange(false);
    setShowModal({
      title: 'Nueva Jornada',
      content: (
        <JornadaForm
          rivales={rivales}
          onSubmit={handleAddJornada}
        />
      ),
    });
  };

  const openDetail = (jornada) => {
    setShowModal({
      title: `${jornada.rivales?.name || 'Rival'} — ${formatDate(jornada.fecha)}`,
      content: (
        <PartidoDetailView
          jornada={jornada}
          players={players}
          canEdit={canEdit}
          setShowModal={setShowModal}
          onDataChange={onDataChange}
          onFormDirtyChange={onFormDirtyChange}
          reopenDetail={openDetail}
        />
      ),
    });
  };

  // Get the escenario for a given categoria within a jornada
  const getEscenarioForCategoria = (jornada, categoria) => {
    const partido = (jornada.partidos || []).find((p) => p.categoria === categoria);
    return partido?.escenario || '—';
  };

  const escenarioBadge = (esc) => {
    if (esc === 'Local') return 'bg-green-100 text-green-800';
    if (esc === 'Visitante') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Partidos</h2>
          <p className="text-sm text-gray-500 mt-1">
            {jornadas.length} jornada{jornadas.length !== 1 ? 's' : ''} registrada{jornadas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Vista toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
            <button
              onClick={() => setView('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition ${view === 'lista' ? 'bg-black text-yellow-400' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              onClick={() => setView('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-l border-gray-300 transition ${view === 'calendario' ? 'bg-black text-yellow-400' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Calendario
            </button>
          </div>

          {canEdit && (
            <button
              onClick={openNewJornada}
              className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800 font-medium"
            >
              <Plus className="w-4 h-4" />
              Nueva Jornada
            </button>
          )}
        </div>
      </div>

      {jornadas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No hay jornadas registradas aún.</p>
          {canEdit && (
            <p className="text-gray-400 text-sm mt-2">Usá el botón "Nueva Jornada" para comenzar.</p>
          )}
        </div>
      ) : view === 'calendario' ? (
        <CalendarioView jornadas={jornadas} onJornadaClick={openDetail} />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jornada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fase</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rival</th>
                {CATEGORIAS_PARTIDO.map((cat) => (
                  <th key={cat} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {cat}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jornadas.map((jornada) => (
                <tr key={jornada.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {jornada.numero_jornada ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                        {jornada.numero_jornada}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                      {jornada.fase}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{formatDate(jornada.fecha)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{jornada.rivales?.name || '—'}</td>
                  {CATEGORIAS_PARTIDO.map((cat) => {
                    const esc = getEscenarioForCategoria(jornada, cat);
                    return (
                      <td key={cat} className="px-3 py-4 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${escenarioBadge(esc)}`}>
                          {esc}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openDetail(jornada)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => openEditJornada(jornada)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar jornada"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => setConfirmDelete(jornada)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Eliminar Jornada"
        message={`¿Estás seguro que querés eliminar la jornada contra "${confirmDelete?.rivales?.name}" del ${formatDate(confirmDelete?.fecha)}? Esta acción no se puede deshacer.`}
        onConfirm={() => handleDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
