import React, { useRef, useState } from 'react';
import { Upload, X, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BANCOS_VIATICO, CUENTA_VIATICO_FIELDS } from '../utils/constants';

// Encabezados del Google Form, normalizados (sin tildes, minúsculas, espacios simples).
const COLUMNAS = {
  marcaTemporal: 'marca temporal',
  nombre: 'nombre',
  apellido: 'apellido',
  cedula: 'cedula de identidad',
  categoria: 'categoria / division',
  titularNombre: 'nombre completo del titular',
  titularDocumento: 'documento del titular',
};
// La pregunta del tipo de cuenta es larga; se identifica por esta palabra.
const TIPO_KEYWORD = 'propia';
// El formulario repite "Banco" y "Número de cuenta": la primera aparición es la cuenta
// propia del jugador y la segunda la del titular (también se acepta el sufijo "del titular").
const BANCO_HEADERS = ['banco', 'banco del titular'];
const NUMERO_HEADERS = ['numero de cuenta', 'numero de cuenta del titular'];

const NOMBRES_COLUMNA = {
  cedula: 'Cédula de identidad',
  tipo: '¿La cuenta bancaria es propia del jugador o de un familiar?',
  banco: 'Banco',
  numero: 'Numero de cuenta',
  titularNombre: 'Nombre completo del titular',
  titularDocumento: 'Documento del titular',
  titularBanco: 'Banco (del titular)',
  titularNumero: 'Número de cuenta (del titular)',
};

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

function parseTipo(valor, fila, cols) {
  const n = normalizar(valor);
  if (n.includes('propia')) return 'jugador';
  if (n.includes('padre') || n.includes('madre') || n.includes('tutor') || n.includes('familiar')) return 'familiar';
  // Sin respuesta: se deduce por qué bloque de columnas está completo
  if (texto(fila[cols.titularNumero]) || texto(fila[cols.titularNombre])) return 'familiar';
  if (texto(fila[cols.numero])) return 'jugador';
  return null;
}

/** "29/9/2026 20:51:17" (formato de Google Sheets en es-UY) → milisegundos, o null. */
function parseMarcaTemporal(valor) {
  const m = String(valor ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, d, mes, y, h = 0, min = 0, seg = 0] = m;
  return new Date(+y, +mes - 1, +d, +h, +min, +seg).getTime();
}

function compararConJugador(player, cuenta) {
  if (!player.cuenta_banco && !player.cuenta_numero) return 'nuevo';
  const igual = CUENTA_VIATICO_FIELDS.every(f => (player[f] ?? null) === (cuenta[f] ?? null));
  return igual ? 'igual' : 'cambia';
}

/** matriz: filas del archivo como arrays (la primera son los encabezados). */
function parsearArchivo(matriz, players) {
  const headers = (matriz[0] ?? []).map(normalizar);
  const cols = {};
  Object.entries(COLUMNAS).forEach(([key, nombre]) => {
    const i = headers.indexOf(nombre);
    if (i !== -1) cols[key] = i;
  });
  const tipoIdx = headers.findIndex(h => h.includes(TIPO_KEYWORD));
  if (tipoIdx !== -1) cols.tipo = tipoIdx;
  const bancos = headers.flatMap((h, i) => (BANCO_HEADERS.includes(h) ? [i] : []));
  const numeros = headers.flatMap((h, i) => (NUMERO_HEADERS.includes(h) ? [i] : []));
  [cols.banco, cols.titularBanco] = bancos;
  [cols.numero, cols.titularNumero] = numeros;

  const faltantes = Object.keys(NOMBRES_COLUMNA).filter(k => cols[k] === undefined);
  if (faltantes.length > 0) {
    return { error: `Faltan columnas del formulario: ${faltantes.map(k => `"${NOMBRES_COLUMNA[k]}"`).join(', ')}.` };
  }

  const playersPorCedula = new Map(players.map(p => [normalizarCedula(p.gov_id), p]));

  // Si un jugador respondió más de una vez, gana la respuesta con la Marca temporal más reciente
  // (las filas de la hoja no siempre están en orden). Sin marca temporal, gana la última fila.
  const porCedula = new Map();
  matriz.slice(1).forEach((fila, i) => {
    const cedula = normalizarCedula(fila[cols.cedula]);
    if (!cedula) return;
    const orden = (cols.marcaTemporal !== undefined ? parseMarcaTemporal(fila[cols.marcaTemporal]) : null) ?? i;
    const previa = porCedula.get(cedula);
    if (!previa || orden >= previa.orden) {
      porCedula.set(cedula, { fila, orden, respuestas: (previa?.respuestas ?? 0) + 1 });
    } else {
      previa.respuestas++;
    }
  });

  const rows = [...porCedula.entries()].map(([cedula, { fila, respuestas }]) => {
    const tipo = parseTipo(fila[cols.tipo], fila, cols);
    const esFamiliar = tipo === 'familiar';
    const cuenta = {
      cuenta_titular_tipo: tipo,
      cuenta_banco: normalizarBanco(fila[esFamiliar ? cols.titularBanco : cols.banco]),
      cuenta_numero: texto(fila[esFamiliar ? cols.titularNumero : cols.numero]),
      cuenta_titular_nombre: esFamiliar ? texto(fila[cols.titularNombre]) : null,
      cuenta_titular_documento: esFamiliar ? texto(fila[cols.titularDocumento]) : null,
    };

    const errores = [];
    if (!tipo) errores.push('Falta el tipo de cuenta');
    if (!cuenta.cuenta_banco) errores.push('Falta el banco');
    else if (!BANCOS_VIATICO.includes(cuenta.cuenta_banco)) errores.push(`Banco no habilitado: ${cuenta.cuenta_banco}`);
    if (!cuenta.cuenta_numero) errores.push('Falta el número de cuenta');
    if (esFamiliar && !cuenta.cuenta_titular_nombre) errores.push('Falta el nombre del titular');

    // Avisos: no bloquean la importación, pero conviene revisarlos.
    const avisos = [];
    if (esFamiliar && normalizarCedula(cuenta.cuenta_titular_documento) === cedula) {
      avisos.push('El documento del titular es la cédula del jugador');
    }
    if (respuestas > 1) avisos.push(`Respondió ${respuestas} veces: se toma la última respuesta`);

    const player = playersPorCedula.get(cedula);
    const estado = !player ? 'no_encontrado' : errores.length > 0 ? 'invalido' : compararConJugador(player, cuenta);

    return {
      cedula,
      nombreForm: [texto(fila[cols.nombre]), texto(fila[cols.apellido])].filter(Boolean).join(' '),
      categoriaForm: texto(fila[cols.categoria]),
      player,
      cuenta,
      errores,
      avisos,
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
        // header: 1 → filas como arrays, porque el formulario repite encabezados (Banco, Número de cuenta)
        const matriz = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
        if (matriz.length < 2) {
          setPreview({ error: 'El archivo está vacío.' });
          return;
        }
        const result = parsearArchivo(matriz, players);
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
                            {r.avisos.length > 0 && (
                              <div className="text-xs text-amber-700 mt-1">{r.avisos.join('. ')}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.cedula}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{r.player ? (r.player.name_visual || r.player.name) : '—'}</div>
                            <div className="text-xs text-gray-500">
                              {r.nombreForm}{r.categoriaForm ? ` · ${r.categoriaForm}` : ''}
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
