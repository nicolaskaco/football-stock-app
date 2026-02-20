import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DistributionForm } from '../forms/DistributionForm';
import { database } from '../utils/database';
import { AlertModal } from './AlertModal';
import { useMutation } from '../hooks/useMutation';
import { PromptModal } from './PromptModal';


export const DistributionsTab = ({
  distributions,
  employees,
  inventory,
  saveDistributions,
  saveInventory,
  setShowModal,
  onDataChange,
  onFormDirtyChange
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('ds_filter') || 'all';
  const sortConfig = {
    key: searchParams.get('ds_sort') || null,
    direction: searchParams.get('ds_dir') || 'asc',
  };

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

  const setFilter = (v) => setParam('ds_filter', v, 'all');
  const setSortConfig = ({ key, direction }) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      key ? p.set('ds_sort', key) : p.delete('ds_sort');
      direction && direction !== 'asc' ? p.set('ds_dir', direction) : p.delete('ds_dir');
      return p;
    });
  };

  const filtered = distributions.filter(d =>
    filter === 'all' ||
    (filter === 'active' && !d.return_date) ||
    (filter === 'returned' && d.return_date)
  );
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'info' });
  const { execute } = useMutation((msg) =>
    setAlertModal({ isOpen: true, title: 'Error', message: msg, type: 'error' })
  );
  const [returnPrompt, setReturnPrompt] = useState(null);

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Render sort icon
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Sort the filtered data
  const sortedDistributions = [...filtered].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const empA = employees.find(e => e.id === a.employee_id);
    const empB = employees.find(e => e.id === b.employee_id);
    const itemA = inventory.find(i => i.id === a.item_id);
    const itemB = inventory.find(i => i.id === b.item_id);

    let aValue, bValue;

    switch (sortConfig.key) {
      case 'date':
        aValue = new Date(a.date);
        bValue = new Date(b.date);
        break;
      case 'employee':
        aValue = empA?.name?.toLowerCase() || '';
        bValue = empB?.name?.toLowerCase() || '';
        break;
      case 'item':
        aValue = itemA?.name?.toLowerCase() || '';
        bValue = itemB?.name?.toLowerCase() || '';
        break;
      case 'size':
        aValue = a.size?.toLowerCase() || '';
        bValue = b.size?.toLowerCase() || '';
        break;
      case 'quantity':
        aValue = a.quantity || 0;
        bValue = b.quantity || 0;
        break;
      case 'condition':
        aValue = a.condition?.toLowerCase() || '';
        bValue = b.condition?.toLowerCase() || '';
        break;
      case 'authorized':
        aValue = a.authorized_by?.toLowerCase() || '';
        bValue = b.authorized_by?.toLowerCase() || '';
        break;
      case 'status':
        aValue = a.return_date ? 1 : 0;
        bValue = b.return_date ? 1 : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleAdd = (dist) => {
    const item = inventory.find(i => i.id === dist.item_id);
    if (!item || item.quantity < dist.quantity) {
      setAlertModal({ isOpen: true, title: 'Error', message: 'No hay inventario suficiente', type: 'error' });
      return;
    }
    execute(async () => {
      await database.addDistribution({
        employee_id: dist.employee_id,
        item_id: dist.item_id,
        size: dist.size,
        quantity: dist.quantity,
        date: dist.date,
        condition: dist.condition,
        authorized_by: dist.authorized_by
      });
      await database.updateInventoryItem(item.id, {
        ...item,
        quantity: item.quantity - dist.quantity
      });
      await onDataChange('distributions', 'inventory');
      setShowModal(null);
    }, 'Error creando distribución', 'Entrega registrada correctamente');
  };

  const handleReturn = (distId) => {
    if (distributions.find(d => d.id === distId)) {
      setReturnPrompt(distId);
    }
  };

  const handleConfirmReturn = (return_date) => {
    const dist = distributions.find(d => d.id === returnPrompt);
    if (!dist) return;
    setReturnPrompt(null);
    execute(async () => {
      await database.updateDistribution(dist.id, { ...dist, return_date });
      const item = inventory.find(i => i.id === dist.item_id);
      if (item) {
        await database.updateInventoryItem(item.id, {
          ...item,
          quantity: item.quantity + dist.quantity
        });
      }
      await onDataChange('distributions', 'inventory');
    }, 'Error devolviendo artículo', 'Devolución registrada correctamente');
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    const exportData = sortedDistributions.map(dist => {
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
    const filename = `ropa_entregada_${date}_${time}.xlsx`;
    
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
              content: <DistributionForm employees={employees} inventory={inventory} onSubmit={handleAdd} onDirtyChange={onFormDirtyChange} />
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
              <th 
                onClick={() => handleSort('date')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Fecha
                  <SortIcon columnKey="date" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('employee')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Funcionario
                  <SortIcon columnKey="employee" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('item')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Tipo de Ropa
                  <SortIcon columnKey="item" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('size')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Talle
                  <SortIcon columnKey="size" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('quantity')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Cantidad
                  <SortIcon columnKey="quantity" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('condition')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Condición
                  <SortIcon columnKey="condition" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('authorized')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Autorizado por
                  <SortIcon columnKey="authorized" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Estado
                  <SortIcon columnKey="status" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedDistributions.map(dist => {
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
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
      <PromptModal
        isOpen={returnPrompt !== null}
        onClose={() => setReturnPrompt(null)}
        onConfirm={handleConfirmReturn}
        title="Registrar Devolución"
        message="Ingresá la fecha de devolución en formato YYYY-MM-DD:"
        placeholder={new Date().toISOString().split('T')[0]}
        required={true}
      />
    </div>
  );
};