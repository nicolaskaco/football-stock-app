import React, { useState } from 'react';
import { Plus, Eye, Trash2, Calendar } from 'lucide-react';
import { JornadaForm } from '../forms/JornadaForm';
import { PartidoDetailView } from './PartidoDetailView';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { ConfirmModal } from './ConfirmModal';
import { formatDate } from '../utils/dateUtils';
import { CATEGORIAS_PARTIDO } from '../utils/constants';

export const PartidosTab = ({ jornadas = [], rivales = [], players = [], setShowModal, onDataChange, currentUser, onFormDirtyChange }) => {
  const { execute } = useMutation();
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canEdit = currentUser?.canEditPartidos || false;

  const handleAddJornada = (formData, escenarioBase) => execute(async () => {
    await database.addJornada(formData, escenarioBase);
    await onDataChange('jornadas');
    setShowModal(null);
  }, 'Error al crear la jornada', 'Jornada creada correctamente');

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Partidos</h2>
          <p className="text-sm text-gray-500 mt-1">
            {jornadas.length} jornada{jornadas.length !== 1 ? 's' : ''} registrada{jornadas.length !== 1 ? 's' : ''}
          </p>
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

      {jornadas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No hay jornadas registradas aún.</p>
          {canEdit && (
            <p className="text-gray-400 text-sm mt-2">Usá el botón "Nueva Jornada" para comenzar.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
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
