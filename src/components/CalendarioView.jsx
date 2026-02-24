import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIAS_PARTIDO } from '../utils/constants';
import { formatDate } from '../utils/dateUtils';

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

const RESULT_LABEL = {
  win:  'G',
  loss: 'P',
  draw: 'E',
  null: '·',
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
      className="w-full text-left bg-white border border-gray-200 rounded-md px-2 py-1.5 hover:border-blue-400 hover:shadow-sm transition group"
    >
      <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-blue-700">
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
// Month view
// ─────────────────────────────────────────────

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function MonthView({ year, month, jornadasByDate, onJornadaClick }) {
  // First day of month (0=Sun…6=Sat), convert to Mon-based (0=Mon…6=Sun)
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7; // cells to leave blank before day 1
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const cells = Array.from({ length: offset + daysInMonth }, (_, i) => {
    if (i < offset) return null;
    return i - offset + 1;
  });
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 text-center mb-1">
        {DAYS_ES.map((d) => (
          <div key={d} className="text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="bg-gray-50 min-h-[80px]" />;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const jornadas = jornadasByDate[dateKey] || [];
          return (
            <div
              key={idx}
              className={`bg-white min-h-[80px] p-1.5 flex flex-col gap-1 ${isToday(day) ? 'ring-2 ring-inset ring-blue-400' : ''}`}
            >
              <span
                className={`text-xs font-semibold self-start w-5 h-5 flex items-center justify-center rounded-full ${
                  isToday(day) ? 'bg-blue-500 text-white' : 'text-gray-500'
                }`}
              >
                {day}
              </span>
              {jornadas.map((j) => (
                <JornadaCard key={j.id} jornada={j} onClick={onJornadaClick} />
              ))}
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

function WeekView({ weekStart, jornadasByDate, onJornadaClick }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {days.map((date, idx) => {
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const jornadas = jornadasByDate[dateKey] || [];
          const isToday = date.getTime() === today.getTime();
          const dayLabel = DAYS_ES[idx];
          return (
            <div
              key={idx}
              className={`bg-white min-h-[120px] p-2 flex flex-col gap-1.5 ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''}`}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400 font-medium">{dayLabel}</span>
                <span
                  className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-500 text-white' : 'text-gray-700'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
              {jornadas.map((j) => (
                <JornadaCard key={j.id} jornada={j} onClick={onJornadaClick} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main CalendarioView
// ─────────────────────────────────────────────

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const CalendarioView = ({ jornadas = [], onJornadaClick }) => {
  const today = new Date();
  const [calView, setCalView] = useState('month'); // 'month' | 'week'
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekStart, setWeekStart] = useState(getMonday(today));

  // Index jornadas by their fecha (YYYY-MM-DD)
  const jornadasByDate = jornadas.reduce((acc, j) => {
    const key = j.fecha; // already YYYY-MM-DD from Supabase
    if (!acc[key]) acc[key] = [];
    acc[key].push(j);
    return acc;
  }, {});

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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-base font-semibold text-gray-800 min-w-[200px] text-center">{title}</h3>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            Hoy
          </button>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
          <button
            onClick={() => setCalView('month')}
            className={`px-3 py-1.5 transition ${calView === 'month' ? 'bg-black text-yellow-400' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Mes
          </button>
          <button
            onClick={() => setCalView('week')}
            className={`px-3 py-1.5 border-l border-gray-300 transition ${calView === 'week' ? 'bg-black text-yellow-400' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Ganamos</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Perdimos</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Empate</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" /> Sin resultado</span>
        <span className="text-gray-400">— Dots: {CATEGORIAS_PARTIDO.join(' · ')}</span>
      </div>

      {/* Calendar */}
      {calView === 'month' ? (
        <MonthView
          year={currentDate.getFullYear()}
          month={currentDate.getMonth()}
          jornadasByDate={jornadasByDate}
          onJornadaClick={onJornadaClick}
        />
      ) : (
        <WeekView
          weekStart={weekStart}
          jornadasByDate={jornadasByDate}
          onJornadaClick={onJornadaClick}
        />
      )}
    </div>
  );
};
