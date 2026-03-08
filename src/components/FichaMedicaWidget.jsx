import React, { useState, useEffect } from 'react';
import { Stethoscope, X, RefreshCw } from 'lucide-react';
import { database } from '../utils/database';

export const FichaMedicaWidget = ({ currentUser, onDataChange }) => {
  const [players, setPlayers] = useState([]);
  const [catFiltro, setCatFiltro] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);

  const fetchPlayers = () => {
    const categorias = currentUser?.categoria?.length > 0 ? currentUser.categoria : null;
    database.getPlayersWithExpiredFichaMedica(categorias)
      .then((data) => setPlayers(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleRefreshFicha = async () => {
    if (!selectedPlayer) return;
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const result = await database.checkFichaMedica(selectedPlayer.gov_id, selectedPlayer.tipo_documento);
      const fichaFutbol = (result?.fichas || []).find(
        (f) => f.deporte && ['FÚTBOL', 'FUTBOL'].includes(f.deporte.toUpperCase())
      );
      if (!fichaFutbol) {
        setRefreshResult({ ok: false, msg: 'No se encontró ficha de FÚTBOL en SND.' });
        return;
      }
      await database.saveFichaMedicaHasta(selectedPlayer.id, fichaFutbol.hasta);
      if (onDataChange) onDataChange('players');
      fetchPlayers();
      setSelectedPlayer((prev) => ({ ...prev, ficha_medica_hasta: fichaFutbol.hasta }));
      setRefreshResult({ ok: true, msg: `Actualizado: vence ${fichaFutbol.hasta}` });
    } catch (err) {
      setRefreshResult({ ok: false, msg: 'Error al consultar SND.' });
    } finally {
      setRefreshing(false);
    }
  };

  if (players.length === 0) return null;

  const CATEGORIA_ORDER = ['3era', '4ta', '5ta', 'S16', '6ta', '7ma'];
  const categorias = [...new Set(players.map((p) => p.categoria))].sort(
    (a, b) => {
      const ai = CATEGORIA_ORDER.indexOf(a);
      const bi = CATEGORIA_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    }
  );
  const filtered = catFiltro ? players.filter((p) => p.categoria === catFiltro) : players;
  const expiredCount = players.filter((p) => p.expired).length;
  const soonCount = players.filter((p) => p.expiringSoon).length;

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-bold">Ficha Médica</h3>
          <div className="ml-auto flex gap-1">
            {expiredCount > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
                {expiredCount} vencido{expiredCount !== 1 ? 's' : ''}
              </span>
            )}
            {soonCount > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
                {soonCount} próximo{soonCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Categoria filter pills */}
        <div className="flex flex-wrap gap-1 mb-3">
          <button
            onClick={() => setCatFiltro(null)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition ${!catFiltro ? 'bg-black text-yellow-400 border-black' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCatFiltro(cat === catFiltro ? null : cat)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition ${catFiltro === cat ? 'bg-black text-yellow-400 border-black' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-2 overflow-y-auto max-h-96 pr-1">
          {filtered.map((player) => {
            const isExpired = player.expired;
            return (
              <button
                key={player.id}
                onClick={() => { setSelectedPlayer(player); setRefreshResult(null); }}
                className={`w-full text-left flex items-center justify-between border-l-4 pl-3 py-2 transition hover:opacity-80 ${isExpired ? 'border-red-400 bg-red-50' : 'border-orange-400 bg-orange-50'}`}
              >
                <div>
                  <p className="font-medium text-sm">{player.name_visual || player.name}</p>
                  <p className="text-xs text-gray-500">{player.categoria}</p>
                </div>
                <span className={`text-sm font-semibold ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                  {isExpired ? 'Venció' : 'Vence'}: {new Date(player.ficha_medica_hasta + 'T00:00:00').toLocaleDateString('es-UY')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Player detail modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-800">Ficha Médica</h3>
              <button
                onClick={() => { setSelectedPlayer(null); setRefreshResult(null); }}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500">Nombre</p>
                <p className="font-semibold text-gray-800">{selectedPlayer.name_visual || selectedPlayer.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Documento</p>
                <p className="text-gray-800">{selectedPlayer.gov_id || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Celular</p>
                <p className="text-gray-800">{selectedPlayer.celular || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ficha Médica vence</p>
                <p className={`font-semibold ${selectedPlayer.expired ? 'text-red-600' : 'text-orange-600'}`}>
                  {new Date(selectedPlayer.ficha_medica_hasta + 'T00:00:00').toLocaleDateString('es-UY')}
                </p>
              </div>

              {refreshResult && (
                <p className={`text-sm font-medium ${refreshResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {refreshResult.msg}
                </p>
              )}

              <button
                onClick={handleRefreshFicha}
                disabled={refreshing || !selectedPlayer.gov_id}
                className="w-full flex items-center justify-center gap-2 bg-black text-yellow-400 font-semibold py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Consultando SND...' : 'Actualizar Ficha Médica'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
