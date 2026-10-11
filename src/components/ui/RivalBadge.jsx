import { useState } from 'react';
import { Shield } from 'lucide-react';
import { database } from '../../utils/database';

const SIZES = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

/** Escudo de un rival. Sin escudo (o si la imagen falla) muestra un ícono neutro. */
export function RivalBadge({ rival, size = 'sm', src = null, className = '' }) {
  const url = src || database.getRivalBadgeUrl(rival?.badge_path);
  const [failedUrl, setFailedUrl] = useState(null);
  const sizeClass = SIZES[size] || SIZES.sm;

  if (!url || failedUrl === url) {
    return (
      <Shield
        className={`${sizeClass} shrink-0 text-gray-300 dark:text-gray-600 ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={url}
      alt={rival?.name ? `Escudo de ${rival.name}` : 'Escudo'}
      loading="lazy"
      onError={() => setFailedUrl(url)}
      className={`${sizeClass} shrink-0 object-contain ${className}`}
    />
  );
}
