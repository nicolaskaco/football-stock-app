import React from 'react';
import { Lock } from 'lucide-react';

export const ViaticosCongeladosBanner = ({ contacto = 'Martín Arroyo' }) => (
  <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-4">
    <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
    <p className="text-sm text-amber-800">
      En este momento los viáticos están congelados. Contactarse con{' '}
      <span className="font-semibold">{contacto}</span> en caso de algún cambio urgente.
    </p>
  </div>
);
