import React, { useState, useRef } from 'react';
import { Lock, Download } from 'lucide-react';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { calculateTotal } from '../utils/playerUtils';
import * as XLSX from 'xlsx';

const ContactoInput = ({ value, loading, onSave }) => {
  const [draft, setDraft] = useState(value);
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setDraft(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSave(val), 800);
  };

  return (
    <div className="pb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Persona de contacto</label>
      <input
        type="text"
        value={draft}
        onChange={handleChange}
        placeholder="Martín Arroyo"
        disabled={loading}
        className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
      />
    </div>
  );
};

const EXPORT_CATEGORIAS = ['4ta', '5ta', 'S16', '6ta', '7ma', 'Sub13'];

export const TesoreroTab = ({ players, appSettings, onDataChange }) => {
  const { execute, isSaving } = useMutation();

  const s = (key) => appSettings[key] === 'true';

  const handleToggle = (key, currentValue) =>
    execute(
      async () => {
        await database.updateAppSetting(key, !currentValue);
        await onDataChange('appSettings');
      },
      'Error al guardar la configuración',
      'Configuración actualizada'
    );

  const handleExport = () => {
    const workbook = XLSX.utils.book_new();

    EXPORT_CATEGORIAS.forEach(cat => {
      const catPlayers = players
        .filter(p => p.categoria === cat && !p.contrato)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es-UY'));

      if (catPlayers.length === 0) return;

      const data = catPlayers.map(p => ({
        'Nombre': p.name || '',
        'Cédula': p.gov_id || '',
        'Total Viático': calculateTotal(p),
        'Categoría': p.categoria || '',
      }));

      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, cat);
    });

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    XLSX.writeFile(workbook, `Viaticos-Formativas-${dd}-${mm}-${yyyy}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tesorero</h2>
        <p className="text-sm text-gray-500 mt-1">
          Gestión de viáticos y exportación de datos financieros.
        </p>
      </div>

      {/* Congelar Viáticos */}
      <div className={`rounded-lg shadow px-6 py-2 ${s('viaticos_congelados') ? 'bg-amber-50 border border-amber-300' : 'bg-white'}`}>
        <div className="flex items-center justify-between py-4">
          <div className="flex items-start gap-3">
            <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${s('viaticos_congelados') ? 'text-amber-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium text-gray-900">Congelar Viáticos</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Bloquea la creación y modificación de viáticos, complementos y contratos en toda la app.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('viaticos_congelados', s('viaticos_congelados'))}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 flex-shrink-0 ml-4 ${
              s('viaticos_congelados') ? 'bg-amber-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                s('viaticos_congelados') ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {s('viaticos_congelados') && (
          <ContactoInput
            value={appSettings['viaticos_congelados_contacto'] || ''}
            loading={isSaving}
            onSave={(val) =>
              execute(
                async () => {
                  await database.updateAppSetting('viaticos_congelados_contacto', val);
                  await onDataChange('appSettings');
                },
                'Error al guardar contacto',
                'Contacto actualizado'
              )
            }
          />
        )}
      </div>

      {/* Export Excel */}
      <div className="bg-white rounded-lg shadow px-6 py-6">
        <h3 className="font-medium text-gray-900 mb-2">Exportar Viáticos</h3>
        <p className="text-sm text-gray-500 mb-4">
          Genera un archivo Excel con los viáticos de todas las categorías formativas (excluye 3era y jugadores con contrato).
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-800 text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Descargar Excel
        </button>
      </div>
    </div>
  );
};
