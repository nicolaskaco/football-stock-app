import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '../hooks/useMutation';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { Plus, Edit2, Trash2, Settings2 } from 'lucide-react';
import { SearchInput } from './ui/SearchInput';
import { InventoryForm } from '../forms/InventoryForm';
import { database } from '../utils/database';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';
import { BulkActionModal } from './BulkActionModal';
import { useAlertModal } from '../hooks/useAlertModal';

export const InventoryTab = ({ inventory, setShowModal, onDataChange, onFormDirtyChange }) => {
  const { alertModal, showAlert, closeAlert } = useAlertModal();
  const { execute } = useMutation((msg) => showAlert('Error', msg, 'error'));
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkAdjust, setBulkAdjust] = useState(null); // { changes, columns }
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('i_search') || '';
  const filterCategory = searchParams.get('i_cat') || 'all';

  const setParam = (key, value, defaultValue) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (value === null || value === undefined || value === defaultValue || value === '') {
        p.delete(key);
      } else {
        p.set(key, String(value));
      }
      return p;
    });
  };

  const setSearchTerm = (v) => setParam('i_search', v, '');
  const [inputValue, setInputValue] = useDebouncedSearch(searchTerm, setSearchTerm);
  const setFilterCategory = (v) => setParam('i_cat', v, 'all');

  const categories = [...new Set(inventory.map(item => item.category))];
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = (item) => execute(async () => {
    await database.addInventoryItem(item);
    await onDataChange('inventory');
    setShowModal(null);
  }, 'Error agregando artículo', 'Artículo agregado correctamente');

  const handleEditItem = (item) => execute(async () => {
    await database.updateInventoryItem(item.id, item);
    await onDataChange('inventory');
    setShowModal(null);
  }, 'Error actualizando artículo', 'Artículo actualizado correctamente');

  const handleDeleteItem = (id) => setConfirmDelete(id);

  const handleConfirmDelete = () => {
    execute(async () => {
      await database.deleteInventoryItem(confirmDelete);
      await onDataChange('inventory');
    }, 'Error eliminando artículo', 'Artículo eliminado correctamente');
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredInventory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredInventory.map(i => i.id));
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const prepareBulkAdjust = () => {
    const selected = filteredInventory.filter(i => selectedItems.includes(i.id));
    if (selected.length === 0) {
      showAlert('Error', 'Selecciona al menos un artículo', 'warning');
      return;
    }
    const input = prompt('Ajuste de stock (ej: +5, -3, o cantidad fija 10):');
    if (input === null || input.trim() === '') return;
    const trimmed = input.trim();
    const isRelative = trimmed.startsWith('+') || trimmed.startsWith('-');
    const num = parseInt(trimmed, 10);
    if (isNaN(num)) {
      showAlert('Error', 'Valor numérico inválido', 'error');
      return;
    }

    const changes = selected.map(item => {
      const newQty = isRelative ? Math.max(0, item.quantity + num) : Math.max(0, num);
      return {
        id: item.id,
        name: item.name,
        before: { cantidad: item.quantity },
        after: { cantidad: newQty },
        newQuantity: newQty,
      };
    }).filter(c => c.before.cantidad !== c.after.cantidad);

    if (changes.length === 0) {
      showAlert('Sin cambios', 'Ningún artículo requiere modificación', 'info');
      return;
    }

    const columns = [
      { key: 'name', label: 'Artículo', render: (r) => r.name },
      { key: 'cantidad', label: 'Cantidad' },
    ];
    setBulkAdjust({ changes, columns });
  };

  const handleBulkAdjustConfirm = () => {
    execute(async () => {
      const adjustments = bulkAdjust.changes.map(c => ({ id: c.id, quantity: c.newQuantity }));
      await database.bulkAdjustInventory(adjustments);
      await onDataChange('inventory');
      setBulkAdjust(null);
      setSelectedItems([]);
    }, 'Error ajustando stock', `${bulkAdjust?.changes.length} artículo${(bulkAdjust?.changes.length || 0) !== 1 ? 's' : ''} actualizado${(bulkAdjust?.changes.length || 0) !== 1 ? 's' : ''}`);
  };

  return (
    <>
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Administrar Inventario</h2>
        <div className="flex gap-2">
          {selectedItems.length >= 1 && (
            <button
              onClick={prepareBulkAdjust}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              <Settings2 className="w-5 h-5" />
              Ajustar stock ({selectedItems.length})
            </button>
          )}
          <button 
            onClick={() => setShowModal({
              title: "Agregar Ropa",
              content: <InventoryForm onSubmit={handleAddItem} onDirtyChange={onFormDirtyChange} />
            })} 
            className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            <Plus className="w-5 h-5" />
            Agregar Item
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex gap-4">
          <SearchInput
            value={inputValue}
            onChange={setInputValue}
            placeholder="Buscar..."
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
              <th className="px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={selectedItems.length === filteredInventory.length && filteredInventory.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
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
                <td className="px-3 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                    className="rounded"
                  />
                </td>
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
                        content: <InventoryForm item={item} onSubmit={handleEditItem} onDirtyChange={onFormDirtyChange} />
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

    <AlertModal
      isOpen={alertModal.isOpen}
      onClose={closeAlert}
      title={alertModal.title}
      message={alertModal.message}
      type={alertModal.type}
    />
    <ConfirmModal
      isOpen={confirmDelete !== null}
      onClose={() => setConfirmDelete(null)}
      onConfirm={handleConfirmDelete}
      title="Eliminar Item"
      message="¿Estás seguro de que quieres borrar este item? Esta acción no se puede deshacer."
      confirmText="Eliminar"
      type="danger"
    />
    <BulkActionModal
      isOpen={!!bulkAdjust}
      onClose={() => setBulkAdjust(null)}
      onConfirm={handleBulkAdjustConfirm}
      title={`Ajustar stock — ${bulkAdjust?.changes.length || 0} artículo${(bulkAdjust?.changes.length || 0) !== 1 ? 's' : ''}`}
      changes={bulkAdjust?.changes}
      columns={bulkAdjust?.columns}
    />
    </>
  );
};