import React from 'react';
import { Users, Shield, FileText } from 'lucide-react';

export const ComisionDetailView = ({ comision }) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-black text-yellow-400 p-6 rounded-lg shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8" />
          <h2 className="text-3xl font-bold">{comision.name}</h2>
        </div>
      </div>

      {/* Description */}
      {comision.description && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-yellow-400">
            <FileText className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-900">Descripción</h3>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {comision.description}
          </p>
        </div>
      )}

      {/* Dirigentes */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-yellow-400">
          <Users className="w-6 h-6 text-yellow-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Dirigentes ({comision.comision_dirigentes?.length || 0})
          </h3>
        </div>
        {comision.comision_dirigentes && comision.comision_dirigentes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {comision.comision_dirigentes.map((cd, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="w-10 h-10 bg-yellow-600 text-black rounded-full flex items-center justify-center font-bold">
                  {cd.dirigentes?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{cd.dirigentes?.name || 'Sin nombre'}</p>
                  {cd.dirigentes?.rol && (
                    <p className="text-sm text-black">{cd.dirigentes.rol}</p>
                  )}
                  {cd.dirigentes?.categoria && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                      {cd.dirigentes.categoria}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No hay dirigentes asignados</p>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="bg-gradient-to-r from-yellow-50 to-purple-50 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Estadísticas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {comision.comision_dirigentes?.length || 0}
            </p>
            <p className="text-sm text-gray-600">Dirigentes</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {comision.description ? comision.description.length : 0}
            </p>
            <p className="text-sm text-gray-600">Caracteres en Descripción</p>
          </div>
        </div>
      </div>
    </div>
  );
};