import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Users } from 'lucide-react';
import { CATEGORIAS_PARTIDO } from '../utils/constants';
import { getYellowCountsByCategory, getCurrentSuspensionsByCategory } from '../utils/suspensions';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { SearchInput } from './ui/SearchInput';
import { FilterButtonGroup } from './ui/FilterButtonGroup';
import { PlayerFichaView } from './playerstats/PlayerFichaView';
import { PlayerCompareView } from './playerstats/PlayerCompareView';

const MAX_SELECCION = 3;
const MIN_MUESTRA_DEFAULT = 5;

/**
 * Estadísticas Jugadores.
 *
 * Buscá un jugador para ver su ficha completa, o seleccioná 2-3 para
 * compararlos lado a lado. Todo se computa en el browser desde el payload de
 * `jornadas` (mismo patrón que EstadisticasTab): no hay queries propias.
 *
 * El estado vive en la URL (`ej_cat`, `ej_year`, `ej_q`, `ej_p`) para que la
 * vista sea compartible y sobreviva a un refresh.
 */
export const EstadisticasJugadoresTab = ({
  jornadas = [],
  players = [],
  appSettings = {},
  currentUser,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const setParam = (key, value, defaultValue) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (value === null || value === undefined || value === defaultValue || value === '') p.delete(key);
      else p.set(key, String(value));
      return p;
    });
  };

  const filterCat  = searchParams.get('ej_cat') || null;
  const filterYear = searchParams.get('ej_year') || null;
  const searchTerm = searchParams.get('ej_q') || '';
  const selectedIds = useMemo(
    () => (searchParams.get('ej_p') || '').split(',').filter(Boolean),
    [searchParams]
  );

  const [inputValue, setInputValue] = useDebouncedSearch(searchTerm, (v) => setParam('ej_q', v, ''));

  const minMuestra = Number(appSettings.stats_min_muestra) || MIN_MUESTRA_DEFAULT;

  // ── Años disponibles ──────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years = [...new Set(
      jornadas.map((j) => (j.fecha ? new Date(j.fecha).getFullYear() : null)).filter(Boolean)
    )].sort((a, b) => b - a);
    if (!years.includes(currentYear)) years.unshift(currentYear);
    return years;
  }, [jornadas, currentYear]);

  // ── Scoping por categoría del usuario ─────────────────────────────
  const visibleCats = useMemo(() => {
    if (!currentUser?.categoria || currentUser.categoria.length === 0) return CATEGORIAS_PARTIDO;
    return CATEGORIAS_PARTIDO.filter((c) => currentUser.categoria.includes(c));
  }, [currentUser]);

  /**
   * Jugadores con al menos un partido disputado, y la(s) categoría(s) en las
   * que jugaron. Se arma en una sola pasada por `jornadas` — la lista de
   * búsqueda no debe ofrecer jugadores sin partidos.
   */
  const playersConPartidos = useMemo(() => {
    const catsPorJugador = new Map();

    jornadas.forEach((j) => {
      const year = j.fecha ? new Date(j.fecha).getFullYear() : null;
      if (filterYear && year !== Number(filterYear)) return;
      (j.partidos || []).forEach((partido) => {
        if (filterCat && partido.categoria !== filterCat) return;
        (partido.partido_players || []).forEach((pp) => {
          if (!pp.player_id) return;
          if (!catsPorJugador.has(pp.player_id)) catsPorJugador.set(pp.player_id, new Set());
          catsPorJugador.get(pp.player_id).add(partido.categoria);
        });
      });
    });

    return players
      .filter((p) => catsPorJugador.has(p.id))
      .map((p) => ({
        ...p,
        categoriasJugadas: CATEGORIAS_PARTIDO.filter((c) => catsPorJugador.get(p.id).has(c)),
      }))
      // El usuario solo ve jugadores que disputaron partidos en sus categorías.
      .filter((p) => p.categoriasJugadas.some((c) => visibleCats.includes(c)));
  }, [jornadas, players, filterCat, filterYear, visibleCats]);

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return playersConPartidos
      .filter((p) => (p.name_visual || p.name || '').toLowerCase().includes(term))
      .slice(0, 30);
  }, [playersConPartidos, searchTerm]);

  const selectedPlayers = useMemo(
    () => selectedIds.map((id) => players.find((p) => p.id === id)).filter(Boolean),
    [selectedIds, players]
  );

  // ── Disciplina: se calcula una sola vez y se pasa a la ficha ──────
  const yellowCounts = useMemo(() => getYellowCountsByCategory(jornadas), [jornadas]);
  const suspensions  = useMemo(() => getCurrentSuspensionsByCategory(jornadas), [jornadas]);

  // ── Selección ─────────────────────────────────────────────────────
  const toggleSelected = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : selectedIds.length >= MAX_SELECCION
        ? selectedIds
        : [...selectedIds, id];
    setParam('ej_p', next.join(','), '');
  };

  const clearSeleccion = () => setParam('ej_p', '', '');

  const nombreDe = (p) => p.name_visual || p.name;

  return (
    <div className="space-y-6">
      {/* ── Encabezado ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Estadísticas Jugadores</h2>
          <p className="text-sm text-gray-500">
            Buscá un jugador para ver su ficha completa, o elegí hasta {MAX_SELECCION} para compararlos.
          </p>
        </div>
      </div>

      {/* ── Filtros ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <SearchInput
          value={inputValue}
          onChange={setInputValue}
          placeholder="Buscar jugador por nombre…"
          className="w-full"
        />
        <div className="flex flex-wrap gap-4">
          <FilterButtonGroup
            label="Categoría:"
            options={visibleCats}
            value={filterCat}
            onChange={(v) => setParam('ej_cat', v, null)}
          />
          <FilterButtonGroup
            label="Año:"
            options={availableYears.map(String)}
            value={filterYear}
            onChange={(v) => setParam('ej_year', v, null)}
            allLabel="Todos"
          />
        </div>
      </div>

      {/* ── Resultados de búsqueda ─────────────────────────────────── */}
      {searchTerm.trim() && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {searchResults.length === 0 ? (
            <p className="p-6 text-center text-gray-400 text-sm">
              Ningún jugador con partidos coincide con “{searchTerm}” en estos filtros.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {searchResults.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                const isFull = !isSelected && selectedIds.length >= MAX_SELECCION;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => toggleSelected(p.id)}
                      disabled={isFull}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition ${
                        isSelected ? 'bg-yellow-50' : isFull ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-800">{nombreDe(p)}</span>
                      <span className="text-xs text-gray-400">
                        {p.categoriasJugadas.join(' / ')}
                        {isSelected && <span className="ml-2 font-bold text-yellow-600">Seleccionado</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── Chips de selección ─────────────────────────────────────── */}
      {selectedPlayers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Seleccionados:</span>
          {selectedPlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => toggleSelected(p.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-yellow-400 text-sm font-medium"
            >
              {nombreDe(p)}
              <X className="w-3.5 h-3.5" />
            </button>
          ))}
          <button onClick={clearSeleccion} className="text-xs text-gray-500 underline hover:text-gray-700">
            Limpiar
          </button>
        </div>
      )}

      {/* ── Contenido ──────────────────────────────────────────────── */}
      {selectedPlayers.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            Buscá un jugador arriba para ver su ficha, o seleccioná 2 o 3 para compararlos.
          </p>
        </div>
      )}

      {selectedPlayers.length === 1 && (
        <PlayerFichaView
          player={selectedPlayers[0]}
          jornadas={jornadas}
          categoria={filterCat}
          year={filterYear}
          minMuestra={minMuestra}
          yellowCounts={yellowCounts}
          suspensions={suspensions}
        />
      )}

      {selectedPlayers.length > 1 && (
        <PlayerCompareView
          players={selectedPlayers}
          jornadas={jornadas}
          categoria={filterCat}
          year={filterYear}
          minMuestra={minMuestra}
        />
      )}
    </div>
  );
};
