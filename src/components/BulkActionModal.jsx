import React from 'react';
import { X, ArrowRight } from 'lucide-react';

export const BulkActionModal = ({ isOpen, onClose, onConfirm, title, changes, columns }) => {
  if (!isOpen || !changes || changes.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600 mb-4">
            Se modificarán <span className="font-semibold">{changes.length}</span> registro{changes.length !== 1 ? 's' : ''}. Revisá los cambios antes de confirmar.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  {columns.map(col => (
                    <th key={col.key} className="text-left px-4 py-2 font-medium">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {changes.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columns.map(col => (
                      <td key={col.key} className="px-4 py-2">
                        {col.render ? col.render(row) : (
                          <div className="flex items-center gap-2">
                            <span className="text-red-600 line-through">{formatValue(row.before?.[col.key])}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-green-700 font-medium">{formatValue(row.after?.[col.key])}</span>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-black text-yellow-400 rounded-lg hover:bg-gray-800 font-semibold"
          >
            Confirmar cambios ({changes.length})
          </button>
        </div>
      </div>
    </div>
  );
};

function formatValue(val) {
  if (val === true) return '✓';
  if (val === false) return '✗';
  if (val === null || val === undefined) return '—';
  return String(val);
}
