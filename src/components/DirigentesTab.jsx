import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Users, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { DirigenteForm } from '../forms/DirigenteForm';
import { database } from '../utils/database';
import * as XLSX from 'xlsx';
import { AlertModal } from './AlertModal';

export const DirigentesTab = ({ dirigentes = [], setShowModal, onDataChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState('all');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'info' });

  const roles = [
    'Presidente Formativas',
    'Ejecutivo Formativas',
    'Presidente de Categoría',
    'Ayudante de Categoría',
    'Tesorero Formativas',
    'Infraestructura Formativas',
    'Delegado',
    'Marketing y Comunicación'
  ];

  const categorias = ['3era', '4ta', '5ta', 'S16', '6ta', '7ma', 'Captación'];

  // Safety check
  const safeDirigentes = Array.isArray(dirigentes) ? dirigentes : [];

  // Filter dirigentes
  const filtered = safeDirigentes.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (d.cedula && d.cedula.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRol = filterRol === 'all' || d.rol === filterRol;
    const matchesCategoria = filterCategoria === 'all' || d.categoria === filterCategoria;
    
    return matchesSearch && matchesRol && matchesCategoria;
  });

  // Calculate age
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '-';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const sortedDirigentes = [...filtered].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue, bValue;

    switch (sortConfig.key) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'cedula':
        aValue = a.cedula?.toLowerCase() || '';
        bValue = b.cedula?.toLowerCase() || '';
        break;
      case 'age':
        aValue = calculateAge(a.date_of_birth);
        bValue = calculateAge(b.date_of_birth);
        break;
      case 'rol':
        aValue = a.rol?.toLowerCase() || '';
        bValue = b.rol?.toLowerCase() || '';
        break;
      case 'categoria':
        aValue = categorias.indexOf(a.categoria);
        bValue = categorias.indexOf(b.categoria);
        if (aValue === -1) aValue = 999;
        if (bValue === -1) bValue = 999;
        break;
      case 'celular':
        aValue = a.celular || 0;
        bValue = b.celular || 0;
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

  const handleAdd = async (dirigente) => {
    try {
      await database.addDirigente(dirigente);
      await onDataChange('dirigentes');
      setShowModal(null);
    } catch (error) {
      console.error('Error adding dirigente:', error);
      setAlertModal({ isOpen: true, title: 'Error', message: 'Error agregando dirigente: ' + error.message, type: 'error' });
    }
  };

  const handleEdit = async (dirigente) => {
    try {
      await database.updateDirigente(dirigente.id, dirigente);
      await onDataChange('dirigentes');
      setShowModal(null);
    } catch (error) {
      console.error('Error updating dirigente:', error);
      setAlertModal({ isOpen: true, title: 'Error', message: 'Error actualizando dirigente: ' + error.message, type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este dirigente?')) {
      try {
        await database.deleteDirigente(id);
        await onDataChange('dirigentes');
      } catch (error) {
        console.error('Error deleting dirigente:', error);
        setAlertModal({ isOpen: true, title: 'Error', message: 'Error eliminando dirigente: ' + error.message, type: 'error' });
      }
    }
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    const exportData = sortedDirigentes.map(dirigente => ({
      'Nombre': dirigente.name,
      'Cédula': dirigente.cedula || '-',
      'Rol': dirigente.rol || '-',
      'Categoría': dirigente.categoria || '-',
      'Celular': dirigente.celular || '-',
      'Edad': calculateAge(dirigente.date_of_birth),
      'Matrícula Auto': dirigente.matricula_auto || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dirigentes');
    
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `dirigentes_${date}_${time}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Dirigentes</h2>
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
              title: "Agregar Nuevo Dirigente",
              content: <DirigenteForm onSubmit={handleAdd} />
            })} 
            className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            <Plus className="w-5 h-5" />
            Agregar Dirigente
          </button>
        </div>
      </div>

      {/* Summary Section */}
      {filtered.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">Resumen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Dirigentes</p>
              <p className="text-2xl font-bold text-blue-600">{filtered.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Roles Únicos</p>
              <p className="text-2xl font-bold text-green-600">
                {new Set(filtered.filter(d => d.rol).map(d => d.rol)).size}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Categorías Cubiertas</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(filtered.filter(d => d.categoria).map(d => d.categoria)).size}
              </p>
            </div>
          </div>
        </div>
      )}
            
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex gap-4 flex-wrap">
          <input 
            type="text" 
            placeholder="Buscar por nombre o cédula..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg" 
          />
          <select 
            value={filterRol} 
            onChange={(e) => setFilterRol(e.target.value)} 
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">Todos los Roles</option>
            {roles.map(rol => (
              <option key={rol} value={rol}>{rol}</option>
            ))}
          </select>
          <select 
            value={filterCategoria} 
            onChange={(e) => setFilterCategoria(e.target.value)} 
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">Todas las Categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th 
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Nombre
                  <SortIcon columnKey="name" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('cedula')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Cédula
                  <SortIcon columnKey="cedula" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('age')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Edad
                  <SortIcon columnKey="age" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('rol')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Rol
                  <SortIcon columnKey="rol" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('categoria')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Categoría
                  <SortIcon columnKey="categoria" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('celular')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center gap-2">
                  Celular
                  <SortIcon columnKey="celular" />
                </div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedDirigentes.map(dirigente => (
              <tr key={dirigente.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{dirigente.name}</td>
                <td className="px-6 py-4 text-sm">{dirigente.cedula || '-'}</td>
                <td className="px-6 py-4 text-sm">{calculateAge(dirigente.date_of_birth)}</td>
                <td className="px-6 py-4">
                  {dirigente.rol ? (
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                      {dirigente.rol}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {dirigente.categoria ? (
                    <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
                      {dirigente.categoria}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">{dirigente.celular || '-'}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowModal({
                        title: `Editar Dirigente: ${dirigente.name}`,
                        content: <DirigenteForm dirigente={dirigente} onSubmit={handleEdit} />
                      })} 
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(dirigente.id)} 
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron dirigentes</p>
          </div>
        )}
      </div>
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};