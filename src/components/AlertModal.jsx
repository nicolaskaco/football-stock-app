import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

export const AlertModal = ({ isOpen, onClose, title, message, type = 'info' }) => {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="w-12 h-12 text-green-600" />,
    error: <XCircle className="w-12 h-12 text-red-600" />,
    warning: <AlertCircle className="w-12 h-12 text-yellow-600" />,
    info: <Info className="w-12 h-12 text-blue-600" />
  };

  const colors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className={`p-6 border-b ${colors[type]}`}>
          <div className="flex items-center gap-4">
            {icons[type]}
            <h3 className="text-xl font-bold text-gray-900">
              {title || (type === 'error' ? 'Error' : type === 'success' ? 'Éxito' : 'Información')}
            </h3>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700">{message}</p>
        </div>
        
        <div className="p-6 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-800 font-semibold"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};