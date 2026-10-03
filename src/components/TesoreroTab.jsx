import React, { useState, useRef } from 'react';
import { Lock, Download, Star } from 'lucide-react';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { calculateTotal } from '../utils/playerUtils';
import { BANCOS_VIATICO } from '../utils/constants';
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

const EXPORT_CATEGORIAS = [
  { key: '4ta', label: 'Sub 19' },
  { key: '5ta', label: 'Sub 17' },
  { key: 'S16', label: 'Sub 16' },
  { key: '6ta', label: 'Sub 15' },
  { key: '7ma', label: 'Sub 14' },
  { key: 'Sub13', label: 'Sub 13' },
];

/** Jugadores que entran en la hoja de una categoría: activos, sin contrato o marcados como caso especial. */
const jugadoresExportables = (players, key) => players
  .filter(p => p.categoria === key && (!p.contrato || p.incluir_viatico_export) && (!p.status || p.status === 'activo'))
  .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es-UY'));

const SIN_CUENTA = 'SIN CUENTA';

/** Monto que se le paga al jugador en el export: complemento si tiene contrato, viático total si no. */
const montoViatico = (p) => (p.contrato ? (p.complemento || 0) : calculateTotal(p));

const EFECTIVO = 'Efectivo';
const MEDIOS = [...BANCOS_VIATICO, EFECTIVO];

/** Sin cuenta cargada se considera pago en efectivo. */
const medioDePago = (p) => (p.cuenta_banco && p.cuenta_numero ? p.cuenta_banco : EFECTIVO);

const bucketsVacios = () => Object.fromEntries([...MEDIOS, 'total'].map(m => [m, { monto: 0, cantidad: 0 }]));

/** Totales por medio de pago (Prex / Mi Dinero / Efectivo), por categoría y generales. Mismos criterios que el export. */
const resumenPagos = (players) => {
  const totales = bucketsVacios();
  const porCategoria = EXPORT_CATEGORIAS.map(({ key, label }) => {
    const fila = { label, ...bucketsVacios() };
    jugadoresExportables(players, key).forEach(p => {
      const monto = montoViatico(p);
      [fila[medioDePago(p)], fila.total, totales[medioDePago(p)], totales.total].forEach(b => {
        b.monto += monto;
        b.cantidad += 1;
      });
    });
    return fila;
  }).filter(f => f.total.cantidad > 0);
  return { porCategoria, totales };
};

const formatMonto = (n) => `$ ${n.toLocaleString('es-UY')}`;

export const TesoreroTab = ({ players, appSettings, onDataChange, currentUserEmail }) => {
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

  const handleToggleEspecial = (player) =>
    execute(
      async () => {
        await database.updatePlayer(player.id, { incluir_viatico_export: !player.incluir_viatico_export }, currentUserEmail);
        await onDataChange('players');
      },
      'Error al guardar',
      player.incluir_viatico_export ? 'Excluido del export' : 'Incluido en el export'
    );

  const casosEspeciales = players.filter(
    p => p.contrato && EXPORT_CATEGORIAS.some(c => c.key === p.categoria) && (!p.status || p.status === 'activo')
  ).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es-UY'));

  const sinCuenta = EXPORT_CATEGORIAS.flatMap(({ key, label }) =>
    jugadoresExportables(players, key)
      .filter(p => !p.cuenta_banco || !p.cuenta_numero)
      .map(p => ({ ...p, categoriaLabel: label }))
  );

  const resumen = resumenPagos(players);

  const handleExport = () => {
    const workbook = XLSX.utils.book_new();

    // Hoja Resumen: montos y cantidad de jugadores por medio de pago
    const header = ['Categoría', ...MEDIOS, 'Total'];
    const filaMontos = (label, f) => [label, ...MEDIOS.map(m => f[m].monto), f.total.monto];
    const resumenSheet = XLSX.utils.aoa_to_sheet([
      header,
      ...resumen.porCategoria.map(f => filaMontos(f.label, f)),
      filaMontos('TOTAL', resumen.totales),
      [],
      ['Cantidad de jugadores', ...MEDIOS.map(m => resumen.totales[m].cantidad), resumen.totales.total.cantidad],
    ]);
    resumenSheet['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');

    EXPORT_CATEGORIAS.forEach(({ key, label }) => {
      const catPlayers = jugadoresExportables(players, key);

      if (catPlayers.length === 0) return;

      const data = catPlayers.map(p => ({
        'Nombre': p.name || '',
        'Cédula': p.gov_id || '',
        'Total Viático': montoViatico(p),
        'Categoría': label,
        // El número de cuenta va como texto: conserva ceros a la izquierda y no pasa a notación científica
        'Banco': p.cuenta_banco || SIN_CUENTA,
        'Número de cuenta': p.cuenta_numero || '',
        'Nombre del titular': p.cuenta_titular_tipo === 'familiar' ? (p.cuenta_titular_nombre || '') : '',
        'Documento del titular': p.cuenta_titular_tipo === 'familiar' ? (p.cuenta_titular_documento || '') : '',
      }));

      const sheet = XLSX.utils.json_to_sheet(data);
      sheet['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 32 }, { wch: 20 }];

      // SUM formula 3 rows below the last data row (row 1 = header, rows 2..N+1 = data)
      const lastDataRow = data.length + 1;
      const sumRow = lastDataRow + 3;
      sheet[`A${sumRow}`] = { v: 'TOTAL', t: 's' };
      sheet[`C${sumRow}`] = { f: `SUM(C2:C${lastDataRow})`, t: 'n' };
      const range = XLSX.utils.decode_range(sheet['!ref']);
      range.e.r = Math.max(range.e.r, sumRow - 1);
      sheet['!ref'] = XLSX.utils.encode_range(range);

      XLSX.utils.book_append_sheet(workbook, sheet, label);
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

      {/* Resumen de pagos por medio */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-6 py-6">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Resumen de pagos</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Cuánto se paga por Prex, por Mi Dinero y en efectivo (jugadores sin cuenta cargada). Usa los mismos criterios que la exportación.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MEDIOS.map(m => {
            const { monto, cantidad } = resumen.totales[m];
            const pct = resumen.totales.total.monto > 0 ? Math.round((monto / resumen.totales.total.monto) * 100) : 0;
            const esEfectivo = m === EFECTIVO;
            return (
              <div
                key={m}
                className={`rounded-lg border px-4 py-3 ${
                  esEfectivo
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40'
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide ${esEfectivo ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {m}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">{formatMonto(monto)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {cantidad} jugador{cantidad !== 1 ? 'es' : ''} · {pct}%{esEfectivo ? ' · Sin cuenta cargada' : ''}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">
          Total a pagar: <span className="font-semibold tabular-nums">{formatMonto(resumen.totales.total.monto)}</span> · {resumen.totales.total.cantidad} jugadores
        </p>
        {resumen.porCategoria.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">Ver por categoría</summary>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                    <th className="text-left font-medium py-2 pr-4">Categoría</th>
                    {MEDIOS.map(m => <th key={m} className="text-right font-medium py-2 px-2">{m}</th>)}
                    <th className="text-right font-medium py-2 pl-2">Total</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900 dark:text-gray-100 tabular-nums">
                  {resumen.porCategoria.map(f => (
                    <tr key={f.label} className="border-b border-gray-100 dark:border-gray-700/60">
                      <td className="py-2 pr-4">{f.label}</td>
                      {MEDIOS.map(m => <td key={m} className="text-right py-2 px-2">{formatMonto(f[m].monto)}</td>)}
                      <td className="text-right py-2 pl-2 font-medium">{formatMonto(f.total.monto)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-gray-900 dark:text-gray-100 font-semibold tabular-nums">
                  <tr>
                    <td className="py-2 pr-4">TOTAL</td>
                    {MEDIOS.map(m => <td key={m} className="text-right py-2 px-2">{formatMonto(resumen.totales[m].monto)}</td>)}
                    <td className="text-right py-2 pl-2">{formatMonto(resumen.totales.total.monto)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </details>
        )}
      </div>

      {/* Export Excel */}
      <div className="bg-white rounded-lg shadow px-6 py-6">
        <h3 className="font-medium text-gray-900 mb-2">Exportar Viáticos</h3>
        <p className="text-sm text-gray-500 mb-4">
          Genera un archivo Excel con los viáticos de todas las categorías formativas (excluye 3era), incluyendo la cuenta de cobro (banco, número y titular si es de un padre, madre o tutor). La primera hoja (Resumen) tiene los totales por medio de pago. Jugadores con contrato se incluyen solo si están marcados como caso especial.
        </p>
        {sinCuenta.length > 0 && (
          <details className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <summary className="cursor-pointer font-medium">
              {sinCuenta.length} jugador{sinCuenta.length !== 1 ? 'es' : ''} no {sinCuenta.length !== 1 ? 'tienen' : 'tiene'} cuenta cargada; se {sinCuenta.length !== 1 ? 'exportan' : 'exporta'} con "{SIN_CUENTA}".
            </summary>
            <ul className="mt-2 space-y-0.5">
              {sinCuenta.map(p => (
                <li key={p.id}>{p.name} · {p.categoriaLabel}</li>
              ))}
            </ul>
          </details>
        )}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-800 text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Descargar Excel
        </button>
      </div>

      {/* Casos especiales */}
      {casosEspeciales.length > 0 && (
        <div className="bg-white rounded-lg shadow px-6 py-6">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-gray-900">Casos especiales</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Jugadores con contrato en categorías formativas. Activar el toggle los incluye en la exportación con su complemento.
          </p>
          <div className="space-y-3">
            {casosEspeciales.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {EXPORT_CATEGORIAS.find(c => c.key === p.categoria)?.label} · Complemento: ${(p.complemento || 0).toLocaleString('es-UY')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleEspecial(p)}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 flex-shrink-0 ml-4 ${
                    p.incluir_viatico_export ? 'bg-amber-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      p.incluir_viatico_export ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
