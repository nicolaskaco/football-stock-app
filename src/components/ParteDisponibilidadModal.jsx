import React from 'react';
import { ArrowLeft, Copy, FileDown } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { buildParteDisponibilidad, parteComoTexto, tituloParte } from '../utils/disponibilidad';
import { exportParteDisponibilidadPDF } from '../utils/pdfExport';
import { formatDate } from '../utils/dateUtils';

const MOTIVO_ESTILO = {
  suspendido: { emoji: '🚫', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  lesionado: { emoji: '🏥', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' },
  ficha: { emoji: '🩺', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  edad: { emoji: '⚠️', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' },
};

/**
 * Parte de disponibilidad de una jornada: por categoría, quiénes del plantel no pueden jugar
 * (suspendidos, lesionados, ficha vencida, excede edad) y quiénes sí. Copia como texto o PDF.
 */
export const ParteDisponibilidadModal = ({ jornada, jornadas = [], players = [], injuries = [], appSettings = {}, currentUser = null, onBack = null }) => {
  const { showToast } = useToast();
  const parte = buildParteDisponibilidad({ jornada, jornadas, players, injuries, appSettings, categorias: currentUser?.categoria, detalleLesion: currentUser?.role === 'admin' });
  const titulo = tituloParte(jornada);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(parteComoTexto(jornada, parte));
      showToast('Parte copiado: pegalo en WhatsApp o Telegram', 'success');
    } catch {
      showToast('No se pudo copiar al portapapeles', 'error');
    }
  };

  const nombre = (p) => p.name_visual || p.name;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la jornada
          </button>
        )}
        <div className="flex flex-wrap gap-2 ml-auto">
          <button
            type="button"
            onClick={copiar}
            disabled={parte.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 text-yellow-400 text-sm font-semibold hover:bg-black disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
            Copiar texto
          </button>
          <button
            type="button"
            onClick={() => exportParteDisponibilidadPDF(jornada, parte, titulo)}
            disabled={parte.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-400 text-black text-sm font-semibold hover:bg-yellow-300 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        {titulo}. Plantel = jugadores activos de la categoría de juego del partido. Las suspensiones incluyen los ajustes manuales guardados.
      </p>

      {parte.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">Esta jornada no tiene partidos de tus categorías.</p>
      )}

      {parte.map(({ categoria, fecha, disponibles, noDisponibles }) => (
        <div key={categoria} className="border rounded-lg overflow-hidden dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-gray-50 border-b dark:bg-gray-800 dark:border-gray-700">
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {categoria} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">· {formatDate(fecha)}</span>
            </span>
            <span className="text-sm">
              <span className="text-green-700 dark:text-green-400 font-semibold">{disponibles.length} disponibles</span>
              <span className="text-gray-400"> · </span>
              <span className={noDisponibles.length ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}>
                {noDisponibles.length} no disponibles
              </span>
            </span>
          </div>

          <div className="p-4 space-y-3">
            {noDisponibles.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">Todo el plantel disponible.</p>
            ) : (
              <ul className="space-y-2">
                {noDisponibles.map(({ player, motivos }) => (
                  <li key={player.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100 sm:w-48 shrink-0">{nombre(player)}</span>
                    <span className="flex flex-wrap gap-1">
                      {motivos.map((m) => (
                        <span key={m.tipo} className={`px-2 py-0.5 rounded-full text-xs ${MOTIVO_ESTILO[m.tipo].className}`}>
                          {MOTIVO_ESTILO[m.tipo].emoji} {m.texto}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {disponibles.length > 0 && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">Disponibles:</span> {disponibles.map(nombre).join(', ')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
