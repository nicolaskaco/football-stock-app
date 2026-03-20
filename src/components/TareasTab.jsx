import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, LayoutGrid, List, Edit2, Trash2, ChevronDown, ChevronUp, Calendar, ArrowRight } from 'lucide-react';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { useAlertModal } from '../hooks/useAlertModal';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';
import { TareaForm } from '../forms/TareaForm';

const ESTADOS = ['Sin Asignar', 'Sin Comenzar', 'En Progreso', 'Completado'];

const PRIORIDAD_CONFIG = {
  Alta:  { badge: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500'    },
  Media: { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  Baja:  { badge: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500'  },
};

const PRIORIDAD_ORDER = { Alta: 0, Media: 1, Baja: 2 };

const ESTADO_HEADER = {
  'Sin Asignar':  'bg-gray-100 border-gray-300 text-gray-700',
  'Sin Comenzar': 'bg-purple-50 border-purple-300 text-purple-700',
  'En Progreso':  'bg-amber-50 border-amber-300 text-amber-700',
  'Completado':   'bg-green-50 border-green-300 text-green-700',
};

const PriorityBadge = ({ prioridad }) => {
  const cfg = PRIORIDAD_CONFIG[prioridad] || PRIORIDAD_CONFIG.Media;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {prioridad}
    </span>
  );
};

const formatFecha = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });
};

const TareaCard = ({ tarea, onEdit, onDelete, onDragStart }) => {
  const isOverdue = tarea.fecha_estimada_completo
    && new Date(tarea.fecha_estimada_completo) < new Date()
    && tarea.estado !== 'Completado';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, tarea.id)}
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-900 leading-snug break-words min-w-0">{tarea.titulo}</p>
        <div className="flex gap-0.5 flex-shrink-0">
          <button onClick={() => onEdit(tarea)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Editar">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(tarea.id)} className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors" title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {tarea.descripcion && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{tarea.descripcion}</p>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PriorityBadge prioridad={tarea.prioridad} />
        {tarea.asignado_nombre && (
          <span className="text-xs text-gray-500 truncate max-w-[100px]" title={tarea.asignado_nombre}>
            {tarea.asignado_nombre}
          </span>
        )}
      </div>

      {tarea.fecha_estimada_completo && (
        <p className={`text-xs mt-1.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
          {formatFecha(tarea.fecha_estimada_completo)}
          {isOverdue ? ' — vencida' : ''}
        </p>
      )}
    </div>
  );
};

const KanbanColumn = ({ estado, tareas, onEdit, onDelete, onDragStart, onDragOver, onDrop }) => (
  <div
    className="flex flex-col min-w-[240px] flex-1"
    onDragOver={onDragOver}
    onDrop={(e) => onDrop(e, estado)}
  >
    <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-2 ${ESTADO_HEADER[estado]}`}>
      <span className="font-semibold text-sm">{estado}</span>
      <span className="text-xs font-medium opacity-60 bg-white/60 rounded-full px-1.5">{tareas.length}</span>
    </div>
    <div className="flex-1 bg-gray-50 border-x-2 border-b-2 border-gray-200 rounded-b-lg p-2 space-y-2 min-h-[160px]">
      {tareas.map(t => (
        <TareaCard key={t.id} tarea={t} onEdit={onEdit} onDelete={onDelete} onDragStart={onDragStart} />
      ))}
    </div>
  </div>
);

export const TareasTab = ({
  tareas: tareasProp = [],
  sprints = [],
  dirigentes = [],
  employees = [],
  setShowModal,
  onDataChange,
  onFormDirtyChange,
}) => {
  const { alertModal, showAlert, closeAlert } = useAlertModal();
  const { execute } = useMutation((msg) => showAlert('Error', msg, 'error'));
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [rolloverConfirm, setRolloverConfirm] = useState(null); // { fromSprint, nextSprint, count }
  const [showSprintPanel, setShowSprintPanel] = useState(false);
  const [newSprintDates, setNewSprintDates] = useState({ fecha_inicio: '', fecha_fin: '' });
  const [searchParams, setSearchParams] = useSearchParams();
  const [localTareas, setLocalTareas] = useState(tareasProp);
  const dragIdRef = useRef(null);

  useEffect(() => { setLocalTareas(tareasProp); }, [tareasProp]);

  // Auto-init sprint for current week on mount
  useEffect(() => {
    (async () => {
      try {
        const sprint = await database.getOrCreateCurrentSprint();
        if (sprint?.id && !searchParams.get('tk_sprint')) {
          setSearchParams(prev => {
            const p = new URLSearchParams(prev);
            p.set('tk_sprint', sprint.id);
            return p;
          }, { replace: true });
          await onDataChange('sprints');
        }
      } catch (e) {
        console.error('Error iniciando sprint:', e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterSprint   = searchParams.get('tk_sprint')   || '';
  const viewMode       = searchParams.get('tk_view')     || 'kanban';
  const searchTerm     = searchParams.get('tk_search')   || '';
  const filterAsignado = searchParams.get('tk_asignado') || '';

  const setParam = (key, value) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      value ? p.set(key, value) : p.delete(key);
      return p;
    });
  };

  // Derive active sprint (covers today's date)
  const today = new Date().toISOString().slice(0, 10);
  const activeSprint = sprints.find(s => s.fecha_inicio <= today && s.fecha_fin >= today);

  // Count incomplete tareas per sprint
  const incompleteCount = (sprintId) =>
    localTareas.filter(t => t.sprint_id === sprintId && t.estado !== 'Completado').length;

  // Sprint-filtered list — used to derive assignee options and as base for final filter
  const { sprintFilteredTareas, assigneeOptions } = useMemo(() => {
    const sprintFiltered = localTareas.filter(t => !filterSprint || t.sprint_id === filterSprint);
    const seen = new Map();
    let hasSinAsignar = false;
    for (const t of sprintFiltered) {
      if (!t.asignado_id) hasSinAsignar = true;
      else seen.set(t.asignado_id, t.asignado_nombre);
    }
    const people = [...seen.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-UY'));
    if (hasSinAsignar) people.unshift({ id: '__sin_asignar__', nombre: 'Sin Asignar' });
    return { sprintFilteredTareas: sprintFiltered, assigneeOptions: people };
  }, [localTareas, filterSprint]);

  // Reset assignee filter when switching sprints if the selected person has no tasks there
  useEffect(() => {
    if (!filterAsignado) return;
    const ids = new Set(assigneeOptions.map(a => a.id));
    if (!ids.has(filterAsignado)) setParam('tk_asignado', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSprint]);

  const filtered = sprintFilteredTareas.filter(t => {
    const matchesSearch = !searchTerm
      || t.titulo.toLowerCase().includes(searchTerm.toLowerCase())
      || (t.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
      || (t.asignado_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAsignado = !filterAsignado
      || (filterAsignado === '__sin_asignar__' ? !t.asignado_id : t.asignado_id === filterAsignado);
    return matchesSearch && matchesAsignado;
  });

  // ── Tarea handlers ──────────────────────────────────────────────────────────

  const handleAdd = (payload) => execute(async () => {
    await database.addTarea(payload);
    await onDataChange('tareas');
    setShowModal(null);
  }, 'Error creando tarea', 'Tarea creada');

  const handleEdit = (payload) => execute(async () => {
    await database.updateTarea(payload.id, payload);
    await onDataChange('tareas');
    setShowModal(null);
  }, 'Error actualizando tarea', 'Tarea actualizada');

  const handleConfirmDelete = () => execute(async () => {
    await database.deleteTarea(confirmDelete);
    await onDataChange('tareas');
    setConfirmDelete(null);
  }, 'Error eliminando tarea', 'Tarea eliminada');

  const openAddModal = () => {
    setShowModal({
      title: 'Nueva Tarea',
      content: (
        <TareaForm
          defaultSprintId={activeSprint?.id || ''}
          sprints={sprints}
          dirigentes={dirigentes}
          employees={employees}
          onSubmit={handleAdd}
          onDirtyChange={onFormDirtyChange}
        />
      ),
    });
  };

  const openEditModal = (tarea) => {
    setShowModal({
      title: 'Editar Tarea',
      content: (
        <TareaForm
          tarea={tarea}
          sprints={sprints}
          dirigentes={dirigentes}
          employees={employees}
          onSubmit={(payload) => handleEdit({ ...payload, id: tarea.id })}
          onDirtyChange={onFormDirtyChange}
        />
      ),
    });
  };

  // ── Sprint handlers ─────────────────────────────────────────────────────────

  const handleCreateSprint = () => execute(async () => {
    if (!newSprintDates.fecha_inicio || !newSprintDates.fecha_fin) throw new Error('Completá ambas fechas');
    if (newSprintDates.fecha_inicio > newSprintDates.fecha_fin) throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    await database.addSprint(newSprintDates);
    await onDataChange('sprints');
    setNewSprintDates({ fecha_inicio: '', fecha_fin: '' });
  }, 'Error creando sprint', 'Sprint creado');

  const handleRolloverClick = (sprint) => {
    const sorted = [...sprints].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
    const nextSprint = sorted.find(s => s.fecha_inicio > sprint.fecha_fin) || null;
    setRolloverConfirm({ fromSprint: sprint, nextSprint, count: incompleteCount(sprint.id) });
  };

  const handleRolloverConfirm = () => execute(async () => {
    let toSprint = rolloverConfirm.nextSprint;
    if (!toSprint) {
      // Auto-create the week after the source sprint ends
      const nextDay = new Date(rolloverConfirm.fromSprint.fecha_fin + 'T00:00:00');
      nextDay.setDate(nextDay.getDate() + 1);
      const dow = nextDay.getDay();
      const diffToMon = dow === 0 ? -6 : 1 - dow;
      const monday = new Date(nextDay);
      monday.setDate(nextDay.getDate() + diffToMon);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      toSprint = await database.addSprint({ fecha_inicio: toISO(monday), fecha_fin: toISO(sunday) });
    }
    await database.rolloverIncompleteTareas(rolloverConfirm.fromSprint.id, toSprint.id);
    await onDataChange('tareas', 'sprints');
    setRolloverConfirm(null);
  }, 'Error en rollover', `${rolloverConfirm?.count} tarea${rolloverConfirm?.count !== 1 ? 's' : ''} movida${rolloverConfirm?.count !== 1 ? 's' : ''}`);

  // ── Drag and drop ───────────────────────────────────────────────────────────

  const handleDragStart = (e, tareaId) => {
    dragIdRef.current = tareaId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, nuevoEstado) => {
    e.preventDefault();
    const tareaId = dragIdRef.current;
    if (!tareaId) return;

    const tarea = localTareas.find(t => t.id === tareaId);
    if (!tarea || tarea.estado === nuevoEstado) { dragIdRef.current = null; return; }

    setLocalTareas(prev => prev.map(t => t.id === tareaId ? { ...t, estado: nuevoEstado } : t));
    try {
      await database.updateTarea(tareaId, { estado: nuevoEstado });
      await onDataChange('tareas');
    } catch (err) {
      setLocalTareas(prev => prev.map(t => t.id === tareaId ? { ...t, estado: tarea.estado } : t));
      showAlert('Error', 'No se pudo mover la tarea: ' + err.message, 'error');
    }
    dragIdRef.current = null;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const sortedSprints = [...sprints].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tareas</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de tareas del club</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          {/* Sprint selector */}
          <select
            value={filterSprint}
            onChange={(e) => setParam('tk_sprint', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="">Todos los sprints</option>
            {sortedSprints.map(s => (
              <option key={s.id} value={s.id}>
                {s.nombre}{s.id === activeSprint?.id ? ' ★' : ''}
              </option>
            ))}
          </select>

          {/* Assignee filter */}
          <select
            value={filterAsignado}
            onChange={(e) => setParam('tk_asignado', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="">Todos los asignados</option>
            {assigneeOptions.map(a => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setParam('tk_search', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 w-40"
          />

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setParam('tk_view', 'kanban')}
              className={`p-1.5 transition-colors ${viewMode === 'kanban' ? 'bg-black text-yellow-400' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              title="Vista Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setParam('tk_view', 'list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-black text-yellow-400' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              title="Vista Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sprints panel toggle */}
          <button
            onClick={() => setShowSprintPanel(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Sprints
            {showSprintPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Sprint Management Panel */}
      {showSprintPanel && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">Gestionar Sprints</h3>

          {/* Sprint list */}
          <div className="divide-y divide-gray-100">
            {sortedSprints.length === 0 && (
              <p className="text-sm text-gray-400 py-2">No hay sprints todavía.</p>
            )}
            {sortedSprints.map(s => {
              const isActive = s.id === activeSprint?.id;
              const incomplete = incompleteCount(s.id);
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{s.nombre}</span>
                        {isActive && (
                          <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatFecha(s.fecha_inicio)} – {formatFecha(s.fecha_fin)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-500">{incomplete} incompleta{incomplete !== 1 ? 's' : ''}</span>
                    {incomplete > 0 && (
                      <button
                        onClick={() => handleRolloverClick(s)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors font-medium"
                      >
                        <ArrowRight className="w-3 h-3" />
                        Rollover
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create Sprint */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Crear nuevo Sprint</p>
            <div className="flex items-end gap-2 flex-wrap">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Inicio</label>
                <input
                  type="date"
                  value={newSprintDates.fecha_inicio}
                  onChange={(e) => setNewSprintDates(p => ({ ...p, fecha_inicio: e.target.value }))}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fin</label>
                <input
                  type="date"
                  value={newSprintDates.fecha_fin}
                  onChange={(e) => setNewSprintDates(p => ({ ...p, fecha_fin: e.target.value }))}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <button
                onClick={handleCreateSprint}
                disabled={!newSprintDates.fecha_inicio || !newSprintDates.fecha_fin}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-yellow-400 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {ESTADOS.map(estado => (
            <KanbanColumn
              key={estado}
              estado={estado}
              tareas={filtered
                .filter(t => t.estado === estado)
                .sort((a, b) => (PRIORIDAD_ORDER[a.prioridad] ?? 1) - (PRIORIDAD_ORDER[b.prioridad] ?? 1))
              }
              onEdit={openEditModal}
              onDelete={(id) => setConfirmDelete(id)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-center py-12 text-gray-400">No hay tareas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Título', 'Prioridad', 'Estado', 'Asignado a', 'Fecha estimada', 'Sprint', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(t => {
                    const isOverdue = t.fecha_estimada_completo
                      && new Date(t.fecha_estimada_completo) < new Date()
                      && t.estado !== 'Completado';
                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">{t.titulo}</td>
                        <td className="px-4 py-3"><PriorityBadge prioridad={t.prioridad} /></td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{t.estado}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.asignado_nombre || '—'}</td>
                        <td className={`px-4 py-3 text-sm whitespace-nowrap ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {formatFecha(t.fecha_estimada_completo) || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{t.sprints?.nombre || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEditModal(t)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {alertModal.isOpen && (
        <AlertModal {...alertModal} onClose={closeAlert} />
      )}

      {confirmDelete && (
        <ConfirmModal
          isOpen={true}
          title="Eliminar tarea"
          message="¿Eliminar esta tarea? Esta acción no se puede deshacer."
          onConfirm={handleConfirmDelete}
          onClose={() => setConfirmDelete(null)}
          type="danger"
        />
      )}

      {rolloverConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Rollover de Sprint"
          message={`Mover ${rolloverConfirm.count} tarea${rolloverConfirm.count !== 1 ? 's' : ''} incompleta${rolloverConfirm.count !== 1 ? 's' : ''} de "${rolloverConfirm.fromSprint.nombre}" al sprint "${rolloverConfirm.nextSprint?.nombre ?? 'siguiente (se creará automáticamente)'}".\n\n¿Confirmar?`}
          onConfirm={handleRolloverConfirm}
          onClose={() => setRolloverConfirm(null)}
          confirmText="Mover tareas"
          type="primary"
        />
      )}
    </div>
  );
};
