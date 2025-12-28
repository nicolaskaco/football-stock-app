import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { InventoryForm } from '../forms/InventoryForm';

export const InventoryTab = ({ inventory, saveInventory, setShowModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = [...new Set(inventory.map(item => item.category))];
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventory Management</h2>
        <button 
          onClick={() => setShowModal(
            <InventoryForm 
              onSubmit={(item) => { 
                saveInventory([...inventory, { ...item, id: Date.now().toString() }]); 
                setShowModal(null); 
              }} 
            />
          )} 
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="flex-1 px-4 py-2 border rounded-lg" 
          />
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)} 
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredInventory.map(item => (
              <tr key={item.id} className={item.quantity <= item.minStock ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 font-medium">{item.name}</td>
                <td className="px-6 py-4">{item.category}</td>
                <td className="px-6 py-4">{item.size}</td>
                <td className="px-6 py-4 font-semibold">{item.quantity}</td>
                <td className="px-6 py-4">{item.minStock}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    item.quantity <= item.minStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {item.quantity <= item.minStock ? 'Low' : 'OK'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowModal(
                        <InventoryForm 
                          item={item} 
                          onSubmit={(updated) => { 
                            saveInventory(inventory.map(i => i.id === updated.id ? updated : i)); 
                            setShowModal(null); 
                          }} 
                        />
                      )} 
                      className="text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { 
                        if (window.confirm('Delete?')) saveInventory(inventory.filter(i => i.id !== item.id)); 
                      }} 
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};