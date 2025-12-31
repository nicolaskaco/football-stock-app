import React, { useState, useEffect } from 'react';

export const PlayerFormViatico = ({ player, onSubmit }) => {
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

  const categorias = ['3era', '4ta', 'S16', '5ta', '6ta', '7ma'];
  const banks = ['Itau', 'Prex', 'Mi Dinero', 'BROU', 'Santander', 'Scotia', 'HSBC', 'Other'];

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
            required 
            value={formData.date_of_birth} 
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
            onChange={(e) => setFormData({...formData, categoria: e.target.value})} 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione Categoría</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input 
              type="checkbox" 
              checked={formData.contrato} 
              onChange={(e) => setFormData({...formData, contrato: e.target.checked})} 
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            Tiene Contrato
          </label>
        </div>
      </div>

      {/* Viático and Complemento - disabled if contrato is checked */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Viático {formData.contrato && <span className="text-red-500">(Deshabilitado - Tiene Contrato)</span>}
          </label>
          <input 
            type="number" 
            min="0"
            max="99999"
            disabled={formData.contrato}
            value={formData.viatico || ''} 
            onChange={(e) => setFormData({...formData, viatico: parseInt(e.target.value) || 0})} 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complemento {formData.contrato && <span className="text-red-500">(Deshabilitado - Tiene Contrato)</span>}
          </label>
          <input 
            type="number" 
            min="0"
            max="99999"
            disabled={formData.contrato}
            value={formData.complemento} 
            onChange={(e) => setFormData({...formData, complemento: parseInt(e.target.value) || 0})} 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
          />
        </div>
      </div>

      {/* Bank Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Banco
          </label>
          <select 
            value={formData.bank} 
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
              onChange={(e) => setFormData({...formData, comentario_viatico: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="Notas adicionales sobre viático..."
            />
        </div>
      </div>

      <button 
        type="submit" 
        className="w-full bg-black text-yellow-400 py-3 rounded-lg hover:bg-gray-800 font-medium"
      >
        {player ? 'Actualizar' : 'Agregar'} Jugador
      </button>
    </form>
  );
};