import React, { useMemo } from 'react';
import { calculateAge } from '../utils/dateUtils';
import { calculateTotal } from '../utils/playerUtils';
import { CATEGORIAS_PARTIDO } from '../utils/constants';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3B82F6', '#EF4444', '#10B981'];

const buildPlayerStats = (jornadas, playerIds) => {
  const map = {};
  playerIds.forEach(id => {
    map[id] = { pj: 0, titular: 0, suplente: 0, goles: 0, amarillas: 0, rojas: 0 };
  });

  jornadas.forEach((jornada) => {
    (jornada.partidos || []).forEach((partido) => {
      (partido.partido_players || []).forEach((pp) => {
        if (!pp.player_id || !map[pp.player_id]) return;
        map[pp.player_id].pj++;
        if (pp.tipo === 'titular') map[pp.player_id].titular++;
        if (pp.tipo === 'suplente') map[pp.player_id].suplente++;
      });
      (partido.partido_eventos || []).forEach((e) => {
        if (!e.player_id || !map[e.player_id]) return;
        if (e.tipo === 'gol') map[e.player_id].goles++;
        if (e.tipo === 'amarilla') map[e.player_id].amarillas++;
        if (e.tipo === 'roja') map[e.player_id].rojas++;
      });
    });
  });

  return map;
};

const buildGoalTimeline = (jornadas, playerIds, playerNames) => {
  const data = [];

  jornadas
    .slice()
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .forEach((jornada) => {
      const label = jornada.numero_jornada || jornada.fecha;
      const point = { jornada: label };
      const accumulator = {};
      playerIds.forEach(id => { accumulator[id] = 0; });

      (jornada.partidos || []).forEach((partido) => {
        (partido.partido_eventos || []).forEach((e) => {
          if (e.tipo === 'gol' && accumulator[e.player_id] !== undefined) {
            accumulator[e.player_id]++;
          }
        });
      });

      let hasData = false;
      playerIds.forEach((id, i) => {
        point[playerNames[i]] = accumulator[id];
        if (accumulator[id] > 0) hasData = true;
      });

      if (hasData || data.length > 0) data.push(point);
    });

  return data;
};

const Row = ({ label, values, highlight, format }) => {
  const formatted = values.map(v => format ? format(v) : v);
  const best = highlight ? getBest(values, highlight) : null;

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2.5 pr-4 text-sm font-medium text-gray-500">{label}</td>
      {formatted.map((val, i) => (
        <td
          key={i}
          className={`py-2.5 px-3 text-sm text-center font-semibold ${best === i ? 'text-green-700 bg-green-50' : 'text-gray-900'}`}
        >
          {val}
        </td>
      ))}
    </tr>
  );
};

const getBest = (values, type) => {
  const nums = values.map(v => typeof v === 'number' ? v : parseFloat(v) || 0);
  if (nums.every(n => n === nums[0])) return null;
  if (type === 'max') return nums.indexOf(Math.max(...nums));
  if (type === 'min') return nums.indexOf(Math.min(...nums));
  return null;
};

const SectionHeader = ({ title }) => (
  <tr>
    <td colSpan={4} className="pt-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-yellow-400">
      {title}
    </td>
  </tr>
);

export const PlayerComparisonModal = ({ players = [], jornadas = [], injuries = [] }) => {
  const playerIds = players.map(p => p.id);
  const playerNames = players.map(p => p.name_visual || p.name);

  const stats = useMemo(() => buildPlayerStats(jornadas, playerIds), [jornadas, playerIds]);
  const goalTimeline = useMemo(() => buildGoalTimeline(jornadas, playerIds, playerNames), [jornadas, playerIds]);

  const activeInjuries = {};
  injuries.forEach(inj => {
    if (!inj.fecha_alta && playerIds.includes(inj.player_id)) {
      activeInjuries[inj.player_id] = inj;
    }
  });

  const fichaMedicaStatus = (hasta) => {
    if (!hasta) return 'Sin datos';
    const today = new Date();
    const exp = new Date(hasta + 'T00:00:00');
    if (exp < today) return 'Vencida';
    const diff = (exp - today) / (1000 * 60 * 60 * 24);
    if (diff <= 30) return 'Por vencer';
    return 'Vigente';
  };

  return (
    <div className="space-y-4">
      {/* Headers */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 pr-4 w-36"></th>
              {players.map((p, i) => (
                <th key={p.id} className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: COLORS[i] }}>
                      {(p.name_visual || p.name).charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{p.name_visual || p.name}</span>
                    <span className="text-xs text-gray-500">{p.categoria}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Personal */}
            <SectionHeader title="Datos Personales" />
            <Row label="Edad" values={players.map(p => calculateAge(p.date_of_birth))} highlight="max" />
            <Row label="Categoría" values={players.map(p => p.categoria || '—')} />
            <Row label="Posición" values={players.map(p => p.posicion || '—')} />
            <Row label="Departamento" values={players.map(p => p.departamento || '—')} />

            {/* Estado */}
            <SectionHeader title="Estado" />
            <Row label="Contrato" values={players.map(p => p.contrato ? 'Sí' : 'No')} />
            <Row label="Residencia" values={players.map(p => p.casita ? 'Sí' : 'No')} />
            <Row label="Ficha Médica" values={players.map(p => fichaMedicaStatus(p.ficha_medica_hasta))} />
            <Row
              label="Lesión"
              values={players.map(p => activeInjuries[p.id] ? `${activeInjuries[p.id].tipo} (${activeInjuries[p.id].severidad})` : 'Ninguna')}
            />

            {/* Financiero */}
            <SectionHeader title="Financiero" />
            <Row label="Viático" values={players.map(p => p.contrato ? 'Contrato' : p.viatico)} highlight="max" />
            <Row label="Complemento" values={players.map(p => p.contrato ? 'Contrato' : p.complemento)} highlight="max" />
            <Row
              label="Total"
              values={players.map(p => p.contrato ? 'Contrato' : calculateTotal(p))}
              highlight="max"
            />

            {/* Estadísticas */}
            <SectionHeader title="Estadísticas de Partido" />
            <Row label="PJ" values={playerIds.map(id => stats[id]?.pj || 0)} highlight="max" />
            <Row label="Titular" values={playerIds.map(id => stats[id]?.titular || 0)} highlight="max" />
            <Row label="Suplente" values={playerIds.map(id => stats[id]?.suplente || 0)} />
            <Row label="Goles" values={playerIds.map(id => stats[id]?.goles || 0)} highlight="max" />
            <Row label="Amarillas" values={playerIds.map(id => stats[id]?.amarillas || 0)} highlight="min" />
            <Row label="Rojas" values={playerIds.map(id => stats[id]?.rojas || 0)} highlight="min" />
            <Row
              label="G/PJ"
              values={playerIds.map(id => {
                const s = stats[id];
                return s && s.pj > 0 ? (s.goles / s.pj).toFixed(2) : '0.00';
              })}
              highlight="max"
            />
          </tbody>
        </table>
      </div>

      {/* Goal timeline chart */}
      {goalTimeline.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Goles por Jornada</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={goalTimeline} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis dataKey="jornada" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              {playerNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[i]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
