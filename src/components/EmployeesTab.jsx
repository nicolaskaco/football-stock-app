import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { EmployeeForm } from '../forms/EmployeeForm';
import { database } from '../utils/database';

export const EmployeesTab = ({ employees, setShowModal, onDataChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = async (emp) => {
    try {
      await database.addEmployee(emp);
      await onDataChange(); // Refresh data from database
      setShowModal(null);
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Error adding employee: ' + error.message);
    }
  };

  const handleEdit = async (emp) => {
    try {
      await database.updateEmployee(emp.id, emp);
      await onDataChange(); // Refresh data from database
      setShowModal(null);
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Error updating employee: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete employee?')) {
      try {
        await database.deleteEmployee(id);
        await onDataChange(); // Refresh data from database
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Error deleting employee: ' + error.message);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Administrar Funcionarios</h2>
        <button 
          onClick={() => setShowModal({
            title: "Agregar Funcionario",
            content: <EmployeeForm onSubmit={handleAdd} />
          })} 
          className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-5 h-5" />
          Agregar Funcionario
        </button>
      </div>
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <input 
          type="text" 
          placeholder="Buscar..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full px-4 py-2 border rounded-lg" 
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(emp => (
          <div key={emp.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              {emp.photo_url || emp.photo_url ? (
                <img 
                  src={emp.photo_url || emp.photo_url} 
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
                  onClick={() => setShowModal({
                  title: "Agregar Funcionario",
                  content: <EmployeeForm employee={emp} onSubmit={handleEdit} />
                })}
                  className="text-blue-600"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(emp.id)} 
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">{emp.name}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Rol:</span> {emp.role}</p>
              <p><span className="font-medium">Id:</span> {emp.id}</p>
              <p><span className="font-medium">Cédula:</span> {emp.gov_id || emp.gov_id}</p>
              <p><span className="font-medium">Talle superior sugerido:</span> {emp.upper_size || emp.upper_size}</p>
              <p><span className="font-medium">Talle inferior sugerido:</span> {emp.lower_size || emp.lower_size}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};