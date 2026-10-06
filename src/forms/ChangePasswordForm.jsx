import React, { useState } from 'react';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { useFormDirty } from '../hooks/useFormDirty';

const EMPTY = { current: '', password: '', confirm: '' };

export const ChangePasswordForm = ({ currentUser, onClose, onDirtyChange }) => {
  const [formData, setFormData] = useState(EMPTY);
  const [error, setError] = useState('');
  const { execute, isSaving } = useMutation(setError);

  useFormDirty(formData, EMPTY, onDirtyChange);

  const setField = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (formData.password !== formData.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (formData.password === formData.current) {
      setError('La nueva contraseña tiene que ser distinta de la actual.');
      return;
    }

    await execute(async () => {
      await database.changePassword(currentUser.email, formData.current, formData.password);
      database.logActivity('password_changed', currentUser.email, 'user', null, null);
      onDirtyChange?.(false);
      onClose();
    }, 'Error al cambiar la contraseña', 'Contraseña actualizada');
  };

  const inputClass = 'w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:bg-slate-900 dark:text-gray-100';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Contraseña actual</label>
        <input
          type="password"
          autoComplete="current-password"
          value={formData.current}
          onChange={setField('current')}
          required
          disabled={isSaving}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Nueva contraseña</label>
        <input
          type="password"
          autoComplete="new-password"
          value={formData.password}
          onChange={setField('password')}
          required
          disabled={isSaving}
          className={inputClass}
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <div>
        <label className={labelClass}>Confirmar nueva contraseña</label>
        <input
          type="password"
          autoComplete="new-password"
          value={formData.confirm}
          onChange={setField('confirm')}
          required
          disabled={isSaving}
          className={inputClass}
          placeholder="Repetir contraseña"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full bg-black text-yellow-400 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {isSaving ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
};
