import { POSICION_FICHA_A_PARTIDO } from './constants';

const HISTORIAL_PARTIDOS = 5;

/**
 * Posición más frecuente de cada jugador como titular en sus últimos 5 partidos
 * (empate → la más reciente). Usa las jornadas ya cargadas en App.jsx.
 * @returns {Map<string, string>} player_id → posición de partido
 */
export function posicionesHistorial(jornadas = [], excludePartidoId = null) {
  const apariciones = []; // { player_id, posicion, fecha }
  jornadas.forEach((j) => {
    (j.partidos || []).forEach((p) => {
      if (p.id === excludePartidoId) return;
      const fecha = p.fecha || j.fecha || '';
      (p.partido_players || []).forEach((pp) => {
        if (pp.tipo === 'titular' && pp.posicion && pp.player_id) {
          apariciones.push({ player_id: pp.player_id, posicion: pp.posicion, fecha });
        }
      });
    });
  });
  apariciones.sort((a, b) => b.fecha.localeCompare(a.fecha));

  const porJugador = new Map(); // player_id → posiciones, de la más reciente a la más vieja
  apariciones.forEach(({ player_id, posicion }) => {
    const lista = porJugador.get(player_id) || [];
    if (lista.length < HISTORIAL_PARTIDOS) porJugador.set(player_id, [...lista, posicion]);
  });

  const result = new Map();
  porJugador.forEach((lista, player_id) => {
    const cuenta = new Map();
    lista.forEach((pos) => cuenta.set(pos, (cuenta.get(pos) || 0) + 1));
    const max = Math.max(...cuenta.values());
    // La lista va de más reciente a más vieja: el primero con el máximo gana el empate
    result.set(player_id, lista.find((pos) => cuenta.get(pos) === max));
  });
  return result;
}

/**
 * Sugiere la posición de cada titular importado:
 * 1. la que ya tenía en este partido, 2. el historial, 3. la ficha del jugador
 * (primera candidata libre de POSICION_FICHA_A_PARTIDO).
 * @param {string[]} playerIds  titulares en orden ('' si el slot no tiene jugador)
 * @returns {Array<{ posicion: string, origen: 'partido'|'historial'|'ficha'|null }>}
 */
export function sugerirPosiciones(playerIds, { prevPosicion = new Map(), historial = new Map(), playersById = new Map() }) {
  const result = playerIds.map((id) => {
    if (!id) return { posicion: '', origen: null };
    if (prevPosicion.get(id)) return { posicion: prevPosicion.get(id), origen: 'partido' };
    if (historial.get(id)) return { posicion: historial.get(id), origen: 'historial' };
    return null;
  });

  const ocupadas = new Set(result.filter((r) => r?.posicion).map((r) => r.posicion));
  return result.map((r, i) => {
    if (r) return r;
    const candidatas = POSICION_FICHA_A_PARTIDO[playersById.get(playerIds[i])?.posicion];
    if (!candidatas) return { posicion: '', origen: null };
    const posicion = candidatas.find((c) => !ocupadas.has(c)) || candidatas[0];
    ocupadas.add(posicion);
    return { posicion, origen: 'ficha' };
  });
}
