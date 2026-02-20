import React, { useState, useEffect, useRef } from 'react';

export const DistributionForm = ({ employees, inventory, onSubmit, onDirtyChange }) => {
  const defaultValues = {
    employee_id: '',
    item_id: '',
    size: '',
    quantity: 1,
    date: new Date().toISOString().split('T')[0],
    condition: 'Nuevo',
    authorized_by: ''
  };
  const [formData, setFormData] = useState(defaultValues);
  const initialData = useRef(JSON.stringify(defaultValues));

  useEffect(() => {
    onDirtyChange?.(JSON.stringify(formData) !== initialData.current);
  }, [formData]);

  const selectedItem = inventory.find(i => i.id === formData.item_id);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Funcionario
        </label>
        <select 
          required 
          value={formData.employee_id} 
          onChange={(e) => setFormData({...formData, employee_id: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccione Funcionario</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.name} - {emp.role}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ropa
        </label>
        <select 
          required 
          value={formData.item_id} 
          onChange={(e) => { 
            const item = inventory.find(i => i.id === e.target.value); 
            setFormData({...formData, item_id: e.target.value, size: item?.size || ''}); 
          }} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccione la ropa a entregar</option>
          {inventory.filter(i => i.quantity > 0).map(item => (
            <option key={item.id} value={item.id}>
              {item.name} - Talle {item.size} (Stock: {item.quantity})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Talle
        </label>
        <input 
          type="text" 
          readOnly 
          value={formData.size} 
          className="w-full px-4 py-2 border rounded-lg bg-gray-50" 
          placeholder="Size (auto-filled)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cantidad
        </label>
        <input 
          type="number" 
          required 
          min="1" 
          max={selectedItem?.quantity || 1} 
          value={formData.quantity} 
          onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
          placeholder="Quantity"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fecha entrega
        </label>
        <input 
          type="date" 
          required 
          value={formData.date} 
          onChange={(e) => setFormData({...formData, date: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Condición
        </label>
        <select 
          required 
          value={formData.condition} 
          onChange={(e) => setFormData({...formData, condition: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="Nuevo">Nuevo</option>
          <option value="Bueno">Bueno</option>
          <option value="Regular">Regular</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ropa autorizada por
        </label>
        <input 
          type="text" 
          required 
          placeholder="Nombre de la persona que autorizó la entrega de ropa" 
          value={formData.authorized_by} 
          onChange={(e) => setFormData({...formData, authorized_by: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <button 
        type="submit" 
        className="w-full bg-black text-yellow-400 py-3 rounded-lg hover:bg-gray-800 font-medium"
      >
        Entregar Ropa
      </button>
    </form>
  );
};