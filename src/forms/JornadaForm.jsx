import React, { useState } from 'react';
import { CATEGORIAS_PARTIDO, CATEGORIAS_ESCENARIO_INVERTIDO, FASES_CAMPEONATO, ESCENARIOS, NUMEROS_JORNADA } from '../utils/constants';
import { localTodayISO, todayISO } from '../utils/dateUtils';

/**
 * Formulario de jornada — funciona tanto para crear (sin `jornada`) como para editar (con `jornada`).
 * En modo edición no se muestra el selector de escenario (los partidos ya existen).
 * Con `puedeTelegram`, al crear ofrece mandar el parte de disponibilidad al grupo de Telegram
 * (marcado por defecto si la jornada es de hoy en adelante, para no avisar al cargar jornadas viejas).
 */
export const JornadaForm = ({ rivales = [], torneos = [], onSubmit, jornada = null, puedeTelegram = false }) => {
  const isEdit = !!jornada;

  const [formData, setFormData] = useState({
    rival_id: jornada?.rival_id || '',
    fecha: jornada?.fecha || todayISO(),
    fase: jornada?.fase || '',
    numero_jornada: jornada?.numero_jornada || '',
    torneo_id: jornada?.torneo_id || '',
  });
  const [escenarioBase, setEscenarioBase] = useState('');
  // null = sin tocar: se deriva de la fecha
  const [enviarTelegramElegido, setEnviarTelegramElegido] = useState(null);
  const enviarTelegram = puedeTelegram && (enviarTelegramElegido ?? formData.fecha >= localTodayISO());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
      onSubmit(formData);
    } else {
      onSubmit(formData, escenarioBase, { enviarTelegram });
    }
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

  const isValid = formData.rival_id && formData.fecha && formData.fase && formData.numero_jornada
    && (isEdit || escenarioBase);

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

      {/* Torneo (opcional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Torneo (opcional)</label>
        <select
          value={formData.torneo_id}
          onChange={(e) => setFormData({ ...formData, torneo_id: e.target.value || null })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sin torneo</option>
          {[...torneos].sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '')).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
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

      {/* Escenario base — solo al crear */}
      {!isEdit && (
        <>
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
          {puedeTelegram && (
            <label className="flex items-start gap-3 p-3 rounded-lg border border-sky-200 bg-sky-50 cursor-pointer dark:border-sky-800 dark:bg-sky-900/30">
              <input
                type="checkbox"
                checked={enviarTelegram}
                onChange={(e) => setEnviarTelegramElegido(e.target.checked)}
                className="mt-1 h-4 w-4 accent-yellow-400"
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">
                <span className="font-medium">Enviar el parte de disponibilidad al grupo de Telegram</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Al crear la jornada se manda quiénes no pueden jugar en cada categoría y cuántos están disponibles. Las lesiones van sin el tipo.
                </span>
              </span>
            </label>
          )}
        </>
      )}

      <button
        type="submit"
        disabled={!isValid}
        className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isEdit ? 'Guardar cambios' : 'Crear Jornada (5 partidos)'}
      </button>
    </form>
  );
};
