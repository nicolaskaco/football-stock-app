import React, { useState, useEffect, useRef } from 'react';

export const RivalForm = ({ rival, onSubmit, onDirtyChange }) => {
  const [formData, setFormData] = useState(rival || { name: '' });
  const initialData = useRef(JSON.stringify(rival || {}));

  useEffect(() => {
    onDirtyChange?.(JSON.stringify(formData) !== initialData.current);
  }, [formData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre del Rival *
        </label>
        <input
          type="text"
          required
          placeholder="ej: Nacional, Liverpool"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200"
      >
        {rival ? 'Actualizar' : 'Agregar'} Rival
      </button>
    </form>
  );
};
