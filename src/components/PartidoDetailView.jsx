import React from 'react';
import { Edit2 } from 'lucide-react';
import { PartidoForm } from '../forms/PartidoForm';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { formatDate } from '../utils/dateUtils';
import { CATEGORIAS_PARTIDO } from '../utils/constants';

export const PartidoDetailView = ({ jornada, players = [], canEdit, setShowModal, onDataChange, onFormDirtyChange }) => {
  const { execute } = useMutation();

  const handleEditPartido = (partido, partidoData, titulares, suplentes) => execute(async () => {
    await database.updatePartido(partido.id, partidoData, titulares, suplentes);
    await onDataChange('jornadas');
    // Reload detail view with fresh data is handled by onDataChange → re-render
    setShowModal(null);
  }, 'Error al guardar el partido', 'Partido guardado correctamente');

  const openEditPartido = (partido) => {
    onFormDirtyChange(false);
    // Attach full player objects to partido_players for form initialization
    const partidoWithPlayers = {
      ...partido,
      partido_players: (partido.partido_players || []).map((pp) => ({
        ...pp,
        player_id: pp.player_id,
      })),
    };
    setShowModal({
      title: `Editar partido — ${partido.categoria}`,
      content: (
        <PartidoForm
          partido={partidoWithPlayers}
          players={players}
          onSubmit={(data, titulares, suplentes) =>
            handleEditPartido(partido, data, titulares, suplentes)
          }
        />
      ),
    });
  };

  // Sort partidos in canonical category order
  const sortedPartidos = CATEGORIAS_PARTIDO.map((cat) =>
    (jornada.partidos || []).find((p) => p.categoria === cat)
  ).filter(Boolean);

  const escenarioBadge = (esc) =>
    esc === 'Local'
      ? 'bg-green-100 text-green-800'
      : 'bg-blue-100 text-blue-800';

  const cespedBadge = (cesped) =>
    cesped === 'Natural'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-orange-100 text-orange-800';

  const resultadoText = (p) => {
    if (p.goles_local == null && p.goles_visitante == null) return null;
    return `${p.goles_local ?? '—'} - ${p.goles_visitante ?? '—'}`;
  };

  return (
    <div className="space-y-4">
      {/* Jornada header */}
      <div className="bg-gradient-to-r from-gray-900 to-black text-yellow-400 p-4 rounded-lg">
        <h2 className="text-xl font-bold">{jornada.rivales?.name || 'Rival'}</h2>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-yellow-200">{formatDate(jornada.fecha)}</span>
          <span className="px-2 py-0.5 bg-yellow-400 text-gray-900 rounded-full text-xs font-semibold">
            {jornada.fase}
          </span>
          {jornada.numero_jornada && (
            <span className="px-2 py-0.5 bg-yellow-200 text-gray-900 rounded-full text-xs font-semibold">
              Jornada {jornada.numero_jornada}
            </span>
          )}
        </div>
      </div>

      {/* Partido cards */}
      {sortedPartidos.map((partido) => {
        const titulares = (partido.partido_players || [])
          .filter((pp) => pp.tipo === 'titular')
          .sort((a, b) => (a.orden || 0) - (b.orden || 0));
        const suplentes = (partido.partido_players || [])
          .filter((pp) => pp.tipo === 'suplente')
          .sort((a, b) => (a.orden || 0) - (b.orden || 0));
        const resultado = resultadoText(partido);

        return (
          <div key={partido.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-lg">{partido.categoria}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${escenarioBadge(partido.escenario)}`}>
                  {partido.escenario}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cespedBadge(partido.cesped)}`}>
                  {partido.cesped}
                </span>
                {resultado && (
                  <span className="ml-2 px-3 py-0.5 bg-gray-900 text-yellow-400 rounded-full text-sm font-bold">
                    {resultado}
                  </span>
                )}
              </div>
              {canEdit && (
                <button
                  onClick={() => openEditPartido(partido)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
              )}
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Titulares */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Titulares ({titulares.length}/11)
                </p>
                {titulares.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Sin convocatoria cargada</p>
                ) : (
                  <div className="space-y-1">
                    {titulares.map((pp, i) => (
                      <div key={pp.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-right text-gray-400 shrink-0 text-xs">{pp.orden || i + 1}</span>
                        <span className="font-medium text-gray-800">
                          {pp.players?.name_visual || pp.players?.name || '—'}
                        </span>
                        {pp.posicion && (
                          <span className="text-xs text-gray-500">({pp.posicion})</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suplentes */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Suplentes ({suplentes.length}/10)
                </p>
                {suplentes.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Sin suplentes cargados</p>
                ) : (
                  <div className="space-y-1">
                    {suplentes.map((pp, i) => (
                      <div key={pp.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-right text-gray-400 shrink-0 text-xs">{pp.orden || i + 1}</span>
                        <span className="font-medium text-gray-800">
                          {pp.players?.name_visual || pp.players?.name || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {sortedPartidos.length === 0 && (
        <p className="text-center text-gray-500 py-8">No hay partidos en esta jornada.</p>
      )}
    </div>
  );
};
