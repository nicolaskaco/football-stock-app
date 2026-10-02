import React, { useRef, useState } from 'react';
import { Upload, X, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BANCOS_VIATICO, CUENTA_VIATICO_FIELDS } from '../utils/constants';

// Encabezados del Google Form, normalizados (sin tildes, minúsculas, espacios simples).
const COLUMNAS = {
  nombre: 'nombre',
  apellido: 'apellido',
  cedula: 'cedula de identidad',
  categoria: 'categoria / division',
  banco: 'banco',
  numero: 'numero de cuenta',
  titularNombre: 'nombre completo del titular',
  titularDocumento: 'documento del titular',
  titularBanco: 'banco del titular',
  titularNumero: 'numero de cuenta del titular',
};
// La pregunta del tipo de cuenta es larga; se identifica por esta palabra.
const TIPO_KEYWORD = 'propia';

const REQUERIDAS = ['cedula', 'banco', 'numero', 'titularNombre', 'titularDocumento', 'titularBanco', 'titularNumero'];

const ESTADOS = {
  nuevo: { label: 'Nuevo', className: 'bg-green-100 text-green-800' },
  cambia: { label: 'Cambia', className: 'bg-orange-100 text-orange-800' },
  igual: { label: 'Sin cambios', className: 'bg-gray-100 text-gray-600' },
  no_encontrado: { label: 'No encontrado', className: 'bg-red-100 text-red-800' },
  invalido: { label: 'Inválido', className: 'bg-red-100 text-red-800' },
};

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Cédula sin puntos, guiones ni espacios, para comparar "1.234.567-8" con "12345678". */
function normalizarCedula(cedula) {
  return String(cedula ?? '').replace(/[^0-9a-z]/gi, '').toLowerCase();
}

function texto(valor) {
  const s = String(valor ?? '').trim();
  return s || null;
}

function normalizarBanco(valor) {
  const n = normalizar(valor).replace(/\s/g, '');
  if (!n) return null;
  return BANCOS_VIATICO.find(b => normalizar(b).replace(/\s/g, '') === n) ?? valor;
}

function parseTipo(valor, raw, cols) {
  const n = normalizar(valor);
  if (n.includes('propia')) return 'jugador';
  if (n.includes('padre') || n.includes('madre') || n.includes('tutor') || n.includes('familiar')) return 'familiar';
  // Sin respuesta: se deduce por qué bloque de columnas está completo
  if (texto(raw[cols.titularNumero]) || texto(raw[cols.titularNombre])) return 'familiar';
  if (texto(raw[cols.numero])) return 'jugador';
  return null;
}

function compararConJugador(player, cuenta) {
  if (!player.cuenta_banco && !player.cuenta_numero) return 'nuevo';
  const igual = CUENTA_VIATICO_FIELDS.every(f => (player[f] ?? null) === (cuenta[f] ?? null));
  return igual ? 'igual' : 'cambia';
}

function parsearArchivo(jsonData, players) {
  const headers = Object.keys(jsonData[0] ?? {});
  const cols = {};
  headers.forEach(h => {
    const n = normalizar(h);
    const key = Object.keys(COLUMNAS).find(k => COLUMNAS[k] === n);
    if (key) cols[key] = h;
    else if (n.includes(TIPO_KEYWORD)) cols.tipo = h;
  });

  const faltantes = REQUERIDAS.filter(k => !cols[k]);
  if (faltantes.length > 0) {
    return { error: `Faltan columnas del formulario: ${faltantes.map(k => `"${COLUMNAS[k]}"`).join(', ')}.` };
  }

  const playersPorCedula = new Map(players.map(p => [normalizarCedula(p.gov_id), p]));

  // Las respuestas del Google Form vienen en orden cronológico: si un jugador respondió
  // más de una vez, gana la última fila.
  const porCedula = new Map();
  jsonData.forEach((raw, i) => {
    const cedula = normalizarCedula(raw[cols.cedula]);
    if (!cedula) return;
    porCedula.set(cedula, { raw, fila: i + 2, duplicado: porCedula.has(cedula) });
  });

  const rows = [...porCedula.entries()].map(([cedula, { raw, fila, duplicado }]) => {
    const tipo = parseTipo(cols.tipo ? raw[cols.tipo] : '', raw, cols);
    const esFamiliar = tipo === 'familiar';
    const cuenta = {
      cuenta_titular_tipo: tipo,
      cuenta_banco: normalizarBanco(raw[esFamiliar ? cols.titularBanco : cols.banco]),
      cuenta_numero: texto(raw[esFamiliar ? cols.titularNumero : cols.numero]),
      cuenta_titular_nombre: esFamiliar ? texto(raw[cols.titularNombre]) : null,
      cuenta_titular_documento: esFamiliar ? texto(raw[cols.titularDocumento]) : null,
    };

    const errores = [];
    if (!tipo) errores.push('Falta el tipo de cuenta');
    if (!cuenta.cuenta_banco) errores.push('Falta el banco');
    else if (!BANCOS_VIATICO.includes(cuenta.cuenta_banco)) errores.push(`Banco no habilitado: ${cuenta.cuenta_banco}`);
    if (!cuenta.cuenta_numero) errores.push('Falta el número de cuenta');
    if (esFamiliar && !cuenta.cuenta_titular_nombre) errores.push('Falta el nombre del titular');

    const player = playersPorCedula.get(cedula);
    const estado = !player ? 'no_encontrado' : errores.length > 0 ? 'invalido' : compararConJugador(player, cuenta);

    return {
      cedula,
      fila,
      duplicado,
      nombreForm: [texto(cols.nombre ? raw[cols.nombre] : ''), texto(cols.apellido ? raw[cols.apellido] : '')].filter(Boolean).join(' '),
      categoriaForm: cols.categoria ? texto(raw[cols.categoria]) : null,
      player,
      cuenta,
      errores,
      estado,
    };
  });

  return { rows };
}

export const CuentaViaticoImportModal = ({ players = [], onClose, onConfirm }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null); // { rows } | { error }
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        // El CSV de Google viene en UTF-8: se decodifica como texto para no romper las tildes.
        // raw: true mantiene los valores del CSV como texto (no pierde ceros a la izquierda).
        const wb = file.name.toLowerCase().endsWith('.csv')
          ? XLSX.read(new TextDecoder('utf-8').decode(ev.target.result), { type: 'string', raw: true })
          : XLSX.read(ev.target.result, { type: 'array', raw: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        if (jsonData.length === 0) {
          setPreview({ error: 'El archivo está vacío.' });
          return;
        }
        const result = parsearArchivo(jsonData, players);
        setPreview(result);
        setSelected(new Set((result.rows ?? []).filter(r => r.estado === 'nuevo').map(r => r.cedula)));
      } catch {
        setPreview({ error: 'No se pudo leer el archivo. Subí el .csv o .xlsx exportado de las respuestas del formulario.' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggle = (cedula) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(cedula)) next.delete(cedula);
      else next.add(cedula);
      return next;
    });
  };

  const rows = preview?.rows ?? [];
  const seleccionables = rows.filter(r => r.estado === 'nuevo' || r.estado === 'cambia');
  const aImportar = seleccionables.filter(r => selected.has(r.cedula));
  const conteo = (estado) => rows.filter(r => r.estado === estado).length;

  const handleConfirm = async () => {
    if (aImportar.length === 0) return;
    setImporting(true);
    try {
      await onConfirm(aImportar.map(r => ({ id: r.player.id, ...r.cuenta })));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <h3 className="text-xl font-bold text-gray-900">Importar cuentas de viáticos (Google Form)</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {(!preview || preview.error) && (
            <div className="text-center py-12 space-y-4">
              <p className="text-gray-600">
                Descargá las respuestas del formulario (Hoja de cálculo → Archivo → Descargar → .csv o .xlsx) y subilas acá.
              </p>
              <p className="text-xs text-gray-400">
                Los jugadores se identifican por la Cédula de identidad. Si alguien respondió más de una vez, se toma la última respuesta.
              </p>
              {preview?.error && <p className="text-sm text-red-600">{preview.error}</p>}
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
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                {Object.entries(ESTADOS).map(([key, { label, className }]) => (
                  <span key={key} className={`px-2 py-1 rounded-full font-semibold ${className}`}>
                    {label}: {conteo(key)}
                  </span>
                ))}
              </div>
              {conteo('cambia') > 0 && (
                <p className="text-xs text-orange-700">
                  Las filas "Cambia" reemplazan una cuenta ya cargada: quedan desmarcadas, revisalas y marcalas si corresponde.
                </p>
              )}

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2"></th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cédula</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jugador (app / formulario)</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Titular</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Banco</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cuenta actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map(r => {
                      const estado = ESTADOS[r.estado];
                      const seleccionable = r.estado === 'nuevo' || r.estado === 'cambia';
                      return (
                        <tr key={r.cedula} className="align-top">
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              disabled={!seleccionable}
                              checked={selected.has(r.cedula)}
                              onChange={() => toggle(r.cedula)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded disabled:opacity-30"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${estado.className}`}>{estado.label}</span>
                            {r.errores.length > 0 && r.player && (
                              <div className="text-xs text-red-600 mt-1">{r.errores.join('. ')}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.cedula}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{r.player ? (r.player.name_visual || r.player.name) : '—'}</div>
                            <div className="text-xs text-gray-500">
                              {r.nombreForm}{r.categoriaForm ? ` · ${r.categoriaForm}` : ''}{r.duplicado ? ' · respondió más de una vez' : ''}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {r.cuenta.cuenta_titular_tipo === 'familiar' ? (
                              <>
                                <div>{r.cuenta.cuenta_titular_nombre || '—'}</div>
                                <div className="text-xs text-gray-500">{r.cuenta.cuenta_titular_documento || ''}</div>
                              </>
                            ) : r.cuenta.cuenta_titular_tipo === 'jugador' ? 'Cuenta propia' : '—'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.cuenta.cuenta_banco || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.cuenta.cuenta_numero || '—'}</td>
                          <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                            {r.player?.cuenta_banco ? `${r.player.cuenta_banco} · ${r.player.cuenta_numero || '-'}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t">
          <span className="text-sm text-gray-600">
            {rows.length > 0 && `${aImportar.length} cuenta(s) seleccionada(s)`}
          </span>
          <div className="flex gap-3">
            {rows.length > 0 && (
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Elegir otro archivo
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={aImportar.length === 0 || importing}
              className="px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importando...' : `Importar ${aImportar.length} cuenta(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
