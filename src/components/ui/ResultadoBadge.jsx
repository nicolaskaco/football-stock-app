/** Marcador de un partido (CAP - rival), con color según el resultado. */
export function ResultadoBadge({ resultado, capGoles, rivalGoles }) {
  if (capGoles == null || rivalGoles == null) {
    return <span className="text-gray-400 text-xs">Sin resultado</span>;
  }
  const text = `${capGoles} - ${rivalGoles}`;
  const cls =
    resultado === 'G' ? 'bg-green-100 text-green-800' :
    resultado === 'P' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${cls}`}>{text}</span>;
}
