import React, { useState, useRef } from 'react';
import { Lock } from 'lucide-react';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { UserManagementSection } from './UserManagementSection';
import { CATEGORIAS } from '../utils/constants';

const SettingToggle = ({ label, description, enabled, onToggle, loading }) => (
  <div className="flex items-center justify-between py-4">
    <div>
      <p className="font-medium text-gray-900">{label}</p>
      {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        enabled ? 'bg-black' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const ContactoInput = ({ value, loading, onSave }) => {
  const [draft, setDraft] = useState(value);
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setDraft(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSave(val), 800);
  };

  return (
    <div className="pb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Persona de contacto</label>
      <input
        type="text"
        value={draft}
        onChange={handleChange}
        placeholder="Martín Arroyo"
        disabled={loading}
        className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
      />
    </div>
  );
};

const EdadMaxInput = ({ categoria, value, loading, onSave }) => {
  const [draft, setDraft] = useState(value);
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setDraft(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSave(val), 800);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{categoria}</label>
      <input
        type="number"
        value={draft}
        onChange={handleChange}
        min="0"
        max="25"
        placeholder="—"
        disabled={loading}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
      />
    </div>
  );
};

export const ConfiguracionTab = ({ appSettings = {}, onDataChange }) => {
  const { execute, loading } = useMutation();

  const s = (key) => appSettings[key] === 'true';

  const handleToggle = (key, currentValue) =>
    execute(
      async () => {
        await database.updateAppSetting(key, !currentValue);
        await onDataChange('appSettings');
      },
      'Error al guardar la configuración',
      'Configuración actualizada'
    );

  const TABS = [
    {
      key: 'inventario_tab_enabled',
      label: 'Tab Inventario',
      description: 'Gestión del stock de ropa e indumentaria.',
    },
    {
      key: 'distribuciones_tab_enabled',
      label: 'Tab Distribuciones',
      description: 'Registro de entregas de ropa a funcionarios.',
    },
    {
      key: 'reportes_tab_enabled',
      label: 'Tab Reportes',
      description: 'Exportación de datos a Excel.',
    },
    {
      key: 'estadisticas_tab_enabled',
      label: 'Tab Estadísticas',
      description: 'Estadísticas de jugadores: goles, tarjetas, partidos.',
    },
    {
      key: 'rivales_tab_enabled',
      label: 'Tab Rivales',
      description: 'Catálogo de rivales para el campeonato juvenil.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
        <p className="text-sm text-gray-500 mt-1">
          Controles globales de la aplicación. Solo visible para administradores.
        </p>
      </div>

      {/* Freeze viáticos section */}
      <div className={`rounded-lg shadow px-6 py-2 ${s('viaticos_congelados') ? 'bg-amber-50 border border-amber-300' : 'bg-white'}`}>
        <div className="flex items-center justify-between py-4">
          <div className="flex items-start gap-3">
            <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${s('viaticos_congelados') ? 'text-amber-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium text-gray-900">Congelar Viáticos</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Bloquea la creación y modificación de viáticos, complementos y contratos en toda la app.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('viaticos_congelados', s('viaticos_congelados'))}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 flex-shrink-0 ml-4 ${
              s('viaticos_congelados') ? 'bg-amber-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                s('viaticos_congelados') ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {s('viaticos_congelados') && (
          <ContactoInput
            value={appSettings['viaticos_congelados_contacto'] || ''}
            loading={loading}
            onSave={(val) =>
              execute(
                async () => {
                  await database.updateAppSetting('viaticos_congelados_contacto', val);
                  await onDataChange('appSettings');
                },
                'Error al guardar contacto',
                'Contacto actualizado'
              )
            }
          />
        )}
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-100 px-6">
        {TABS.map(({ key, label, description }) => (
          <SettingToggle
            key={key}
            label={label}
            description={description}
            enabled={s(key)}
            onToggle={() => handleToggle(key, s(key))}
            loading={loading}
          />
        ))}
      </div>

      <div className="bg-white rounded-lg shadow px-6 py-4">
        <p className="font-medium text-gray-900 mb-1">Edad máxima por categoría</p>
        <p className="text-sm text-gray-500 mb-4">
          Los jugadores que superen la edad máxima se mostrarán con una alerta. Dejar vacío para no controlar.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CATEGORIAS.map((cat) => (
            <EdadMaxInput
              key={cat}
              categoria={cat}
              value={appSettings['edad_max_' + cat] || ''}
              loading={loading}
              onSave={(val) =>
                execute(
                  async () => {
                    await database.updateAppSetting('edad_max_' + cat, val);
                    await onDataChange('appSettings');
                  },
                  'Error al guardar',
                  'Configuración actualizada'
                )
              }
            />
          ))}
        </div>
      </div>

      <UserManagementSection />
    </div>
  );
};
