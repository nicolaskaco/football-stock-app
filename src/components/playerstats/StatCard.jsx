import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { fmtPct } from '../../utils/playerStats';

/**
 * Tarjeta de estadística simple: un número grande con su etiqueta.
 */
export const StatCard = ({ label, value, sub, tone = 'default' }) => {
  const toneCls =
    tone === 'green'  ? 'text-green-700'  :
    tone === 'red'    ? 'text-red-700'    :
    tone === 'yellow' ? 'text-yellow-600' :
    'text-gray-900';

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneCls}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
};

/**
 * Tarjeta de PORCENTAJE con control de tamaño de muestra.
 *
 * Un "100% de victorias en sintético" con 1 partido engaña, así que:
 *   n === 0            → "—"
 *   n <  minMuestra    → porcentaje atenuado + aviso "muestra chica"
 *   n >= minMuestra    → porcentaje destacado
 * En todos los casos se muestra (n=X) para que el lector juzgue por sí mismo.
 */
export const PctStatCard = ({ label, pct, n, minMuestra = 5, sub }) => {
  const muestraChica = n > 0 && n < minMuestra;

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${muestraChica ? 'border border-dashed border-amber-300' : ''}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className={`text-2xl font-bold ${n === 0 ? 'text-gray-300' : muestraChica ? 'text-gray-400' : 'text-gray-900'}`}>
          {n === 0 ? '—' : fmtPct(pct)}
        </p>
        <span className="text-xs text-gray-400">(n={n})</span>
      </div>
      {muestraChica && (
        <p className="flex items-center gap-1 text-[11px] text-amber-600 mt-1">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          Muestra chica
        </p>
      )}
      {sub && !muestraChica && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
};

/**
 * Porcentaje en línea, para usar dentro de tablas y filas comparativas.
 */
export const PctInline = ({ pct, n, minMuestra = 5 }) => {
  const muestraChica = n > 0 && n < minMuestra;
  return (
    <span className={muestraChica ? 'text-gray-400' : ''} title={muestraChica ? `Muestra chica (${n} partidos)` : undefined}>
      {n === 0 ? '—' : fmtPct(pct)}
      <span className="text-xs text-gray-400 ml-1">(n={n})</span>
    </span>
  );
};

/**
 * Barra G / E / P proporcional. Devuelve un guion cuando no hay partidos con
 * marcador cargado.
 */
export const RecordBar = ({ record }) => {
  if (!record || record.pj === 0) return <span className="text-gray-300">—</span>;
  const pctOf = (v) => `${(v / record.pj) * 100}%`;

  return (
    <div className="space-y-1">
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
        <div className="bg-green-500" style={{ width: pctOf(record.g) }} />
        <div className="bg-gray-400" style={{ width: pctOf(record.e) }} />
        <div className="bg-red-500" style={{ width: pctOf(record.p) }} />
      </div>
      <p className="text-xs text-gray-500">
        {record.g}G · {record.e}E · {record.p}P
      </p>
    </div>
  );
};

/** Encabezado de sección de la ficha. */
export const FichaSection = ({ title, description, children }) => (
  <section className="space-y-3">
    <div>
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b-2 border-yellow-400 pb-1">
        {title}
      </h3>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
    {children}
  </section>
);

/** Aviso para eventos que quedaron fuera de un cálculo por falta de minuto. */
export const SinMinutoNota = ({ n, sustantivo = 'eventos' }) => {
  if (!n) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-amber-600">
      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
      {n} {sustantivo} sin minuto registrado (no se incluyen acá).
    </p>
  );
};
