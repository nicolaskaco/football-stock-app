import React, { useState, useRef } from 'react';
import { database } from '../utils/database';
import { useMountEffect } from '../hooks/useMountEffect';
import { Loader2, RefreshCw } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatTs = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-UY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const FIELD_LABELS = {
  viatico: 'Viático', complemento: 'Complemento', contrato: 'Contrato',
  vianda: 'Vianda', casita: 'Casita', ficha_medica_hasta: 'Ficha médica hasta',
};

const fieldLabel = (f) => FIELD_LABELS[f] || f;

// ── Event normalisation ────────────────────────────────────────────────────

function normaliseActivityLog(rows) {
  return rows.map(r => {
    let label = '';
    let detail = '';
    switch (r.action_type) {
      case 'login':
        label = 'Inicio de sesión';
        detail = r.details?.role ? `Rol: ${r.details.role}` : '';
        break;
      case 'permission_change':
        label = 'Permiso cambiado';
        detail = r.details?.target_email ? `Usuario: ${r.details.target_email}` : '';
        break;
      case 'bulk_approve':
        label = 'Operación masiva — aprobación';
        detail = r.details?.count ? `${r.details.count} solicitud${r.details.count !== 1 ? 'es' : ''}` : '';
        break;
      case 'bulk_reject':
        label = 'Operación masiva — rechazo';
        detail = r.details?.count ? `${r.details.count} solicitud${r.details.count !== 1 ? 'es' : ''}` : '';
        break;
      case 'import_cuentas_viatico':
        label = 'Importación de cuentas de viáticos';
        detail = r.details?.count ? `${r.details.count} jugador${r.details.count !== 1 ? 'es' : ''}` : '';
        break;
      case 'import_planilla_comet':
        label = 'Importación de planilla COMET';
        detail = [r.details?.categoria, r.details?.rival && `vs ${r.details.rival}`].filter(Boolean).join(' ');
        break;
      default:
        label = r.action_type;
    }
    return {
      _id: `al-${r.id}`,
      _type: r.action_type,
      ts: r.created_at,
      performer: r.performed_by,
      label,
      detail,
      _category: 'activity',
    };
  });
}

function normalisePlayerHistory(rows) {
  return rows.map(r => {
    const playerName = r.players?.name_visual || r.players?.name || '—';
    const fld = fieldLabel(r.field_name);
    const detail = `${fld}: ${r.old_value ?? '—'} → ${r.new_value ?? '—'}`;
    return {
      _id: `ph-${r.id}`,
      _type: 'field_change',
      ts: r.changed_at,
      performer: r.changed_by,
      label: `Campo modificado — ${playerName}`,
      detail,
      _category: 'field_change',
    };
  });
}

function normaliseChangeRequests(rows) {
  return rows.map(r => {
    const playerName = r.players?.name_visual || r.players?.name || '—';
    const isApproved = r.status === 'approved';
    const parts = [];
    if (r.new_viatico != null) parts.push(`viático $${r.new_viatico}`);
    if (r.new_complemento != null) parts.push(`complemento $${r.new_complemento}`);
    if (r.new_contrato != null) parts.push(`contrato: ${r.new_contrato ? 'Sí' : 'No'}`);
    return {
      _id: `cr-${r.id}`,
      _type: isApproved ? 'approved' : 'rejected',
      ts: r.review_date,
      performer: r.reviewed_by,
      label: `Solicitud ${isApproved ? 'aprobada' : 'rechazada'} — ${playerName}`,
      detail: parts.join(', '),
      _category: 'change_request',
    };
  });
}

// ── Badge styles ───────────────────────────────────────────────────────────

const BADGE = {
  login:             'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  field_change:      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  approved:          'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected:          'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  permission_change: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  bulk_approve:      'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  bulk_reject:       'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  import_cuentas_viatico: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  import_planilla_comet: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
};

const TYPE_LABELS = {
  login:             'Inicio de sesión',
  field_change:      'Campo modificado',
  approved:          'Solicitud aprobada',
  rejected:          'Solicitud rechazada',
  permission_change: 'Permiso cambiado',
  bulk_approve:      'Operación masiva',
  bulk_reject:       'Operación masiva',
  import_cuentas_viatico: 'Importación de cuentas',
  import_planilla_comet: 'Planilla COMET',
};

const ALL_TYPES = Object.keys(TYPE_LABELS);

// ── Paging ─────────────────────────────────────────────────────────────────

// Events come from 3 tables, each paged on its own and merged by timestamp.
const PAGE_SIZE = 50;

const ACTIVITY_TYPES = ['login', 'permission_change', 'bulk_approve', 'bulk_reject', 'import_cuentas_viatico', 'import_planilla_comet'];
const REQUEST_TYPES = ['approved', 'rejected'];

// Returns the subset of `all` that is selected, null when none is (skip the
// source) and undefined when all are (no filter, so unknown types still show).
const selectedSubset = (all, types) => {
  const sel = all.filter(t => types.has(t));
  if (sel.length === 0) return null;
  return sel.length === all.length ? undefined : sel;
};

const SOURCES = [
  {
    key: 'activity',
    normalise: normaliseActivityLog,
    query: (types) => {
      const actionTypes = selectedSubset(ACTIVITY_TYPES, types);
      return actionTypes === null ? null : (params) => database.getActivityLog({ ...params, actionTypes });
    },
  },
  {
    key: 'history',
    normalise: normalisePlayerHistory,
    query: (types) => (types.has('field_change') ? (params) => database.getPlayerHistoryAll(params) : null),
  },
  {
    key: 'requests',
    normalise: normaliseChangeRequests,
    query: (types) => {
      const statuses = selectedSubset(REQUEST_TYPES, types);
      return statuses === null ? null : (params) => database.getResolvedChangeRequests({ ...params, statuses });
    },
  },
];

const INITIAL_CURSORS = Object.fromEntries(SOURCES.map(s => [s.key, { offset: 0, hasMore: true, oldestTs: null }]));

const INITIAL_FILTERS = { types: new Set(ALL_TYPES), user: '', from: '', to: '' };

// Date inputs are local days; the DB compares full timestamps.
const serverParams = (filters) => ({
  performer: filters.user || undefined,
  fromDate: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
  toDate: filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : undefined,
});

async function fetchPage(filters, cursors) {
  const params = serverParams(filters);
  const results = await Promise.all(SOURCES.map(async (src) => {
    const cur = cursors[src.key];
    const run = src.query(filters.types);
    if (!run || !cur.hasMore) return { key: src.key, events: [], cursor: { ...cur, hasMore: false } };
    const rows = await run({ ...params, limit: PAGE_SIZE, offset: cur.offset });
    const events = src.normalise(rows);
    return {
      key: src.key,
      events,
      cursor: {
        offset: cur.offset + rows.length,
        hasMore: rows.length === PAGE_SIZE,
        oldestTs: events.at(-1)?.ts ?? cur.oldestTs,
      },
    };
  }));
  return {
    events: results.flatMap(r => r.events),
    cursors: Object.fromEntries(results.map(r => [r.key, r.cursor])),
  };
}

const mergeEvents = (prev, next) => {
  const byId = new Map(prev.map(e => [e._id, e]));
  next.forEach(e => byId.set(e._id, e));
  return Array.from(byId.values()).sort((a, b) => new Date(b.ts) - new Date(a.ts));
};

// A source that still has more rows may hold events newer than another
// source's already-loaded ones, so only events at or above the newest
// "oldest loaded" timestamp among those sources are safe to show.
const getWatermark = (cursors) => {
  const pending = Object.values(cursors).filter(c => c.hasMore && c.oldestTs);
  if (pending.length === 0) return null;
  return Math.max(...pending.map(c => new Date(c.oldestTs).getTime()));
};

// ── Component ──────────────────────────────────────────────────────────────

export const ActivityLogTab = () => {
  const [events, setEvents] = useState([]);
  const [cursors, setCursors] = useState(INITIAL_CURSORS);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [users, setUsers] = useState([]);
  // Ignores responses from a reload that a newer filter change superseded.
  const requestId = useRef(0);

  const reload = async (nextFilters) => {
    const id = ++requestId.current;
    setFilters(nextFilters);
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPage(nextFilters, INITIAL_CURSORS);
      if (id !== requestId.current) return;
      setEvents(mergeEvents([], page.events));
      setCursors(page.cursors);
    } catch (err) {
      if (id !== requestId.current) return;
      console.error('ActivityLogTab load error:', err);
      setError('Error cargando el registro de actividad.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const loadMore = async () => {
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await fetchPage(filters, cursors);
      if (id !== requestId.current) return;
      setEvents(prev => mergeEvents(prev, page.events));
      setCursors(page.cursors);
    } catch (err) {
      console.error('ActivityLogTab load more error:', err);
      setError('Error cargando más eventos.');
    } finally {
      setLoadingMore(false);
    }
  };

  useMountEffect(() => {
    reload(INITIAL_FILTERS);
    database.listUserPermissions()
      .then(rows => setUsers(rows.map(r => r.email).filter(Boolean)))
      .catch(err => console.error('ActivityLogTab users error:', err));
  });

  const watermark = getWatermark(cursors);
  const visible = watermark === null ? events : events.filter(e => new Date(e.ts).getTime() >= watermark);
  const hasMore = Object.values(cursors).some(c => c.hasMore);

  // Users with a login plus anyone seen in loaded events ('Unknown', ex-users)
  const performers = Array.from(new Set([
    ...users,
    ...events.map(e => e.performer),
    filters.user,
  ].filter(Boolean))).sort();

  const filtersActive = filters.types.size !== ALL_TYPES.length || filters.user || filters.from || filters.to;

  const toggleType = (type) => {
    const types = new Set(filters.types);
    if (types.has(type)) { types.delete(type); } else { types.add(type); }
    reload({ ...filters, types });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Registro de Actividad</h2>
        <button
          onClick={() => reload(filters)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        {/* Type chips */}
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map(type => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filters.types.has(type)
                  ? `${BADGE[type]} border-transparent`
                  : 'bg-white text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-600'
              }`}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
          {filtersActive && (
            <button
              onClick={() => reload(INITIAL_FILTERS)}
              className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-transparent"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* User + date filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filters.user}
            onChange={e => reload({ ...filters, user: e.target.value })}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none"
          >
            <option value="">Todos los usuarios</option>
            {performers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Desde</span>
            <input
              type="date"
              value={filters.from}
              onChange={e => reload({ ...filters, from: e.target.value })}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none"
            />
            <span>hasta</span>
            <input
              type="date"
              value={filters.to}
              onChange={e => reload({ ...filters, to: e.target.value })}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : error && visible.length === 0 ? (
        <div className="p-6 text-red-600 dark:text-red-400">{error}</div>
      ) : (
        <>
          {/* Results count */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {visible.length} evento{visible.length !== 1 ? 's' : ''}
          </p>

          {/* Timeline */}
          {visible.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">No hay eventos para mostrar</div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {visible.map(e => (
                <div key={e._id} className="flex items-start gap-4 px-4 py-3">
                  <span className={`mt-0.5 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${BADGE[e._type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {TYPE_LABELS[e._type] || e._type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{e.label}</p>
                    {e.detail && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{e.detail}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatTs(e.ts)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{e.performer || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pager */}
          {error && visible.length > 0 && (
            <p className="text-sm text-center text-red-600 dark:text-red-400">{error}</p>
          )}
          {hasMore ? (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-black text-yellow-400 hover:bg-gray-800 dark:bg-yellow-400 dark:text-black dark:hover:bg-yellow-300 disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                Cargar más
              </button>
            </div>
          ) : visible.length > 0 && (
            <p className="text-sm text-center text-gray-400 dark:text-gray-500">No hay más eventos</p>
          )}
        </>
      )}
    </div>
  );
};
