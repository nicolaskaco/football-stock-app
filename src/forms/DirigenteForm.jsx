import React, { useState } from 'react';

export const DirigenteForm = ({ dirigente, onSubmit }) => {
  const [formData, setFormData] = useState(dirigente || { 
    name: '',
    date_of_birth: null,
    rol: '',
    categoria: '',
    celular: '',
    cedula: '',
    matricula_auto: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const roles = [
    'Presidente Formativas',
    'Ejecutivo Formativas',
    'Presidente de Categoría',
    'Ayudante de Categoría',
    'Tesorero Formativas',
    'Infraestructura Formativas',
    'Delegado',
    'Marketing y Comunicación'
  ];

  const categorias = ['3era', '4ta', '5ta', 'S16', '6ta', '7ma', 'Captación'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-lg">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">Información del Dirigente</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <input 
              type="text" 
              required 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="Juan Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cédula
            </label>
            <input 
              type="text" 
              value={formData.cedula} 
              onChange={(e) => setFormData({...formData, cedula: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="12345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Nacimiento
            </label>
            <input 
              type="date" 
              
              value={formData.date_of_birth || ''} 
              onChange={(e) => setFormData({...formData, date_of_birth: e.target.value || null})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol
            </label>
            <select 
              value={formData.rol} 
              onChange={(e) => setFormData({...formData, rol: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione un Rol</option>
              {roles.map(rol => (
                <option key={rol} value={rol}>{rol}</option>
              ))}
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
              <option value="">Seleccione una Categoría</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Celular
            </label>
            <input 
              type="tel" 
              value={formData.celular} 
              onChange={(e) => setFormData({...formData, celular: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="099001891"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Matrícula Auto
            </label>
            <input 
              type="text" 
              value={formData.matricula_auto || ''} 
              onChange={(e) => setFormData({...formData, matricula_auto: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="SCP 1891"
            />
          </div>
        </div>
      </div>

      <button 
        type="submit" 
        className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200"
      >
        {dirigente ? '✓ Actualizar' : '+ Agregar'} Dirigente
      </button>
    </form>
  );
};