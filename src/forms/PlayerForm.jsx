import React, { useState } from 'react';
import { useFormDirty } from '../hooks/useFormDirty';
import { DocumentUpload } from '../components/DocumentUpload';
import { ViaticosCongeladosBanner } from '../components/ViaticosCongeladosBanner';
import { CATEGORIAS, BANCOS, DEPARTAMENTOS, POSICIONES_JUGADOR } from '../utils/constants';
import { formatDate } from '../utils/dateUtils';

const SEVERITY_BADGE = {
  leve: 'bg-yellow-100 text-yellow-800',
  moderada: 'bg-orange-100 text-orange-800',
  grave: 'bg-red-100 text-red-800',
};

export const PlayerForm = ({ player, onSubmit, readOnly = false, currentUser, onDirtyChange, injuries = [], jornadas = [], appSettings = {}, onRequestChange = null, hasPendingRequest = false }) => {
  const [formData, setFormData] = useState(player ? { ...player, categoria_juego: player.categoria_juego ?? null, status: player.status || 'activo' } : {
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
    categoria_juego: null,
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
    celular: '',
    tipo_documento: 'Cédula de Identidad',
    status: 'activo',
  });
  useFormDirty(formData, player, onDirtyChange);

  const isEditingPlayer = player && player.id;
  const canEditFinancialFields = ['ejecutivo', 'admin', 'presidente'].includes(currentUser?.role);
  const viaticosCongelados = appSettings['viaticos_congelados'] === 'true';
  const financialFieldsDisabled = !canEditFinancialFields || viaticosCongelados;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const categorias = CATEGORIAS;
  const banks = BANCOS;
  const departamentos = DEPARTAMENTOS;
  const posiciones = POSICIONES_JUGADOR;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-lg">
      {onRequestChange && (
        <div className="flex justify-end">
          {hasPendingRequest ? (
            <div className="bg-gray-100 text-gray-500 font-semibold py-2 px-4 rounded-lg text-sm border border-gray-300 cursor-not-allowed">
              Solicitud pendiente en revisión
            </div>
          ) : (
            <button
              type="button"
              onClick={onRequestChange}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-lg text-sm"
            >
              Solicitar Cambio de Viáticos/Contrato
            </button>
          )}
        </div>
      )}
      {/* BASIC INFORMATION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Información Básica</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fila 1: Nombre | Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              disabled={readOnly}
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
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione Categoría</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {!readOnly && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría de juego <span className="text-gray-400 font-normal">(solo si difiere del cobro)</span>
              </label>
              <select
                value={formData.categoria_juego || ''}
                onChange={(e) => setFormData({ ...formData, categoria_juego: e.target.value || null })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Igual que categoría de cobro —</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {/* Fila 2: Tipo Documento | Número de Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Documento *
            </label>
            <select
              required
              value={formData.tipo_documento || 'Cédula de Identidad'}
              onChange={(e) => setFormData({...formData, tipo_documento: e.target.value})}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Cédula de Identidad">Cédula de Identidad</option>
              <option value="Pasaporte">Pasaporte</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Documento *
            </label>
            <input
              type="text"
              required
              value={formData.gov_id}
              onChange={(e) => setFormData({...formData, gov_id: e.target.value})}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {player && player.name_visual && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Visual (para mostrar)
              </label>
              <div className="px-4 py-2 bg-gray-50 border rounded-lg text-gray-700">
                {player.name_visual}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Este es el nombre que se mostrará en listados. El nombre completo siempre se guardará.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Nacimiento *
            </label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Posición
            </label>
            <select 
              value={formData.posicion} 
              onChange={(e) => setFormData({...formData, posicion: e.target.value})} 
              disabled={readOnly}
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
              Estado
            </label>
            <select
              value={formData.status || 'activo'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="activo">Activo</option>
              <option value="cedido">Cedido</option>
              <option value="transferido">Transferido</option>
              <option value="egresado">Egresado</option>
              <option value="dado de baja">Dado de baja</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departamento
            </label>
            <select
              value={formData.departamento}
              onChange={(e) => setFormData({...formData, departamento: e.target.value})}
              disabled={readOnly}
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
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Información de Contacto y Representante</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email del jugador
            </label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder={readOnly ? "" : "email@ejemplo.com"}

            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Celular del jugador
            </label>
            <input 
              type="tel" 
              value={formData.celular} 
              onChange={(e) => setFormData({...formData, celular: e.target.value})} 
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder={readOnly ? "" : "099001891"}
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
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder={readOnly ? "" : "Nombre del Representante"}
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
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder={readOnly ? "" : "Nombre del que lo trajo al club"}
            />
          </div>
        </div>
      </div>

      {/* FINANCIAL INFORMATION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Información Financiera</h3>
        
        {viaticosCongelados && (
          <div className="mb-4">
            <ViaticosCongeladosBanner contacto={appSettings['viaticos_congelados_contacto'] || 'Martín Arroyo'} />
          </div>
        )}

        {!canEditFinancialFields && !viaticosCongelados && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ℹ️ Los campos de viáticos y contratos son de solo lectura. Para modificarlos, utilizá la pestaña <strong>"Viáticos"</strong>.
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input 
              type="checkbox" 
              checked={formData.contrato} 
              onChange={(e) => setFormData({...formData, contrato: e.target.checked, ...(e.target.checked ? { viatico: 0, complemento: 0 } : {})})}
              disabled={readOnly || financialFieldsDisabled}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            Tiene Contrato
            {financialFieldsDisabled && <span className="text-blue-600 text-xs">(Solo lectura)</span>}
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Viático {(formData.contrato || financialFieldsDisabled) && <span className="text-red-500">(Deshabilitado)</span>}
            </label>
            <input type="text" inputMode="numeric" pattern="[0-9]*"
              disabled={formData.contrato || readOnly || financialFieldsDisabled}
              value={formData.viatico || ''} 
              onChange={(e) => setFormData({...formData, viatico: parseInt(e.target.value) || 0})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Complemento {(formData.contrato || financialFieldsDisabled) && <span className="text-red-500">(Deshabilitado)</span>}
            </label>
            <input type="text" inputMode="numeric" pattern="[0-9]*"
              disabled={formData.contrato || readOnly || financialFieldsDisabled}
              value={formData.complemento ?? 0}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : Math.min(99999, Math.max(0, parseInt(e.target.value) || 0));
                setFormData({...formData, complemento: value});
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
            />
          </div>
        </div>

        {/* Override Temporal de Complemento — solo lectura, se edita desde la pestaña Viático */}
        {!formData.contrato && (
          <div className="mt-4 border border-yellow-200 bg-yellow-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-800 mb-1">
              Override Temporal de Complemento
            </h4>
            <p className="text-xs text-yellow-700 mb-3">
              Para modificar estos valores, usá la pestaña <strong>Viático</strong>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Override</label>
                <input
                  type="text"
                  disabled
                  value={formData.complemento_override ?? ''}
                  placeholder="Sin override activo"
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Válido hasta</label>
                <input
                  type="date"
                  disabled
                  value={formData.complemento_override_expira ?? ''}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentario Viático
          </label>
          <textarea 
            rows="3"
            value={formData.comentario_viatico} 
            onChange={(e) => setFormData({...formData, comentario_viatico: e.target.value})} 
            disabled={readOnly}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
            placeholder={readOnly || (isEditingPlayer && !canEditFinancialFields) ? "" : "Notas adicionales sobre viático..."}
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
              disabled={readOnly}
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
              placeholder={readOnly ? "" : "Número de cuenta"}
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
              disabled={readOnly}
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
              disabled={readOnly}
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
                disabled={readOnly}
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
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
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
                disabled={readOnly}
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
                disabled={readOnly}
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
                disabled={readOnly}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                placeholder={readOnly ? "" : "Italia"}
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
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder={readOnly ? "" : "2024"}
            />
          </div>
        </div>
      </div>

      {/* DOCUMENTS SECTION */}
      {player && player.id && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Documentos</h3>
          <DocumentUpload playerId={player.id} playerName={player.name} readOnly={readOnly} />
        </div>
      )}

      {/* INJURIES RELATED LIST */}
      {player && player.id && injuries.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Lesiones ({injuries.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2 pr-3">Tipo</th>
                  <th className="pb-2 pr-3">Severidad</th>
                  <th className="pb-2 pr-3">Inicio</th>
                  <th className="pb-2 pr-3">Retorno Est.</th>
                  <th className="pb-2 pr-3">Alta</th>
                  <th className="pb-2">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {injuries.map(inj => (
                  <tr key={inj.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-3 font-medium">{inj.tipo}</td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${SEVERITY_BADGE[inj.severidad] || 'bg-gray-100 text-gray-600'}`}>
                        {inj.severidad?.charAt(0).toUpperCase() + inj.severidad?.slice(1)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDate(inj.fecha_inicio)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{inj.fecha_retorno_estimada ? formatDate(inj.fecha_retorno_estimada) : '-'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {inj.fecha_alta
                        ? <span className="text-green-700">{formatDate(inj.fecha_alta)}</span>
                        : <span className="text-red-600 font-medium">Activa</span>}
                    </td>
                    <td className="py-2 text-gray-600">{inj.descripcion || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MATCH HISTORY RELATED LIST */}
      {player && player.id && jornadas.length > 0 && (() => {
        const history = [];
        jornadas.forEach(jornada => {
          (jornada.partidos || []).forEach(partido => {
            const pp = (partido.partido_players || []).find(p => p.player_id === player.id);
            if (!pp) return;
            const eventos = (partido.partido_eventos || []).filter(e => e.player_id === player.id);
            const goles = eventos.filter(e => e.tipo === 'gol').length;
            const amarillas = eventos.filter(e => e.tipo === 'amarilla').length;
            const rojas = eventos.filter(e => e.tipo === 'roja').length;
            const capGoles = partido.escenario === 'Local' ? partido.goles_local : partido.goles_visitante;
            const rivalGoles = partido.escenario === 'Local' ? partido.goles_visitante : partido.goles_local;
            const hasResult = capGoles != null && rivalGoles != null;
            let resultado = null;
            if (hasResult) {
              if (capGoles > rivalGoles) resultado = 'G';
              else if (capGoles < rivalGoles) resultado = 'P';
              else resultado = 'E';
            }
            history.push({
              id: partido.id,
              fecha: jornada.fecha,
              rival: jornada.rivales?.name || '-',
              categoria: partido.categoria,
              tipo: pp.tipo,
              resultado,
              marcador: hasResult ? `${capGoles} - ${rivalGoles}` : null,
              goles,
              amarillas,
              rojas,
            });
          });
        });
        history.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        if (history.length === 0) return null;
        const RESULT_BADGE = { G: 'bg-green-100 text-green-800', E: 'bg-gray-100 text-gray-800', P: 'bg-red-100 text-red-800' };
        const RESULT_LABEL = { G: 'Ganado', E: 'Empate', P: 'Perdido' };
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Historial de Partidos ({history.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
                    <th className="pb-2 pr-3">Fecha</th>
                    <th className="pb-2 pr-3">Rival</th>
                    <th className="pb-2 pr-3">Cat.</th>
                    <th className="pb-2 pr-3">Rol</th>
                    <th className="pb-2 pr-3">Resultado</th>
                    <th className="pb-2 pr-3 text-center">⚽</th>
                    <th className="pb-2 pr-3 text-center">🟨</th>
                    <th className="pb-2 text-center">🟥</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(m => (
                    <tr key={m.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDate(m.fecha)}</td>
                      <td className="py-2 pr-3 font-medium">{m.rival}</td>
                      <td className="py-2 pr-3">{m.categoria}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${m.tipo === 'titular' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                          {m.tipo === 'titular' ? 'Titular' : 'Suplente'}
                        </span>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {m.resultado ? (
                          <span className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${RESULT_BADGE[m.resultado]}`}>{RESULT_LABEL[m.resultado]}</span>
                            <span className="text-gray-500 text-xs">{m.marcador}</span>
                          </span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-2 pr-3 text-center">{m.goles || '-'}</td>
                      <td className="py-2 pr-3 text-center">{m.amarillas || '-'}</td>
                      <td className="py-2 text-center">{m.rojas || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {readOnly ? (
        <div className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg text-center font-bold text-lg">
          Modo Solo Lectura
        </div>
      ) : (
        <button 
          type="submit" 
          className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200"
        >
          {player ? '✓ Actualizar' : '+ Agregar'} Jugador
        </button>
      )}

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