import React, { useState, useEffect, useRef } from 'react';

export const PlayerFormViatico = ({ player, onSubmit, currentUser, readOnly = false, onDirtyChange }) => {
  const [formData, setFormData] = useState(player || {
    name: '',
    gov_id: '',
    date_of_birth: '',
    viatico: 0,
    complemento: 0,
    contrato: false,
    bank: '',
    bank_account: '',
    comentario_viatico: '',
    categoria: '',
  });
  const initialData = useRef(JSON.stringify(player || {}));
  const isPresidenteCategoria = currentUser?.role === 'presidente_categoria';

  useEffect(() => {
    onDirtyChange?.(JSON.stringify(formData) !== initialData.current);
  }, [formData]);

  // When contrato is checked, clear viatico and complemento
  useEffect(() => {
    if (formData.contrato) {
      setFormData(prev => ({
        ...prev,
        viatico: 0,
        complemento: 0
      }));
    }
  }, [formData.contrato]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChangeRequest = (e) => {
    e.preventDefault();
    // Pass flag to parent that this is a change request
    onSubmit(formData, true);
  };

  const categorias = ['3era', '4ta', 'S16', '5ta', '6ta', '7ma', 'Sub13'];
  const banks = ['Itau', 'Prex', 'MiDinero', 'BROU', 'Santander', 'Scotia', 'HSBC', 'Otro'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre Completo *
          </label>
          <input 
            type="text" 
            required 
            value={formData.name} 
            disabled={readOnly}
            onChange={(e) => setFormData({...formData, name: e.target.value})} 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cédula o Pasaporte *
          </label>
          <input 
            type="text" 
            required 
            value={formData.gov_id} 
            disabled={readOnly}
            onChange={(e) => setFormData({...formData, gov_id: e.target.value})} 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Nacimiento *
          </label>
          <input 
            type="date" 
            value={formData.date_of_birth} 
            disabled={readOnly}
            onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría *
          </label>
          <select 
            required 
            value={formData.categoria} 
            disabled={readOnly}
            onChange={(e) => setFormData({...formData, categoria: e.target.value})} 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione Categoría</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Viático and Complemento - disabled if contrato is checked OR if presidente_categoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Viático {formData.contrato && <span className="text-red-500">(Deshabilitado - Tiene Contrato)</span>}
            {isPresidenteCategoria && <span className="text-orange-500"> (Requiere aprobación)</span>}
          </label>
          <input type="text" inputMode="numeric" pattern="[0-9]*"
            disabled={readOnly || (formData.contrato || isPresidenteCategoria)}
            value={formData.viatico || ''} 
            onChange={(e) => setFormData({...formData, viatico: parseInt(e.target.value) || 0})} 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complemento {formData.contrato && <span className="text-red-500">(Deshabilitado - Tiene Contrato)</span>}
            {isPresidenteCategoria && <span className="text-orange-500"> (Requiere aprobación)</span>}
          </label>
          <input type="text" inputMode="numeric" pattern="[0-9]*"
            disabled={readOnly || (formData.contrato || isPresidenteCategoria)}
            value={formData.complemento} 
            onChange={(e) => setFormData({...formData, complemento: parseInt(e.target.value) || 0})} 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input 
            type="checkbox" 
            checked={formData.contrato} 
            onChange={(e) => setFormData({...formData, contrato: e.target.checked})} 
            disabled={readOnly || isPresidenteCategoria}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          Tiene Contrato
          {isPresidenteCategoria && <span className="text-orange-500 text-xs">(Requiere aprobación)</span>}
        </label>
      </div>

      {/* Bank Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Banco
          </label>
          <select 
            value={formData.bank} 
            disabled={readOnly}
            onChange={(e) => setFormData({...formData, bank: e.target.value})} 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione Banco</option>
            {banks.map(bank => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cuenta Bancaria
          </label>
          <input 
            type="text" 
            value={formData.bank_account} 
            onChange={(e) => setFormData({...formData, bank_account: e.target.value})} 
            disabled={readOnly}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
            placeholder="Número de cuenta"
          />
        </div>
      </div>

      {/* Comment */}
      <div className="col-span-1 md:col-span-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentario Viático
          </label>
            <textarea 
              rows="3"
              value={formData.comentario_viatico} 
              disabled={readOnly}
              onChange={(e) => setFormData({...formData, comentario_viatico: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="Notas adicionales sobre viático..."
            />
        </div>
      </div>

      {readOnly ? (
        <div className="w-full bg-gray-100 text-gray-600 py-4 rounded-lg text-center font-bold text-lg">
          Modo Solo Lectura
        </div>
      ) : isPresidenteCategoria && player ? (
        <div className="space-y-3">
          <button 
            type="submit" 
            className="w-full bg-black hover:bg-gray-800 text-yellow-400 py-3 rounded-lg font-medium"
          >
            Actualizar Información General
          </button>
          <button 
            type="button"
            onClick={handleChangeRequest}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-medium"
          >
            Solicitar Cambio de Viáticos/Contrato
          </button>
          <p className="text-sm text-orange-600 text-center">
            Los cambios financieros requieren aprobación de un administrador
          </p>
        </div>
      ) : (
        <button 
          type="submit" 
          className="w-full bg-black hover:bg-gray-800 text-yellow-400 py-3 rounded-lg font-medium"
        >
          {player ? 'Actualizar' : 'Agregar'} Jugador
        </button>
      )}
    </form>
  );
};