import React, { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Upload, X, FileSpreadsheet, ImagePlus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { RivalForm } from '../forms/RivalForm';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { ConfirmModal } from './ConfirmModal';
import { RivalBadge } from './ui/RivalBadge';
import { useToast } from '../context/ToastContext';
import { RIVAL_BADGE_ACCEPT, matchBadgeFiles } from '../utils/rivalBadges';

export const RivalesTab = ({ rivales = [], setShowModal, onDataChange, currentUser, onFormDirtyChange }) => {
  const { execute, isSaving } = useMutation();
  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [importPreview, setImportPreview] = useState(null); // { names: [], duplicates: [] }
  const [badgePreview, setBadgePreview] = useState(null); // { matched: [], unmatched: [], rejected: [] }
  const fileInputRef = useRef(null);
  const badgeInputRef = useRef(null);

  const canEdit = currentUser?.canEditPartidos || false;

  const handleAdd = (formData, { badgeFile } = {}) => execute(async () => {
    const created = await database.addRival(formData);
    if (badgeFile) await database.uploadRivalBadge(created, badgeFile);
    await onDataChange('rivales');
    setShowModal(null);
  }, 'Error al agregar rival', 'Rival agregado correctamente');

  // El nombre y el escudo del rival también viajan anidados en jornadas y torneos
  const handleEdit = (formData, rival, { badgeFile, removeBadge } = {}) => execute(async () => {
    await database.updateRival(rival.id, formData);
    if (badgeFile) await database.uploadRivalBadge(rival, badgeFile);
    else if (removeBadge) await database.removeRivalBadge(rival);
    await onDataChange('rivales', 'jornadas', 'torneos');
    setShowModal(null);
  }, 'Error al actualizar rival', 'Rival actualizado correctamente');

  const handleDelete = (rival) => execute(async () => {
    await database.deleteRival(rival.id, rival.badge_path);
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
          onSubmit={(data, badge) => handleEdit(data, rival, badge)}
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

  // Asocia cada imagen con un rival por el nombre del archivo y muestra la vista previa
  const handleBadgeFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setBadgePreview(matchBadgeFiles(files, rivales));
  };

  const handleConfirmBadges = () => execute(async () => {
    const failed = [];
    for (const { file, rival } of badgePreview.matched) {
      try {
        await database.uploadRivalBadge(rival, file);
      } catch (error) {
        console.error('Error al subir escudo', file.name, error);
        failed.push(rival.name);
      }
    }
    await onDataChange('rivales', 'jornadas', 'torneos');
    setBadgePreview(null);

    const ok = badgePreview.matched.length - failed.length;
    if (ok > 0) showToast(`${ok} escudo${ok !== 1 ? 's' : ''} subido${ok !== 1 ? 's' : ''} correctamente`, 'success');
    if (failed.length > 0) showToast(`No se pudo subir el escudo de: ${failed.join(', ')}`, 'error');
  }, 'Error al subir escudos');

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
            {rivales.length > 0 && (
              <button
                onClick={() => badgeInputRef.current?.click()}
                className="flex items-center gap-2 bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <ImagePlus className="w-4 h-4" />
                Subir escudos
              </button>
            )}
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
            <input
              ref={badgeInputRef}
              type="file"
              accept={RIVAL_BADGE_ACCEPT}
              multiple
              className="hidden"
              onChange={handleBadgeFilesChange}
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

      {/* Badge upload preview panel */}
      {badgePreview && (
        <div className="bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-600 rounded-lg shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Vista previa de escudos</h3>
            </div>
            <button onClick={() => setBadgePreview(null)} disabled={isSaving} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          {badgePreview.matched.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {badgePreview.matched.length} escudo{badgePreview.matched.length !== 1 ? 's' : ''} a subir:
              </p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {badgePreview.matched.map(({ file, rival }) => (
                  <span key={rival.id} className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded text-sm">
                    {rival.name}
                    {rival.badge_path && <span className="text-xs opacity-75"> (reemplaza el actual)</span>}
                    <span className="text-xs opacity-75"> ← {file.name}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Ningún archivo coincide con un rival.</p>
          )}

          {badgePreview.unmatched.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                {badgePreview.unmatched.length} sin rival con ese nombre (se omitirá{badgePreview.unmatched.length !== 1 ? 'n' : ''}):
              </p>
              <div className="flex flex-wrap gap-2">
                {badgePreview.unmatched.map((file, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 rounded text-sm line-through">
                    {file.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {badgePreview.rejected.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                {badgePreview.rejected.length} archivo{badgePreview.rejected.length !== 1 ? 's' : ''} no válido{badgePreview.rejected.length !== 1 ? 's' : ''}:
              </p>
              <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                {badgePreview.rejected.map(({ file, reason }, i) => (
                  <li key={i}>{file.name}: {reason}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            El nombre del archivo debe coincidir con el nombre del rival (ej: Nacional.png). No importan mayúsculas, tildes ni espacios.
          </p>

          <div className="flex justify-end gap-3 pt-2 border-t dark:border-gray-700">
            <button
              onClick={() => setBadgePreview(null)}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 border dark:border-gray-600 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmBadges}
              disabled={badgePreview.matched.length === 0 || isSaving}
              className="px-4 py-2 text-sm bg-black text-yellow-400 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSaving ? 'Subiendo...' : `Subir${badgePreview.matched.length > 0 ? ` (${badgePreview.matched.length})` : ''}`}
            </button>
          </div>
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
                <th className="pl-6 py-3 w-14 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Escudo
                </th>
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
                  <td className="pl-6 py-2">
                    <RivalBadge rival={rival} size="md" />
                  </td>
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
        onConfirm={() => handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
