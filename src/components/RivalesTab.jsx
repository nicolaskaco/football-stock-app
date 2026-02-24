import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { RivalForm } from '../forms/RivalForm';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { ConfirmModal } from './ConfirmModal';

export const RivalesTab = ({ rivales = [], setShowModal, onDataChange, currentUser, onFormDirtyChange }) => {
  const { execute } = useMutation();
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canEdit = currentUser?.canEditPartidos || false;

  const handleAdd = (formData) => execute(async () => {
    await database.addRival(formData);
    await onDataChange('rivales');
    setShowModal(null);
  }, 'Error al agregar rival', 'Rival agregado correctamente');

  const handleEdit = (formData, id) => execute(async () => {
    await database.updateRival(id, formData);
    await onDataChange('rivales');
    setShowModal(null);
  }, 'Error al actualizar rival', 'Rival actualizado correctamente');

  const handleDelete = (id) => execute(async () => {
    await database.deleteRival(id);
    await onDataChange('rivales');
    setConfirmDelete(null);
  }, 'Error al eliminar rival', 'Rival eliminado correctamente');

  const openAdd = () => {
    onFormDirtyChange(false);
    setShowModal({
      title: 'Agregar Rival',
      content: (
        <RivalForm
          onSubmit={handleAdd}
          onDirtyChange={onFormDirtyChange}
        />
      ),
    });
  };

  const openEdit = (rival) => {
    onFormDirtyChange(false);
    setShowModal({
      title: 'Editar Rival',
      content: (
        <RivalForm
          rival={rival}
          onSubmit={(data) => handleEdit(data, rival.id)}
          onDirtyChange={onFormDirtyChange}
        />
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rivales</h2>
          <p className="text-sm text-gray-500 mt-1">{rivales.length} rival{rivales.length !== 1 ? 'es' : ''} registrado{rivales.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800 font-medium"
          >
            <Plus className="w-4 h-4" />
            Agregar Rival
          </button>
        )}
      </div>

      {rivales.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">No hay rivales cargados aún.</p>
          {canEdit && (
            <p className="text-gray-400 text-sm mt-2">Usá el botón "Agregar Rival" para comenzar.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                {canEdit && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rivales.map((rival) => (
                <tr key={rival.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{rival.name}</td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(rival)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(rival)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Eliminar Rival"
        message={`¿Estás seguro que querés eliminar a "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={() => handleDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
