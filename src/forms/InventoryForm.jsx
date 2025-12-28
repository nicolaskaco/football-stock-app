import React, { useState } from 'react';

export const InventoryForm = ({ item, onSubmit }) => {
  const [formData, setFormData] = useState(item || { 
    name: '', 
    category: '', 
    size: '', 
    quantity: 0, 
    minStock: 0 
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Item Name
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
          Category
        </label>
        <select 
          required 
          value={formData.category} 
          onChange={(e) => setFormData({...formData, category: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Category</option>
          <option value="T-Shirts">T-Shirts</option>
          <option value="Shorts">Shorts</option>
          <option value="Pants">Pants</option>
          <option value="Winter Jackets">Winter Jackets</option>
          <option value="Training Gear">Training Gear</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Size
        </label>
        <select 
          required 
          value={formData.size} 
          onChange={(e) => setFormData({...formData, size: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Size</option>
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quantity
        </label>
        <input 
          type="number" 
          placeholder="Quantity" 
          required 
          min="0" 
          value={formData.quantity} 
          onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Minimum Stock Alert
        </label>
        <input 
          type="number" 
          placeholder="Min Stock" 
          required 
          min="0" 
          value={formData.minStock} 
          onChange={(e) => setFormData({...formData, minStock: parseInt(e.target.value) || 0})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <button 
        type="submit" 
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
      >
        {item ? 'Update' : 'Add'} Item
      </button>
    </form>
  );
};