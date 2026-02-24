import React, { useState } from 'react';
import { CATEGORIAS_PARTIDO, CATEGORIAS_ESCENARIO_INVERTIDO, FASES_CAMPEONATO, ESCENARIOS, NUMEROS_JORNADA } from '../utils/constants';
import { todayISO } from '../utils/dateUtils';

export const JornadaForm = ({ rivales = [], onSubmit }) => {
  const [formData, setFormData] = useState({
    rival_id: '',
    fecha: todayISO(),
    fase: '',
    numero_jornada: '',
  });
  const [escenarioBase, setEscenarioBase] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, escenarioBase);
  };

  // Calcula el escenario efectivo para cada categoría según la regla de negocio
  const getEscenario = (categoria) => {
    if (!escenarioBase) return '—';
    return CATEGORIAS_ESCENARIO_INVERTIDO.includes(categoria)
      ? (escenarioBase === 'Local' ? 'Visitante' : 'Local')
      : escenarioBase;
  };

  const escenarioColor = (esc) =>
    esc === 'Local'
      ? 'bg-green-100 text-green-800'
      : esc === 'Visitante'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-gray-100 text-gray-500';

  const isValid = formData.rival_id && formData.fecha && formData.fase && formData.numero_jornada && escenarioBase;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rival */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Rival *</label>
        <select
          required
          value={formData.rival_id}
          onChange={(e) => setFormData({ ...formData, rival_id: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccione un rival</option>
          {rivales.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Fecha */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
        <input
          type="date"
          required
          value={formData.fecha}
          onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Fase */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fase *</label>
        <div className="flex gap-3">
          {FASES_CAMPEONATO.map((fase) => (
            <button
              key={fase}
              type="button"
              onClick={() => setFormData({ ...formData, fase })}
              className={`flex-1 py-2 rounded-lg font-medium border transition ${
                formData.fase === fase
                  ? 'bg-black text-yellow-400 border-black'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {fase}
            </button>
          ))}
        </div>
      </div>

      {/* Número de jornada */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Jornada *</label>
        <div className="flex flex-wrap gap-2">
          {NUMEROS_JORNADA.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setFormData({ ...formData, numero_jornada: n })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                formData.numero_jornada === n
                  ? 'bg-black text-yellow-400 border-black'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Escenario base */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Escenario *</label>
        <div className="flex gap-3">
          {ESCENARIOS.map((esc) => (
            <button
              key={esc}
              type="button"
              onClick={() => setEscenarioBase(esc)}
              className={`flex-1 py-2 rounded-lg font-medium border transition ${
                escenarioBase === esc
                  ? 'bg-black text-yellow-400 border-black'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {esc}
            </button>
          ))}
        </div>
      </div>

      {/* Preview de escenarios por categoría */}
      {escenarioBase && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Vista previa — escenario por categoría
          </p>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIAS_PARTIDO.map((cat) => {
              const esc = getEscenario(cat);
              return (
                <div key={cat} className="text-center">
                  <p className="font-bold text-sm text-gray-800">{cat}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${escenarioColor(esc)}`}>
                    {esc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!isValid}
        className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        Crear Jornada (5 partidos)
      </button>
    </form>
  );
};
