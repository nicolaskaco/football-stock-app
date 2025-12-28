import React, { useState } from 'react';

export const ReportsTab = ({ distributions, employees, inventory }) => {
  const [reportType, setReportType] = useState('employee');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const employeeDistributions = selectedEmployee 
    ? distributions.filter(d => d.employeeId === selectedEmployee) 
    : [];
  const selectedEmp = employees.find(e => e.id === selectedEmployee);

  const allDistributions = employees.map(emp => ({
    employee: emp,
    distributions: distributions.filter(d => d.employeeId === emp.id)
  }));

  const monthlyStats = distributions.reduce((acc, dist) => {
    const month = dist.date.substring(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const inventoryByCategory = inventory.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { total: 0, lowStock: 0 };
    }
    acc[item.category].total += item.quantity;
    if (item.quantity <= item.minStock) {
      acc[item.category].lowStock += 1;
    }
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Reports</h2>
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <select 
          value={reportType} 
          onChange={(e) => setReportType(e.target.value)} 
          className="px-4 py-2 border rounded-lg"
        >
          <option value="employee">Employee Report</option>
          <option value="all">All Employees Summary</option>
          <option value="inventory">Inventory Status</option>
          <option value="monthly">Monthly Distribution</option>
        </select>
      </div>

      {reportType === 'employee' && (
        <div>
          <select 
            value={selectedEmployee} 
            onChange={(e) => setSelectedEmployee(e.target.value)} 
            className="mb-6 px-4 py-2 border rounded-lg"
          >
            <option value="">Select Employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          {selectedEmp && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">
                {selectedEmp.name} - Distribution History
              </h3>
              <div className="mb-4 text-sm text-gray-600">
                <p>Role: {selectedEmp.role}</p>
                <p>Preferred Sizes: Upper {selectedEmp.upperSize}, Lower {selectedEmp.lowerSize}</p>
                <p>Total Items Received: {employeeDistributions.length}</p>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Size</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Condition</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employeeDistributions.map(dist => {
                    const item = inventory.find(i => i.id === dist.itemId);
                    return (
                      <tr key={dist.id}>
                        <td className="px-4 py-2 text-sm">{dist.date}</td>
                        <td className="px-4 py-2 text-sm">{item?.name || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm">{dist.size}</td>
                        <td className="px-4 py-2 text-sm">{dist.quantity}</td>
                        <td className="px-4 py-2 text-sm">{dist.condition}</td>
                        <td className="px-4 py-2 text-sm">
                          {dist.returnDate ? `Returned ${dist.returnDate}` : 'Active'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {reportType === 'all' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">All Employees Distribution Summary</h3>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Employee</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Role</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total Items</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Active</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Returned</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allDistributions.map(({ employee, distributions: dists }) => (
                <tr key={employee.id}>
                  <td className="px-4 py-2 text-sm font-medium">{employee.name}</td>
                  <td className="px-4 py-2 text-sm">{employee.role}</td>
                  <td className="px-4 py-2 text-sm">{dists.length}</td>
                  <td className="px-4 py-2 text-sm">
                    {dists.filter(d => !d.returnDate).length}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {dists.filter(d => d.returnDate).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reportType === 'inventory' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Inventory Status by Category</h3>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total Items</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Low Stock Items</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(inventoryByCategory).map(([category, stats]) => {
                const categoryItems = inventory.filter(i => i.category === category);
                return (
                  <tr key={category}>
                    <td className="px-4 py-2 text-sm font-medium">{category}</td>
                    <td className="px-4 py-2 text-sm">{categoryItems.length}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={stats.lowStock > 0 ? 'text-red-600 font-semibold' : ''}>
                        {stats.lowStock}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{stats.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reportType === 'monthly' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Monthly Distribution Statistics</h3>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Month</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total Distributions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(monthlyStats)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([month, count]) => (
                  <tr key={month}>
                    <td className="px-4 py-2 text-sm font-medium">{month}</td>
                    <td className="px-4 py-2 text-sm">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};