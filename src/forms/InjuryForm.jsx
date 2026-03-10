import React, { useState, useEffect } from 'react';

const TIPOS_LESION = [
  'Lesión muscular',
  'Fractura',
  'Esguince',
  'Contusión',
  'Tendinitis',
  'Ligamentos cruzados',
  'Meniscos',
  'Otro',
];

const SEVERIDADES = ['leve', 'moderada', 'grave'];

export const InjuryForm = ({ injury, playerId, playerName, onSubmit, readOnly = false }) => {
  const [formData, setFormData] = useState({
    tipo: '',
    severidad: 'leve',
    descripcion: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_retorno_estimada: '',
    fecha_alta: '',
  });

  useEffect(() => {
    if (injury) {
      setFormData({
        tipo: injury.tipo || '',
        severidad: injury.severidad || 'leve',
        descripcion: injury.descripcion || '',
        fecha_inicio: injury.fecha_inicio || '',
        fecha_retorno_estimada: injury.fecha_retorno_estimada || '',
        fecha_alta: injury.fecha_alta || '',
      });
    }
  }, [injury]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, player_id: playerId };
    // Remove empty strings for nullable date fields
    if (!payload.fecha_retorno_estimada) payload.fecha_retorno_estimada = null;
    if (!payload.fecha_alta) payload.fecha_alta = null;
    onSubmit(payload);
  };

  const severityLabels = { leve: 'Leve', moderada: 'Moderada', grave: 'Grave' };
  const severityColors = {
    leve: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    moderada: 'bg-orange-100 text-orange-800 border-orange-300',
    grave: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {playerName && (
        <div className="bg-gray-50 rounded-lg p-3">
          <span className="text-sm text-gray-500">Jugador:</span>{' '}
          <span className="font-semibold text-gray-800">{playerName}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de lesión *</label>
        <select
          required
          disabled={readOnly}
          value={formData.tipo}
          onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">— Seleccionar —</option>
          {TIPOS_LESION.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Severidad *</label>
        <div className="flex gap-2">
          {SEVERIDADES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={readOnly}
              onClick={() => setFormData({ ...formData, severidad: s })}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                formData.severidad === s
                  ? severityColors[s]
                  : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {severityLabels[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
        <textarea
          rows={3}
          disabled={readOnly}
          placeholder="Detalles de la lesión…"
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de inicio *</label>
          <input
            type="date"
            required
            disabled={readOnly}
            value={formData.fecha_inicio}
            onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Retorno estimado</label>
          <input
            type="date"
            disabled={readOnly}
            value={formData.fecha_retorno_estimada}
            onChange={(e) => setFormData({ ...formData, fecha_retorno_estimada: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      </div>

      {injury && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de alta</label>
          <input
            type="date"
            disabled={readOnly}
            value={formData.fecha_alta}
            onChange={(e) => setFormData({ ...formData, fecha_alta: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      )}

      {!readOnly && (
        <button
          type="submit"
          className="w-full bg-black text-yellow-400 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
        >
          {injury ? 'Actualizar Lesión' : 'Registrar Lesión'}
        </button>
      )}
    </form>
  );
};
