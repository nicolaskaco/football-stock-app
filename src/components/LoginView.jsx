import React, { useState } from 'react';
import { Package } from 'lucide-react';
import logo from '../../public/logo.jpeg';

export const LoginView = ({ onLogin }) => {
  const [isAdmin, setIsAdmin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(email, password, isAdmin);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-600 to-gray-800 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="Ropa CAP logo"
            className="w-8 h-8 object-contain"
          />
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
            Administrador
          </button>
          <button 
            onClick={() => setIsAdmin(false)} 
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              !isAdmin ? 'bg-black text-yellow-400' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Funcionario
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isAdmin ? 'Email' : 'Cédula o Pasaporte'}
            </label>
            <input 
              type={isAdmin ? 'email' : 'text'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={isAdmin ? 'admin@test.com' : 'Ingrese su cédula o pasaporte'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isAdmin ? 'Contraseña' : 'Número de Funcionario'}
            </label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={isAdmin ? 'Ingrese contraseña' : 'Ingrese número de Funcionario'}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-black text-yellow-400 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar'}
          </button>
        </form>

        {isAdmin && (
          <div className="mt-4 text-center">
            <button
              onClick={() => alert('Contact your administrator to reset your password')}
              className="text-sm text-yellow-600 hover:text-yellow-700"
            >
              Olvidó contraseña?
            </button>
          </div>
        )}
      </div>
    </div>
  );
};