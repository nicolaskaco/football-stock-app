import React, { useState } from 'react';
import { X } from 'lucide-react';
import { POSICIONES_PARTIDO, ESCENARIOS, CESPED_TIPOS, CANCHAS_LOCAL, CATEGORIAS_PARTIDO, CATEGORIAS } from '../utils/constants';

const MAX_TITULARES = 11;
const MAX_SUPLENTES = 10;

const emptySlot = () => ({ player_id: '', posicion: '' });

export const PartidoForm = ({ partido, players = [], injuries = [], onSubmit }) => {
  const categoria = partido?.categoria || '';

  // Build active injury map
  const activeInjuryMap = {};
  injuries.forEach(inj => {
    if (!inj.fecha_alta && !activeInjuryMap[inj.player_id]) activeInjuryMap[inj.player_id] = inj;
  });

  // Datos básicos del partido
  const [formData, setFormData] = useState({
    escenario: partido?.escenario || '',
    cesped: partido?.cesped || 'Natural',
    cancha: partido?.cancha || 'Ciudad Deportiva',
    goles_local: partido?.goles_local ?? '',
    goles_visitante: partido?.goles_visitante ?? '',
    comentario: partido?.comentario || '',
  });

  // Construir slots iniciales desde partido_players existentes
  const buildInitialTitulares = () => {
    const existing = (partido?.partido_players || [])
      .filter((pp) => pp.tipo === 'titular')
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const slots = existing.map((pp) => ({
      player_id: pp.player_id || pp.players?.id || '',
      posicion: pp.posicion || '',
    }));
    while (slots.length < MAX_TITULARES) slots.push(emptySlot());
    return slots;
  };

  const buildInitialSuplentes = () => {
    const existing = (partido?.partido_players || [])
      .filter((pp) => pp.tipo === 'suplente')
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const slots = existing.map((pp) => ({
      player_id: pp.player_id || pp.players?.id || '',
    }));
    while (slots.length < MAX_SUPLENTES) slots.push({ player_id: '' });
    return slots;
  };

  const [titulares, setTitulares] = useState(buildInitialTitulares);
  const [suplentes, setSuplentes] = useState(buildInitialSuplentes);

  // Eventos: mapa player_id → { goles, amarilla, roja }
  const buildInitialEventos = () => {
    const map = {};
    (partido?.partido_eventos || []).forEach((e) => {
      if (!map[e.player_id]) map[e.player_id] = { goles: 0, amarilla: false, roja: false };
      if (e.tipo === 'gol')      map[e.player_id].goles++;
      if (e.tipo === 'amarilla') map[e.player_id].amarilla = true;
      if (e.tipo === 'roja')     map[e.player_id].roja = true;
    });
    return map;
  };
  const [eventosState, setEventosState] = useState(buildInitialEventos);

  const updateEvento = (player_id, field, value) =>
    setEventosState((prev) => ({
      ...prev,
      [player_id]: { goles: 0, amarilla: false, roja: false, ...prev[player_id], [field]: value },
    }));

  // Filtro de categorías: por defecto solo la del partido
  const [categoriasActivas, setCategoriasActivas] = useState([categoria]);

  const toggleCategoria = (cat) => {
    setCategoriasActivas((prev) =>
      prev.includes(cat)
        ? prev.length === 1 ? prev : prev.filter((c) => c !== cat) // al menos una activa
        : [...prev, cat]
    );
  };

  // Jugadores filtrados según las categorías activas
  const jugadoresCategoria = players
    .filter((p) => categoriasActivas.includes(p.categoria))
    .sort((a, b) => {
      // Primero los de la categoría propia, luego el resto por categoría
      const aPropia = a.categoria === categoria ? 0 : 1;
      const bPropia = b.categoria === categoria ? 0 : 1;
      if (aPropia !== bPropia) return aPropia - bPropia;
      return (a.name_visual || a.name).localeCompare(b.name_visual || b.name);
    });

  // Para slots pre-cargados con jugadores de otra categoría, inyectar solo ese jugador
  const getOptionsForSlot = (currentPlayerId) => {
    if (!currentPlayerId) return jugadoresCategoria;
    if (jugadoresCategoria.some((p) => p.id === currentPlayerId)) return jugadoresCategoria;
    const savedPlayer = players.find((p) => p.id === currentPlayerId);
    return savedPlayer ? [...jugadoresCategoria, savedPlayer] : jugadoresCategoria;
  };

  // IDs ya usados en titulares o suplentes (para evitar duplicados)
  const usedIds = new Set([
    ...titulares.map((t) => t.player_id),
    ...suplentes.map((s) => s.player_id),
  ].filter(Boolean));

  const updateTitular = (index, field, value) => {
    setTitulares((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const updateSuplente = (index, value) => {
    setSuplentes((prev) => prev.map((s, i) => (i === index ? { player_id: value } : s)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const titularesData = titulares
      .map((t, i) => ({ player_id: t.player_id, posicion: t.posicion, orden: i + 1 }))
      .filter((t) => t.player_id);
    const suplentesData = suplentes
      .map((s, i) => ({ player_id: s.player_id, orden: i + 1 }))
      .filter((s) => s.player_id);

    const data = {
      ...formData,
      cancha: formData.escenario === 'Local' ? formData.cancha : null,
      goles_local: formData.goles_local === '' ? null : Number(formData.goles_local),
      goles_visitante: formData.goles_visitante === '' ? null : Number(formData.goles_visitante),
    };

    const lineupIds = new Set([
      ...titularesData.map((t) => t.player_id),
      ...suplentesData.map((s) => s.player_id),
    ]);
    const eventosData = [];
    Object.entries(eventosState).forEach(([player_id, stats]) => {
      if (!lineupIds.has(player_id)) return;
      for (let i = 0; i < (stats.goles || 0); i++)
        eventosData.push({ player_id, tipo: 'gol' });
      if (stats.amarilla) eventosData.push({ player_id, tipo: 'amarilla' });
      if (stats.roja)     eventosData.push({ player_id, tipo: 'roja' });
    });

    onSubmit(data, titularesData, suplentesData, eventosData);
  };

  const titularesCount = titulares.filter((t) => t.player_id).length;
  const suplentesCount = suplentes.filter((s) => s.player_id).length;

  // Lista de convocados con player_id para la sección de eventos
  const convocados = [
    ...titulares.filter((t) => t.player_id).map((t) => ({ player_id: t.player_id, tipo: 'T' })),
    ...suplentes.filter((s) => s.player_id).map((s) => ({ player_id: s.player_id, tipo: 'S' })),
  ];

  const getPlayerName = (player_id) => {
    const p = players.find((pl) => pl.id === player_id);
    return p?.name_visual || p?.name || '—';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Info del partido */}
      <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
        <span className="font-bold text-lg text-gray-800">{categoria}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          formData.escenario === 'Local' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>{formData.escenario || '—'}</span>
      </div>

      {/* Filtro de categorías de jugadores */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">
          Mostrar jugadores de:
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.filter((c) => c !== 'Sub13').map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategoria(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                categoriasActivas.includes(cat)
                  ? cat === categoria
                    ? 'bg-black text-yellow-400 border-black'
                    : 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
              }`}
            >
              {cat}
              {cat === categoria && <span className="ml-1 opacity-60">(esta)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Escenario y Césped */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Escenario</label>
          <select
            value={formData.escenario}
            onChange={(e) => setFormData({ ...formData, escenario: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {ESCENARIOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Césped</label>
          <select
            value={formData.cesped}
            onChange={(e) => setFormData({ ...formData, cesped: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {CESPED_TIPOS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Cancha (solo Local) */}
      {formData.escenario === 'Local' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cancha</label>
          <select
            value={formData.cancha}
            onChange={(e) => setFormData({ ...formData, cancha: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {CANCHAS_LOCAL.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Resultado */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Resultado <span className="text-gray-400 font-normal">(completar luego del partido)</span>
        </label>
        <div className="flex items-center gap-3">
          {/* Peñarol siempre a la izquierda — el campo real depende del escenario */}
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1 text-center">Peñarol</p>
            <input
              type="number"
              min="0"
              placeholder="—"
              value={formData.escenario === 'Local' ? formData.goles_local : formData.goles_visitante}
              onChange={(e) =>
                formData.escenario === 'Local'
                  ? setFormData({ ...formData, goles_local: e.target.value })
                  : setFormData({ ...formData, goles_visitante: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-center text-xl font-bold focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-2xl font-bold text-gray-400">—</span>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1 text-center">Rival</p>
            <input
              type="number"
              min="0"
              placeholder="—"
              value={formData.escenario === 'Local' ? formData.goles_visitante : formData.goles_local}
              onChange={(e) =>
                formData.escenario === 'Local'
                  ? setFormData({ ...formData, goles_visitante: e.target.value })
                  : setFormData({ ...formData, goles_local: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-center text-xl font-bold focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Comentario */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Comentario del partido</label>
        <textarea
          rows={3}
          placeholder="Observaciones, tácticas, lesiones…"
          value={formData.comentario}
          onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
        />
      </div>

      {/* Titulares */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">
            Titulares <span className="text-sm font-normal text-gray-500">({titularesCount}/{MAX_TITULARES})</span>
          </h3>
        </div>
        <div className="space-y-2">
          {titulares.map((t, i) => (
            <div key={i} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
              <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
              <select
                value={t.player_id}
                onChange={(e) => updateTitular(i, 'player_id', e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Jugador —</option>
                {getOptionsForSlot(t.player_id).map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={usedIds.has(p.id) && t.player_id !== p.id}
                  >
                    {activeInjuryMap[p.id] ? '🏥 ' : ''}{p.name_visual || p.name}{(p.categoria_juego || p.categoria) !== categoria ? ` (${p.categoria_juego || p.categoria})` : ''}{activeInjuryMap[p.id] ? ` — ${activeInjuryMap[p.id].tipo}` : ''}
                  </option>
                ))}
              </select>
              <select
                value={t.posicion}
                onChange={(e) => updateTitular(i, 'posicion', e.target.value)}
                className="w-full sm:w-44 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                disabled={!t.player_id}
              >
                <option value="">— Posición —</option>
                {POSICIONES_PARTIDO.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
              {t.player_id && (
                <button
                  type="button"
                  onClick={() => updateTitular(i, 'player_id', '') || updateTitular(i, 'posicion', '')}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Suplentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">
            Suplentes <span className="text-sm font-normal text-gray-500">({suplentesCount}/{MAX_SUPLENTES})</span>
          </h3>
        </div>
        <div className="space-y-2">
          {suplentes.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
              <select
                value={s.player_id}
                onChange={(e) => updateSuplente(i, e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Jugador —</option>
                {getOptionsForSlot(s.player_id).map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={usedIds.has(p.id) && s.player_id !== p.id}
                  >
                    {activeInjuryMap[p.id] ? '🏥 ' : ''}{p.name_visual || p.name}{(p.categoria_juego || p.categoria) !== categoria ? ` (${p.categoria_juego || p.categoria})` : ''}{activeInjuryMap[p.id] ? ` — ${activeInjuryMap[p.id].tipo}` : ''}
                  </option>
                ))}
              </select>
              {s.player_id && (
                <button
                  type="button"
                  onClick={() => updateSuplente(i, '')}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Goles y Tarjetas */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Goles y Tarjetas</h3>
        {convocados.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
            Cargá la convocatoria primero
          </p>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jugador</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Goles</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">🟨</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">🟥</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {convocados.map(({ player_id, tipo }) => {
                  const ev = eventosState[player_id] || { goles: 0, amarilla: false, roja: false };
                  return (
                    <tr key={player_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-800">{getPlayerName(player_id)}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-semibold ${tipo === 'T' ? 'bg-black text-yellow-400' : 'bg-gray-100 text-gray-600'}`}>
                          {tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateEvento(player_id, 'goles', Math.max(0, ev.goles - 1))}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center"
                          >−</button>
                          <span className="w-4 text-center font-semibold text-gray-800">{ev.goles}</span>
                          <button
                            type="button"
                            onClick={() => updateEvento(player_id, 'goles', ev.goles + 1)}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center"
                          >+</button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={ev.amarilla}
                          onChange={(e) => updateEvento(player_id, 'amarilla', e.target.checked)}
                          className="w-4 h-4 accent-yellow-400 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={ev.roja}
                          onChange={(e) => updateEvento(player_id, 'roja', e.target.checked)}
                          className="w-4 h-4 accent-red-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200"
      >
        Guardar Partido
      </button>
    </form>
  );
};
