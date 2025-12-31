import React from 'react';
import { Package } from 'lucide-react';

export const EmployeeView = ({ employee, distributions, inventory, onLogout }) => {
  const myDistributions = distributions.filter(d => d.employee_id === employee.id);
  const activeDistributions = myDistributions.filter(d => !d.return_date);
  const returnedDistributions = myDistributions.filter(d => d.return_date);

  // Format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">Mi Ropa</h1>
            </div>
            <button 
              onClick={onLogout} 
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start gap-4">
            {employee.photo_url ? (
              <img 
                src={employee.photo_url} 
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
                <p>Talles sugeridos: Superior {employee.upper_size}, Inferior {employee.lower_size}</p>
                <p>Total Ropa devuelta: {myDistributions.length}</p>
                <p>Ropa que posee: {activeDistributions.length} unidad(es)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Ropa que posee actualmente</h3>
          {activeDistributions.length === 0 ? (
            <p className="text-gray-500">Ninguna ropa</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha Recibida</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Talle</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Condición</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeDistributions.map(dist => {
                    const item = inventory.find(i => i.id === dist.item_id);
                    return (
                      <tr key={dist.id}>
                        <td className="px-4 py-2 text-sm">{formatDate(dist.date)}</td>
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
          <h3 className="text-xl font-bold mb-4">Historial de Ropa devuelta</h3>
          {returnedDistributions.length === 0 ? (
            <p className="text-gray-500">Ninguna unidad devuelta</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Recibido</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha de retorno</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Talle</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {returnedDistributions.map(dist => {
                    const item = inventory.find(i => i.id === dist.item_id);
                    return (
                      <tr key={dist.id}>
                        <td className="px-4 py-2 text-sm">{formatDate(dist.date)}</td>
                        <td className="px-4 py-2 text-sm">{formatDate(dist.return_date)}</td>
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