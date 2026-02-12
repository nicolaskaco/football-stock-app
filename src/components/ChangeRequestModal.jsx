import React, { useState } from 'react';
import { AlertCircle, Save, X } from 'lucide-react';

export const ChangeRequestModal = ({ player, currentValues, onSubmit, onClose }) => {
  const [newValues, setNewValues] = useState({
    viatico: currentValues.viatico || 0,
    complemento: currentValues.complemento || 0,
    contrato: currentValues.contrato || false
  });
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const hasChanges = 
    newValues.viatico !== currentValues.viatico ||
    newValues.complemento !== currentValues.complemento ||
    newValues.contrato !== currentValues.contrato;

  const handleSubmit = () => {
    if (!hasChanges) {
      alert('No hay cambios para solicitar');
      return;
    }

    if (!notes.trim()) {
      setError('Debes ingresar una justificación');
      return;
    }

    
    onSubmit(newValues, notes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h3 className="text-xl font-bold">Solicitar Cambio de Valores</h3>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Jugador:</strong> {player.name_visual || player.name}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Como Presidente de Categoría, los cambios en viáticos y contrato requieren aprobación.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Viático Actual
                </label>
                <div className="px-4 py-2 bg-gray-100 border rounded-lg">
                  ${(currentValues.viatico || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo Viático *
                </label>
                <input
                  type="number"
                  value={newValues.viatico}
                  onChange={(e) => setNewValues({...newValues, viatico: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complemento Actual
                </label>
                <div className="px-4 py-2 bg-gray-100 border rounded-lg">
                  ${(currentValues.complemento || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo Complemento *
                </label>
                <input
                  type="number"
                  value={newValues.complemento}
                  onChange={(e) => setNewValues({...newValues, complemento: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contrato Actual
                </label>
                <div className="px-4 py-2 bg-gray-100 border rounded-lg">
                  {currentValues.contrato ? 'Sí' : 'No'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo Contrato
                </label>
                <label className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white">
                  <input
                    type="checkbox"
                    checked={newValues.contrato}
                    onChange={(e) => setNewValues({...newValues, contrato: e.target.checked})}
                    className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <span className="text-sm">Tiene Contrato</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas / Justificación *
              </label>
              <textarea
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                placeholder="Explica el motivo del cambio solicitado..."
              />
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSubmit}
              disabled={!hasChanges}
              className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 text-black px-4 py-3 rounded-lg hover:bg-yellow-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              Enviar Solicitud
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};