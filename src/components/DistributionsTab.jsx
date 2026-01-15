import React, { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DistributionForm } from '../forms/DistributionForm';
import { database } from '../utils/database';


export const DistributionsTab = ({ 
  distributions, 
  employees, 
  inventory, 
  saveDistributions, 
  saveInventory, 
  setShowModal, 
  onDataChange 
}) => {
  const [filter, setFilter] = useState('all');
  const filtered = distributions.filter(d => 
    filter === 'all' || 
    (filter === 'active' && !d.return_date) || 
    (filter === 'returned' && d.return_date)
  );

  const handleAdd = async (dist) => {
    const item = inventory.find(i => i.id === dist.item_id || i.id === dist.item_id);
    if (item && item.quantity >= dist.quantity) {
      try {
        // Add distribution
        await database.addDistribution({
          employee_id: dist.employee_id,
          item_id: dist.item_id,
          size: dist.size,
          quantity: dist.quantity,
          date: dist.date,
          condition: dist.condition,
          authorized_by: dist.authorized_by
        });
        
        // Update inventory
        await database.updateInventoryItem(item.id, {
          ...item,
          quantity: item.quantity - dist.quantity
        });
        
        await onDataChange();
        setShowModal(null);
      } catch (error) {
        alert('Error creating distribution: ' + error.message);
      }
    } else {
      alert('Insufficient inventory');
    }
  };

  const handleReturn = async (distId) => {
    const dist = distributions.find(d => d.id === distId);
    if (dist) {
      const return_date = prompt(
        'Return date (YYYY-MM-DD):', 
        new Date().toISOString().split('T')[0]
      );
      if (return_date) {
        try {
          // Update distribution
          await database.updateDistribution(dist.id, {
            ...dist,
            return_date: return_date
          });
          
          // Return to inventory
          const item = inventory.find(i => i.id === dist.item_id);
          if (item) {
            await database.updateInventoryItem(item.id, {
              ...item,
              quantity: item.quantity + dist.quantity
            });
          }
          
          await onDataChange();
        } catch (error) {
          alert('Error returning item: ' + error.message);
        }
      }
    }
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    const exportData = filtered.map(dist => {
      const emp = employees.find(e => e.id === dist.employee_id);
      const item = inventory.find(i => i.id === dist.item_id);
      
      return {
        'Fecha': dist.date,
        'Funcionario': emp?.name || 'N/A',
        'Tipo de Ropa': item?.name || 'N/A',
        'Talle': dist.size,
        'Cantidad': dist.quantity,
        'Condición': dist.condition,
        'Autorizado por': dist.authorized_by,
        'Estado': dist.return_date ? 'Devuelto' : 'Activo',
        'Fecha Devolución': dist.return_date || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Distribuciones');
    
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `distribuciones_${date}_${time}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Ropa Entregada</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleExportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            Exportar a Excel
          </button>
          <button 
            onClick={() => setShowModal({
              title: "Entregar Ropa",
              content: <DistributionForm employees={employees} inventory={inventory} onSubmit={handleAdd} />
            })} 
            className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-900"
          >
            <Plus className="w-5 h-5" />
            Nueva entrega de Ropa
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)} 
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">Todo</option>
          <option value="active">Activo</option>
          <option value="returned">Devuelto</option>
        </select>
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funcionario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de ROpa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Talle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condición</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Autorizado por</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(dist => {
              const emp = employees.find(e => e.id === dist.employee_id);
              const item = inventory.find(i => i.id === dist.item_id);
              return (
                <tr key={dist.id}>
                  <td className="px-6 py-4 text-sm">{dist.date}</td>
                  <td className="px-6 py-4 text-sm font-medium">{emp?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">{item?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">{dist.size}</td>
                  <td className="px-6 py-4 text-sm">{dist.quantity}</td>
                  <td className="px-6 py-4 text-sm">{dist.condition}</td>
                  <td className="px-6 py-4 text-sm">{dist.authorized_by}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      dist.return_date ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {dist.return_date ? 'Devuelto' : 'Activo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {!dist.return_date && (
                      <button 
                        onClick={() => handleReturn(dist.id)} 
                        className="text-yellow-600 text-sm hover:underline"
                      >
                        Devolver Ropa
                      </button>
                    )}
                    {dist.return_date && (
                      <span className="text-gray-400 text-sm">{dist.return_date}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};