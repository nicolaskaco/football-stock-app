import React from 'react';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';

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
    </div>
  );
};
