import React from 'react';
import { BANCOS_VIATICO, CUENTA_TITULAR_TIPOS } from '../../utils/constants';

const inputClass = 'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-2';

const ReadOnlyItem = ({ label, value, sub }) => (
  <div>
    <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
    <p className="text-gray-900 font-medium">{value || '—'}</p>
    {sub && <p className="text-xs text-gray-500">{sub}</p>}
  </div>
);

/**
 * Cuenta de cobro de viáticos (Prex / Mi Dinero), propia del jugador o de un padre, madre o tutor.
 * Reemplaza a los campos legacy bank / bank_account.
 *
 * Props:
 *   value     objeto con las columnas cuenta_* del jugador
 *   onChange  (patch) => void — recibe solo los campos que cambian
 *   readOnly  boolean — muestra la vista de lectura
 */
export const CuentaViaticoFields = ({ value, onChange, readOnly = false }) => {
  const tipo = value.cuenta_titular_tipo || '';
  const esFamiliar = tipo === 'familiar';

  if (readOnly) {
    if (!value.cuenta_banco && !value.cuenta_numero) {
      return <p className="text-sm text-gray-500 italic">Sin datos bancarios cargados</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {esFamiliar ? (
          <ReadOnlyItem
            label="Titular (Padre/Madre/Tutor)"
            value={value.cuenta_titular_nombre}
            sub={value.cuenta_titular_documento ? `Documento: ${value.cuenta_titular_documento}` : null}
          />
        ) : (
          <ReadOnlyItem label="Titular" value="Cuenta propia (del jugador)" />
        )}
        <ReadOnlyItem label="Banco" value={value.cuenta_banco} />
        <ReadOnlyItem label="Cuenta" value={value.cuenta_numero} />
      </div>
    );
  }

  const handleTipoChange = (nuevoTipo) => {
    onChange(nuevoTipo === 'familiar'
      ? { cuenta_titular_tipo: nuevoTipo }
      : { cuenta_titular_tipo: nuevoTipo || null, cuenta_titular_nombre: null, cuenta_titular_documento: null });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <label className={labelClass}>¿La cuenta es propia del jugador o de un familiar?</label>
        <select
          value={tipo}
          onChange={(e) => handleTipoChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Seleccione</option>
          {CUENTA_TITULAR_TIPOS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {esFamiliar && (
        <>
          <div>
            <label className={labelClass}>Nombre completo del titular *</label>
            <input
              type="text"
              required
              value={value.cuenta_titular_nombre || ''}
              onChange={(e) => onChange({ cuenta_titular_nombre: e.target.value || null })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Documento del titular</label>
            <input
              type="text"
              value={value.cuenta_titular_documento || ''}
              onChange={(e) => onChange({ cuenta_titular_documento: e.target.value || null })}
              className={inputClass}
            />
          </div>
        </>
      )}

      <div>
        <label className={labelClass}>Banco</label>
        <select
          value={value.cuenta_banco || ''}
          onChange={(e) => onChange({ cuenta_banco: e.target.value || null })}
          className={inputClass}
        >
          <option value="">Seleccione Banco</option>
          {BANCOS_VIATICO.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Número de cuenta{value.cuenta_banco ? ' *' : ''}</label>
        <input
          type="text"
          required={!!value.cuenta_banco}
          value={value.cuenta_numero || ''}
          onChange={(e) => onChange({ cuenta_numero: e.target.value || null })}
          className={inputClass}
          placeholder="Número de cuenta"
        />
      </div>
    </div>
  );
};
