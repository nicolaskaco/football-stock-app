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

/** Input numérico genérico para un app_setting, con guardado debounced. */
const NumberSettingInput = ({ value, placeholder, min, max, loading, onSave }) => {
  const [draft, setDraft] = useState(value);
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setDraft(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSave(val), 800);
  };

  return (
    <input
      type="number"
      value={draft}
      onChange={handleChange}
      min={min}
      max={max}
      placeholder={placeholder}
      disabled={loading}
      className="w-full max-w-[8rem] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
    />
  );
};

const AnoMinInput = ({ categoria, value, loading, onSave }) => {
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
        min="2000"
        max="2030"
        placeholder="ej: 2007"
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
      key: 'estadisticas_jugadores_tab_enabled',
      label: 'Tab Estadísticas Jugadores',
      description: 'Ficha individual y comparación de jugadores: tramos de minuto, cruces con el resultado y el contexto, rachas e hitos.',
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-6">
        <SettingToggle
          label="Fotos de jugadores"
          description="Muestra la foto de cada jugador (o una silueta si no tiene) en Jugadores, Viático, los modales del jugador, Estadísticas Jugador, la planilla del partido y los widgets de lesionados y cumpleaños. Quien puede editar jugadores sube o cambia la foto tocándola. Apagado, no se muestra nada."
          enabled={s('jugadores_fotos_enabled')}
          onToggle={() => handleToggle('jugadores_fotos_enabled', s('jugadores_fotos_enabled'))}
          loading={loading}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-100 dark:divide-gray-700 px-6">
        <SettingToggle
          label="Resumen semanal por Telegram"
          description="Los lunes a las 8:00 se manda al grupo de Telegram del club un resumen con fichas médicas vencidas o por vencer, lesionados con el retorno vencido, solicitudes pendientes hace 7 días o más y stock bajo."
          enabled={s('telegram_digest_enabled')}
          onToggle={() => handleToggle('telegram_digest_enabled', s('telegram_digest_enabled'))}
          loading={loading}
        />
        <SettingToggle
          label="Parte semanal por Telegram"
          description="Los miércoles a las 12:59 se manda al grupo de Telegram del club el parte de disponibilidad de la próxima jornada. Si no hay jornada cargada, avisa que no hay siguiente partido."
          enabled={s('parte_semanal_enabled')}
          onToggle={() => handleToggle('parte_semanal_enabled', s('parte_semanal_enabled'))}
          loading={loading}
        />
        <SettingToggle
          label="Cambios de fichas médicas por Telegram"
          description="Todos los días a las 6:00, si el chequeo automático de SND de la madrugada actualizó alguna ficha médica, se manda al grupo de Telegram del club la lista de cambios. Si no hubo cambios, no se manda nada."
          enabled={s('telegram_fichas_cambios_enabled')}
          onToggle={() => handleToggle('telegram_fichas_cambios_enabled', s('telegram_fichas_cambios_enabled'))}
          loading={loading}
        />
        <SettingToggle
          label="Preguntas con IA en el bot"
          description="Habilita /pregunta en el bot de Telegram para admin, ejecutivo y presidente: búsquedas de jugadores en lenguaje natural (ej. «jugadores con más de 7 amarillas»). La IA solo arma el filtro; los datos y los permisos los resuelve la app. Cada pregunta cuesta una fracción de centavo de dólar y queda en Actividad."
          enabled={s('bot_ia_enabled')}
          onToggle={() => handleToggle('bot_ia_enabled', s('bot_ia_enabled'))}
          loading={loading}
        />
      </div>

      <div className="bg-white rounded-lg shadow px-6 py-4">
        <p className="font-medium text-gray-900 mb-1">Año mínimo de nacimiento por categoría</p>
        <p className="text-sm text-gray-500 mb-4">
          Jugadores nacidos antes de este año se mostrarán con una alerta. Ej: 2007 para 4ta significa que solo pueden jugar nacidos en 2007 o después. Dejar vacío para no controlar.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CATEGORIAS.map((cat) => (
            <AnoMinInput
              key={cat}
              categoria={cat}
              value={appSettings['ano_min_' + cat] || ''}
              loading={loading}
              onSave={(val) =>
                execute(
                  async () => {
                    await database.updateAppSetting('ano_min_' + cat, val);
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

      <div className="bg-white rounded-lg shadow px-6 py-4">
        <p className="font-medium text-gray-900 mb-1">Muestra mínima para estadísticas</p>
        <p className="text-sm text-gray-500 mb-4">
          Cantidad mínima de partidos para considerar confiable un porcentaje en la pestaña Estadísticas Jugadores.
          Por debajo de este número el porcentaje se muestra atenuado con el aviso “muestra chica” —
          un “100% de victorias en sintético” con 1 partido engaña. Default: 5.
        </p>
        <NumberSettingInput
          value={appSettings['stats_min_muestra'] || ''}
          placeholder="5"
          min={1}
          max={50}
          loading={loading}
          onSave={(val) =>
            execute(
              async () => {
                await database.updateAppSetting('stats_min_muestra', val);
                await onDataChange('appSettings');
              },
              'Error al guardar',
              'Configuración actualizada'
            )
          }
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-6 py-4">
        <p className="font-medium text-gray-900 dark:text-white mb-1">Tope diario de preguntas con IA</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Cantidad máxima de /pregunta por usuario por día en el bot de Telegram. Default: 30.
        </p>
        <NumberSettingInput
          value={appSettings['bot_ia_limite_diario'] || ''}
          placeholder="30"
          min={1}
          max={500}
          loading={loading}
          onSave={(val) =>
            execute(
              async () => {
                await database.updateAppSetting('bot_ia_limite_diario', val);
                await onDataChange('appSettings');
              },
              'Error al guardar',
              'Configuración actualizada'
            )
          }
        />
      </div>

      <UserManagementSection />
    </div>
  );
};
