import React, { useState } from 'react';

export const TorneoForm = ({ torneo, onSubmit, dirigentes = [], players = [], employees = [], readOnly = false }) => {
  const [formData, setFormData] = useState(torneo || {
    name: '',
    country: '',
    city: '',
    categoria: '',
    start_date: '',
    end_date: ''
  });

  const [selectedDirigentes, setSelectedDirigentes] = useState(
    torneo?.torneo_dirigentes?.map(td => td.dirigente_id) || []
  );

  const [selectedPlayers, setSelectedPlayers] = useState(
    torneo?.torneo_players?.map(tp => tp.player_id) || []
  );

  const [selectedEmployees, setSelectedEmployees] = useState(
    torneo?.torneo_funcionarios?.map(tf => tf.employee_id) || []
  );

  const [filterCategoria, setFilterCategoria] = useState('all');

  const categorias = ['3era', '4ta', '5ta', 'S16', '6ta', '7ma', 'Sub13'];

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit(formData, selectedDirigentes, selectedPlayers, selectedEmployees);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDirigente = (dirigenteId) => {
    if (readOnly) return;
    setSelectedDirigentes(prev => 
      prev.includes(dirigenteId)
        ? prev.filter(id => id !== dirigenteId)
        : [...prev, dirigenteId]
    );
  };

  const togglePlayer = (playerId) => {
    if (readOnly) return;
    setSelectedPlayers(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const toggleEmployee = (employeeId) => {
    if (readOnly) return;
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const filteredPlayers = players.filter(p => 
    filterCategoria === 'all' || p.categoria === filterCategoria
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-lg">
      {/* BASIC INFORMATION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">
          Información del Torneo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Torneo *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Durazno y Flores 2026"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              País
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Uruguay"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ciudad
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Durazno, Flores"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Seleccione Categoría</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Inicio *
            </label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Fin *
            </label>
            <input
              type="date"
              required
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              disabled={readOnly}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* FUNCIONARIOS SELECTION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">
          Funcionarios
        </h3>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {employees.length === 0 ? (
            <p className="text-gray-500">No hay funcionarios disponibles</p>
          ) : (
            employees.map(employee => (
              <label
                key={employee.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  readOnly ? 'cursor-not-allowed opacity-70' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedEmployees.includes(employee.id)}
                  onChange={() => toggleEmployee(employee.id)}
                  disabled={readOnly}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div>
                  <p className="font-medium">{employee.name}</p>
                  {employee.role && (
                    <p className="text-sm text-gray-600">{employee.role}</p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
        {selectedEmployees.length > 0 && (
          <p className="mt-3 text-sm text-gray-600">
            {selectedEmployees.length} funcionario(s) seleccionado(s)
          </p>
        )}
      </div>

      {/* DIRIGENTES SELECTION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">
          Dirigentes
        </h3>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {dirigentes.length === 0 ? (
            <p className="text-gray-500">No hay dirigentes disponibles</p>
          ) : (
            dirigentes.map(dirigente => (
              <label
                key={dirigente.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  readOnly ? 'cursor-not-allowed opacity-70' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDirigentes.includes(dirigente.id)}
                  onChange={() => toggleDirigente(dirigente.id)}
                  disabled={readOnly}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div>
                  <p className="font-medium">{dirigente.name}</p>
                  {dirigente.rol && (
                    <p className="text-sm text-gray-600">{dirigente.rol}</p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
        {selectedDirigentes.length > 0 && (
          <p className="mt-3 text-sm text-gray-600">
            {selectedDirigentes.length} dirigente(s) seleccionado(s)
          </p>
        )}
      </div>

      {/* PLAYERS SELECTION */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-4 border-yellow-400">
          Jugadores
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Categoría
          </label>
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las Categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredPlayers.length === 0 ? (
            <p className="text-gray-500">No hay jugadores disponibles</p>
          ) : (
            filteredPlayers.map(player => (
              <label
                key={player.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  readOnly ? 'cursor-not-allowed opacity-70' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(player.id)}
                  onChange={() => togglePlayer(player.id)}
                  disabled={readOnly}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <p className="font-medium">{player.name}</p>
                  <div className="flex gap-2 text-sm text-gray-600">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {player.categoria}
                    </span>
                    {player.posicion && (
                      <span className="text-gray-500">{player.posicion}</span>
                    )}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
        {selectedPlayers.length > 0 && (
          <p className="mt-3 text-sm text-gray-600">
            {selectedPlayers.length} jugador(es) seleccionado(s)
          </p>
        )}
      </div>
      

      {readOnly ? (
        <div className="w-full bg-gray-100 text-gray-600 py-4 rounded-lg text-center font-bold text-lg">
          Modo Solo Lectura
        </div>
      ) : (
        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isSaving ? 'Guardando...' : `${torneo ? '✓ Actualizar' : '+ Agregar'} Torneo`}
        </button>
      )}
    </form>
  );
};