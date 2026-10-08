/**
 * Cruza los jugadores de un informe COMET con la tabla `players`.
 *
 * 1. Por COMET ID (exacto).
 * 2. Por nombre: COMET escribe "APELLIDOS, NOMBRES" y en `players.name` el
 *    orden puede variar, así que se comparan conjuntos de palabras sin tildes.
 * 3. Sin match: se elige a mano en la vista previa.
 */

const normalizeWord = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const tokens = (name) =>
  new Set(
    String(name || '')
      .split(/[\s,.'-]+/)
      .map(normalizeWord)
      .filter((w) => w.length > 1)
  );

/**
 * Puntaje 0..1: qué parte de las palabras del informe aparecen en el nombre del
 * jugador, con peso doble para los apellidos (lo que va antes de la coma).
 */
function nameScore(cometNombre, player) {
  const [apellidos, nombres = ''] = cometNombre.split(',');
  const ap = tokens(apellidos);
  const no = tokens(nombres);
  const target = new Set([...tokens(player.name), ...tokens(player.name_visual)]);
  let hit = 0;
  ap.forEach((t) => { if (target.has(t)) hit += 2; });
  no.forEach((t) => { if (target.has(t)) hit += 1; });
  const total = ap.size * 2 + no.size;
  if (total === 0) return 0;
  // Sin ningún apellido en común no es el mismo jugador
  if (![...ap].some((t) => target.has(t))) return 0;
  return hit / total;
}

const MIN_SCORE = 0.5;
const AMBIGUITY_GAP = 0.15;

/**
 * @param {Array<{dorsal, nombre, cometId}>} rows
 * @param {Array} players  todos los jugadores (de App.jsx)
 * @param {string} categoria  categoría del partido
 * @returns rows con { player_id, status: 'id'|'nombre'|'dudoso'|'sin_match', candidatos }
 */
export function matchCometPlayers(rows, players, categoria) {
  const byCometId = new Map(players.filter((p) => p.comet_id).map((p) => [String(p.comet_id), p]));
  const usedIds = new Set();

  // Primero los matches por ID, así un match por nombre no les roba el jugador
  const result = rows.map((row) => {
    const p = byCometId.get(String(row.cometId));
    if (p) {
      usedIds.add(p.id);
      return { ...row, player_id: p.id, status: 'id', candidatos: [] };
    }
    return null;
  });

  return rows.map((row, i) => {
    if (result[i]) return result[i];

    const scored = players
      .filter((p) => !usedIds.has(p.id) && !(p.comet_id && String(p.comet_id) !== String(row.cometId)))
      .map((p) => {
        const propia = p.categoria === categoria || p.categoria_juego === categoria;
        // Pequeño empujón a la categoría del partido para desempatar homónimos
        return { player: p, score: nameScore(row.nombre, p) + (propia ? 0.05 : 0) };
      })
      .filter((s) => s.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return { ...row, player_id: '', status: 'sin_match', candidatos: [] };

    const [best, second] = scored;
    const ambiguo = second && best.score - second.score < AMBIGUITY_GAP;
    usedIds.add(best.player.id);
    return {
      ...row,
      player_id: best.player.id,
      status: ambiguo ? 'dudoso' : 'nombre',
      candidatos: scored.slice(0, 5).map((s) => s.player.id),
    };
  });
}
