import { useState } from 'react';
import { database } from '../utils/database.js';

export default function PlayerLoginView({ onLogin }) {
  const [govId, setGovId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!govId.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await database.validatePlayer(govId.trim());
      onLogin(result.player, result.already_submitted);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <img src="/logo.jpeg" alt="Club Atlético Peñarol" className="w-24 h-24 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-yellow-400">Club Atlético Peñarol</h1>
          <p className="text-gray-400 mt-1">Formulario de jugadores</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-8">
          <h2 className="text-lg font-semibold text-yellow-400 mb-1">Ingresar</h2>
          <p className="text-sm text-gray-400 mb-6">
            Ingresá tu número de cédula para acceder al formulario.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Cédula de identidad
              </label>
              <input
                type="text"
                value={govId}
                onChange={(e) => setGovId(e.target.value)}
                placeholder="Ej: 12345678"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !govId.trim()}
              className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/40 disabled:text-black/40 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Si tu cédula no está registrada, contactá al club.
        </p>
      </div>
    </div>
  );
}
