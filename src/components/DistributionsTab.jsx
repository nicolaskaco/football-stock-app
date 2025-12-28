import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { DistributionForm } from '../forms/DistributionForm';

export const DistributionsTab = ({ 
  distributions, 
  employees, 
  inventory, 
  saveDistributions, 
  saveInventory, 
  setShowModal 
}) => {
  const [filter, setFilter] = useState('all');
  const filtered = distributions.filter(d => 
    filter === 'all' || 
    (filter === 'active' && !d.returnDate) || 
    (filter === 'returned' && d.returnDate)
  );

  const handleAdd = (dist) => {
    const item = inventory.find(i => i.id === dist.itemId);
    if (item && item.quantity >= dist.quantity) {
      saveInventory(inventory.map(i => 
        i.id === dist.itemId ? { ...i, quantity: i.quantity - dist.quantity } : i
      ));
      saveDistributions([...distributions, { ...dist, id: Date.now().toString() }]);
      setShowModal(null);
    } else {
      alert('Insufficient inventory');
    }
  };

  const handleReturn = (distId) => {
    const dist = distributions.find(d => d.id === distId);
    if (dist) {
      const returnDate = prompt(
        'Return date (YYYY-MM-DD):', 
        new Date().toISOString().split('T')[0]
      );
      if (returnDate) {
        saveDistributions(distributions.map(d => 
          d.id === distId ? { ...d, returnDate } : d
        ));
        saveInventory(inventory.map(i => 
          i.id === dist.itemId ? { ...i, quantity: i.quantity + dist.quantity } : i
        ));
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Distributions</h2>
        <button 
          onClick={() => setShowModal(
            <DistributionForm 
              employees={employees} 
              inventory={inventory} 
              onSubmit={handleAdd} 
            />
          )} 
          className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-900"
        >
          <Plus className="w-5 h-5" />
          New Distribution
        </button>
      </div>
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)} 
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
        </select>
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Authorized</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(dist => {
              const emp = employees.find(e => e.id === dist.employeeId);
              const item = inventory.find(i => i.id === dist.itemId);
              return (
                <tr key={dist.id}>
                  <td className="px-6 py-4 text-sm">{dist.date}</td>
                  <td className="px-6 py-4 text-sm font-medium">{emp?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">{item?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">{dist.size}</td>
                  <td className="px-6 py-4 text-sm">{dist.quantity}</td>
                  <td className="px-6 py-4 text-sm">{dist.condition}</td>
                  <td className="px-6 py-4 text-sm">{dist.authorizedBy}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      dist.returnDate ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {dist.returnDate ? 'Returned' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {!dist.returnDate && (
                      <button 
                        onClick={() => handleReturn(dist.id)} 
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Return
                      </button>
                    )}
                    {dist.returnDate && (
                      <span className="text-gray-400 text-sm">{dist.returnDate}</span>
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