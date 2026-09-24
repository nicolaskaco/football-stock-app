import React, { useMemo } from 'react';
import { Flame, ShieldCheck, Trophy, AlertTriangle } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import {
  buildPlayerMatchLog,
  getTotales, getTramos, getTiempos, getMinutoPromedioGol,
  getRecord, getCuandoMarca, getPorTipo, getConTarjeta,
  getPorEscenario, getPorCesped, getCombinaciones, getPorRival,
  getRachas, getHitos, getDisciplina, getCategoriasJugadas,
  AMARILLAS_PARA_SUSPENSION,
  fmtPct, fmtRatio, fmtMinuto,
} from '../../utils/playerStats';
import { StatCard, PctStatCard, PctInline, RecordBar, FichaSection, SinMinutoNota } from './StatCard';
import { GolesPorTramoChart } from '../charts/GolesPorTramoChart';

const cardCls = 'bg-white rounded-lg shadow p-4';

/** Tabla chica reutilizada por los bloques de cruces. */
const CruceTable = ({ rows, minMuestra, primeraColumna = 'Contexto' }) => (
  <div className={`${cardCls} overflow-x-auto p-0`}>
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <tr>
          <th className="px-4 py-2">{primeraColumna}</th>
          <th className="px-4 py-2 text-center">PJ</th>
          <th className="px-4 py-2 text-center">G-E-P</th>
          <th className="px-4 py-2 text-center">% Victorias</th>
          <th className="px-4 py-2 text-center">Goles</th>
          <th className="px-4 py-2 text-center">G/PJ</th>
          <th className="px-4 py-2 text-center">🟨</th>
          <th className="px-4 py-2 text-center">🟥</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.key} className="hover:bg-gray-50 transition">
            <td className="px-4 py-2 font-medium text-gray-800">{r.label}</td>
            <td className="px-4 py-2 text-center">{r.pjTotal}</td>
            <td className="px-4 py-2 text-center text-gray-600">
              {r.record.pj > 0 ? `${r.record.g}-${r.record.e}-${r.record.p}` : '—'}
            </td>
            <td className="px-4 py-2 text-center">
              <PctInline pct={r.record.pctVictorias} n={r.record.pj} minMuestra={minMuestra} />
            </td>
            <td className="px-4 py-2 text-center font-semibold">{r.goles}</td>
            <td className="px-4 py-2 text-center">{fmtRatio(r.golesPorPartido)}</td>
            <td className="px-4 py-2 text-center">{r.amarillas}</td>
            <td className="px-4 py-2 text-center">{r.rojas}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">Sin datos</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

function RachaCard({ icon, label, actual, maxima }) {
  return (
    <div className={cardCls}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {icon}
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{actual}</p>
      <p className="text-xs text-gray-400 mt-0.5">Máxima: {maxima}</p>
    </div>
  );
}

export const PlayerFichaView = ({
  player,
  jornadas = [],
  categoria = null,
  year = null,
  minMuestra = 5,
  yellowCounts = null,
  suspensions = null,
}) => {
  const log = useMemo(
    () => buildPlayerMatchLog(jornadas, player.id, { categoria, year }),
    [jornadas, player.id, categoria, year]
  );

  const stats = useMemo(() => {
    if (log.length === 0) return null;
    return {
      totales: getTotales(log),
      tramos: getTramos(log),
      tiempos: getTiempos(log),
      minutoPromedio: getMinutoPromedioGol(log),
      record: getRecord(log),
      cuandoMarca: getCuandoMarca(log),
      porTipo: getPorTipo(log),
      conTarjeta: getConTarjeta(log),
      porEscenario: getPorEscenario(log),
      porCesped: getPorCesped(log),
      combinaciones: getCombinaciones(log),
      porRival: getPorRival(log),
      rachas: getRachas(log),
      hitos: getHitos(log),
      categoriasJugadas: getCategoriasJugadas(log),
    };
  }, [log]);

  const disciplina = useMemo(() => {
    if (!stats) return [];
    return getDisciplina(yellowCounts, suspensions, player.id, stats.categoriasJugadas);
  }, [yellowCounts, suspensions, player.id, stats]);

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500">
          {player.name_visual || player.name} no tiene partidos registrados con los filtros actuales.
        </p>
      </div>
    );
  }

  const { totales, tramos, tiempos, minutoPromedio, record, cuandoMarca, porTipo,
          conTarjeta, porEscenario, porCesped, combinaciones, porRival, rachas, hitos } = stats;

  const tarjetasTramos = Object.fromEntries(
    Object.keys(tramos.amarillas).map((k) => [k, tramos.amarillas[k] + tramos.rojas[k]])
  );

  return (
    <div className="space-y-8">
      {/* ── Encabezado ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-black text-yellow-400 flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {(player.name_visual || player.name || '?').charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{player.name_visual || player.name}</h2>
          <p className="text-sm text-gray-500">
            {stats.categoriasJugadas.join(' / ') || '—'}
            {player.posicion ? ` · ${player.posicion}` : ''}
            {` · ${totales.pj} ${totales.pj === 1 ? 'partido' : 'partidos'}`}
          </p>
        </div>
      </div>

      {/* ── Lo básico ──────────────────────────────────────────────── */}
      <FichaSection title="Lo básico">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Partidos" value={totales.pj} />
          <StatCard label="Goles" value={totales.goles} tone="green" />
          <StatCard label="Goles / Partido" value={fmtRatio(totales.golesPorPartido)} />
          <StatCard label="Amarillas" value={totales.amarillas} tone="yellow" />
          <StatCard label="Rojas" value={totales.rojas} tone="red" />
          <StatCard
            label="% Titularidad"
            value={fmtPct(totales.pctTitularidad)}
            sub={`${totales.titular} titular · ${totales.suplente} suplente`}
          />
        </div>
      </FichaSection>

      {/* ── Por minuto ─────────────────────────────────────────────── */}
      <FichaSection
        title="Análisis por minuto"
        description="Solo se incluyen los eventos que tienen el minuto cargado en el partido."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GolesPorTramoChart series={[{ name: 'Goles', tramos: tramos.goles }]} />
          <GolesPorTramoChart
            series={[{ name: 'Tarjetas', tramos: tarjetasTramos }]}
            title="Tarjetas por Tramo del Partido"
          />
        </div>
        <SinMinutoNota n={tramos.golesSinMinuto} sustantivo="goles" />
        <SinMinutoNota n={tramos.tarjetasSinMinuto} sustantivo="tarjetas" />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Goles 1er Tiempo" value={tiempos.golesPrimer} />
          <StatCard label="Goles 2do Tiempo" value={tiempos.golesSegundo} />
          <StatCard label="Tarjetas 1er T." value={tiempos.tarjetasPrimer} />
          <StatCard label="Tarjetas 2do T." value={tiempos.tarjetasSegundo} />
          <StatCard
            label="Minuto Promedio de Gol"
            value={fmtMinuto(minutoPromedio.promedio)}
            sub={minutoPromedio.n > 0 ? `sobre ${minutoPromedio.n} goles` : 'sin minutos cargados'}
          />
        </div>
      </FichaSection>

      {/* ── Cruces con el resultado ────────────────────────────────── */}
      <FichaSection
        title="Cruces con el resultado"
        description="Solo cuentan los partidos que tienen el marcador cargado."
      >
        <div className={cardCls}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Récord del equipo con él en cancha
          </p>
          <RecordBar record={record} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <PctStatCard label="% Victorias cuando marca"    pct={cuandoMarca.conGol.pctVictorias}    n={cuandoMarca.conGol.pj}    minMuestra={minMuestra} />
          <PctStatCard label="% Victorias cuando no marca" pct={cuandoMarca.sinGol.pctVictorias}    n={cuandoMarca.sinGol.pj}    minMuestra={minMuestra} />
          <PctStatCard label="% Victorias de titular"      pct={porTipo.titular.pctVictorias}       n={porTipo.titular.pj}       minMuestra={minMuestra} />
          <PctStatCard label="% Victorias de suplente"     pct={porTipo.suplente.pctVictorias}      n={porTipo.suplente.pj}      minMuestra={minMuestra} />
          <PctStatCard label="% Victorias con tarjeta"     pct={conTarjeta.conTarjeta.pctVictorias} n={conTarjeta.conTarjeta.pj} minMuestra={minMuestra} />
          <PctStatCard label="% Victorias sin tarjeta"     pct={conTarjeta.sinTarjeta.pctVictorias} n={conTarjeta.sinTarjeta.pj} minMuestra={minMuestra} />
        </div>
      </FichaSection>

      {/* ── Cruces con el contexto ─────────────────────────────────── */}
      <FichaSection title="Cruces con el contexto">
        <CruceTable
          primeraColumna="Escenario"
          minMuestra={minMuestra}
          rows={Object.entries(porEscenario).map(([k, v]) => ({ key: k, label: k, ...v }))}
        />
        <CruceTable
          primeraColumna="Césped"
          minMuestra={minMuestra}
          rows={Object.entries(porCesped).map(([k, v]) => ({ key: k, label: k, ...v }))}
        />
        {combinaciones.length > 0 && (
          <CruceTable primeraColumna="Combinación" minMuestra={minMuestra} rows={combinaciones} />
        )}
        <CruceTable
          primeraColumna="Rival"
          minMuestra={minMuestra}
          rows={porRival.map((r) => ({ ...r, label: r.rival }))}
        />
      </FichaSection>

      {/* ── Rachas y logros ────────────────────────────────────────── */}
      <FichaSection
        title="Rachas y logros"
        description="La racha actual se cuenta desde el último partido hacia atrás."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RachaCard icon={<Flame className="w-3.5 h-3.5 text-orange-500" />}       label="Partidos seguidos con gol"     actual={rachas.conGol.actual}     maxima={rachas.conGol.maxima} />
          <RachaCard icon={<ShieldCheck className="w-3.5 h-3.5 text-green-600" />}  label="Partidos seguidos sin tarjeta" actual={rachas.sinTarjeta.actual} maxima={rachas.sinTarjeta.maxima} />
          <RachaCard icon={<Trophy className="w-3.5 h-3.5 text-yellow-500" />}      label="Partidos invicto en cancha"    actual={rachas.invicto.actual}    maxima={rachas.invicto.maxima} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Dobletes" value={hitos.dobletes} />
          <StatCard label="Hat-tricks" value={hitos.hatTricks} />
          <StatCard label="Goles desde el banco" value={hitos.golesDesdeBanco} />
          <StatCard
            label="Próximo hito"
            value={hitos.proximoHito ? `Gol ${hitos.proximoHito}` : '—'}
            sub={hitos.proximoHito ? `faltan ${hitos.proximoHito - hitos.totalGoles}` : 'todos alcanzados'}
          />
        </div>

        {hitos.golesMilestone.length > 0 && (
          <div className={`${cardCls} space-y-2`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hitos alcanzados</p>
            {hitos.golesMilestone.map((h) => (
              <p key={h.hito} className="text-sm text-gray-700">
                <span className="font-bold text-yellow-600">Gol {h.hito}</span>
                {' · '}{formatDate(h.fecha)} vs. {h.rival} ({h.categoria})
              </p>
            ))}
          </div>
        )}
      </FichaSection>

      {/* ── Disciplina ─────────────────────────────────────────────── */}
      <FichaSection
        title="Disciplina"
        description={`Contador vigente de amarillas del año en curso (se resetea con cada roja y a la ${AMARILLAS_PARA_SUSPENSION}ª). No depende del filtro de año.`}
      >
        {disciplina.length === 0 ? (
          <div className={`${cardCls} text-center text-gray-400 text-sm py-6`}>
            Sin amarillas acumuladas este año.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {disciplina.map((d) => (
              <div key={d.categoria} className={cardCls}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{d.categoria}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {d.amarillas}<span className="text-base text-gray-400">/{AMARILLAS_PARA_SUSPENSION}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {d.faltan === 0
                    ? 'Contador en el límite'
                    : `Faltan ${d.faltan} para la suspensión`}
                </p>
                {d.suspension && (
                  <p className="flex items-center gap-1 text-xs font-bold text-red-600 mt-2">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    Suspendido — {d.suspension.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </FichaSection>
    </div>
  );
};
