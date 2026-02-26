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

  const rivalesEnabled = appSettings.rivales_tab_enabled === 'true';

  const handleToggle = (key, currentValue) =>
    execute(
      async () => {
        await database.updateAppSetting(key, !currentValue);
        await onDataChange('appSettings');
      },
      'Error al guardar la configuración',
      'Configuración actualizada'
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
        <p className="text-sm text-gray-500 mt-1">
          Controles globales de la aplicación. Solo visible para administradores.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-100 px-6">
        <SettingToggle
          label="Tab Rivales"
          description="Cuando está activo, todos los usuarios con acceso a Partidos pueden ver y gestionar el catálogo de rivales."
          enabled={rivalesEnabled}
          onToggle={() => handleToggle('rivales_tab_enabled', rivalesEnabled)}
          loading={loading}
        />
      </div>
    </div>
  );
};
