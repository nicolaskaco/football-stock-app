import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { useMountEffect } from '../hooks/useMountEffect';

export const Modal = ({ children, onClose, title = "Form", isDirty = false }) => {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const scrollRef = useRef(null);

  // Reset scroll to top whenever the modal content changes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [title, children]);

  // Lock page scroll behind the modal so touch drags don't pan the page on mobile
  useMountEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  });

  const handleCloseAttempt = () => {
    isDirty ? setShowCloseConfirm(true) : onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
        onClick={handleCloseAttempt}
      >
        <div
          ref={scrollRef}
          className="bg-white dark:bg-slate-800 rounded-lg max-w-7xl w-full max-h-[90dvh] overflow-y-auto overflow-x-hidden overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 border-b-4 border-yellow-400 pb-2 truncate mr-2">{title}</h3>
            <button onClick={handleCloseAttempt} className="text-gray-500 hover:text-gray-700 flex-shrink-0">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-3 sm:p-6 min-w-0">{children}</div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={onClose}
        title="¿Descartar cambios?"
        message="Los datos ingresados no se guardarán."
        confirmText="Descartar"
        cancelText="Seguir editando"
        type="danger"
      />
    </>
  );
};