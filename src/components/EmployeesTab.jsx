import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { EmployeeForm } from '../forms/EmployeeForm';

export const EmployeesTab = ({ employees, saveEmployees, setShowModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Employee Management</h2>
        <button 
          onClick={() => setShowModal(
            <EmployeeForm 
              onSubmit={(emp) => { 
                saveEmployees([...employees, { ...emp, id: Date.now().toString() }]); 
                setShowModal(null); 
              }} 
            />
          )} 
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Employee
        </button>
      </div>
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <input 
          type="text" 
          placeholder="Search..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full px-4 py-2 border rounded-lg" 
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(emp => (
          <div key={emp.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              {emp.photoUrl ? (
                <img 
                  src={emp.photoUrl} 
                  alt={emp.name} 
                  className="w-16 h-16 rounded-full object-cover" 
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {emp.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowModal(
                    <EmployeeForm 
                      employee={emp} 
                      onSubmit={(updated) => { 
                        saveEmployees(employees.map(e => e.id === updated.id ? updated : e)); 
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
                    if (window.confirm('Delete?')) saveEmployees(employees.filter(e => e.id !== emp.id)); 
                  }} 
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">{emp.name}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Role:</span> {emp.role}</p>
              <p><span className="font-medium">ID:</span> {emp.id}</p>
              <p><span className="font-medium">Gov ID:</span> {emp.govId}</p>
              <p><span className="font-medium">Upper:</span> {emp.upperSize}</p>
              <p><span className="font-medium">Lower:</span> {emp.lowerSize}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};