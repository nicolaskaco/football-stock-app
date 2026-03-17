export function OverAgeIcon({ playerAge, maxAge }) {
  if (playerAge == null || maxAge == null || playerAge <= maxAge) return null;

  const label = `Excede edad máxima (${playerAge} años, máx: ${maxAge})`;

  return (
    <span title={label} className="inline-flex">
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden="true">
        <path d="M8 1 L15 14 L1 14 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5" />
        <text x="8" y="12.5" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">!</text>
      </svg>
    </span>
  );
}
