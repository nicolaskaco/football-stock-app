import React, { useState } from 'react';

export const PromptModal = ({ isOpen, onClose, onConfirm, title, message, placeholder = '', required = false }) => {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (required && !inputValue.trim()) {
      return; // Don't close if required and empty
    }
    onConfirm(inputValue);
    setInputValue('');
  };

  const handleCancel = () => {
    setInputValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 mb-4">{message}</p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleConfirm();
            }}
          />
          {required && !inputValue.trim() && (
            <p className="text-xs text-red-600 mt-1">Este campo es obligatorio</p>
          )}
        </div>
        
        <div className="p-6 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={required && !inputValue.trim()}
            className="px-6 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};