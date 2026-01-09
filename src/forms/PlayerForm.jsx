import React, { useState, useEffect } from 'react';
import { DocumentUpload } from '../components/DocumentUpload';

export const PlayerForm = ({ player, onSubmit }) => {
  const [formData, setFormData] = useState(player || { 
    name: '',
    gov_id: '',
    date_of_birth: null,
    viatico: 0,
    complemento: 0,
    contrato: false,
    bank: '',
    bank_account: '',
    comentario_viatico: '',
    categoria: '',
    numero_buzo: null,
    numero_pantalon: null,
    hide_player: false,
    representante: '',
    casita: false,
    vianda: 0,
    departamento: '',
    posicion: '',
    email: '',
    pasaporte_uy: false,
    pasaporte_ext: false,
    tipo_pasaporte_ext: '',
    fecha_llegada: null,
    captador: '',
    celular: ''
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

  const categorias = ['3era', '4ta', '5ta', 'S16', '6ta', '7ma'];
  const banks = ['Itau', 'Prex', 'Mi Dinero', 'BROU', 'Santander', 'Scotia', 'HSBC', 'Otro'];
  const departamentos = ['Montevideo', 'Canelones', 'Artigas', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida', 'Lavalleja', 'Maldonado', 'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto', 'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres', 'Argentina', 'Brasil', 'Colombia', 'España', 'Estados Unidos', 'Venezuela'];
  const posiciones = ['Arquero', 'Zaguero', 'Lateral', 'Volante', 'Extremo', 'Delantero'];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-lg">
      {/* BASIC INFORMATION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Información Básica</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Posición
            </label>
            <select 
              value={formData.posicion} 
              onChange={(e) => setFormData({...formData, posicion: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione Posición</option>
              {posiciones.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departamento
            </label>
            <select 
              value={formData.departamento} 
              onChange={(e) => setFormData({...formData, departamento: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione Departamento</option>
              {departamentos.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CONTACT INFORMATION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Información de Contacto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="email@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Celular
            </label>
            <input 
              type="tel" 
              value={formData.celular} 
              onChange={(e) => setFormData({...formData, celular: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="099 123 456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Representante
            </label>
            <input 
              type="text" 
              value={formData.representante} 
              onChange={(e) => setFormData({...formData, representante: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="Nombre del Representante"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Captador
            </label>
            <input 
              type="text" 
              value={formData.captador} 
              onChange={(e) => setFormData({...formData, captador: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="Nombre del que lo trajo al club"
            />
          </div>
        </div>
      </div>

      {/* FINANCIAL INFORMATION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Información Financiera</h3>
        <div className="mb-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Viático {formData.contrato && <span className="text-red-500">(Deshabilitado)</span>}
            </label>
            <input type="text" inputMode="numeric" pattern="[0-9]*"
              disabled={formData.contrato}
              value={formData.viatico || ''} 
              onChange={(e) => setFormData({...formData, viatico: parseInt(e.target.value) || 0})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Complemento {formData.contrato && <span className="text-red-500">(Deshabilitado)</span>}
            </label>
            <input type="text" inputMode="numeric" pattern="[0-9]*"
              disabled={formData.contrato}
              value={formData.complemento ?? 0}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : Math.min(99999, Math.max(0, parseInt(e.target.value) || 0));
                setFormData({...formData, complemento: value});
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
            />
          </div>
        </div>

        <div className="mt-4">
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

      {/* BANK INFORMATION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Información Bancaria</h3>
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
      </div>

      {/* PASSPORT INFORMATION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Información de Pasaporte</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input 
                type="checkbox" 
                checked={formData.pasaporte_uy} 
                onChange={(e) => setFormData({...formData, pasaporte_uy: e.target.checked})} 
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              Pasaporte Uruguayo
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input 
                type="checkbox" 
                checked={formData.pasaporte_ext} 
                onChange={(e) => setFormData({...formData, pasaporte_ext: e.target.checked})} 
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              Pasaporte Extranjero
            </label>
          </div>

          {formData.pasaporte_ext && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                País del Pasaporte Extranjero
              </label>
              <input 
                type="text" 
                value={formData.tipo_pasaporte_ext} 
                onChange={(e) => setFormData({...formData, tipo_pasaporte_ext: e.target.value})} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                placeholder="Italia"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Llegada (año)
            </label>
            <input 
              type="number" 
              min="2000"
              max="2100"
              value={formData.fecha_llegada || ''} 
              onChange={(e) => setFormData({...formData, fecha_llegada: e.target.value ? parseInt(e.target.value) : null})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="2024"
            />
          </div>
        </div>
      </div>

      {/* UNIFORM INFORMATION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Información de Indumentaria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Buzo
            </label>
            <input type="text" inputMode="numeric" pattern="[0-9]*"
              value={formData.numero_buzo || ''} 
              onChange={(e) => setFormData({...formData, numero_buzo: e.target.value ? parseInt(e.target.value) : null})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Pantalón
            </label>
            <input 
              type="text" 
              inputMode="numeric" 
              pattern="[0-9]*"
              name="pantalon"
              value={formData.numero_pantalon || ''} 
              onChange={(e) => setFormData({...formData, numero_pantalon: e.target.value ? parseInt(e.target.value) : null})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>
      </div>

      {/* OTHER OPTIONS */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Residencia/Vianda</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Casita
            </label>
            <div className="flex items-center h-[42px]">
              <input 
                type="checkbox" 
                checked={formData.casita} 
                onChange={(e) => setFormData({...formData, casita: e.target.checked})} 
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vianda
            </label>
            <input type="text" inputMode="numeric" pattern="[0-9]*"
              value={formData.vianda || ''} 
              onChange={(e) => setFormData({...formData, vianda: parseInt(e.target.value) || 0})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>
      </div>

      {/* DOCUMENTS SECTION */}
      {player && player.id && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Documentos</h3>
          <DocumentUpload playerId={player.id} playerName={player.name} />
        </div>
      )}

      <button 
        type="submit" 
        className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200"
      >
        {player ? '✓ Actualizar' : '+ Agregar'} Jugador
      </button>

      {/*}
      <button 
        type="submit" 
        className="w-full bg-black text-yellow-400 py-3 rounded-lg hover:bg-gray-800 font-medium transition-colors duration-200 mt-8"
      >
        {player ? 'Actualizar' : 'Agregar'} Jugador
      </button>*/}
    </form>
  );
};