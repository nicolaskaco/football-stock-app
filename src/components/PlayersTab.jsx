import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { PlayerForm } from '../forms/PlayerForm';
import { database } from '../utils/database';

export const PlayersTab = ({ players = [], setShowModal, onDataChange }) => {  // ADD = []
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');

  const categorias = ['3era', '4ta', 'S16', '5ta', '6ta', '7ma'];

  // Add safety check
  const safePlayers = Array.isArray(players) ? players : [];

  const filtered = safePlayers.filter(p => {  // CHANGE FROM players TO safePlayers
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.gov_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = filterCategoria === 'all' || p.categoria === filterCategoria;
    return matchesSearch && matchesCategoria;
  });

  const handleAdd = async (player) => {
    try {
      await database.addPlayer(player);
      await onDataChange();
      setShowModal(null);
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Error agregando jugador: ' + error.message);
    }
  };

  const handleEdit = async (player) => {
    try {
      await database.updatePlayer(player.id, player);
      await onDataChange();
      setShowModal(null);
    } catch (error) {
      console.error('Error updating player:', error);
      alert('Error actualizando jugador: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este jugador?')) {
      try {
        await database.deletePlayer(id);
        await onDataChange();
      } catch (error) {
        console.error('Error deleting player:', error);
        alert('Error eliminando jugador: ' + error.message);
      }
    }
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Jugadores</h2>
        <button 
          onClick={() => setShowModal({
            title: "Agregar Nuevo Jugador",
            content: <PlayerForm onSubmit={handleAdd} />
          })} 
          className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-5 h-5" />
          Agregar Jugador
        </button>
      </div>

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cédula</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Edad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contrato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Viático</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Complemento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Banco</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(player => (
              <tr key={player.id}>
                <td className="px-6 py-4 font-medium">{player.name}</td>
                <td className="px-6 py-4 text-sm">{player.gov_id}</td>
                <td className="px-6 py-4 text-sm">{calculateAge(player.date_of_birth)} años</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                    {player.categoria}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {player.contrato ? (
                    <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                      Sí
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                      No
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {player.contrato ? '-' : `$${player.viatico.toLocaleString()}`}
                </td>
                <td className="px-6 py-4 text-sm">
                  {player.contrato ? '-' : `$${player.complemento.toLocaleString()}`}
                </td>
                <td className="px-6 py-4 text-sm">{player.bank || '-'}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowModal({
                        title: `Editar Jugador: ${player.name}`,
                        content: <PlayerForm player={player} onSubmit={handleEdit} />
                      })} 
                      className="text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(player.id)} 
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

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron jugadores</p>
          </div>
        )}
      </div>
    </div>
  );
};