import React, { useState, useEffect } from 'react';
import { Type, Save } from 'lucide-react';

export const NameVisualEditor = ({ player, onSave, onClose }) => {
  const [selectedParts, setSelectedParts] = useState([]);
  const [customText, setCustomText] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  // Split name into parts (words)
  const nameParts = player.name.split(' ').filter(part => part.trim() !== '');

  useEffect(() => {
    // Initialize with current name_visual if it exists
    if (player.name_visual) {
      setCustomText(player.name_visual);
      setUseCustom(true);
    }
  }, [player.name_visual]);

  const toggleNamePart = (index) => {
    setSelectedParts(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index].sort((a, b) => a - b)
    );
    setUseCustom(false);
  };

  const getPreview = () => {
    if (useCustom) {
      return customText.trim() || player.name;
    }
    if (selectedParts.length === 0) {
      return player.name; // Default to full name if nothing selected
    }
    return selectedParts.map(i => nameParts[i]).join(' ');
  };

  const handleSave = async () => {
    const nameVisual = getPreview();
    await onSave(nameVisual);
  };

  const handleCustomTextChange = (e) => {
    setCustomText(e.target.value);
    setUseCustom(true);
    setSelectedParts([]);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-6">
      {/* Current Name Display */}
      <div className="bg-gray p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-yellow-400">
          Nombre Completo Actual
        </h3>
        <p className="text-2xl font-semibold text-gray-800">{player.name}</p>
      </div>

      {/* Selection Method Tabs */}
      <div className="bg-gray p-6 rounded-lg shadow-md">
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setUseCustom(false)}
            className={`pb-2 px-4 font-medium ${
              !useCustom 
                ? 'border-b-2 border-yellow-600 text-yellow-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Seleccionar Partes
          </button>
          <button
            onClick={() => setUseCustom(true)}
            className={`pb-2 px-4 font-medium ${
              useCustom 
                ? 'border-b-2 border-yellow-600 text-yellow-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Texto Personalizado
          </button>
        </div>

        {!useCustom ? (
          /* Select Name Parts */
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Selecciona las partes del nombre a mostrar:
            </h4>
            <div className="flex flex-wrap gap-3">
              {nameParts.map((part, index) => (
                <button
                  key={index}
                  onClick={() => toggleNamePart(index)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedParts.includes(index)
                      ? 'bg-yellow-600 text-gray'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {part}
                </button>
              ))}
            </div>
            {selectedParts.length === 0 && (
              <p className="text-sm text-gray-500 mt-3">
                * Sin selección se mostrará el nombre completo
              </p>
            )}
          </div>
        ) : (
          /* Custom Text Input */
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Escribe el nombre a mostrar:
            </label>
            <input
              type="text"
              value={customText}
              onChange={handleCustomTextChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
              placeholder="Ej: Alan Benthencourt"
            />
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-gradient-to-r from-yellow-50 to-purple-50 p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Type className="w-5 h-5 text-yellow-600" />
          <h4 className="text-sm font-medium text-gray-700">Vista Previa:</h4>
        </div>
        <p className="text-3xl font-bold text-gray-900">{getPreview()}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 to-black text-yellow-400 py-3 rounded-lg hover:from-black hover:to-gray-900 font-bold transition-all"
        >
          <Save className="w-5 h-5" />
          Guardar Nombre Visual
        </button>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};