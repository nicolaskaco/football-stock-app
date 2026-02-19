import React, { useState } from 'react';

export const ComisionForm = ({ comision, onSubmit, dirigentes = [], readOnly = false }) => {
  const [formData, setFormData] = useState(comision || {
    name: '',
    description: ''
  });

  const [selectedDirigentes, setSelectedDirigentes] = useState(
    comision?.comision_dirigentes?.map(cd => cd.dirigente_id) || []
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit(formData, selectedDirigentes);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDirigente = (dirigenteId) => {
    if (readOnly) return;
    setSelectedDirigentes(prev => 
      prev.includes(dirigenteId)
        ? prev.filter(id => id !== dirigenteId)
        : [...prev, dirigenteId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-lg">
      {/* BASIC INFORMATION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">
          Información de la Comisión
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Comisión *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Comisión de Competiciones"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              rows="6"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Descripción detallada de la comisión y sus responsabilidades..."
            />
          </div>
        </div>
      </div>

      {/* DIRIGENTES SELECTION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">
          Dirigentes
        </h3>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {dirigentes.length === 0 ? (
            <p className="text-gray-500">No hay dirigentes disponibles</p>
          ) : (
            dirigentes.map(dirigente => (
              <label
                key={dirigente.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  readOnly ? 'cursor-not-allowed opacity-70' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDirigentes.includes(dirigente.id)}
                  onChange={() => toggleDirigente(dirigente.id)}
                  disabled={readOnly}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div>
                  <p className="font-medium">{dirigente.name}</p>
                  {dirigente.rol && (
                    <p className="text-sm text-gray-600">{dirigente.rol}</p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
        {selectedDirigentes.length > 0 && (
          <p className="mt-3 text-sm text-gray-600">
            {selectedDirigentes.length} dirigente(s) seleccionado(s)
          </p>
        )}
      </div>

      {readOnly ? (
        <div className="w-full bg-gray-100 text-gray-600 py-4 rounded-lg text-center font-bold text-lg">
          Modo Solo Lectura
        </div>
      ) : (
        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isSaving ? 'Guardando...' : `${comision ? '✓ Actualizar' : '+ Agregar'} Comisión`}
        </button>
      )}
    </form>
  );
};