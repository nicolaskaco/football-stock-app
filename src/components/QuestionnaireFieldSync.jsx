import React, { useState } from 'react';
import { ArrowRight, Check, AlertTriangle, CheckCircle } from 'lucide-react';
import { database } from '../utils/database';

const FIELD_MAPPING = [
  { qKey: 'email', playerCol: 'email', label: 'Email' },
  { qKey: 'telefono', playerCol: 'celular', label: 'Celular' },
  { qKey: 'padre_nombre', playerCol: 'padre_nombre', label: 'Nombre del padre' },
  { qKey: 'padre_celular', playerCol: 'padre_telefono', label: 'Celular del padre' },
  { qKey: 'madre_nombre', playerCol: 'madre_nombre', label: 'Nombre de la madre' },
  { qKey: 'madre_celular', playerCol: 'madre_telefono', label: 'Celular de la madre' },
  { qKey: 'tiene_pasaporte_uy', playerCol: 'pasaporte_uy', label: 'Pasaporte uruguayo', type: 'bool' },
  { qKey: 'tiene_pasaporte_ext', playerCol: 'pasaporte_ext', label: 'Pasaporte extranjero', type: 'bool' },
  { qKey: 'pais_pasaporte_ext', playerCol: 'tipo_pasaporte_ext', label: 'Pais pasaporte extranjero' },
  { qKey: 'anio_llegada_club', playerCol: 'fecha_llegada', label: 'Fecha de llegada (año)' },
  { qKey: 'departamento', playerCol: 'departamento', label: 'Departamento' },
  { qKey: 'agente_info', playerCol: 'representante', label: 'Representante' },
  { qKey: 'quien_capto', playerCol: 'captador', label: 'Captador' },
];

function isEmpty(val) {
  return val === null || val === undefined || val === '';
}

function formatValue(val, type) {
  if (isEmpty(val)) return '—';
  if (type === 'bool') return val === true || val === 'true' ? 'Si' : 'No';
  return String(val);
}

export function QuestionnaireFieldSync({ questionnaire, player, onSync, onCancel }) {
  const mappableFields = FIELD_MAPPING.filter(({ qKey }) => !isEmpty(questionnaire[qKey]));

  const noConflict = mappableFields.filter(({ playerCol }) => isEmpty(player[playerCol]));
  const alreadyMatch = mappableFields.filter(({ qKey, playerCol, type }) =>
    !isEmpty(player[playerCol]) && formatValue(questionnaire[qKey], type) === formatValue(player[playerCol], type)
  );
  const withConflict = mappableFields.filter(({ qKey, playerCol, type }) =>
    !isEmpty(player[playerCol]) && formatValue(questionnaire[qKey], type) !== formatValue(player[playerCol], type)
  );

  const [selected, setSelected] = useState(() => {
    const initial = {};
    noConflict.forEach(({ qKey }) => { initial[qKey] = true; });
    withConflict.forEach(({ qKey }) => { initial[qKey] = false; });
    return initial;
  });
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const toggleField = (qKey) => {
    setSelected((prev) => ({ ...prev, [qKey]: !prev[qKey] }));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleApply = async () => {
    const fieldsToUpdate = {};
    for (const { qKey, playerCol } of mappableFields) {
      if (selected[qKey]) {
        fieldsToUpdate[playerCol] = questionnaire[qKey];
      }
    }
    if (Object.keys(fieldsToUpdate).length === 0) return;

    setSyncing(true);
    setError(null);
    try {
      await database.syncQuestionnaireToPlayer(player.id, fieldsToUpdate);
      onSync(fieldsToUpdate);
    } catch (err) {
      setError('Error al sincronizar: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (mappableFields.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No hay campos del cuestionario para sincronizar con la ficha del jugador.
      </div>
    );
  }

  const renderRow = ({ qKey, playerCol, label, type }, hasConflict) => (
    <label
      key={qKey}
      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        selected[qKey] ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'
      }`}
    >
      <input
        type="checkbox"
        checked={selected[qKey]}
        onChange={() => toggleField(qKey)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span className="text-green-700 font-medium truncate">
            {formatValue(questionnaire[qKey], type)}
          </span>
          {hasConflict && (
            <>
              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-gray-500 line-through truncate">
                {formatValue(player[playerCol], type)}
              </span>
            </>
          )}
        </div>
      </div>
    </label>
  );

  return (
    <div className="space-y-4">
      {noConflict.length > 0 && (
        <div>
          <h5 className="text-xs font-bold uppercase tracking-widest text-green-600 mb-2 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Campos vacios en la ficha ({noConflict.length})
          </h5>
          <div className="space-y-2">
            {noConflict.map((f) => renderRow(f, false))}
          </div>
        </div>
      )}

      {withConflict.length > 0 && (
        <div>
          <h5 className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Campos con valor existente ({withConflict.length})
          </h5>
          <p className="text-xs text-gray-500 mb-2">
            El valor del cuestionario (verde) reemplazara el valor actual (tachado) si se selecciona.
          </p>
          <div className="space-y-2">
            {withConflict.map((f) => renderRow(f, true))}
          </div>
        </div>
      )}

      {alreadyMatch.length > 0 && (
        <div>
          <h5 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Campos ya sincronizados ({alreadyMatch.length})
          </h5>
          <div className="space-y-2">
            {alreadyMatch.map(({ qKey, playerCol, label, type }) => (
              <label
                key={qKey}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 cursor-not-allowed opacity-60"
              >
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-400"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-400">{label}</span>
                  <div className="mt-1 text-sm text-gray-400 truncate">
                    {formatValue(player[playerCol], type)}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-2 border-t">
        <button
          onClick={handleApply}
          disabled={syncing || selectedCount === 0}
          className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium text-sm hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {syncing ? 'Aplicando...' : `Aplicar seleccionados (${selectedCount})`}
        </button>
        <button
          onClick={onCancel}
          disabled={syncing}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
