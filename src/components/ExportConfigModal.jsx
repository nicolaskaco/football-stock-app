import React from 'react';
import { Download } from 'lucide-react';

export const ExportConfigModal = ({ 
  selectedPlayers, 
  exportFields, 
  toggleExportField, 
  onClose, 
  onExport 
}) => {
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
    total: 'Total Viático',
    contrato: 'Contrato',
    bank: 'Banco',
    bank_account: 'Cuenta Bancaria'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">Configurar Exportación a Excel</h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Jugadores seleccionados: <strong>{selectedPlayers.length}</strong>
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Campos a exportar:</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(exportFields).map(field => (
                <label key={field} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={exportFields[field]}
                    onChange={() => toggleExportField(field)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">{fieldLabels[field]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onExport}
              disabled={selectedPlayers.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Exportar ({selectedPlayers.length} jugadores)
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};