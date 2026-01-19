import React, { useState } from 'react';

export const InventoryForm = ({ item, onSubmit }) => {
  const [formData, setFormData] = useState(item || { 
    name: '', 
    category: '', 
    size: '', 
    quantity: 0, 
    min_stock: 0 
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre de Ropa
        </label>
        <input 
          type="text" 
          placeholder="Item Name" 
          required 
          value={formData.name} 
          onChange={(e) => setFormData({...formData, name: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categoría
        </label>
        <select 
          required 
          value={formData.category} 
          onChange={(e) => setFormData({...formData, category: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccione Categoría</option>
          <option value="Remeras">Remeras</option>
          <option value="Shorts">Shorts</option>
          <option value="Pantalones">Pantalones</option>
          <option value="Camperas de invierno">Camperas de invierno</option>
          <option value="Ropa de entrenamiento">Ropa de entrenamiento</option>
          <option value="Otro">Otro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Talle
        </label>
        <select 
          required 
          value={formData.size} 
          onChange={(e) => setFormData({...formData, size: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccione Talle</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cantidad
        </label>
        <input 
          type="number" 
          placeholder="Cantidad" 
          required 
          min="0" 
          value={formData.quantity} 
          onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alerta de Stock Mínimo
        </label>
        <input 
          type="number" 
          placeholder="Mínimo Stock" 
          required 
          min="0" 
          value={formData.min_stock} 
          onChange={(e) => setFormData({...formData, min_stock: parseInt(e.target.value) || 0})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <button 
        type="submit" 
        className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200"
      >
        {item ? 'Actualizar' : 'Agregar'} Inventario
      </button>
    </form>
  );
};