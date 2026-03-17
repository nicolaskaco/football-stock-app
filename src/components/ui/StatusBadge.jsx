const STATUS_STYLES = {
  cedido:         'bg-amber-100 text-amber-800',
  transferido:    'bg-blue-100 text-blue-800',
  egresado:       'bg-gray-100 text-gray-600',
  'dado de baja': 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  cedido:         'Cedido',
  transferido:    'Transferido',
  egresado:       'Egresado',
  'dado de baja': 'Baja',
};

export function StatusBadge({ status }) {
  if (!status || status === 'activo') return null;
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600';
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      title={`Estado: ${label}`}
      className={`inline-flex items-center px-1.5 py-0.5 text-xs font-semibold rounded-full ${style}`}
    >
      {label}
    </span>
  );
}
