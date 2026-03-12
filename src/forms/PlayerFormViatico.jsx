import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIAS, BANCOS } from '../utils/constants';
import { ViaticosCongeladosBanner } from '../components/ViaticosCongeladosBanner';

export const PlayerFormViatico = ({ player, onSubmit, currentUser, readOnly = false, onDirtyChange, appSettings = {} }) => {
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
    complemento_override: null,
    complemento_override_expira: null,
  });
  const initialData = useRef(JSON.stringify(player || {}));
  const isPresidenteCategoria = currentUser?.role === 'presidente_categoria';
  const canEditOverride = ['presidente', 'ejecutivo', 'admin'].includes(currentUser?.role);
  const viaticosCongelados = appSettings['viaticos_congelados'] === 'true';

  useEffect(() => {
    onDirtyChange?.(JSON.stringify(formData) !== initialData.current);
  }, [formData]);

  // When contrato is checked, clear viatico, complemento, and override
  useEffect(() => {
    if (formData.contrato) {
      setFormData(prev => ({
        ...prev,
        viatico: 0,
        complemento: 0,
        complemento_override: null,
        complemento_override_expira: null,
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

  const categorias = CATEGORIAS;
  const banks = BANCOS;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {viaticosCongelados && (
        <ViaticosCongeladosBanner contacto={appSettings['viaticos_congelados_contacto'] || 'Martín Arroyo'} />
      )}
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
            {isPresidenteCategoria && !viaticosCongelados && <span className="text-orange-500"> (Requiere aprobación)</span>}
          </label>
          <input type="text" inputMode="numeric" pattern="[0-9]*"
            disabled={readOnly || formData.contrato || isPresidenteCategoria || viaticosCongelados}
            value={formData.viatico || ''}
            onChange={(e) => setFormData({...formData, viatico: parseInt(e.target.value) || 0})}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complemento {formData.contrato && <span className="text-red-500">(Deshabilitado - Tiene Contrato)</span>}
            {isPresidenteCategoria && !viaticosCongelados && <span className="text-orange-500"> (Requiere aprobación)</span>}
          </label>
          <input type="text" inputMode="numeric" pattern="[0-9]*"
            disabled={readOnly || formData.contrato || isPresidenteCategoria || viaticosCongelados}
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
            disabled={readOnly || isPresidenteCategoria || viaticosCongelados}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          Tiene Contrato
          {isPresidenteCategoria && !viaticosCongelados && <span className="text-orange-500 text-xs">(Requiere aprobación)</span>}
        </label>
      </div>

      {/* Override Temporal de Complemento */}
      {!formData.contrato && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-yellow-800 mb-3">
            Override Temporal de Complemento
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Override
                {!canEditOverride && <span className="text-gray-400 ml-1">(solo lectura)</span>}
              </label>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                disabled={readOnly || !canEditOverride || viaticosCongelados}
                value={formData.complemento_override ?? ''}
                placeholder="Sin override activo"
                onChange={(e) => setFormData({...formData, complemento_override: parseInt(e.target.value) || null})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Válido hasta
              </label>
              <input
                type="date"
                disabled={readOnly || !canEditOverride || viaticosCongelados}
                value={formData.complemento_override_expira ?? ''}
                onChange={(e) => setFormData({...formData, complemento_override_expira: e.target.value || null})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          {canEditOverride && formData.complemento_override != null && (
            <button
              type="button"
              onClick={() => setFormData({...formData, complemento_override: null, complemento_override_expira: null})}
              className="mt-2 text-xs text-red-600 hover:underline"
            >
              Limpiar override
            </button>
          )}
        </div>
      )}

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
      ) : viaticosCongelados ? (
        <button
          type="submit"
          className="w-full bg-black hover:bg-gray-800 text-yellow-400 py-3 rounded-lg font-medium"
        >
          Actualizar Información General
        </button>
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