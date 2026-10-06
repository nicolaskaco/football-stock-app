import React, { useState } from 'react';
import { Download, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CATEGORIAS } from '../utils/constants';
import { formatDate, todayISO } from '../utils/dateUtils';
import { calculateTotal, getComplementoEfectivo } from '../utils/playerUtils';
import { useTableSort, thClass } from '../hooks/useTableSort';
import { SearchInput } from './ui/SearchInput';
import { PlayerHistoryModal } from './PlayerHistoryModal';
import { database } from '../utils/database';

const money = (n) => (n == null ? '-' : `$${Number(n).toLocaleString('es-UY')}`);

const titularLabel = (p) => {
  if (p.cuenta_titular_tipo === 'familiar') {
    return [p.cuenta_titular_nombre, p.cuenta_titular_documento].filter(Boolean).join(' · ') || 'Padre/madre/tutor';
  }
  return p.cuenta_titular_tipo === 'jugador' ? 'Jugador' : '';
};

// Filas normalizadas (sin nulls) para que useTableSort pueda ordenar cualquier columna
const toRow = (p) => {
  const { valor: complementoEfectivo, activo: overrideActivo } = getComplementoEfectivo(p);
  return {
    ...p,
    name: p.name || '',
    gov_id: p.gov_id || '',
    categoria: p.categoria || '',
    date_of_birth: p.date_of_birth || '',
    viatico: p.viatico || 0,
    complemento: p.complemento || 0,
    complemento_override_expira: p.complemento_override_expira || '',
    cuenta_banco: p.cuenta_banco || '',
    cuenta_numero: p.cuenta_numero || '',
    comentario_viatico: p.comentario_viatico || '',
    titular: titularLabel(p),
    contratoSort: p.contrato ? 1 : 0,
    complementoEfectivo,
    overrideActivo,
    casoEspecial: !!(p.contrato && p.incluir_viatico_export),
    // Mismo monto que el export de Tesorero: con contrato solo cobra el complemento si es caso especial
    total: p.contrato ? (p.incluir_viatico_export ? (p.complemento || 0) : 0) : calculateTotal(p),
  };
};

const EXPORT_COLUMNS = [
  ['Nombre', (r) => r.name],
  ['Fecha de Nacimiento', (r) => formatDate(r.date_of_birth || null)],
  ['Tipo Documento', (r) => r.tipo_documento || ''],
  ['Documento', (r) => r.gov_id],
  ['Categoría', (r) => r.categoria],
  ['Viático', (r) => r.viatico],
  ['Complemento', (r) => r.complemento],
  ['Contrato', (r) => (r.casoEspecial ? 'Sí (caso especial)' : r.contrato ? 'Sí' : 'No')],
  ['Override Complemento', (r) => r.complemento_override ?? ''],
  ['Válido Hasta', (r) => (r.complemento_override_expira ? formatDate(r.complemento_override_expira) : '')],
  ['Total', (r) => r.total],
  ['Titular Cuenta', (r) => (r.cuenta_titular_tipo === 'familiar' ? r.cuenta_titular_nombre || '' : r.cuenta_titular_tipo === 'jugador' ? r.name : '')],
  ['Documento Titular', (r) => (r.cuenta_titular_tipo === 'familiar' ? r.cuenta_titular_documento || '' : r.cuenta_titular_tipo === 'jugador' ? r.gov_id : '')],
  ['Banco', (r) => r.cuenta_banco],
  ['Número de Cuenta', (r) => r.cuenta_numero],
  ['Comentario Viático', (r) => r.comentario_viatico],
];

/**
 * Vista de solo lectura para el rol finanzas (y admins).
 * Los datos vienen de database.getPlayersFinanzas() (RPC con columnas limitadas),
 * no de la tabla players.
 */
export const FinanzasTab = ({ players = [], currentUser }) => {
  const [search, setSearch] = useState('');
  const [categorias, setCategorias] = useState([]);
  // Por defecto se ocultan los jugadores con contrato, salvo los casos especiales (contrato + complemento)
  const [mostrarContrato, setMostrarContrato] = useState(false);
  const [historyPlayer, setHistoryPlayer] = useState(null);
  const { handleSort, sortFn, SortIcon } = useTableSort('name', 'asc');

  const term = search.trim().toLowerCase();
  const rows = sortFn(
    players
      .map(toRow)
      .filter(r => categorias.length === 0 || categorias.includes(r.categoria))
      .filter(r => mostrarContrato || !r.contrato || r.casoEspecial)
      .filter(r => !term || r.name.toLowerCase().includes(term) || r.gov_id.toLowerCase().includes(term))
  );

  const categoriasPresentes = CATEGORIAS.filter(c => players.some(p => p.categoria === c));
  const toggleCategoria = (cat) =>
    setCategorias(prev => (prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]));
  const chipClass = (active) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium ${active ? 'bg-black text-yellow-400' : 'bg-white text-gray-600 border border-gray-200'}`;

  const totalGeneral = rows.reduce((sum, r) => sum + r.total, 0);

  const handleExport = () => {
    const data = rows.map(r => Object.fromEntries(EXPORT_COLUMNS.map(([label, get]) => [label, get(r)])));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'Jugadores');
    const [y, m, d] = todayISO().split('-');
    XLSX.writeFile(workbook, `Finanzas-Jugadores-${d}-${m}-${y}.xlsx`);
    database.logActivity('export_finanzas', currentUser?.email, 'players', null, { cantidad: rows.length, categorias, mostrarContrato });
  };

  const th = (col, label, className = '') => (
    <th onClick={() => handleSort(col)} className={`${thClass} text-left ${className}`}>
      {label}<SortIcon col={col} />
    </th>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Finanzas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Jugadores activos · solo lectura</p>
        </div>
        <button
          onClick={handleExport}
          disabled={rows.length === 0}
          className="flex items-center gap-2 bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          Exportar a Excel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Jugadores</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Con contrato</p>
          <p className="text-2xl font-bold">{rows.filter(r => r.contrato).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total viáticos + complementos</p>
          <p className="text-2xl font-bold">{money(totalGeneral)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-4 flex flex-col gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o documento..."
          className="w-full"
        />
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-500 mr-1">Categorías:</span>
          <button onClick={() => setCategorias([])} className={chipClass(categorias.length === 0)}>Todas</button>
          {categoriasPresentes.map(cat => (
            <button key={cat} onClick={() => toggleCategoria(cat)} className={chipClass(categorias.includes(cat))}>
              {cat}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={mostrarContrato}
            onChange={(e) => setMostrarContrato(e.target.checked)}
            className="rounded border-gray-300 text-black focus:ring-yellow-500"
          />
          Mostrar jugadores con contrato
          <span className="text-xs text-gray-500">(los casos especiales se muestran siempre)</span>
        </label>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {th('name', 'Nombre', 'sticky left-0 z-10 bg-gray-50 border-r border-gray-200')}
              {th('date_of_birth', 'Fecha nac.')}
              {th('gov_id', 'Documento')}
              {th('categoria', 'Categoría')}
              {th('viatico', 'Viático')}
              {th('complemento', 'Complemento')}
              {th('contratoSort', 'Contrato')}
              {th('complemento_override_expira', 'Override')}
              {th('total', 'Total')}
              {th('titular', 'Titular')}
              {th('cuenta_banco', 'Banco')}
              {th('cuenta_numero', 'Cuenta')}
              {th('comentario_viatico', 'Comentario')}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 sticky left-0 z-10 bg-white border-r border-gray-200 whitespace-nowrap">
                  <button
                    onClick={() => setHistoryPlayer({ playerId: r.id, playerName: r.name })}
                    className="font-medium text-left hover:underline"
                    title="Ver historial de cambios"
                  >
                    {r.name}
                  </button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.date_of_birth || null)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.gov_id}
                  {r.tipo_documento && r.tipo_documento !== 'Cédula de Identidad' && (
                    <span className="ml-1 text-xs text-gray-500">({r.tipo_documento})</span>
                  )}
                </td>
                <td className="px-3 py-2">{r.categoria}</td>
                <td className="px-3 py-2 whitespace-nowrap">{money(r.viatico)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {money(r.complemento)}
                  {r.overrideActivo && (
                    <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 rounded px-1" title="Override activo">temp</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {r.contrato ? (
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Sí</span>
                      {r.casoEspecial && (
                        <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full" title="Tiene contrato y cobra complemento">
                          Caso especial
                        </span>
                      )}
                    </span>
                  ) : 'No'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.complemento_override != null
                    ? <>{money(r.complemento_override)} <span className="text-xs text-gray-500">hasta {formatDate(r.complemento_override_expira || null)}</span></>
                    : '-'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-semibold">{r.contrato && !r.casoEspecial ? '-' : money(r.total)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.titular || <span className="text-gray-400">Sin cuenta</span>}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.cuenta_banco || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.cuenta_numero || '-'}</td>
                <td className="px-3 py-2 min-w-[200px] text-gray-600 dark:text-gray-300">{r.comentario_viatico}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron jugadores</p>
          </div>
        )}
      </div>

      {historyPlayer && (
        <PlayerHistoryModal
          playerId={historyPlayer.playerId}
          playerName={historyPlayer.playerName}
          fetchHistory={(id) => database.getPlayerHistoryFinanzas(id)}
          onClose={() => setHistoryPlayer(null)}
        />
      )}
    </div>
  );
};
