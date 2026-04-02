import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Cake, ShieldAlert, HeartPulse, Trophy, X } from 'lucide-react';
import { CATEGORIAS_PARTIDO, CALENDAR_EVENT_TYPES } from '../utils/constants';

/**
 * Determina si CAP ganó, empatamos, o perdimos un partido individual.
 * @returns 'win' | 'draw' | 'loss' | null (sin resultado)
 */
function getResultado(partido) {
  if (partido.goles_local == null || partido.goles_visitante == null) return null;
  const capGoles =
    partido.escenario === 'Local' ? partido.goles_local : partido.goles_visitante;
  const rivalGoles =
    partido.escenario === 'Local' ? partido.goles_visitante : partido.goles_local;
  if (capGoles > rivalGoles) return 'win';
  if (capGoles < rivalGoles) return 'loss';
  return 'draw';
}

const RESULT_DOT = {
  win:  'bg-green-500',
  loss: 'bg-red-500',
  draw: 'bg-gray-400',
  null: 'bg-gray-200',
};

/** Resumen de la jornada: cuenta G/E/P entre los 5 partidos con resultado */
function ResumenBadge({ jornada }) {
  const resultados = (jornada.partidos || []).map(getResultado).filter(Boolean);
  if (resultados.length === 0) return null;
  const g = resultados.filter((r) => r === 'win').length;
  const e = resultados.filter((r) => r === 'draw').length;
  const p = resultados.filter((r) => r === 'loss').length;
  return (
    <span className="text-xs text-gray-500">
      {g > 0 && <span className="text-green-600 font-semibold">{g}G </span>}
      {e > 0 && <span className="text-gray-500 font-semibold">{e}E </span>}
      {p > 0 && <span className="text-red-600 font-semibold">{p}P</span>}
    </span>
  );
}

/** 5 dots coloreados, uno por categoría en orden canónico */
function CategoryDots({ jornada }) {
  return (
    <div className="flex gap-0.5 mt-1 flex-wrap">
      {CATEGORIAS_PARTIDO.map((cat) => {
        const partido = (jornada.partidos || []).find((p) => p.categoria === cat);
        const res = partido ? getResultado(partido) : null;
        return (
          <span
            key={cat}
            title={`${cat}: ${res ? { win: 'Ganamos', loss: 'Perdimos', draw: 'Empate' }[res] : 'Sin resultado'}`}
            className={`w-2 h-2 rounded-full inline-block ${RESULT_DOT[res]}`}
          />
        );
      })}
    </div>
  );
}

/** Tarjeta de jornada dentro de un día del calendario */
function JornadaCard({ jornada, onClick }) {
  return (
    <button
      onClick={() => onClick(jornada)}
      className="w-full text-left bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-1 py-1 sm:px-2 sm:py-1.5 hover:border-blue-400 hover:shadow-sm transition group"
    >
      <p className="text-[10px] sm:text-xs font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400">
        {jornada.rivales?.name || 'Rival'}
      </p>
      <div className="flex items-center gap-1">
        <CategoryDots jornada={jornada} />
        <ResumenBadge jornada={jornada} />
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// Unified event builders
// ─────────────────────────────────────────────

/** Build birthday events for a given year (month view year or week range) */
function buildBirthdayEvents(players, dirigentes, year) {
  const events = [];
  const addBirthday = (person, type) => {
    if (!person.date_of_birth) return;
    const dob = new Date(person.date_of_birth + 'T00:00:00');
    const month = String(dob.getMonth() + 1).padStart(2, '0');
    const day = String(dob.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    const age = year - dob.getFullYear();
    events.push({
      dateKey,
      type: CALENDAR_EVENT_TYPES.CUMPLEANOS,
      label: person.name_visual || person.name || person.nombre,
      detail: `${age} años`,
      personType: type,
    });
  };

  (players || []).forEach((p) => {
    if (p.hide_player) return;
    addBirthday(p, 'jugador');
  });
  (dirigentes || []).forEach((d) => addBirthday(d, 'dirigente'));
  return events;
}

/** Build ficha médica expiration events */
function buildFichaMedicaEvents(players) {
  const events = [];
  (players || []).forEach((p) => {
    if (p.hide_player || !p.ficha_medica_hasta) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(p.ficha_medica_hasta + 'T00:00:00');
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    const expired = diffDays < 0;
    events.push({
      dateKey: p.ficha_medica_hasta,
      type: CALENDAR_EVENT_TYPES.FICHA_MEDICA,
      label: p.name_visual || p.name,
      detail: expired ? 'Vencida' : `Vence en ${diffDays}d`,
      expired,
    });
  });
  return events;
}

/** Build injury return events */
function buildInjuryEvents(injuries, players) {
  const events = [];
  const playerMap = {};
  (players || []).forEach((p) => { playerMap[p.id] = p; });

  (injuries || []).forEach((inj) => {
    if (inj.fecha_alta) return; // already discharged
    if (!inj.fecha_retorno_estimada) return;
    const player = playerMap[inj.player_id];
    if (!player) return;
    events.push({
      dateKey: inj.fecha_retorno_estimada,
      type: CALENDAR_EVENT_TYPES.LESIONES,
      label: player.name_visual || player.name,
      detail: inj.tipo || 'Lesión',
    });
  });
  return events;
}

/** Index unified events by date key */
function indexEventsByDate(events) {
  return events.reduce((acc, evt) => {
    if (!acc[evt.dateKey]) acc[evt.dateKey] = [];
    acc[evt.dateKey].push(evt);
    return acc;
  }, {});
}

// ─────────────────────────────────────────────
// Event pill rendered inside calendar cells
// ─────────────────────────────────────────────

const EVENT_STYLES = {
  [CALENDAR_EVENT_TYPES.CUMPLEANOS]: {
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    text: 'text-purple-700 dark:text-purple-300',
    Icon: Cake,
  },
  [CALENDAR_EVENT_TYPES.FICHA_MEDICA]: {
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    text: 'text-orange-700 dark:text-orange-300',
    Icon: ShieldAlert,
  },
  [CALENDAR_EVENT_TYPES.LESIONES]: {
    bg: 'bg-teal-100 dark:bg-teal-900/40',
    text: 'text-teal-700 dark:text-teal-300',
    Icon: HeartPulse,
  },
};

function EventPill({ event, onClick }) {
  const style = EVENT_STYLES[event.type];
  if (!style) return null;
  const { bg, text, Icon } = style;
  return (
    <button
      onClick={onClick}
      title={`${event.label} — ${event.detail}`}
      className={`w-full text-left flex items-center gap-0.5 rounded px-1 py-0.5 ${bg} ${text} text-[9px] sm:text-[10px] leading-tight truncate hover:brightness-95 transition`}
    >
      <Icon className="w-2.5 h-2.5 flex-shrink-0" />
      <span className="truncate">{event.label}</span>
    </button>
  );
}

/** When too many events in a cell, show a clickable "more" indicator */
function EventOverflow({ count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-[9px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 pl-1 text-left"
    >
      +{count} más
    </button>
  );
}

// ─────────────────────────────────────────────
// Day events modal (lightweight, inline)
// ─────────────────────────────────────────────

const MONTHS_ES_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const EVENT_TYPE_LABELS = {
  [CALENDAR_EVENT_TYPES.CUMPLEANOS]: 'Cumpleaños',
  [CALENDAR_EVENT_TYPES.FICHA_MEDICA]: 'Fichas Médicas',
  [CALENDAR_EVENT_TYPES.LESIONES]: 'Lesiones',
};

function DayEventsModal({ dateKey, events, onClose }) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateLabel = `${d} de ${MONTHS_ES_LONG[m - 1]} de ${y}`;

  // Group events by type
  const grouped = events.reduce((acc, evt) => {
    if (!acc[evt.type]) acc[evt.type] = [];
    acc[evt.type].push(evt);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{dateLabel}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Event groups */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(grouped).map(([type, evts]) => {
            const style = EVENT_STYLES[type];
            if (!style) return null;
            const { bg, text, Icon } = style;
            return (
              <div key={type}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${text}`}>
                  {EVENT_TYPE_LABELS[type]}
                </p>
                <ul className="space-y-1.5">
                  {evts.map((evt, i) => (
                    <li key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${bg}`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 ${text}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${text}`}>{evt.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{evt.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Month view
// ─────────────────────────────────────────────

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function MonthView({ year, month, jornadasByDate, eventsByDate, onJornadaClick, onDayEventsClick, showPartidos, maxEventsPerCell }) {
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const cells = Array.from({ length: offset + daysInMonth }, (_, i) => {
    if (i < offset) return null;
    return i - offset + 1;
  });
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 text-center mb-1">
        {DAYS_ES.map((d) => (
          <div key={d} className="text-xs font-medium text-gray-400 dark:text-gray-500 py-1 truncate">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="bg-gray-50 dark:bg-gray-800 min-h-[56px] sm:min-h-[80px]" />;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const jornadas = showPartidos ? (jornadasByDate[dateKey] || []) : [];
          const events = eventsByDate[dateKey] || [];
          const totalItems = jornadas.length + events.length;
          const maxShow = maxEventsPerCell;
          const overflow = totalItems > maxShow ? totalItems - maxShow : 0;
          let shown = 0;

          return (
            <div
              key={idx}
              className={`bg-white dark:bg-gray-750 min-h-[56px] sm:min-h-[80px] p-0.5 sm:p-1.5 flex flex-col gap-0.5 sm:gap-1 ${isToday(day) ? 'ring-2 ring-inset ring-blue-400' : ''}`}
            >
              <span
                className={`text-xs font-semibold self-start w-5 h-5 flex items-center justify-center rounded-full ${
                  isToday(day) ? 'bg-blue-500 text-white' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {day}
              </span>
              {jornadas.map((j) => {
                if (shown >= maxShow) return null;
                shown++;
                return <JornadaCard key={j.id} jornada={j} onClick={onJornadaClick} />;
              })}
              {events.map((evt, i) => {
                if (shown >= maxShow) return null;
                shown++;
                return <EventPill key={`${evt.type}-${i}`} event={evt} onClick={() => onDayEventsClick(dateKey, eventsByDate[dateKey] || [])} />;
              })}
              {overflow > 0 && <EventOverflow count={overflow} onClick={() => onDayEventsClick(dateKey, eventsByDate[dateKey] || [])} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Week view
// ─────────────────────────────────────────────

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function WeekView({ weekStart, jornadasByDate, eventsByDate, onJornadaClick, onDayEventsClick, showPartidos }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
        {days.map((date, idx) => {
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const jornadas = showPartidos ? (jornadasByDate[dateKey] || []) : [];
          const events = eventsByDate[dateKey] || [];
          const isToday = date.getTime() === today.getTime();
          const dayLabel = DAYS_ES[idx];
          return (
            <div
              key={idx}
              className={`bg-white dark:bg-gray-750 min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 flex flex-col gap-1 sm:gap-1.5 ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''}`}
            >
              <div className="flex flex-col items-center sm:flex-row sm:items-center gap-0 sm:gap-1">
                <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-medium">{dayLabel}</span>
                <span
                  className={`text-xs sm:text-sm font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
              {jornadas.map((j) => (
                <JornadaCard key={j.id} jornada={j} onClick={onJornadaClick} />
              ))}
              {events.map((evt, i) => (
                <EventPill key={`${evt.type}-${i}`} event={evt} onClick={() => onDayEventsClick(dateKey, events)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Filter toggle button
// ─────────────────────────────────────────────

function EventFilterToggle({ label, icon: Icon, active, count, colorClass, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition border ${
        active
          ? `${colorClass} border-current`
          : 'text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 opacity-50'
      }`}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
      {count > 0 && (
        <span className={`ml-0.5 px-1.5 py-0 rounded-full text-[10px] font-bold ${active ? 'bg-white/30 dark:bg-black/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────
// Main CalendarioView
// ─────────────────────────────────────────────

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const CalendarioView = ({
  jornadas = [],
  onJornadaClick,
  players = [],
  dirigentes = [],
  injuries = [],
}) => {
  const today = new Date();
  const [calView, setCalView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekStart, setWeekStart] = useState(getMonday(today));

  // Day events modal state
  const [dayModal, setDayModal] = useState(null); // { dateKey, events } | null

  const openDayModal = (dateKey, events) => {
    if (events.length > 0) setDayModal({ dateKey, events });
  };

  // Event type filters — all on by default
  const [filters, setFilters] = useState({
    [CALENDAR_EVENT_TYPES.PARTIDOS]: true,
    [CALENDAR_EVENT_TYPES.CUMPLEANOS]: true,
    [CALENDAR_EVENT_TYPES.FICHA_MEDICA]: true,
    [CALENDAR_EVENT_TYPES.LESIONES]: true,
  });

  const hasExtraData = players.length > 0 || dirigentes.length > 0 || injuries.length > 0;

  const toggleFilter = (type) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  // Index jornadas by their fecha (YYYY-MM-DD)
  const jornadasByDate = useMemo(() => jornadas.reduce((acc, j) => {
    const key = j.fecha;
    if (!acc[key]) acc[key] = [];
    acc[key].push(j);
    return acc;
  }, {}), [jornadas]);

  // Build unified events for the visible year
  const visibleYear = calView === 'month' ? currentDate.getFullYear() : weekStart.getFullYear();

  const { eventsByDate, eventCounts } = useMemo(() => {
    const allEvents = [];

    if (filters[CALENDAR_EVENT_TYPES.CUMPLEANOS]) {
      allEvents.push(...buildBirthdayEvents(players, dirigentes, visibleYear));
      // Also build for adjacent year if week view spans year boundary
      if (calView === 'week') {
        const endOfWeek = new Date(weekStart);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        if (endOfWeek.getFullYear() !== visibleYear) {
          allEvents.push(...buildBirthdayEvents(players, dirigentes, endOfWeek.getFullYear()));
        }
      }
    }
    if (filters[CALENDAR_EVENT_TYPES.FICHA_MEDICA]) {
      allEvents.push(...buildFichaMedicaEvents(players));
    }
    if (filters[CALENDAR_EVENT_TYPES.LESIONES]) {
      allEvents.push(...buildInjuryEvents(injuries, players));
    }

    // Count events by type (before filtering for display)
    const counts = {
      [CALENDAR_EVENT_TYPES.CUMPLEANOS]: buildBirthdayEvents(players, dirigentes, visibleYear).length,
      [CALENDAR_EVENT_TYPES.FICHA_MEDICA]: buildFichaMedicaEvents(players).length,
      [CALENDAR_EVENT_TYPES.LESIONES]: buildInjuryEvents(injuries, players).length,
    };

    return { eventsByDate: indexEventsByDate(allEvents), eventCounts: counts };
  }, [players, dirigentes, injuries, visibleYear, calView, weekStart, filters]);

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setWeekStart(getMonday(today));
  };

  const navigate = (dir) => {
    if (calView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1));
    } else {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + dir * 7);
      setWeekStart(d);
    }
  };

  const title =
    calView === 'month'
      ? `${MONTHS_ES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : (() => {
          const end = new Date(weekStart);
          end.setDate(end.getDate() + 6);
          if (weekStart.getMonth() === end.getMonth()) {
            return `${weekStart.getDate()}–${end.getDate()} ${MONTHS_ES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
          }
          return `${weekStart.getDate()} ${MONTHS_ES[weekStart.getMonth()]} – ${end.getDate()} ${MONTHS_ES[end.getMonth()]} ${end.getFullYear()}`;
        })();

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 text-center flex-1 sm:flex-none sm:min-w-[180px]">{title}</h3>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="ml-1 px-2.5 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          >
            Hoy
          </button>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm font-medium self-start sm:self-auto">
          <button
            onClick={() => setCalView('month')}
            className={`px-3 py-1.5 transition ${calView === 'month' ? 'bg-black text-yellow-400' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
          >
            Mes
          </button>
          <button
            onClick={() => setCalView('week')}
            className={`px-3 py-1.5 border-l border-gray-300 dark:border-gray-600 transition ${calView === 'week' ? 'bg-black text-yellow-400' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Event type filters — only show when extra data is available */}
      {hasExtraData && (
        <div className="flex flex-wrap items-center gap-2">
          <EventFilterToggle
            label="Partidos"
            icon={Trophy}
            active={filters[CALENDAR_EVENT_TYPES.PARTIDOS]}
            count={jornadas.length}
            colorClass="text-blue-600 dark:text-blue-400"
            onClick={() => toggleFilter(CALENDAR_EVENT_TYPES.PARTIDOS)}
          />
          <EventFilterToggle
            label="Cumpleaños"
            icon={Cake}
            active={filters[CALENDAR_EVENT_TYPES.CUMPLEANOS]}
            count={eventCounts[CALENDAR_EVENT_TYPES.CUMPLEANOS]}
            colorClass="text-purple-600 dark:text-purple-400"
            onClick={() => toggleFilter(CALENDAR_EVENT_TYPES.CUMPLEANOS)}
          />
          <EventFilterToggle
            label="Fichas Médicas"
            icon={ShieldAlert}
            active={filters[CALENDAR_EVENT_TYPES.FICHA_MEDICA]}
            count={eventCounts[CALENDAR_EVENT_TYPES.FICHA_MEDICA]}
            colorClass="text-orange-600 dark:text-orange-400"
            onClick={() => toggleFilter(CALENDAR_EVENT_TYPES.FICHA_MEDICA)}
          />
          <EventFilterToggle
            label="Lesiones"
            icon={HeartPulse}
            active={filters[CALENDAR_EVENT_TYPES.LESIONES]}
            count={eventCounts[CALENDAR_EVENT_TYPES.LESIONES]}
            colorClass="text-teal-600 dark:text-teal-400"
            onClick={() => toggleFilter(CALENDAR_EVENT_TYPES.LESIONES)}
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {filters[CALENDAR_EVENT_TYPES.PARTIDOS] && (
          <>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Ganamos</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Perdimos</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Empate</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" /> Sin resultado</span>
            <span className="text-gray-400 hidden sm:inline">— Dots: {CATEGORIAS_PARTIDO.join(' · ')}</span>
          </>
        )}
      </div>

      {/* Calendar */}
      {calView === 'month' ? (
        <MonthView
          year={currentDate.getFullYear()}
          month={currentDate.getMonth()}
          jornadasByDate={jornadasByDate}
          eventsByDate={eventsByDate}
          onJornadaClick={onJornadaClick}
          onDayEventsClick={openDayModal}
          showPartidos={filters[CALENDAR_EVENT_TYPES.PARTIDOS]}
          maxEventsPerCell={3}
        />
      ) : (
        <WeekView
          weekStart={weekStart}
          jornadasByDate={jornadasByDate}
          eventsByDate={eventsByDate}
          onJornadaClick={onJornadaClick}
          onDayEventsClick={openDayModal}
          showPartidos={filters[CALENDAR_EVENT_TYPES.PARTIDOS]}
        />
      )}

      {/* Day events modal */}
      {dayModal && (
        <DayEventsModal
          dateKey={dayModal.dateKey}
          events={dayModal.events}
          onClose={() => setDayModal(null)}
        />
      )}
    </div>
  );
};
