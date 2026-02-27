import { Utensils } from 'lucide-react';

/**
 * Renders one food icon per vianda unit (capped at 10).
 * Returns null when count is 0 or falsy.
 *
 * Props:
 *   count  number  — value of player.vianda
 */
export const ViandaIcons = ({ count }) => {
  if (!count || count <= 0) return null;
  return (
    <div className="flex gap-0.5" title={`${count} vianda(s)`}>
      {[...Array(Math.min(count, 10))].map((_, i) => (
        <Utensils key={i} className="w-4 h-4 text-amber-600 flex-shrink-0" />
      ))}
    </div>
  );
};
