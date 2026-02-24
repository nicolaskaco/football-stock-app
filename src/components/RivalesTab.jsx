import React, { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Upload, X, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { RivalForm } from '../forms/RivalForm';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { ConfirmModal } from './ConfirmModal';

export const RivalesTab = ({ rivales = [], setShowModal, onDataChange, currentUser, onFormDirtyChange }) => {
  const { execute } = useMutation();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [importPreview, setImportPreview] = useState(null); // { names: [], duplicates: [] }
  const fileInputRef = useRef(null);

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

  // Parse Excel file and show preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Collect non-empty strings from column A, skip header if it looks like one
        const existing = new Set(rivales.map((r) => r.name.trim().toLowerCase()));
        const newNames = [];
        const duplicates = [];

        rows.forEach((row, i) => {
          if (i === 0) return; // Siempre ignorar la primera fila (encabezado)
          const cell = row[0];
          if (!cell) return;
          const name = String(cell).trim();
          if (!name) return;
          if (existing.has(name.toLowerCase())) {
            duplicates.push(name);
          } else {
            newNames.push(name);
          }
        });

        setImportPreview({ names: newNames, duplicates });
      } catch {
        // If parse fails, show a simple alert via toast indirectly
        setImportPreview({ names: [], duplicates: [], error: 'No se pudo leer el archivo. Asegurate de subir un archivo .xlsx o .xls válido.' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => execute(async () => {
    await database.addRivalesBulk(importPreview.names);
    await onDataChange('rivales');
    setImportPreview(null);
  }, 'Error al importar rivales', `${importPreview?.names.length} rival${importPreview?.names.length !== 1 ? 'es' : ''} importado${importPreview?.names.length !== 1 ? 's' : ''} correctamente`);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rivales</h2>
          <p className="text-sm text-gray-500 mt-1">{rivales.length} rival{rivales.length !== 1 ? 'es' : ''} registrado{rivales.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
            >
              <Upload className="w-4 h-4" />
              Importar Excel
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800 font-medium"
            >
              <Plus className="w-4 h-4" />
              Agregar Rival
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {/* Import preview panel */}
      {importPreview && (
        <div className="bg-white border border-green-200 rounded-lg shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-800">Vista previa de importación</h3>
            </div>
            <button onClick={() => setImportPreview(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {importPreview.error ? (
            <p className="text-red-600 text-sm">{importPreview.error}</p>
          ) : (
            <>
              {importPreview.names.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {importPreview.names.length} rival{importPreview.names.length !== 1 ? 'es' : ''} nuevo{importPreview.names.length !== 1 ? 's' : ''} a importar:
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {importPreview.names.map((name, i) => (
                      <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay rivales nuevos para importar.</p>
              )}

              {importPreview.duplicates.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    {importPreview.duplicates.length} ya existente{importPreview.duplicates.length !== 1 ? 's' : ''} (se omitirán):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {importPreview.duplicates.map((name, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-sm line-through">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  onClick={() => setImportPreview(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importPreview.names.length === 0}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Importar {importPreview.names.length > 0 ? `(${importPreview.names.length})` : ''}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Format hint */}
      {canEdit && rivales.length === 0 && !importPreview && (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">No hay rivales cargados aún.</p>
          <p className="text-gray-400 text-sm mt-2">
            Usá "Agregar Rival" para cargar uno a uno, o "Importar Excel" para subir varios a la vez.
          </p>
          <p className="text-gray-400 text-xs mt-1">
            El Excel debe tener los nombres de los rivales en la columna A (una fila por rival).
          </p>
        </div>
      )}

      {rivales.length > 0 && (
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
