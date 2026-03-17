import React, { useState } from 'react';
import { CATEGORIAS } from '../utils/constants';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'ejecutivo', label: 'Ejecutivo' },
  { value: 'presidente', label: 'Presidente' },
  { value: 'presidente_categoria', label: 'Presidente de Categoría' },
  { value: 'delegado', label: 'Delegado' },
  { value: 'comision', label: 'Comisión' },
];

const PERMISSION_GROUPS = [
  {
    label: 'Jugadores',
    permissions: [
      { key: 'can_access_players', label: 'Ver jugadores' },
      { key: 'can_edit_players', label: 'Editar jugadores' },
      { key: 'editar_nombre_especial', label: 'Editar nombre visual' },
    ],
  },
  {
    label: 'Viáticos',
    permissions: [
      { key: 'can_access_viatico', label: 'Ver viáticos' },
      { key: 'can_access_tesorero', label: 'Acceder a Tesorero' },
    ],
  },
  {
    label: 'Torneos y Partidos',
    permissions: [
      { key: 'view_torneo', label: 'Ver torneos' },
      { key: 'edit_torneo', label: 'Editar torneos' },
      { key: 'can_view_partidos', label: 'Ver partidos' },
      { key: 'can_edit_partidos', label: 'Editar partidos' },
      { key: 'can_view_tarjetas', label: 'Ver tarjetas' },
    ],
  },
  {
    label: 'Comisiones',
    permissions: [
      { key: 'can_view_comisiones', label: 'Ver comisiones' },
      { key: 'can_edit_comisiones', label: 'Editar comisiones' },
    ],
  },
  {
    label: 'Inventario y Ropa',
    permissions: [
      { key: 'can_access_ropa', label: 'Ver inventario / distribuciones' },
      { key: 'can_see_ropa_widgets', label: 'Ver widgets de ropa' },
    ],
  },
  {
    label: 'Otros',
    permissions: [
      { key: 'can_access_widgets', label: 'Ver widgets de estadísticas' },
      { key: 'can_access_dirigentes', label: 'Ver dirigentes' },
      { key: 'can_edit_dirigentes', label: 'Editar dirigentes' },
    ],
  },
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g =>
  g.permissions.map(p => p.key)
);

const defaultPermissions = () =>
  ALL_PERMISSION_KEYS.reduce((acc, k) => ({ ...acc, [k]: false }), {});

export const UserInviteForm = ({ existingUser, onSubmit, onCancel }) => {
  const isEdit = !!existingUser;

  const [email, setEmail] = useState(existingUser?.email || '');
  const [role, setRole] = useState(existingUser?.role || 'ejecutivo');
  const [permissions, setPermissions] = useState(() => {
    if (existingUser) {
      const p = {};
      ALL_PERMISSION_KEYS.forEach(k => {
        p[k] = existingUser[k] ?? false;
      });
      return p;
    }
    return defaultPermissions();
  });
  const [categoria, setCategoria] = useState(existingUser?.categoria || []);
  const [loading, setLoading] = useState(false);

  const togglePerm = (key) =>
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleCategoria = (cat) =>
    setCategoria(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );

  const selectAllPerms = () => {
    const allOn = ALL_PERMISSION_KEYS.every(k => permissions[k]);
    const newVal = !allOn;
    setPermissions(
      ALL_PERMISSION_KEYS.reduce((acc, k) => ({ ...acc, [k]: newVal }), {})
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        email: email.toLowerCase().trim(),
        role,
        permissions: { ...permissions, categoria: categoria.length > 0 ? categoria : null },
      });
    } catch {
      // error handled by parent
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isEdit || loading}
          placeholder="usuario@ejemplo.com"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-100"
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Rol
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
        >
          {ROLES.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Permissions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Permisos</label>
          <button
            type="button"
            onClick={selectAllPerms}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {ALL_PERMISSION_KEYS.every(k => permissions[k])
              ? 'Desmarcar todos'
              : 'Marcar todos'}
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 space-y-4 max-h-64 overflow-y-auto">
          {PERMISSION_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {group.label}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {group.permissions.map(p => (
                  <label
                    key={p.key}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={permissions[p.key]}
                      onChange={() => togglePerm(p.key)}
                      disabled={loading}
                      className="rounded border-gray-300 text-black focus:ring-yellow-500"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categorías */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Categorías permitidas
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Dejar vacío para acceso a todas las categorías.
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategoria(cat)}
              disabled={loading}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                categoria.includes(cat)
                  ? 'bg-black text-yellow-400 border-black'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-black text-yellow-400 py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading
            ? 'Procesando...'
            : isEdit
              ? 'Guardar Cambios'
              : 'Enviar Invitación'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};
