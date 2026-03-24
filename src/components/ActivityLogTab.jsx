import React, { useState, useEffect, useMemo } from 'react';
import { database } from '../utils/database';
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
    const isApproved = r.status === 'APPROVED';
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
  login:             'bg-blue-100 text-blue-700',
  field_change:      'bg-gray-100 text-gray-700',
  approved:          'bg-green-100 text-green-700',
  rejected:          'bg-red-100 text-red-700',
  permission_change: 'bg-purple-100 text-purple-700',
  bulk_approve:      'bg-orange-100 text-orange-700',
  bulk_reject:       'bg-orange-100 text-orange-700',
};

const TYPE_LABELS = {
  login:             'Inicio de sesión',
  field_change:      'Campo modificado',
  approved:          'Solicitud aprobada',
  rejected:          'Solicitud rechazada',
  permission_change: 'Permiso cambiado',
  bulk_approve:      'Operación masiva',
  bulk_reject:       'Operación masiva',
};

const ALL_TYPES = Object.keys(TYPE_LABELS);

// ── Component ──────────────────────────────────────────────────────────────

export const ActivityLogTab = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedTypes, setSelectedTypes] = useState(new Set(ALL_TYPES));
  const [filterUser, setFilterUser] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [activityRows, historyRows, changeReqRows] = await Promise.all([
        database.getActivityLog({ limit: 200 }),
        database.getPlayerHistoryAll({ limit: 200 }),
        database.getResolvedChangeRequests({ limit: 200 }),
      ]);

      const merged = [
        ...normaliseActivityLog(activityRows),
        ...normalisePlayerHistory(historyRows),
        ...normaliseChangeRequests(changeReqRows),
      ].sort((a, b) => new Date(b.ts) - new Date(a.ts));

      setEvents(merged);
    } catch (err) {
      console.error('ActivityLogTab load error:', err);
      setError('Error cargando el registro de actividad.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Unique performers for filter dropdown
  const performers = useMemo(() => {
    const s = new Set(events.map(e => e.performer).filter(Boolean));
    return Array.from(s).sort();
  }, [events]);

  // Apply filters
  const filtered = useMemo(() => {
    return events.filter(e => {
      if (!selectedTypes.has(e._type)) return false;
      if (filterUser && e.performer !== filterUser) return false;
      if (fromDate && new Date(e.ts) < new Date(fromDate)) return false;
      if (toDate && new Date(e.ts) > new Date(toDate + 'T23:59:59')) return false;
      return true;
    });
  }, [events, selectedTypes, filterUser, fromDate, toDate]);

  const toggleType = (type) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
  };

  const resetFilters = () => {
    setSelectedTypes(new Set(ALL_TYPES));
    setFilterUser('');
    setFromDate('');
    setToDate('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">{error}</div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Registro de Actividad</h2>
        <button
          onClick={loadAll}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        {/* Type chips */}
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map(type => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedTypes.has(type)
                  ? `${BADGE[type]} border-transparent`
                  : 'bg-white text-gray-400 border-gray-200'
              }`}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
          {selectedTypes.size !== ALL_TYPES.length && (
            <button
              onClick={resetFilters}
              className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-transparent"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* User + date filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none"
          >
            <option value="">Todos los usuarios</option>
            {performers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Desde</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
            />
            <span>hasta</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">{filtered.length} evento{filtered.length !== 1 ? 's' : ''}</p>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay eventos para mostrar</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.map(e => (
            <div key={e._id} className="flex items-start gap-4 px-4 py-3">
              <span className={`mt-0.5 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${BADGE[e._type] || 'bg-gray-100 text-gray-600'}`}>
                {TYPE_LABELS[e._type] || e._type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{e.label}</p>
                {e.detail && <p className="text-xs text-gray-500 mt-0.5">{e.detail}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-gray-500">{formatTs(e.ts)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{e.performer || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
