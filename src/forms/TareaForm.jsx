import React, { useState } from 'react';
import { useFormDirty } from '../hooks/useFormDirty';

const PRIORIDADES = ['Alta', 'Media', 'Baja'];
const ESTADOS = ['Sin Asignar', 'Sin Comenzar', 'En Progreso', 'Completado'];

const empty = {
  titulo: '',
  descripcion: '',
  prioridad: 'Media',
  estado: 'Sin Asignar',
  asignado_tipo: '',
  asignado_id: '',
  asignado_nombre: '',
  fecha_estimada_completo: '',
  sprint_id: '',
};

export const TareaForm = ({
  tarea,
  sprints = [],
  dirigentes = [],
  employees = [],
  defaultSprintId = '',
  onSubmit,
  onDirtyChange,
}) => {
  const [formData, setFormData] = useState(tarea ? { ...empty, ...tarea } : { ...empty, sprint_id: defaultSprintId });
  useFormDirty(formData, tarea, onDirtyChange);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleAssigneeChange = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setFormData(prev => ({ ...prev, asignado_id: '', asignado_tipo: '', asignado_nombre: '' }));
      return;
    }
    const dirigente = dirigentes.find(d => d.id === selectedId);
    if (dirigente) {
      setFormData(prev => ({
        ...prev,
        asignado_id: dirigente.id,
        asignado_tipo: 'dirigente',
        asignado_nombre: dirigente.name,
        estado: prev.estado === 'Sin Asignar' ? 'Sin Comenzar' : prev.estado,
      }));
      return;
    }
    const employee = employees.find(emp => emp.id === selectedId);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        asignado_id: employee.id,
        asignado_tipo: 'funcionario',
        asignado_nombre: employee.name,
        estado: prev.estado === 'Sin Asignar' ? 'Sin Comenzar' : prev.estado,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      titulo: formData.titulo.trim(),
      descripcion: formData.descripcion || null,
      prioridad: formData.prioridad,
      estado: formData.estado,
      asignado_tipo: formData.asignado_tipo || null,
      asignado_id: formData.asignado_id || null,
      asignado_nombre: formData.asignado_nombre || null,
      fecha_estimada_completo: formData.fecha_estimada_completo || null,
      sprint_id: formData.sprint_id || null,
    };
    onSubmit(payload);
  };

  const sortedDirigentes = [...dirigentes].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
        <input
          type="text"
          required
          value={formData.titulo}
          onChange={(e) => set('titulo', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          placeholder="Ej: Actualizar lista de convocados"
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          rows={4}
          value={formData.descripcion || ''}
          onChange={(e) => set('descripcion', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          placeholder="Detalles de la tarea..."
        />
      </div>

      {/* Prioridad + Estado */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
          <select
            value={formData.prioridad}
            onChange={(e) => set('prioridad', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          >
            {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            value={formData.estado}
            onChange={(e) => set('estado', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          >
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Asignado a */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Asignado a</label>
        <select
          value={formData.asignado_id || ''}
          onChange={handleAssigneeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
        >
          <option value="">Sin asignar</option>
          <optgroup label="Dirigentes">
            {sortedDirigentes.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </optgroup>
          <optgroup label="Funcionarios">
            {sortedEmployees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Sprint + Fecha estimada */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
          <select
            value={formData.sprint_id || ''}
            onChange={(e) => set('sprint_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="">Sin sprint</option>
            {sprints.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha estimada</label>
          <input
            type="date"
            value={formData.fecha_estimada_completo || ''}
            onChange={(e) => set('fecha_estimada_completo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="w-full bg-black text-yellow-400 py-2.5 rounded-lg font-medium hover:bg-gray-800"
        >
          {tarea ? 'Guardar Cambios' : 'Crear Tarea'}
        </button>
      </div>
    </form>
  );
};
