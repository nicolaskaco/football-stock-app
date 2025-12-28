import React, { useState } from 'react';

export const EmployeeForm = ({ employee, onSubmit }) => {
  const [formData, setFormData] = useState(employee || { 
    name: '', 
    govId: '', 
    role: '', 
    photoUrl: '', 
    upperSize: '', 
    lowerSize: '' 
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name
        </label>
        <input 
          type="text" 
          placeholder="Full Name" 
          required 
          value={formData.name} 
          onChange={(e) => setFormData({...formData, name: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Government ID
        </label>
        <input 
          type="text" 
          placeholder="Government ID" 
          required 
          value={formData.govId} 
          onChange={(e) => setFormData({...formData, govId: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Role
        </label>
        <input 
          type="text" 
          placeholder="e.g., Head Coach, Player, Staff" 
          required 
          value={formData.role} 
          onChange={(e) => setFormData({...formData, role: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photo URL (optional)
        </label>
        <input 
          type="url" 
          placeholder="https://example.com/photo.jpg" 
          value={formData.photoUrl} 
          onChange={(e) => setFormData({...formData, photoUrl: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upper Body Size
        </label>
        <select 
          required 
          value={formData.upperSize} 
          onChange={(e) => setFormData({...formData, upperSize: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Upper Body Size</option>
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
          Lower Body Size
        </label>
        <select 
          required 
          value={formData.lowerSize} 
          onChange={(e) => setFormData({...formData, lowerSize: e.target.value})} 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Lower Body Size</option>
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        </select>
      </div>

      <button 
        type="submit" 
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
      >
        {employee ? 'Update' : 'Add'} Employee
      </button>
    </form>
  );
};