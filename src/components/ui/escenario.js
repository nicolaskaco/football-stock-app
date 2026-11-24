/** Clases del badge de escenario (Local verde, Visitante azul, Neutral violeta). */
export function escenarioBadgeClass(escenario) {
  if (escenario === 'Local') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
  if (escenario === 'Visitante') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
  if (escenario === 'Neutral') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200';
  return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
}
