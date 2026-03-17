export function SuspensionIcon({ suspension }) {
  if (!suspension) return null;

  const label = `Suspendido — ${suspension.reason}`;

  return (
    <span title={label} className="inline-flex">
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="#dc2626" />
        <rect x="3" y="7" width="10" height="2" rx="0.5" fill="white" />
      </svg>
    </span>
  );
}
