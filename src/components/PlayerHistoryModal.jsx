import React, { useState, useEffect } from 'react';
import { X, Clock, TrendingUp } from 'lucide-react';
import { database } from '../utils/database';

export const PlayerHistoryModal = ({ playerId, playerName, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [playerId]);

  const loadHistory = async () => {
    try {
      const data = await database.getPlayerHistory(playerId);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
    setLoading(false);
  };

  const formatFieldName = (fieldName) => {
    const names = {
      contrato: 'Contrato',
      viatico: 'Viático',
      complemento: 'Complemento'
    };
    return names[fieldName] || fieldName;
  };

  const formatValue = (fieldName, value) => {
    if (value === null) return 'N/A';
    if (fieldName === 'contrato') return value === 'true' ? 'Sí' : 'No';
    if (fieldName === 'viatico' || fieldName === 'complemento') return `$${parseInt(value).toLocaleString()}`;
    return value;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-UY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Historial de Cambios</h3>
              <p className="text-sm text-gray-600">{playerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando historial...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay cambios registrados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record) => (
                <div key={record.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-800">
                        {formatFieldName(record.field_name)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(record.changed_at)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Valor Anterior</p>
                      <p className="text-sm font-medium text-red-600">
                        {formatValue(record.field_name, record.old_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Valor Nuevo</p>
                      <p className="text-sm font-medium text-green-600">
                        {formatValue(record.field_name, record.new_value)}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    Modificado por: <span className="font-medium">{record.changed_by}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};