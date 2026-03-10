import React, { useRef, useState } from 'react';
import { Upload, X, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CATEGORIAS, DEPARTAMENTOS, BANCOS, POSICIONES_JUGADOR } from '../utils/constants';

const FIELD_MAP = {
  'nombre': 'name',
  'nombre completo': 'name',
  'cedula': 'gov_id',
  'cédula': 'gov_id',
  'documento': 'gov_id',
  'categoria': 'categoria',
  'categoría': 'categoria',
  'fecha de nacimiento': 'date_of_birth',
  'fecha nacimiento': 'date_of_birth',
  'nacimiento': 'date_of_birth',
  'posicion': 'posicion',
  'posición': 'posicion',
  'departamento': 'departamento',
  'celular': 'celular',
  'email': 'email',
  'representante': 'representante',
  'banco': 'bank',
  'cuenta bancaria': 'bank_account',
  'casita': 'casita',
  'residencia': 'casita',
  'vianda': 'vianda',
  'viatico': 'viatico',
  'viático': 'viatico',
  'complemento': 'complemento',
  'contrato': 'contrato',
};

const REQUIRED_FIELDS = ['name', 'gov_id', 'categoria'];

function normalizeHeader(header) {
  return String(header).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try DD/MM/YYYY
  const parts = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (parts) return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  return null;
}

function parseBool(val) {
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  return ['true', 'si', 'sí', '1', 'yes', '✓', 'x'].includes(s);
}

function validateRow(row) {
  const errors = [];
  if (!row.name || !String(row.name).trim()) errors.push('Falta nombre');
  if (!row.gov_id || !String(row.gov_id).trim()) errors.push('Falta documento');
  if (!row.categoria) {
    errors.push('Falta categoría');
  } else if (!CATEGORIAS.includes(row.categoria)) {
    errors.push(`Categoría inválida: ${row.categoria}`);
  }
  if (row.posicion && !POSICIONES_JUGADOR.includes(row.posicion)) {
    errors.push(`Posición inválida: ${row.posicion}`);
  }
  if (row.date_of_birth && !parseDate(row.date_of_birth)) {
    errors.push('Fecha inválida');
  }
  return errors;
}

export const ImportPreviewModal = ({ isOpen, onClose, onConfirm, existingPlayers = [] }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null); // { rows, headers, mappedFields }
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const existingIds = new Set(existingPlayers.map(p => String(p.gov_id).trim().toLowerCase()));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (jsonData.length === 0) {
          setPreview({ rows: [], error: 'El archivo está vacío.' });
          return;
        }

        const rawHeaders = Object.keys(jsonData[0]);
        const mappedFields = {};
        rawHeaders.forEach(h => {
          const norm = normalizeHeader(h);
          // Try exact match first, then without accents
          const mapped = FIELD_MAP[norm] || FIELD_MAP[norm.replace(/[\u0300-\u036f]/g, '')];
          if (mapped) mappedFields[h] = mapped;
        });

        const rows = jsonData.map((raw, i) => {
          const player = {
            viatico: 0,
            complemento: 0,
            contrato: false,
            casita: false,
            vianda: 0,
            hide_player: false,
            tipo_documento: 'Cédula de Identidad',
          };

          Object.entries(mappedFields).forEach(([header, field]) => {
            const val = raw[header];
            if (field === 'date_of_birth') {
              player[field] = parseDate(val);
            } else if (['casita', 'contrato'].includes(field)) {
              player[field] = parseBool(val);
            } else if (['viatico', 'complemento', 'vianda'].includes(field)) {
              player[field] = parseInt(val, 10) || 0;
            } else {
              player[field] = val != null ? String(val).trim() : '';
            }
          });

          const errors = validateRow(player);
          const duplicate = player.gov_id && existingIds.has(String(player.gov_id).trim().toLowerCase());
          if (duplicate) errors.push('Documento ya existe');

          return { index: i + 2, player, errors, duplicate };
        });

        setPreview({ rows, headers: rawHeaders, mappedFields });
      } catch {
        setPreview({ rows: [], error: 'No se pudo leer el archivo. Asegurate de subir un .xlsx o .xls válido.' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validRows = preview?.rows?.filter(r => r.errors.length === 0) || [];
  const invalidRows = preview?.rows?.filter(r => r.errors.length > 0) || [];

  const handleConfirm = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      await onConfirm(validRows.map(r => r.player));
      setPreview(null);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <h3 className="text-xl font-bold text-gray-900">Importar jugadores desde Excel</h3>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {!preview && (
            <div className="text-center py-12 space-y-4">
              <p className="text-gray-600">
                Seleccioná un archivo Excel (.xlsx, .xls) con los datos de los jugadores.
              </p>
              <p className="text-xs text-gray-400">
                Columnas reconocidas: Nombre, Cédula, Categoría, Fecha de Nacimiento, Posición, Departamento, Celular, Email, Representante, Banco, Cuenta Bancaria, Casita, Vianda, Viático, Complemento, Contrato.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                <Upload className="w-5 h-5" />
                Seleccionar archivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {preview?.error && (
            <div className="text-center py-8">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="text-red-600">{preview.error}</p>
              <button
                onClick={() => setPreview(null)}
                className="mt-4 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Reintentar
              </button>
            </div>
          )}

          {preview?.rows && !preview.error && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                  <Check className="w-3 h-3 inline mr-1" />
                  {validRows.length} válido{validRows.length !== 1 ? 's' : ''}
                </span>
                {invalidRows.length > 0 && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-medium">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {invalidRows.length} con error{invalidRows.length !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto border rounded-lg max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Fila</th>
                      <th className="px-3 py-2 text-left font-medium">Nombre</th>
                      <th className="px-3 py-2 text-left font-medium">Documento</th>
                      <th className="px-3 py-2 text-left font-medium">Categoría</th>
                      <th className="px-3 py-2 text-left font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.rows.map((row) => (
                      <tr key={row.index} className={row.errors.length > 0 ? 'bg-red-50' : 'bg-green-50'}>
                        <td className="px-3 py-2 text-gray-500">{row.index}</td>
                        <td className="px-3 py-2 font-medium">{row.player.name || '—'}</td>
                        <td className="px-3 py-2">{row.player.gov_id || '—'}</td>
                        <td className="px-3 py-2">{row.player.categoria || '—'}</td>
                        <td className="px-3 py-2">
                          {row.errors.length === 0 ? (
                            <span className="text-green-700 font-medium">✓ OK</span>
                          ) : (
                            <span className="text-red-600 text-xs">{row.errors.join(', ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setPreview(null)}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                >
                  Seleccionar otro archivo
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={validRows.length === 0 || importing}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
                  >
                    {importing ? 'Importando...' : `Importar ${validRows.length} jugador${validRows.length !== 1 ? 'es' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
