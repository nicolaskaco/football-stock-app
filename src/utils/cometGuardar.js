import { database } from './database';

/**
 * Guarda en orden los partidos armados desde informes COMET (ver armarGuardado en cometLote.js):
 * la planilla con updatePartido (sin tocar los ajustes de suspensión), los COMET ID aprendidos
 * de cada partido y un registro en Actividad por partido.
 *
 * @param lista  [{ partido, archivo, data, titularesData, suplentesData, eventosData, cometIds }]
 * @returns {Promise<string[]>} categorías guardadas
 * @throws Error con la categoría que falló; `error.guardados` lista las que ya quedaron guardadas
 */
export async function guardarImportComet(lista, { jornada, currentUser, automatico = false, historico = false }) {
  const guardados = [];
  const idsGuardados = new Set();
  for (const { partido, archivo, data, titularesData, suplentesData, eventosData, cometIds } of lista) {
    try {
      await database.updatePartido(partido.id, data, titularesData, suplentesData, eventosData, null);
      guardados.push(partido.categoria);
      // IDs de este partido sin los ya guardados por un informe anterior (un ID por jugador)
      const nuevos = cometIds.filter((c) => !idsGuardados.has(c.player_id));
      if (nuevos.length > 0) {
        await database.setPlayersCometIds(nuevos);
        nuevos.forEach((c) => idsGuardados.add(c.player_id));
      }
      database.logActivity('import_planilla_comet', currentUser?.email, 'partido', partido.id, {
        categoria: partido.categoria,
        rival: jornada.rivales?.name || null,
        comet_ids_nuevos: nuevos.length,
        masivo: true,
        ...(automatico ? { automatico: true } : {}),
        ...(historico ? { historico: true } : {}),
        archivo,
      });
    } catch (err) {
      const error = new Error(`${partido.categoria}: ${err.message}`, { cause: err });
      error.guardados = guardados;
      throw error;
    }
  }
  return guardados;
}
