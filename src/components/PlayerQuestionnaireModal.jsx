import React, { useState } from 'react';
import { X, ClipboardList, RefreshCw } from 'lucide-react';
import { QuestionnaireFieldSync } from './QuestionnaireFieldSync';

const SECTIONS = [
  {
    title: 'Contacto',
    fields: [
      { label: 'Email', key: 'email' },
      { label: 'Celular', key: 'telefono' },
    ],
  },
  {
    title: 'Documentos',
    fields: [
      { label: 'Pasaporte uruguayo', key: 'tiene_pasaporte_uy', type: 'bool' },
      { label: 'Pasaporte extranjero', key: 'tiene_pasaporte_ext', type: 'bool' },
      { label: 'País pasaporte extranjero', key: 'pais_pasaporte_ext' },
    ],
  },
  {
    title: 'Salud',
    fields: [
      { label: 'Prestador de salud', key: 'tiene_prestador_salud', type: 'bool' },
      { label: '¿Cuál prestador?', key: 'prestador_salud_cual' },
      { label: 'Emergencia móvil', key: 'tiene_emergencia_movil', type: 'bool' },
      { label: '¿Cuál emergencia?', key: 'emergencia_movil_cual' },
    ],
  },
  {
    title: 'Llegada al club',
    fields: [
      { label: 'Año llegada al club', key: 'anio_llegada_club' },
      { label: 'Liga de proveniencia', key: 'liga_proviene' },
      { label: 'Club de proveniencia', key: 'club_proviene' },
      { label: 'Mediante quién llegó', key: 'mediante_quien_llego' },
      { label: 'Quién lo captó', key: 'quien_capto' },
      { label: 'Tiene agente/representante', key: 'tiene_agente', type: 'bool' },
      { label: 'Info del agente', key: 'agente_info' },
    ],
  },
  {
    title: 'Transporte al entrenamiento',
    fields: [
      { label: 'Medio de transporte', key: 'transporte_entrenamiento' },
      { label: 'Especificación transporte', key: 'transporte_entrenamiento_otro' },
      { label: 'Tiempo de viaje', key: 'tiempo_entrenamiento' },
    ],
  },
  {
    title: 'Centro educativo',
    fields: [
      { label: 'Tipo de centro', key: 'centro_educativo_tipo' },
      { label: 'Nombre del centro', key: 'centro_educativo_nombre' },
      { label: 'Transporte al centro', key: 'transporte_educativo' },
      { label: 'Especificación transporte', key: 'transporte_educativo_otro' },
      { label: 'Tiempo de viaje', key: 'tiempo_educativo' },
      { label: 'Nivel educativo', key: 'nivel_educativo' },
      { label: 'Repitió algún año', key: 'repitio_anio', type: 'bool' },
      { label: 'Nivel repetido', key: 'repitio_nivel' },
    ],
  },
  {
    title: 'Entorno familiar y social',
    fields: [
      { label: 'Antecedentes de adicciones', key: 'antecedentes_adiciones', type: 'bool' },
      { label: 'Composición familiar', key: 'composicion_familiar' },
      { label: 'Descripción de convivencia', key: 'convivencia_descripcion' },
      { label: 'Comparte tiempo con', key: 'comparte_tiempo_con', type: 'multi' },
    ],
  },
  {
    title: 'Padre / tutor',
    fields: [
      { label: 'Nombre', key: 'padre_nombre' },
      { label: 'Celular', key: 'padre_celular' },
      { label: 'Ocupación', key: 'padre_ocupacion' },
      { label: 'Nivel educativo', key: 'padre_nivel_educativo' },
      { label: 'Edad', key: 'padre_edad' },
    ],
  },
  {
    title: 'Madre / tutora',
    fields: [
      { label: 'Nombre', key: 'madre_nombre' },
      { label: 'Celular', key: 'madre_celular' },
      { label: 'Ocupación', key: 'madre_ocupacion' },
      { label: 'Nivel educativo', key: 'madre_nivel_educativo' },
      { label: 'Edad', key: 'madre_edad' },
    ],
  },
  {
    title: 'Vivienda',
    fields: [
      { label: 'Departamento', key: 'departamento' },
      { label: 'Barrio', key: 'barrio' },
      { label: 'Dirección', key: 'direccion' },
      { label: 'Tenencia de vivienda', key: 'tenencia_vivienda' },
      { label: 'Condiciones de habitabilidad', key: 'condiciones_habitabilidad' },
      { label: 'Material del techo', key: 'material_techo' },
      { label: 'Material de las paredes', key: 'material_paredes' },
      { label: 'Material del piso', key: 'material_piso' },
      { label: 'Nº de habitaciones', key: 'num_habitaciones' },
      { label: 'Acceso en el hogar', key: 'acceso_hogar', type: 'multi' },
    ],
  },
  {
    title: 'Comentarios',
    fields: [
      { label: 'Comentario extra', key: 'comentario_extra' },
    ],
  },
];

function BoolBadge({ value }) {
  if (value === true || value === 'true') {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
        Sí
      </span>
    );
  }
  if (value === false || value === 'false') {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500">
        No
      </span>
    );
  }
  return <span className="text-gray-400">—</span>;
}

function FieldValue({ value, type }) {
  if (type === 'bool') return <BoolBadge value={value} />;
  if (type === 'multi') {
    if (!value) return <span className="text-gray-400">—</span>;
    return <span>{value.split(';').filter(Boolean).join(', ')}</span>;
  }
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400">—</span>;
  }
  return <span>{String(value)}</span>;
}

export function PlayerQuestionnaireModal({ questionnaire, playerName, player, onClose, onSync }) {
  const [showSync, setShowSync] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const canSync = player && onSync;

  const completedAt = questionnaire.completed_at
    ? new Date(questionnaire.completed_at).toLocaleDateString('es-UY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  const handleSyncDone = (syncedFields) => {
    setSyncSuccess(true);
    setShowSync(false);
    onSync(syncedFields);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 border-b-4 border-yellow-400 pb-1 truncate">
              Cuestionario — {playerName}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {canSync && !showSync && (
              <button
                onClick={() => setShowSync(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Sincronizar datos
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sync success banner */}
        {syncSuccess && (
          <div className="mx-4 mt-4 sm:mx-6 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
            Datos sincronizados correctamente.
          </div>
        )}

        {/* Sync panel */}
        {showSync && canSync && (
          <div className="p-4 sm:p-6 border-b">
            <QuestionnaireFieldSync
              questionnaire={questionnaire}
              player={player}
              onSync={handleSyncDone}
              onCancel={() => setShowSync(false)}
            />
          </div>
        )}

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-6">
          {SECTIONS.map((section) => {
            const visibleFields = section.fields.filter(({ key, type }) => {
              const val = questionnaire[key];
              if (type === 'bool') return val !== null && val !== undefined;
              return val !== null && val !== undefined && val !== '';
            });
            if (visibleFields.length === 0) return null;

            return (
              <div key={section.title}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-yellow-600 mb-2 pb-1 border-b border-yellow-200">
                  {section.title}
                </h4>
                <div className="space-y-1">
                  {visibleFields.map(({ label, key, type }) => (
                    <div key={key} className="flex justify-between gap-4 py-1">
                      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
                      <span className="text-sm text-gray-900 font-medium text-right">
                        <FieldValue value={questionnaire[key]} type={type} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {completedAt && (
            <p className="text-xs text-gray-400 text-right pt-2 border-t">
              Completado el {completedAt}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
