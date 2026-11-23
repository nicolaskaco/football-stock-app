// Fixtures mínimas con la forma del payload de database.getJornadas().

let seq = 0;
const id = (prefix) => `${prefix}-${++seq}`;

/** Una jornada con un solo partido de `categoria`. */
export function jornada({ fecha, numero = 1, categoria = '5ta', eventos = [], players = [], goles = [null, null], escenario = 'Local', ajustes = [], fechaPartido = null, rival = 'Nacional' } = {}) {
  const jornadaId = id('j');
  return {
    id: jornadaId,
    fecha,
    numero_jornada: numero,
    fase: 'Apertura',
    rival_id: `r-${rival}`,
    rivales: { name: rival },
    partidos: [{
      id: id('p'),
      jornada_id: jornadaId,
      categoria,
      escenario,
      fecha: fechaPartido,
      goles_local: goles[0],
      goles_visitante: goles[1],
      partido_eventos: eventos,
      partido_players: players,
      partido_suspension_ajustes: ajustes,
    }],
  };
}

export const amarilla = (player_id) => ({ tipo: 'amarilla', player_id, minuto: null });
export const roja = (player_id, fechas_suspension = 1) => ({ tipo: 'roja', player_id, minuto: null, fechas_suspension });
export const gol = (player_id, minuto = null) => ({ tipo: 'gol', player_id, minuto });
export const titular = (player_id) => ({ player_id, tipo: 'titular' });
export const suplente = (player_id, minuto_entrada = null) => ({ player_id, tipo: 'suplente', minuto_entrada });
