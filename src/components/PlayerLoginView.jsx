import { useState } from 'react';
import { Shield } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Club Atlético Peñarol</h1>
          <p className="text-gray-500 mt-1">Formulario de jugadores</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Ingresar</h2>
          <p className="text-sm text-gray-500 mb-6">
            Ingresá tu número de cédula para acceder al formulario.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cédula de identidad
              </label>
              <input
                type="text"
                value={govId}
                onChange={(e) => setGovId(e.target.value)}
                placeholder="Ej: 12345678"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !govId.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Si tu cédula no está registrada, contactá al club.
        </p>
      </div>
    </div>
  );
}
