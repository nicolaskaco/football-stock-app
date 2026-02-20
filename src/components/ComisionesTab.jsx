import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Shield, Info, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ComisionForm } from '../forms/ComisionForm';
import { ComisionDetailView } from '../components/ComisionDetailView';
import { database } from '../utils/database';
import { AlertModal } from './AlertModal';
import { useMutation } from '../hooks/useMutation';
import { ConfirmModal } from './ConfirmModal';

export const ComisionesTab = ({ comisiones = [], dirigentes = [], setShowModal, onDataChange, currentUser, onFormDirtyChange }) => {
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'info' });
  const { execute } = useMutation((msg) =>
    setAlertModal({ isOpen: true, title: 'Error', message: msg, type: 'error' })
  );
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('c_search') || '';
  const setSearchTerm = (v) => setSearchParams(prev => {
    const p = new URLSearchParams(prev);
    v ? p.set('c_search', v) : p.delete('c_search');
    return p;
  });

  const canEditComision = currentUser?.canEditComision || false;

  const safeComisiones = Array.isArray(comisiones) ? comisiones : [];

  const filtered = safeComisiones.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.comision_dirigentes?.some(cd => 
      cd.dirigentes?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleAdd = (comision, dirigenteIds) => execute(async () => {
    await database.addComision(comision, dirigenteIds);
    await onDataChange('comisiones');
    setShowModal(null);
  }, 'Error agregando comisión');

  const handleEdit = (comision, dirigenteIds) => execute(async () => {
    const comisionData = {
      name: comision.name,
      description: comision.description
    };
    await database.updateComision(comision.id, comisionData, dirigenteIds);
    await onDataChange('comisiones');
    setShowModal(null);
  }, 'Error actualizando comisión');

  const handleDelete = (id) => setConfirmDelete(id);

  const handleConfirmDelete = () => {
    execute(async () => {
      await database.deleteComision(confirmDelete);
      await onDataChange('comisiones');
    }, 'Error eliminando comisión');
  };

  const handleExportToExcel = () => {
    const exportData = filtered.map(comision => ({
      'Nombre': comision.name,
      'Dirigente(s)': comision.comision_dirigentes?.map(cd => cd.dirigentes?.name).join(', ') || '-',
      'Descripción': comision.description || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comisiones');

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `comisiones_${date}_${time}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  return (
    <>
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Comisiones</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            Exportar a Excel
          </button>
          {canEditComision && (
            <button
              onClick={() => setShowModal({
                title: "Agregar Nueva Comisión",
                content: <ComisionForm onSubmit={handleAdd} dirigentes={dirigentes} onDirtyChange={onFormDirtyChange} />
              })}
              className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              <Plus className="w-5 h-5" />
              Agregar Comisión
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <input
          type="text"
          placeholder="Buscar por nombre o dirigente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-64">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Descripción
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">
                Dirigentes
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(comision => (
              <tr key={comision.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{comision.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="max-w-m text-gray-800">
                      {comision.description || '-'}
                    </div>
                  </td>
                <td className="px-6 py-4 text-sm">
                  {comision.comision_dirigentes && comision.comision_dirigentes.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {comision.comision_dirigentes.slice(0, 3).map((cd, idx) => (
                        <span key={idx} className="text-xs">
                          {cd.dirigentes?.name}
                        </span>
                      ))}
                      {comision.comision_dirigentes.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{comision.comision_dirigentes.length - 3} más
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowModal({
                        title: comision.name,
                        content: <ComisionDetailView comision={comision} />
                      })}
                      className="text-purple-600 hover:text-purple-800"
                      title="Ver detalles completos"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    {canEditComision && (
                      <>
                        <button
                          onClick={() => setShowModal({
                            title: `Editar Comisión: ${comision.name}`,
                            content: <ComisionForm comision={comision} onSubmit={(c, d) => handleEdit({ ...c, id: comision.id }, d)} dirigentes={dirigentes} onDirtyChange={onFormDirtyChange} />
                          })}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(comision.id)}
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
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron comisiones</p>
          </div>
        )}
      </div>
    </div>

    <AlertModal
      isOpen={alertModal.isOpen}
      onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      title={alertModal.title}
      message={alertModal.message}
      type={alertModal.type}
    />
    <ConfirmModal
      isOpen={confirmDelete !== null}
      onClose={() => setConfirmDelete(null)}
      onConfirm={handleConfirmDelete}
      title="Eliminar Comisión"
      message="¿Estás seguro de que quieres eliminar esta comisión? Esta acción no se puede deshacer."
      confirmText="Eliminar"
      type="danger"
    />
    </>
  );
};