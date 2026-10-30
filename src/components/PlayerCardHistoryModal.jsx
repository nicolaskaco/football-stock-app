import React, { useMemo } from 'react';
import { formatDate } from '../utils/dateUtils';
import { getPlayerCardHistory } from '../utils/suspensions';
import { jornadaLabel, partidoInfo, AMARILLAS_PARA_SUSPENSION } from '../utils/playerStats';

const RESULT_BADGE = {
  G: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  E: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  P: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};
const RESULT_LABEL = { G: 'Ganado', E: 'Empate', P: 'Perdido' };

const Resultado = ({ m, vacio }) => (m.resultado ? (
  <span className="flex items-center gap-1.5">
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${RESULT_BADGE[m.resultado]}`}>{RESULT_LABEL[m.resultado]}</span>
    <span className="text-gray-500 dark:text-gray-400 text-xs">{m.marcador}</span>
  </span>
) : <span className="text-gray-400 text-xs">{vacio}</span>);

/**
 * Partidos del año en curso, en una categoría, donde el jugador recibió amarilla o roja.
 * Abierto desde el nombre del jugador en SuspensionWidget. Si está suspendido (no manual), las
 * tarjetas que causaron la suspensión van en rojo; el resto de las que ya no cuentan para el
 * acumulado (hasta el último reset por roja o 5ª amarilla) se muestran atenuadas.
 */
export const PlayerCardHistoryModal = ({ jornadas = [], player, categoria, amarillas = 0, suspension = null }) => {
  const history = useMemo(
    () => getPlayerCardHistory(jornadas, player.id, categoria)
      .map(({ jornada, partido, ...r }) => ({ id: partido.id, ...partidoInfo(jornada, partido), ...r }))
      .reverse(),
    [jornadas, player.id, categoria]
  );

  if (history.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
        Sin tarjetas este año en {categoria}.
      </p>
    );
  }

  const suspAuto = suspension && !suspension.manual;
  const esCausa = (m) => suspAuto && m.causa;
  const rowCls = (m) => {
    if (esCausa(m)) return 'bg-red-50 dark:bg-red-900/20';
    return m.vigente ? '' : 'opacity-50';
  };
  const hayGrises = history.some((m) => !m.vigente && !esCausa(m));

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {suspension ? (
          <>
            <span className="font-semibold text-red-600 dark:text-red-400">Suspendido — {suspension.reason}.</span>
            {suspAuto && ' En rojo, las tarjetas que causaron la suspensión.'}
            {hayGrises && ' En gris, las anteriores, que ya no cuentan.'}
          </>
        ) : (
          <>
            Acumulado actual: <span className="font-semibold">{amarillas}/{AMARILLAS_PARA_SUSPENSION}</span> amarillas.
            {hayGrises && ' En gris, las tarjetas que ya no cuentan (hasta el último reset por roja o 5ª amarilla).'}
          </>
        )}
      </p>

      {/* Mobile: una card por partido */}
      <div className="sm:hidden space-y-2">
        {history.map((m) => (
          <div
            key={m.id}
            className={`border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm ${rowCls(m)}`}
          >
            <div className="font-medium">{m.rival}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {jornadaLabel(m)} · {formatDate(m.fecha)} · {m.categoria}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <Resultado m={m} vacio="Sin resultado" />
              <span className="flex items-center gap-3 text-xs">
                <span>🟨 {m.amarillas || '-'}</span>
                <span>🟥 {m.rojas || '-'}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400 text-xs uppercase">
              <th className="pb-2 pr-3">Fecha</th>
              <th className="pb-2 pr-3">Jornada</th>
              <th className="pb-2 pr-3">Rival</th>
              <th className="pb-2 pr-3">Cat.</th>
              <th className="pb-2 pr-3">Resultado</th>
              <th className="pb-2 pr-3 text-center">🟨</th>
              <th className="pb-2 text-center">🟥</th>
            </tr>
          </thead>
          <tbody>
            {history.map((m) => (
              <tr
                key={m.id}
                className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${rowCls(m)}`}
              >
                <td className="py-2 pr-3 whitespace-nowrap">{formatDate(m.fecha)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{jornadaLabel(m)}</td>
                <td className="py-2 pr-3 font-medium">{m.rival}</td>
                <td className="py-2 pr-3">{m.categoria}</td>
                <td className="py-2 pr-3 whitespace-nowrap"><Resultado m={m} vacio="-" /></td>
                <td className="py-2 pr-3 text-center">{m.amarillas || '-'}</td>
                <td className="py-2 text-center">{m.rojas || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
