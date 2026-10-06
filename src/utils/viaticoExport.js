// ============================================================
// Exportación de viáticos de las categorías formativas.
// Compartida por TesoreroTab y FinanzasTab para que ambos generen el mismo Excel.
// ============================================================
import * as XLSX from 'xlsx';
import { calculateTotal } from './playerUtils';
import { BANCOS_VIATICO } from './constants';

export const EXPORT_CATEGORIAS = [
  { key: '4ta', label: 'Sub 19' },
  { key: '5ta', label: 'Sub 17' },
  { key: 'S16', label: 'Sub 16' },
  { key: '6ta', label: 'Sub 15' },
  { key: '7ma', label: 'Sub 14' },
  { key: 'Sub13', label: 'Sub 13' },
];

/** Jugadores que entran en la hoja de una categoría: activos, sin contrato o marcados como caso especial. */
export const jugadoresExportables = (players, key) => players
  .filter(p => p.categoria === key && (!p.contrato || p.incluir_viatico_export) && (!p.status || p.status === 'activo'))
  .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es-UY'));

export const SIN_CUENTA = 'SIN CUENTA';

/** Monto que se le paga al jugador en el export: complemento si tiene contrato, viático total si no. */
export const montoViatico = (p) => (p.contrato ? (p.complemento || 0) : calculateTotal(p));

export const EFECTIVO = 'Efectivo';
export const MEDIOS = [...BANCOS_VIATICO, EFECTIVO];

/** Sin cuenta cargada se considera pago en efectivo. */
export const medioDePago = (p) => (p.cuenta_banco && p.cuenta_numero ? p.cuenta_banco : EFECTIVO);

const bucketsVacios = () => Object.fromEntries([...MEDIOS, 'total'].map(m => [m, { monto: 0, cantidad: 0 }]));

/** Totales por medio de pago (Prex / Mi Dinero / Efectivo), por categoría y generales. Mismos criterios que el export. */
export const resumenPagos = (players) => {
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

/** 'Viaticos-Formativas-DD-MM-YYYY.xlsx' (Tesorero) */
export function viaticosFileNameFecha(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `Viaticos-Formativas-${dd}-${mm}-${date.getFullYear()}.xlsx`;
}

/** 'Viaticos_Formativas_Octubre_2026.xlsx' (Finanzas) */
export function viaticosFileNameMes(date = new Date()) {
  const mes = date.toLocaleDateString('es-UY', { month: 'long' });
  return `Viaticos_Formativas_${mes.charAt(0).toUpperCase() + mes.slice(1)}_${date.getFullYear()}.xlsx`;
}

/**
 * Genera y descarga el Excel de viáticos: hoja Resumen (por medio de pago) y una hoja por
 * categoría formativa (excluye 3era) con los jugadores de jugadoresExportables().
 */
export function exportViaticosFormativas(players, fileName) {
  const workbook = XLSX.utils.book_new();

  // Hoja Resumen: montos y cantidad de jugadores por medio de pago
  const resumen = resumenPagos(players);
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

  XLSX.writeFile(workbook, fileName);
}
