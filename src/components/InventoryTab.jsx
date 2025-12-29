import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { InventoryForm } from '../forms/InventoryForm';
import { database } from '../utils/database';

export const InventoryTab = ({ inventory, setShowModal, onDataChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = [...new Set(inventory.map(item => item.category))];
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = async (item) => {
    try {
      await database.addInventoryItem(item);
      await onDataChange();
      setShowModal(null);
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Error adding item: ' + error.message);
    }
  };

  const handleEditItem = async (item) => {
    try {
      await database.updateInventoryItem(item.id, item);
      await onDataChange();
      setShowModal(null);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Error updating item: ' + error.message);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Borrar este item?')) {
      try {
        await database.deleteInventoryItem(id);
        await onDataChange();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item: ' + error.message);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Administrar Inventario</h2>
        <button 
          onClick={() => setShowModal({
            title: "Agregar Ropa",
            content: <InventoryForm onSubmit={handleAddItem} />
          })} 
          className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-5 h-5" />
          Agregar Item
        </button>
      </div>
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="flex-1 px-4 py-2 border rounded-lg" 
          />
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)} 
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Talle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredInventory.map(item => (
              <tr key={item.id} className={item.quantity <= item.min_stock ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 font-medium">{item.name}</td>
                <td className="px-6 py-4">{item.category}</td>
                <td className="px-6 py-4">{item.size}</td>
                <td className="px-6 py-4 font-semibold">{item.quantity}</td>
                <td className="px-6 py-4">{item.min_stock}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    item.quantity <= item.min_stock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {item.quantity <= item.min_stock ? 'Bajo' : 'OK'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowModal({
                        title: "Actualizar Stock Ropa",
                        content: <InventoryForm item={item} onSubmit={handleEditItem} />
                      })}
                      className="text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(item.id)} 
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