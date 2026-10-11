import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { useFormDirty } from '../hooks/useFormDirty';
import { RivalBadge } from '../components/ui/RivalBadge';
import { RIVAL_BADGE_ACCEPT, validateRivalBadgeFile } from '../utils/rivalBadges';

export const RivalForm = ({ rival, onSubmit, onDirtyChange }) => {
  // badgeFileName / removeBadge viven en formData para que cuenten como cambios sin guardar
  const [formData, setFormData] = useState(rival || { name: '' });
  const [badgeFile, setBadgeFile] = useState(null);
  const [badgePreview, setBadgePreview] = useState(null);
  const [badgeError, setBadgeError] = useState(null);
  const fileInputRef = useRef(null);
  useFormDirty(formData, rival, onDirtyChange);

  const hasBadge = badgeFile || (rival?.badge_path && !formData.removeBadge);

  const handleBadgeChange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    const error = validateRivalBadgeFile(file);
    if (error) {
      setBadgeError(`${file.name}: ${error}`);
      return;
    }
    if (badgePreview) URL.revokeObjectURL(badgePreview);
    setBadgeError(null);
    setBadgeFile(file);
    setBadgePreview(URL.createObjectURL(file));
    setFormData({ ...formData, badgeFileName: file.name, removeBadge: undefined });
  };

  const handleBadgeRemove = () => {
    if (badgePreview) URL.revokeObjectURL(badgePreview);
    setBadgeError(null);
    setBadgeFile(null);
    setBadgePreview(null);
    setFormData({ ...formData, badgeFileName: undefined, removeBadge: rival?.badge_path ? true : undefined });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name: formData.name }, { badgeFile, removeBadge: !!formData.removeBadge });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Nombre del Rival *
        </label>
        <input
          type="text"
          required
          placeholder="ej: Nacional, Liverpool"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Escudo
        </label>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
            <RivalBadge
              rival={formData.removeBadge ? { name: formData.name } : rival}
              src={badgePreview}
              size="lg"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <Upload className="w-4 h-4" />
              {hasBadge ? 'Cambiar escudo' : 'Subir escudo'}
            </button>
            {hasBadge && (
              <button
                type="button"
                onClick={handleBadgeRemove}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <X className="w-4 h-4" />
                Quitar escudo
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={RIVAL_BADGE_ACCEPT}
              className="hidden"
              onChange={handleBadgeChange}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          PNG, JPG, WEBP o SVG de hasta 512 KB. Mejor cuadrado y con fondo transparente.
        </p>
        {badgeError && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{badgeError}</p>}
      </div>
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-4 rounded-lg hover:from-black hover:to-gray-900 font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200"
      >
        {rival ? 'Actualizar' : 'Agregar'} Rival
      </button>
    </form>
  );
};
