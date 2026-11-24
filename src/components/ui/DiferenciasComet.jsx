const DIFF_CLS = {
  suma: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  saca: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  cambia: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
};

/**
 * Diferencias de un informe COMET con la planilla cargada (ver diferenciasConPlanilla):
 * verde lo que suma el informe, rojo lo que saca, ámbar lo que cambia.
 */
export const DiferenciasComet = ({ items = [] }) => (
  <div className="flex flex-wrap gap-1">
    {items.map((d, i) => (
      <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${DIFF_CLS[d.tipo] || DIFF_CLS.cambia}`}>
        {d.tipo === 'suma' ? '+ ' : d.tipo === 'saca' ? '− ' : ''}{d.texto}
      </span>
    ))}
  </div>
);
