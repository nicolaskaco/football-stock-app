import React from 'react';
import { Package } from 'lucide-react';

export const EmployeeView = ({ employee, distributions, inventory, onLogout }) => {
  const myDistributions = distributions.filter(d => d.employeeId === employee.id);
  const activeDistributions = myDistributions.filter(d => !d.returnDate);
  const returnedDistributions = myDistributions.filter(d => d.returnDate);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">My Items</h1>
            </div>
            <button 
              onClick={onLogout} 
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start gap-4">
            {employee.photoUrl ? (
              <img 
                src={employee.photoUrl} 
                alt={employee.name} 
                className="w-20 h-20 rounded-full object-cover" 
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-3xl font-bold text-blue-600">
                  {employee.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{employee.name}</h2>
              <p className="text-gray-600">{employee.role}</p>
              <div className="mt-2 text-sm text-gray-600">
                <p>Preferred Sizes: Upper {employee.upperSize}, Lower {employee.lowerSize}</p>
                <p>Total Items Received: {myDistributions.length}</p>
                <p>Currently Holding: {activeDistributions.length} items</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Currently Holding</h3>
          {activeDistributions.length === 0 ? (
            <p className="text-gray-500">No active items</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date Received</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Size</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeDistributions.map(dist => {
                    const item = inventory.find(i => i.id === dist.itemId);
                    return (
                      <tr key={dist.id}>
                        <td className="px-4 py-2 text-sm">{dist.date}</td>
                        <td className="px-4 py-2 text-sm font-medium">{item?.name || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm">{dist.size}</td>
                        <td className="px-4 py-2 text-sm">{dist.quantity}</td>
                        <td className="px-4 py-2 text-sm">{dist.condition}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Return History</h3>
          {returnedDistributions.length === 0 ? (
            <p className="text-gray-500">No returned items</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Received</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Returned</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Size</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {returnedDistributions.map(dist => {
                    const item = inventory.find(i => i.id === dist.itemId);
                    return (
                      <tr key={dist.id}>
                        <td className="px-4 py-2 text-sm">{dist.date}</td>
                        <td className="px-4 py-2 text-sm">{dist.returnDate}</td>
                        <td className="px-4 py-2 text-sm font-medium">{item?.name || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm">{dist.size}</td>
                        <td className="px-4 py-2 text-sm">{dist.quantity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};