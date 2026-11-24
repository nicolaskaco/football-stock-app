import React, { useState } from 'react';
import { CATEGORIAS_PARTIDO, FASES_CAMPEONATO, ESCENARIOS, NUMEROS_JORNADA, JORNADAS_UNA_CATEGORIA } from '../utils/constants';
import { escenarioDeCategoria } from '../utils/jornadas';
import { escenarioBadgeClass } from '../components/ui/escenario';
import { localTodayISO, todayISO } from '../utils/dateUtils';

/**
 * Formulario de jornada — funciona tanto para crear (sin `jornada`) como para editar (con `jornada`).
 * En modo edición no se muestra el selector de escenario (los partidos ya existen).
 * Semifinal y Final (JORNADAS_UNA_CATEGORIA) se crean para una sola categoría, con su rival:
 * si varias categorías juegan finales, es una jornada por cada una.
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
  const [categoriaUnica, setCategoriaUnica] = useState('');
  const unaCategoria = !isEdit && JORNADAS_UNA_CATEGORIA.includes(formData.numero_jornada);
  // null = sin tocar: se deriva de la fecha
  const [enviarTelegramElegido, setEnviarTelegramElegido] = useState(null);
  const enviarTelegram = puedeTelegram && (enviarTelegramElegido ?? formData.fecha >= localTodayISO());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
      onSubmit(formData);
    } else {
      onSubmit(formData, escenarioBase, { enviarTelegram, categoria: unaCategoria ? categoriaUnica : null });
    }
  };

  // Escenario efectivo de cada categoría (6ta/7ma invertidas). En Semifinal/Final va tal cual.
  const getEscenario = (categoria) => {
    if (!escenarioBase) return '—';
    return unaCategoria ? escenarioBase : escenarioDeCategoria(escenarioBase, categoria);
  };
  const categoriasPreview = unaCategoria ? (categoriaUnica ? [categoriaUnica] : []) : CATEGORIAS_PARTIDO;

  const isValid = formData.rival_id && formData.fecha && formData.fase && formData.numero_jornada
    && (isEdit || escenarioBase) && (!unaCategoria || categoriaUnica);

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

      {/* Categoría — solo al crear una Semifinal o Final */}
      {unaCategoria && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Categoría *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS_PARTIDO.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaUnica(cat)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${
                  categoriaUnica === cat
                    ? 'bg-black text-yellow-400 border-black'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            La {formData.numero_jornada} se crea solo para esta categoría. Si otras categorías también juegan, creá una jornada para cada una, con su rival.
          </p>
        </div>
      )}

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
          {escenarioBase && categoriasPreview.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Vista previa — escenario por categoría
              </p>
              <div className={`grid gap-2 ${unaCategoria ? 'grid-cols-1' : 'grid-cols-5'}`}>
                {categoriasPreview.map((cat) => {
                  const esc = getEscenario(cat);
                  return (
                    <div key={cat} className="text-center">
                      <p className="font-bold text-sm text-gray-800">{cat}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${escenarioBadgeClass(esc)}`}>
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
        {isEdit ? 'Guardar cambios' : `Crear Jornada (${unaCategoria ? '1 partido' : '5 partidos'})`}
      </button>
    </form>
  );
};
