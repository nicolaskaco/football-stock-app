import React, { useState } from 'react';
import { Package } from 'lucide-react';

export const LoginView = ({ onLogin }) => {
  const [isAdmin, setIsAdmin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Package className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Club Atlético Peñarol</h1>
          <p className="text-gray-600">Aplicación para administrar la Ropa</p>
        </div>
        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setIsAdmin(true)} 
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              isAdmin ? 'bg-black text-yellow-400' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Admin
          </button>
          <button 
            onClick={() => setIsAdmin(false)} 
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              !isAdmin ? 'bg-black text-yellow-400' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Employee
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isAdmin ? 'Username' : 'Government ID'}
            </label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg" 
              placeholder={isAdmin ? 'admin' : 'Gov ID'} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isAdmin ? 'Password' : 'Employee ID'}
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg" 
              placeholder={isAdmin ? 'admin123' : 'Employee ID'} 
            />
          </div>
          <button 
            onClick={() => onLogin(username, password, isAdmin)} 
            className="w-full bg-black text-yellow-400 py-3 rounded-lg font-medium hover:bg-gray-800"
          >
            Login
          </button>
        </div>
        {isAdmin && (
          <p className="text-sm text-gray-500 text-center mt-4">
            Default: admin / admin123
          </p>
        )}
      </div>
    </div>
  );
};