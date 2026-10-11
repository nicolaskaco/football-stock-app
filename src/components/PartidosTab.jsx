import React, { useState } from 'react';
import { Plus, Eye, Trash2, Calendar, Pencil, List } from 'lucide-react';
import { JornadaForm } from '../forms/JornadaForm';
import { PartidoDetailView } from './PartidoDetailView';
import { CalendarioView } from './CalendarioView';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { ConfirmModal } from './ConfirmModal';
import { formatDate } from '../utils/dateUtils';
import { CATEGORIAS_PARTIDO, FASES_CAMPEONATO } from '../utils/constants';
import { FilterButtonGroup } from './ui/FilterButtonGroup';
import { RivalBadge } from './ui/RivalBadge';

export const PartidosTab = ({ jornadas = [], rivales = [], players = [], injuries = [], dirigentes = [], torneos = [], setShowModal, onDataChange, currentUser, onFormDirtyChange, appSettings = {} }) => {
  const { execute } = useMutation();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [view, setView] = useState('lista'); // 'lista' | 'calendario'
  const [faseFiltro, setFaseFiltro] = useState(null);

  const canEdit = currentUser?.canEditPartidos || false;

  const handleAddJornada = (formData, escenarioBase) => execute(async () => {
    await database.addJornada(formData, escenarioBase);
    await onDataChange('jornadas');
    setShowModal(null);
  }, 'Error al crear la jornada', 'Jornada creada correctamente');

  const openEditJornada = (jornada) => {
    onFormDirtyChange(false);
    const handleEditJornada = (formData) => execute(async () => {
      await database.updateJornada(jornada.id, formData);
      await onDataChange('jornadas');
      setShowModal(null);
    }, 'Error al guardar la jornada', 'Jornada actualizada correctamente');

    setShowModal({
      title: 'Editar Jornada',
      content: (
        <JornadaForm
          rivales={rivales}
          torneos={torneos}
          jornada={jornada}
          onSubmit={handleEditJornada}
        />
      ),
    });
  };

  const handleDelete = (id) => execute(async () => {
    await database.deleteJornada(id);
    await onDataChange('jornadas');
    setConfirmDelete(null);
  }, 'Error al eliminar la jornada', 'Jornada eliminada correctamente');

  const openNewJornada = () => {
    onFormDirtyChange(false);
    setShowModal({
      title: 'Nueva Jornada',
      content: (
        <JornadaForm
          rivales={rivales}
          torneos={torneos}
          onSubmit={handleAddJornada}
        />
      ),
    });
  };

  const openDetail = (jornada) => {
    setShowModal({
      title: `${jornada.rivales?.name || 'Rival'} — ${formatDate(jornada.fecha)}`,
      content: (
        <PartidoDetailView
          jornada={jornada}
          jornadas={jornadas}
          players={players}
          injuries={injuries}
          canEdit={canEdit}
          setShowModal={setShowModal}
          onDataChange={onDataChange}
          onFormDirtyChange={onFormDirtyChange}
          reopenDetail={openDetail}
          appSettings={appSettings}
          currentUser={currentUser}
        />
      ),
    });
  };

  // Get partido for a given categoria within a jornada
  const getPartidoForCategoria = (jornada, categoria) =>
    (jornada.partidos || []).find((p) => p.categoria === categoria) || null;

  const escenarioBadge = (esc) => {
    if (esc === 'Local') return 'bg-green-100 text-green-800';
    if (esc === 'Visitante') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-500';
  };

  const getResultado = (partido) => {
    if (!partido || partido.goles_local == null || partido.goles_visitante == null) return null;
    const capGoles = partido.escenario === 'Local' ? partido.goles_local : partido.goles_visitante;
    const rivalGoles = partido.escenario === 'Local' ? partido.goles_visitante : partido.goles_local;
    if (capGoles > rivalGoles) return 'win';
    if (capGoles < rivalGoles) return 'loss';
    return 'draw';
  };

  const RESULT_DOT = { win: 'bg-green-500', loss: 'bg-red-500', draw: 'bg-gray-400' };
  const RESULT_LABEL = { win: 'G', loss: 'P', draw: 'E' };
  const RESULT_PUNTOS = { win: 3, draw: 1, loss: 0 };
  const MAX_PUNTOS_JORNADA = CATEGORIAS_PARTIDO.length * RESULT_PUNTOS.win;

  // Puntos de la jornada: 3 por victoria, 1 por empate. null si no hay ningún marcador cargado.
  const getPuntosJornada = (jornada) => {
    const resultados = CATEGORIAS_PARTIDO
      .map((cat) => getResultado(getPartidoForCategoria(jornada, cat)))
      .filter(Boolean);
    if (resultados.length === 0) return null;
    return resultados.reduce((sum, r) => sum + RESULT_PUNTOS[r], 0);
  };

  // Verde con más de 10 puntos, rojo con menos de 7.
  const puntosColor = (puntos) => {
    if (puntos > 10) return 'text-green-600';
    if (puntos < 7) return 'text-red-600';
    return 'text-gray-900';
  };

  const RESULT_TITLE = { win: 'Ganamos', loss: 'Perdimos', draw: 'Empate' };

  // Escenario + resultado de una categoría. `compact` abrevia el escenario (L/V) para mobile.
  const renderCategoria = (jornada, cat, compact = false) => {
    const partido = getPartidoForCategoria(jornada, cat);
    const esc = partido?.escenario || '—';
    const resultado = getResultado(partido);
    return (
      <div className="flex flex-col items-center gap-1">
        <span
          className={`text-xs py-0.5 rounded-full font-medium ${compact ? 'px-1.5' : 'px-2'} ${escenarioBadge(esc)}`}
          title={compact ? esc : undefined}
          aria-label={compact ? esc : undefined}
        >
          {compact ? esc.charAt(0) : esc}
        </span>
        {resultado ? (
          <span
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold ${RESULT_DOT[resultado]}`}
            title={RESULT_TITLE[resultado]}
          >
            {RESULT_LABEL[resultado]}
          </span>
        ) : (
          <span className="w-5 h-5" />
        )}
      </div>
    );
  };

  const renderPuntos = (jornada) => {
    const puntos = getPuntosJornada(jornada);
    if (puntos == null) return '—';
    return (
      <>
        <span className={`font-bold ${puntosColor(puntos)}`}>{puntos}</span>
        <span className="text-xs text-gray-400">/{MAX_PUNTOS_JORNADA}</span>
      </>
    );
  };

  const currentYear = new Date().getFullYear();
  const [yearFiltro, setYearFiltro] = useState(currentYear);

  const availableYears = [...new Set(
    jornadas
      .map((j) => j.fecha ? new Date(j.fecha).getFullYear() : null)
      .filter(Boolean)
  )].sort((a, b) => b - a);

  if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear);

  const effectiveYear = availableYears.includes(yearFiltro) ? yearFiltro : (availableYears[0] ?? currentYear);

  const FASES_ORDER = ['Apertura', 'Clausura'];
  const sortedJornadas = [...jornadas]
    .filter((j) => {
      const year = j.fecha ? new Date(j.fecha).getFullYear() : null;
      return year === effectiveYear && (!faseFiltro || j.fase === faseFiltro);
    })
    .sort((a, b) => {
      const faseDiff = FASES_ORDER.indexOf(a.fase) - FASES_ORDER.indexOf(b.fase);
      if (faseDiff !== 0) return faseDiff;
      return (a.numero_jornada ?? 999) - (b.numero_jornada ?? 999);
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Partidos</h2>
          <p className="text-sm text-gray-500 mt-1">
            {jornadas.length} jornada{jornadas.length !== 1 ? 's' : ''} registrada{jornadas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Vista toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
            <button
              onClick={() => setView('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition ${view === 'lista' ? 'bg-black text-yellow-400' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              onClick={() => setView('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-l border-gray-300 transition ${view === 'calendario' ? 'bg-black text-yellow-400' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Calendario
            </button>
          </div>

          {canEdit && (
            <button
              onClick={openNewJornada}
              className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800 font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Jornada</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          )}
        </div>
      </div>

      {/* Year filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500 font-medium">Año:</label>
        <select
          value={effectiveYear}
          onChange={(e) => setYearFiltro(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Fase filter */}
      <FilterButtonGroup options={FASES_CAMPEONATO} value={faseFiltro} onChange={setFaseFiltro} />

      {sortedJornadas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {jornadas.length === 0
              ? 'No hay jornadas registradas aún.'
              : `No hay jornadas para ${effectiveYear}${faseFiltro ? ` — ${faseFiltro}` : ''}.`}
          </p>
          {canEdit && jornadas.length === 0 && (
            <p className="text-gray-400 text-sm mt-2">Usá el botón "Nueva Jornada" para comenzar.</p>
          )}
        </div>
      ) : view === 'calendario' ? (
        <CalendarioView jornadas={sortedJornadas} onJornadaClick={openDetail} players={players} dirigentes={dirigentes} injuries={injuries} />
      ) : (
        <>
          {/* Mobile / tablet: tarjetas apiladas, sin scroll horizontal */}
          <div className="lg:hidden space-y-3">
            {sortedJornadas.map((jornada) => (
              <div key={jornada.id} className="bg-white rounded-lg shadow">
                <div className="px-4 pt-3 pb-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 text-sm text-gray-600">
                      {jornada.numero_jornada && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                          {jornada.numero_jornada}
                        </span>
                      )}
                      <span className="truncate">{jornada.fase} · {formatDate(jornada.fecha)}</span>
                    </div>
                    <div className="whitespace-nowrap">{renderPuntos(jornada)}</div>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <RivalBadge rival={jornada.rivales} />
                    <span className="min-w-0 break-words">{jornada.rivales?.name || '—'}</span>
                  </div>
                  {jornada.torneos?.name && (
                    <span className="inline-block max-w-full truncate px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
                      {jornada.torneos.name}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1 px-2 py-3 border-t border-gray-100">
                  {CATEGORIAS_PARTIDO.map((cat) => (
                    <div key={cat} className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{cat}</span>
                      {renderCategoria(jornada, cat, true)}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-2 border-t border-gray-100">
                  <button
                    onClick={() => openDetail(jornada)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg"
                  >
                    <Eye className="w-4 h-4" />
                    Ver detalle
                  </button>
                  {canEdit && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditJornada(jornada)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar jornada"
                        aria-label="Editar jornada"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(jornada)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden lg:block bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-px px-3 text-center py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" title="Jornada">N°</th>
                  <th className="w-px px-3 text-left py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fase</th>
                  <th className="w-px px-3 text-left py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-3 text-left py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rival</th>
                  <th className="w-px px-3 text-center py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" title="Puntos">Pts</th>
                  <th className="px-3 text-left py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Torneo</th>
                  {CATEGORIAS_PARTIDO.map((cat) => (
                    <th key={cat} className="w-px px-2 text-center py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {cat}
                    </th>
                  ))}
                  <th className="w-px px-3 text-right py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedJornadas.map((jornada) => (
                  <tr key={jornada.id} className="hover:bg-gray-50">
                    <td className="w-px px-3 py-3 text-center whitespace-nowrap">
                      {jornada.numero_jornada ? (
                        <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                          {jornada.numero_jornada}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="w-px px-3 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                        {jornada.fase}
                      </span>
                    </td>
                    <td className="w-px px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(jornada.fecha)}</td>
                    <td className="px-3 py-3 min-w-[10rem] font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <RivalBadge rival={jornada.rivales} />
                        {jornada.rivales?.name || '—'}
                      </div>
                    </td>
                    <td className="w-px px-3 py-3 text-center whitespace-nowrap">{renderPuntos(jornada)}</td>
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {jornada.torneos?.name ? (
                        <span
                          className="inline-block max-w-[11rem] truncate align-middle px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full"
                          title={jornada.torneos.name}
                        >
                          {jornada.torneos.name}
                        </span>
                      ) : '—'}
                    </td>
                    {CATEGORIAS_PARTIDO.map((cat) => (
                      <td key={cat} className="w-px px-2 py-3 text-center">
                        {renderCategoria(jornada, cat)}
                      </td>
                    ))}
                    <td className="w-px px-3 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openDetail(jornada)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => openEditJornada(jornada)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Editar jornada"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => setConfirmDelete(jornada)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Eliminar Jornada"
        message={`¿Estás seguro que querés eliminar la jornada contra "${confirmDelete?.rivales?.name}" del ${formatDate(confirmDelete?.fecha)}? Esta acción no se puede deshacer.`}
        onConfirm={() => handleDelete(confirmDelete.id)}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
};
