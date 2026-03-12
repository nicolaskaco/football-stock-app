import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Stethoscope, Cake, ClipboardList, X, Users, Shield } from 'lucide-react';
import { database } from '../utils/database';
import { InjuryIcon } from './ui/InjuryIcon';

const STORAGE_KEY = 'cap-notifications-read';

function getReadIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setReadIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function buildNotifications({ birthdays, fichas, pendingRequests, activeInjuries, players }) {
  const items = [];
  const today = new Date().toISOString().split('T')[0];

  // Birthdays
  birthdays.forEach(person => {
    const label = person.daysUntilBirthday === 0
      ? '¡Hoy!'
      : `En ${person.daysUntilBirthday} ${person.daysUntilBirthday === 1 ? 'día' : 'días'}`;
    items.push({
      id: `birthday-${person.type}-${person.id}`,
      type: 'birthday',
      severity: 'info',
      icon: person.type === 'player' ? 'player' : 'dirigente',
      title: person.daysUntilBirthday === 0 ? '¡Cumpleaños hoy!' : 'Cumpleaños próximo',
      body: `${person.name_visual || person.name} — ${label}`,
      tab: null,
      date: today,
    });
  });

  // Ficha médica
  fichas.forEach(p => {
    const name = p.name_visual || p.name;
    if (p.expired) {
      const [y, m, d] = (p.ficha_medica_hasta || '').split('-');
      const dateStr = y ? `${d}/${m}/${y}` : '';
      items.push({
        id: `ficha-expired-${p.id}`,
        type: 'ficha',
        severity: 'critical',
        icon: 'stethoscope',
        title: 'Ficha médica vencida',
        body: `${name}${dateStr ? ` — venció ${dateStr}` : ''}`,
        tab: 'players',
        date: p.ficha_medica_hasta || today,
      });
    } else if (p.expiringSoon) {
      const diff = Math.ceil((new Date(p.ficha_medica_hasta) - new Date()) / 86400000);
      items.push({
        id: `ficha-expiring-${p.id}`,
        type: 'ficha',
        severity: 'warning',
        icon: 'stethoscope',
        title: 'Ficha médica por vencer',
        body: `${name} — vence en ${diff} ${diff === 1 ? 'día' : 'días'}`,
        tab: 'players',
        date: p.ficha_medica_hasta || today,
      });
    }
  });

  // Pending change requests
  pendingRequests.forEach(req => {
    const playerName = req.players?.name_visual || req.players?.name || 'Jugador';
    items.push({
      id: `change-request-${req.id}`,
      type: 'change_request',
      severity: 'warning',
      icon: 'clipboard',
      title: 'Solicitud de cambio pendiente',
      body: `${playerName} — por ${req.requested_by}`,
      tab: 'change_requests',
      date: req.request_date || today,
    });
  });

  // Active injuries
  const playerMap = {};
  players.forEach(p => { playerMap[p.id] = p; });

  activeInjuries.forEach(inj => {
    const player = playerMap[inj.player_id];
    if (!player) return;
    const name = player.name_visual || player.name;
    items.push({
      id: `injury-${inj.id}`,
      type: 'injury',
      severity: inj.severidad === 'grave' ? 'critical' : inj.severidad === 'moderada' ? 'warning' : 'info',
      icon: 'injury',
      title: 'Lesión activa',
      body: `${name} — ${inj.tipo || 'Lesión'} (${inj.severidad || 'sin severidad'})`,
      tab: 'players',
      date: inj.fecha_inicio || today,
    });
  });

  return items;
}

const severityColor = {
  critical: 'border-red-500',
  warning: 'border-orange-400',
  info: 'border-yellow-400',
};

const severityDot = {
  critical: 'bg-red-500',
  warning: 'bg-orange-400',
  info: 'bg-yellow-400',
};

function NotifIcon({ icon, severity }) {
  const cls = severity === 'critical' ? 'text-red-500' : severity === 'warning' ? 'text-orange-500' : 'text-yellow-500';
  switch (icon) {
    case 'stethoscope': return <Stethoscope className={`w-4 h-4 ${cls}`} />;
    case 'player': return <Users className={`w-4 h-4 ${cls}`} />;
    case 'dirigente': return <Shield className={`w-4 h-4 ${cls}`} />;
    case 'clipboard': return <ClipboardList className={`w-4 h-4 ${cls}`} />;
    case 'injury': return <InjuryIcon injury={{ severidad: severity === 'critical' ? 'grave' : severity === 'warning' ? 'moderada' : 'leve', tipo: 'Lesión' }} />;
    default: return <Bell className={`w-4 h-4 ${cls}`} />;
  }
}

export const NotificationCenter = ({ currentUser, players = [], injuries = [], setActiveTab }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIdsState] = useState(getReadIds);
  const panelRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin';
  const canViewChangeRequests = ['admin', 'ejecutivo', 'presidente', 'presidente_categoria'].includes(currentUser?.role);

  const loadNotifications = useCallback(async () => {
    const categorias = currentUser?.categoria?.length > 0 ? currentUser.categoria : null;

    const promises = [
      database.getUpcomingBirthdays(7, categorias),
      database.getUpcomingBirthdaysDirigentes(7),
    ];

    if (isAdmin) {
      promises.push(database.getPlayersWithExpiredFichaMedica(categorias));
    } else {
      promises.push(Promise.resolve([]));
    }

    if (canViewChangeRequests) {
      promises.push(database.getPendingChangeRequests());
    } else {
      promises.push(Promise.resolve([]));
    }

    let [upcomingPlayers, upcomingDirigentes, fichas, pendingRequests] = await Promise.all(promises);

    if (currentUser?.role === 'presidente_categoria' && categorias?.length > 0) {
      pendingRequests = pendingRequests.filter(req =>
        req.players?.categoria && categorias.includes(req.players.categoria)
      );
    }

    const birthdays = [
      ...upcomingPlayers.map(p => ({ ...p, type: 'player' })),
      ...upcomingDirigentes.map(d => ({ ...d, type: 'dirigente' })),
    ].sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

    const activeInjuries = isAdmin ? injuries.filter(inj => !inj.fecha_alta) : [];

    const items = buildNotifications({ birthdays, fichas, pendingRequests, activeInjuries, players });
    setNotifications(items);

    // Prune readIds that no longer map to existing notifications
    const currentIds = new Set(items.map(n => n.id));
    const pruned = readIds.filter(id => currentIds.has(id));
    if (pruned.length !== readIds.length) {
      setReadIdsState(pruned);
      setReadIds(pruned);
    }
  }, [currentUser, isAdmin, canViewChangeRequests, injuries, players]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const severityOrder = { critical: 0, warning: 1, info: 2 };

  const sorted = [...notifications].sort((a, b) => {
    // Unread first
    const aRead = readIds.includes(a.id) ? 1 : 0;
    const bRead = readIds.includes(b.id) ? 1 : 0;
    if (aRead !== bRead) return aRead - bRead;
    // Then by severity (critical > warning > info)
    const sevDiff = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
    if (sevDiff !== 0) return sevDiff;
    // Then by date descending (newest first)
    return (b.date || '').localeCompare(a.date || '');
  });

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIdsState(allIds);
    setReadIds(allIds);
  };

  const handleNotifClick = (notif) => {
    // Mark as read
    if (!readIds.includes(notif.id)) {
      const updated = [...readIds, notif.id];
      setReadIdsState(updated);
      setReadIds(updated);
    }
    // Navigate to tab if applicable
    if (notif.tab && setActiveTab) {
      setActiveTab(notif.tab);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition"
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />
        <div className="fixed inset-x-0 top-14 mx-2 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:mx-0 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 notification-panel">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Marcar todas como leídas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay notificaciones</p>
              </div>
            ) : (
              sorted.map(notif => {
                const isRead = readIds.includes(notif.id);
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left px-4 py-3 border-l-4 ${severityColor[notif.severity]} hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                      isRead ? 'opacity-60' : ''
                    } ${notif.tab ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <NotifIcon icon={notif.icon} severity={notif.severity} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isRead ? 'text-gray-600' : 'font-semibold text-gray-900'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{notif.body}</p>
                    </div>
                    {!isRead && (
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${severityDot[notif.severity]}`} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
};
