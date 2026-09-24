import React from 'react';

/**
 * Primitivas compartidas por las vistas de comparación de jugadores
 * (PlayerComparisonModal y PlayerCompareView).
 *
 * `Row` resalta en verde la celda con el mejor valor de la fila:
 *   highlight="max" → mayor es mejor (goles, PJ)
 *   highlight="min" → menor es mejor (amarillas, rojas)
 * Si todos los valores son iguales no resalta nada.
 *
 * `format` recibe (valor, índice). El índice permite resaltar por un valor
 * numérico y mostrar otro texto — p. ej. ordenar por el porcentaje pero
 * imprimir "58% (n=12)".
 */

const getBest = (values, type) => {
  const nums = values.map(v => typeof v === 'number' ? v : parseFloat(v) || 0);
  if (nums.every(n => n === nums[0])) return null;
  const target = type === 'max' ? Math.max(...nums) : type === 'min' ? Math.min(...nums) : null;
  if (target === null) return null;
  const indices = new Set();
  nums.forEach((n, i) => { if (n === target) indices.add(i); });
  return indices;
};

export const Row = ({ label, values, highlight, format }) => {
  const formatted = values.map((v, i) => format ? format(v, i) : v);
  const best = highlight ? getBest(values, highlight) : null;

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2.5 pr-4 text-sm font-medium text-gray-500">{label}</td>
      {formatted.map((val, i) => (
        <td
          key={i}
          className={`py-2.5 px-3 text-sm text-center font-semibold ${best && best.has(i) ? 'text-green-700 bg-green-50' : 'text-gray-900'}`}
        >
          {val}
        </td>
      ))}
    </tr>
  );
};

export const SectionHeader = ({ title, colSpan = 4 }) => (
  <tr>
    <td colSpan={colSpan} className="pt-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-yellow-400">
      {title}
    </td>
  </tr>
);
