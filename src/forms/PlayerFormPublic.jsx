import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export const PlayerFormPublic = () => {
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: '',
    email: '',
    category: '',
    representante: '',
    departamento: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('player_responses')
        .insert([formData]);

      if (insertError) throw insertError;

      setSubmitted(true);
      setFormData({
        name: '',
        date_of_birth: '',
        email: '',
        category: '',
        representante: '',
        departamento: ''
      });
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Error al enviar el formulario. Por favor, intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Formulario Enviado!</h2>
          <p className="text-gray-600 mb-6">Gracias por completar el formulario.</p>
          <button
            onClick={() => setSubmitted(false)}
            className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200"
          >
            Enviar Otro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Formulario de Jugador</h1>
          <p className="text-gray-600 mb-6">Por favor complete la siguiente información</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ejemplo@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccione una categoría</option>
                <option value="3era">3era</option>
                <option value="4ta">4ta</option>
                <option value="5ta">5ta</option>
                <option value="S16">S16</option>
                <option value="6ta">6ta</option>
                <option value="7ma">7ma</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Representante *
              </label>
              <input
                type="text"
                name="representante"
                value={formData.representante}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre del representante"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departamento *
              </label>
              <select
                name="departamento"
                value={formData.departamento}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccione un departamento</option>
                <option value="Montevideo">Montevideo</option>
                <option value="Canelones (Ciudad de la Costa)">Canelones (Ciudad de la Costa)</option>
                <option value="Canelones">Canelones</option>
                <option value="Maldonado">Maldonado</option>
                <option value="Rocha">Rocha</option>
                <option value="Treinta y Tres">Treinta y Tres</option>
                <option value="Cerro Largo">Cerro Largo</option>
                <option value="Rivera">Rivera</option>
                <option value="Artigas">Artigas</option>
                <option value="Salto">Salto</option>
                <option value="Paysandú">Paysandú</option>
                <option value="Río Negro">Río Negro</option>
                <option value="Soriano">Soriano</option>
                <option value="Colonia">Colonia</option>
                <option value="San José">San José</option>
                <option value="Flores">Flores</option>
                <option value="Florida">Florida</option>
                <option value="Durazno">Durazno</option>
                <option value="Tacuarembó">Tacuarembó</option>
                <option value="Lavalleja">Lavalleja</option>
                <option value="Argentina">Argentina</option>
                <option value="Brasil">Brasil</option>
                <option value="Colombia">Colombia</option>
                <option value="España">España</option>
                <option value="Venezuela">Venezuela</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200"
            >
              {submitting ? 'Enviando...' : 'Enviar Formulario'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};