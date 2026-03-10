export function InjuryIcon({ injury }) {
  if (!injury) return null;

  const severityFills = {
    leve: '#eab308',      // yellow-500
    moderada: '#f97316',  // orange-500
    grave: '#dc2626',     // red-600
  };
  const fill = severityFills[injury.severidad] || '#dc2626';

  const retorno = injury.fecha_retorno_estimada
    ? (() => { const [y, m, d] = injury.fecha_retorno_estimada.split('-'); return `${d}/${m}/${y}`; })()
    : null;

  const label = `${injury.tipo}${injury.severidad ? ` (${injury.severidad})` : ''}${retorno ? ` — Retorno est.: ${retorno}` : ''}`;

  return (
    <span title={label} className="inline-flex">
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden="true">
        <rect x="0" y="0" width="16" height="16" rx="2" fill={fill} />
        <rect x="6" y="2" width="4" height="12" rx="0.5" fill="white" />
        <rect x="2" y="6" width="12" height="4" rx="0.5" fill="white" />
      </svg>
    </span>
  );
}
