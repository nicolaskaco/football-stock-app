import React, { useState } from 'react';

export const DistributionForm = ({ employees, inventory, onSubmit }) => {
  const [formData, setFormData] = useState({ 
    employeeId: '', 
    itemId: '', 
    size: '', 
    quantity: 1, 
    date: new Date().toISOString().split('T')[0], 
    condition: 'New', 
    authorizedBy: '' 
  });

  const selectedItem = inventory.find(i => i.id === formData.itemId);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Employee
        </label>
        <select 
          required 
          value={formData.employeeId} 
          onChange={(e) => setFormData({...formData, employeeId: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Employee</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.name} - {emp.role}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Item
        </label>
        <select 
          required 
          value={formData.itemId} 
          onChange={(e) => { 
            const item = inventory.find(i => i.id === e.target.value); 
            setFormData({...formData, itemId: e.target.value, size: item?.size || ''}); 
          }} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Item</option>
          {inventory.filter(i => i.quantity > 0).map(item => (
            <option key={item.id} value={item.id}>
              {item.name} - Size {item.size} (Available: {item.quantity})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Size
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
          Quantity
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
          Date
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
          Condition
        </label>
        <select 
          required 
          value={formData.condition} 
          onChange={(e) => setFormData({...formData, condition: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="New">Nuevo</option>
          <option value="Good">Bueno</option>
          <option value="Fair">Regular</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Authorized By
        </label>
        <input 
          type="text" 
          required 
          placeholder="Name of person authorizing distribution" 
          value={formData.authorizedBy} 
          onChange={(e) => setFormData({...formData, authorizedBy: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <button 
        type="submit" 
        className="w-full bg-black text-yellow-400 py-3 rounded-lg hover:bg-gray-800 font-medium"
      >
        Create Distribution
      </button>
    </form>
  );
};