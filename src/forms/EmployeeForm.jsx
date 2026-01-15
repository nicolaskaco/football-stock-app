import React, { useState } from 'react';

export const EmployeeForm = ({ employee, onSubmit }) => {
  const [formData, setFormData] = useState(employee || { 
    name: '', 
    gov_id: '', 
    role: '', 
    photo_url: '', 
    upper_size: '', 
    lower_size: '', 
    celular: '',
    categoria: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre Completo
        </label>
        <input 
          type="text" 
          placeholder="Diego Aguirre" 
          required 
          value={formData.name} 
          onChange={(e) => setFormData({...formData, name: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cédula de Identidad/Pasaporte
        </label>
        <input 
          type="text" 
          placeholder="12345678" 
          required 
          value={formData.gov_id} 
          onChange={(e) => setFormData({...formData, gov_id: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rol
        </label>
        <input 
          type="text" 
          placeholder="ej: Entrenador, Ayudante, Fisio, Médico" 
          required 
          value={formData.role} 
          onChange={(e) => setFormData({...formData, role: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Foto URL (opcional)
        </label>
        <input 
          type="url" 
          placeholder="https://example.com/photo.jpg" 
          value={formData.photo_url} 
          onChange={(e) => setFormData({...formData, photo_url: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Talle parte superior
        </label>
        <select 
          required 
          value={formData.upper_size} 
          onChange={(e) => setFormData({...formData, upper_size: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Elige talle superior</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Talle parte inferior
        </label>
        <select 
          required 
          value={formData.lower_size} 
          onChange={(e) => setFormData({...formData, lower_size: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Elige talle inferior</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categoría
        </label>
        <select 
          value={formData.categoria} 
          onChange={(e) => setFormData({...formData, categoria: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Elige la categoría en caso de aplicar</option>
          <option value="4ta">4ta</option>
          <option value="5ta">5ta</option>
          <option value="S16">S16</option>
          <option value="6ta">6ta</option>
          <option value="7ma">7ma</option>
        </select>
      </div>

      <button 
        type="submit" 
        className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200"
      >
        {employee ? 'Actualizar' : 'Agregar'} Funcionario
      </button>
    </form>
  );
};