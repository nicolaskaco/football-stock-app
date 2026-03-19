import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { todayISO } from '../utils/dateUtils';
import { calculateTotal } from '../utils/playerUtils';
import { CATEGORIAS } from '../utils/constants';

const STATUS_LABELS = {
  activo: 'Activo',
  cedido: 'Cedido',
  transferido: 'Transferido',
  egresado: 'Egresado',
  'dado de baja': 'Dado de baja',
};

const ExportButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
  >
    <Download size={14} /> Exportar Excel
  </button>
);

const ReportHeader = ({ title, onExport }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-xl font-bold">{title}</h3>
    {onExport && <ExportButton onClick={onExport} />}
  </div>
);

export const ReportsTab = ({ distributions, employees, inventory, players = [] }) => {
  const [reportType, setReportType] = useState('funcionario');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // ── Existing report data ───────────────────────────────────────────────────

  const employeeDistributions = selectedEmployee
    ? distributions.filter(d => d.employee_id === selectedEmployee)
    : [];
  const selectedEmp = employees.find(e => e.id === selectedEmployee);

  const allDistributions = employees.map(emp => ({
    employee: emp,
    distributions: distributions.filter(d => d.employee_id === emp.id),
  }));

  const monthlyStats = distributions.reduce((acc, dist) => {
    const month = dist.date.substring(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const inventoryByCategory = inventory.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { total: 0, lowStock: 0 };
    }
    acc[item.category].total += item.quantity;
    if (item.quantity <= item.min_stock) {
      acc[item.category].lowStock += 1;
    }
    return acc;
  }, {});

  // ── New player report data ─────────────────────────────────────────────────

  // Plantel por Categoría: group players by categoria in CATEGORIAS order
  const plantelPorCategoria = CATEGORIAS.map(cat => ({
    categoria: cat,
    jugadores: players
      .filter(p => p.categoria === cat)
      .sort((a, b) => (a.name_visual || a.name).localeCompare(b.name_visual || b.name)),
  })).filter(g => g.jugadores.length > 0);

  // Viáticos por Categoría: active players only, summed per category
  const viaticoPorCategoria = CATEGORIAS.map(cat => {
    const activos = players.filter(p => p.categoria === cat && p.status === 'activo');
    const conContrato = activos.filter(p => p.contrato).length;
    const totalViatico = activos.reduce((s, p) => s + (p.contrato ? 0 : (p.viatico || 0)), 0);
    const totalComplemento = activos.reduce((s, p) => s + (p.contrato ? 0 : (p.complemento || 0)), 0);
    const totalGeneral = activos.reduce((s, p) => s + calculateTotal(p), 0);
    return { categoria: cat, cantidad: activos.length, conContrato, totalViatico, totalComplemento, totalGeneral };
  }).filter(g => g.cantidad > 0);

  // Jugadores con Casita
  const jugadoresCasita = players
    .filter(p => p.casita)
    .sort((a, b) => (a.name_visual || a.name).localeCompare(b.name_visual || b.name));

  // ── Excel exports ──────────────────────────────────────────────────────────

  const exportFuncionario = () => {
    if (!selectedEmp) return;
    const data = employeeDistributions.map(dist => {
      const item = inventory.find(i => i.id === dist.item_id);
      return {
        'Fecha': dist.date,
        'Tipo de Ropa': item?.name || 'N/A',
        'Talle': dist.size,
        'Cantidad': dist.quantity,
        'Condición': dist.condition,
        'Estado': dist.return_date ? `Devuelto ${dist.return_date}` : 'Activo',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ropa');
    XLSX.writeFile(wb, `reporte_funcionario_${todayISO()}.xlsx`);
  };

  const exportTodosFuncionarios = () => {
    const data = allDistributions.map(({ employee, distributions: dists }) => ({
      'Funcionario': employee.name,
      'Rol': employee.role,
      'Total Items': dists.length,
      'Activos': dists.filter(d => !d.return_date).length,
      'Devueltos': dists.filter(d => d.return_date).length,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionarios');
    XLSX.writeFile(wb, `resumen_funcionarios_${todayISO()}.xlsx`);
  };

  const exportInventario = () => {
    const data = Object.entries(inventoryByCategory).map(([category, stats]) => {
      const categoryItems = inventory.filter(i => i.category === category);
      return {
        'Categoría': category,
        'Total Items': categoryItems.length,
        'Stock Bajo': stats.lowStock,
        'Cantidad Total': stats.total,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `inventario_${todayISO()}.xlsx`);
  };

  const exportMensual = () => {
    const data = Object.entries(monthlyStats)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, count]) => ({ 'Mes': month, 'Total Distribuciones': count }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mensual');
    XLSX.writeFile(wb, `distribucion_mensual_${todayISO()}.xlsx`);
  };

  const exportPlantel = () => {
    const data = plantelPorCategoria.flatMap(({ categoria, jugadores }) =>
      jugadores.map(p => ({
        'Nombre': p.name_visual || p.name,
        'Categoría': categoria,
        'Categoría de Juego': p.categoria_juego || categoria,
        'Estado': p.status,
      }))
    );
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantel');
    XLSX.writeFile(wb, `plantel_categorias_${todayISO()}.xlsx`);
  };

  const exportViaticos = () => {
    const data = viaticoPorCategoria.map(g => ({
      'Categoría': g.categoria,
      'Jugadores': g.cantidad,
      'Con Contrato': g.conContrato,
      'Total Viático': g.totalViatico,
      'Total Complemento': g.totalComplemento,
      'Total General': g.totalGeneral,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Viáticos');
    XLSX.writeFile(wb, `viaticos_categorias_${todayISO()}.xlsx`);
  };

  const exportCasita = () => {
    const data = jugadoresCasita.map(p => ({
      'Nombre': p.name_visual || p.name,
      'Categoría': p.categoria,
      'Estado': p.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Casita');
    XLSX.writeFile(wb, `jugadores_casita_${todayISO()}.xlsx`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Reportes</h2>
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="funcionario">Reporte por Funcionario</option>
          <option value="todos_funcionarios">Resumen de Funcionarios</option>
          <option value="inventario">Estado del Inventario</option>
          <option value="mensual">Distribución Mensual</option>
          <option value="plantel_categoria">Plantel por Categoría</option>
          <option value="viaticos_categoria">Viáticos por Categoría</option>
          <option value="casita">Jugadores con Casita</option>
        </select>
      </div>

      {reportType === 'funcionario' && (
        <div>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="mb-6 px-4 py-2 border rounded-lg"
          >
            <option value="">Seleccione Funcionario</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          {selectedEmp && (
            <div className="bg-white rounded-lg shadow p-6">
              <ReportHeader
                title={`${selectedEmp.name} — Historia Ropa Entregada`}
                onExport={exportFuncionario}
              />
              <div className="mb-4 text-sm text-gray-600">
                <p>Rol: {selectedEmp.role}</p>
                <p>Talles preferido: Superior {selectedEmp.upper_size}, Inferior {selectedEmp.lower_size}</p>
                <p>Total ropa entregada: {employeeDistributions.length}</p>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo de Ropa</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Talle</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Condición</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employeeDistributions.map(dist => {
                    const item = inventory.find(i => i.id === dist.item_id);
                    return (
                      <tr key={dist.id}>
                        <td className="px-4 py-2 text-sm">{dist.date}</td>
                        <td className="px-4 py-2 text-sm">{item?.name || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm">{dist.size}</td>
                        <td className="px-4 py-2 text-sm">{dist.quantity}</td>
                        <td className="px-4 py-2 text-sm">{dist.condition}</td>
                        <td className="px-4 py-2 text-sm">
                          {dist.return_date ? `Devuelto ${dist.return_date}` : 'Activo'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {reportType === 'todos_funcionarios' && (
        <div className="bg-white rounded-lg shadow p-6">
          <ReportHeader title="Resumen de Distribución de Funcionarios" onExport={exportTodosFuncionarios} />
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Funcionario</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rol</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total Items</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Activos</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Devueltos</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allDistributions.map(({ employee, distributions: dists }) => (
                <tr key={employee.id}>
                  <td className="px-4 py-2 text-sm font-medium">{employee.name}</td>
                  <td className="px-4 py-2 text-sm">{employee.role}</td>
                  <td className="px-4 py-2 text-sm">{dists.length}</td>
                  <td className="px-4 py-2 text-sm">{dists.filter(d => !d.return_date).length}</td>
                  <td className="px-4 py-2 text-sm">{dists.filter(d => d.return_date).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reportType === 'inventario' && (
        <div className="bg-white rounded-lg shadow p-6">
          <ReportHeader title="Estado del Inventario por Categoría" onExport={exportInventario} />
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Categoría</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total Items</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Items Stock Bajo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(inventoryByCategory).map(([category, stats]) => {
                const categoryItems = inventory.filter(i => i.category === category);
                return (
                  <tr key={category}>
                    <td className="px-4 py-2 text-sm font-medium">{category}</td>
                    <td className="px-4 py-2 text-sm">{categoryItems.length}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={stats.lowStock > 0 ? 'text-red-600 font-semibold' : ''}>
                        {stats.lowStock}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{stats.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reportType === 'mensual' && (
        <div className="bg-white rounded-lg shadow p-6">
          <ReportHeader title="Distribución Mensual" onExport={exportMensual} />
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mes</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total Distribuciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(monthlyStats)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([month, count]) => (
                  <tr key={month}>
                    <td className="px-4 py-2 text-sm font-medium">{month}</td>
                    <td className="px-4 py-2 text-sm">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {reportType === 'plantel_categoria' && (
        <div className="bg-white rounded-lg shadow p-6">
          <ReportHeader title="Plantel por Categoría" onExport={exportPlantel} />
          {plantelPorCategoria.map(({ categoria, jugadores }) => (
            <div key={categoria} className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-2">{categoria} — {jugadores.length} jugadores</h4>
              <table className="w-full mb-2">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Categoría de Juego</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jugadores.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-2 text-sm font-medium">{p.name_visual || p.name}</td>
                      <td className="px-4 py-2 text-sm">{p.categoria_juego || categoria}</td>
                      <td className="px-4 py-2 text-sm">{STATUS_LABELS[p.status] || p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {plantelPorCategoria.length === 0 && (
            <p className="text-gray-500 text-sm">No hay jugadores registrados.</p>
          )}
        </div>
      )}

      {reportType === 'viaticos_categoria' && (
        <div className="bg-white rounded-lg shadow p-6">
          <ReportHeader title="Viáticos por Categoría" onExport={exportViaticos} />
          <p className="text-xs text-gray-500 mb-4">Solo jugadores activos. Jugadores con contrato no suman al total.</p>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Categoría</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Jugadores</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Con Contrato</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total Viático</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total Complemento</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total General</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {viaticoPorCategoria.map(g => (
                <tr key={g.categoria}>
                  <td className="px-4 py-2 text-sm font-medium">{g.categoria}</td>
                  <td className="px-4 py-2 text-sm">{g.cantidad}</td>
                  <td className="px-4 py-2 text-sm">{g.conContrato}</td>
                  <td className="px-4 py-2 text-sm text-right">${g.totalViatico.toLocaleString('es-UY')}</td>
                  <td className="px-4 py-2 text-sm text-right">${g.totalComplemento.toLocaleString('es-UY')}</td>
                  <td className="px-4 py-2 text-sm text-right font-semibold">${g.totalGeneral.toLocaleString('es-UY')}</td>
                </tr>
              ))}
              {viaticoPorCategoria.length > 1 && (
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-2 text-sm">Total</td>
                  <td className="px-4 py-2 text-sm">{viaticoPorCategoria.reduce((s, g) => s + g.cantidad, 0)}</td>
                  <td className="px-4 py-2 text-sm">{viaticoPorCategoria.reduce((s, g) => s + g.conContrato, 0)}</td>
                  <td className="px-4 py-2 text-sm text-right">${viaticoPorCategoria.reduce((s, g) => s + g.totalViatico, 0).toLocaleString('es-UY')}</td>
                  <td className="px-4 py-2 text-sm text-right">${viaticoPorCategoria.reduce((s, g) => s + g.totalComplemento, 0).toLocaleString('es-UY')}</td>
                  <td className="px-4 py-2 text-sm text-right">${viaticoPorCategoria.reduce((s, g) => s + g.totalGeneral, 0).toLocaleString('es-UY')}</td>
                </tr>
              )}
            </tbody>
          </table>
          {viaticoPorCategoria.length === 0 && (
            <p className="text-gray-500 text-sm">No hay jugadores activos registrados.</p>
          )}
        </div>
      )}

      {reportType === 'casita' && (
        <div className="bg-white rounded-lg shadow p-6">
          <ReportHeader title="Jugadores con Casita" onExport={exportCasita} />
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Categoría</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jugadoresCasita.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-sm font-medium">{p.name_visual || p.name}</td>
                  <td className="px-4 py-2 text-sm">{p.categoria}</td>
                  <td className="px-4 py-2 text-sm">{STATUS_LABELS[p.status] || p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {jugadoresCasita.length === 0 && (
            <p className="text-gray-500 text-sm">No hay jugadores con casita.</p>
          )}
          {jugadoresCasita.length > 0 && (
            <p className="mt-3 text-sm text-gray-600 font-medium">Total: {jugadoresCasita.length} jugadores</p>
          )}
        </div>
      )}
    </div>
  );
};
