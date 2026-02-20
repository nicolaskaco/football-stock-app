import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const COLORS = {
  success: { border: 'border-green-500', icon: 'text-green-500' },
  error:   { border: 'border-red-500',   icon: 'text-red-500'   },
  warning: { border: 'border-yellow-500', icon: 'text-yellow-500' },
  info:    { border: 'border-blue-500',  icon: 'text-blue-500'  },
};

const ToastItem = ({ toast, onClose }) => {
  const Icon = ICONS[toast.type] ?? Info;
  const color = COLORS[toast.type] ?? COLORS.info;

  return (
    <div
      className={`flex items-start gap-3 bg-white rounded-lg shadow-lg border-l-4 ${color.border} px-4 py-3 min-w-[280px] max-w-sm animate-slide-in`}
      role="alert"
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${color.icon}`} />
      <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const Toast = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};
