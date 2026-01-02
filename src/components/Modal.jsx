import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ children, onClose, title = "Form" }) => (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
    onClick={onClose}
  >
    <div 
      className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-900 border-b-4 border-yellow-400 pb-2">{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);