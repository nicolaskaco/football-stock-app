import React, { useState } from 'react';
import { useMountEffect } from '../hooks/useMountEffect';
import { UserPlus, Pencil, Trash2, Shield, ChevronDown, ChevronUp, Copy, Check, Link } from 'lucide-react';
import { database } from '../utils/database';
import { ALL_PERMISSION_KEYS } from '../forms/UserInviteForm';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';
import { UserInviteForm } from '../forms/UserInviteForm';
import { useMutation } from '../hooks/useMutation';

const ROLE_LABELS = {
  admin: 'Admin',
  ejecutivo: 'Ejecutivo',
  presidente: 'Presidente',
  presidente_categoria: 'Pres. Categoría',
  delegado: 'Delegado',
  comision: 'Comisión',
};

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700',
  ejecutivo: 'bg-blue-100 text-blue-700',
  presidente: 'bg-purple-100 text-purple-700',
  presidente_categoria: 'bg-amber-100 text-amber-700',
  delegado: 'bg-green-100 text-green-700',
  comision: 'bg-teal-100 text-teal-700',
};

export const UserManagementSection = () => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const { execute } = useMutation();

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await database.listUserPermissions();
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
    setLoadingUsers(false);
  };

  useMountEffect(() => {
    let cancelled = false;
    database.listUserPermissions().then(data => {
      if (!cancelled) {
        setUsers(data || []);
        setLoadingUsers(false);
      }
    }).catch(err => {
      console.error('Error loading users:', err);
      if (!cancelled) setLoadingUsers(false);
    });
    return () => { cancelled = true; };
  });

  const handleInvite = async ({ email, role, permissions }) => {
    await execute(
      async () => {
        const result = await database.inviteUser(email, role, permissions);
        setShowModal(false);
        if (result?.invite_link) {
          setInviteLink(result.invite_link);
          setCopied(false);
        }
        await loadUsers();
      },
      'Error al enviar invitación',
      'Invitación generada correctamente'
    );
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = inviteLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEdit = async ({ email, role, permissions }) => {
    await execute(
      async () => {
        const updates = {
          role,
          ...permissions,
        };
        await database.updateUserPermissions(email, updates);
        setEditingUser(null);
        await loadUsers();
      },
      'Error al actualizar permisos',
      'Permisos actualizados'
    );
  };

  const handleDelete = async (email) => {
    await execute(
      async () => {
        await database.deleteUserPermissions(email);
        setDeleteConfirm(null);
        await loadUsers();
      },
      'Error al eliminar usuario',
      'Permisos de usuario eliminados'
    );
  };

  const enabledCount = (user) =>
    ALL_PERMISSION_KEYS.filter(f => user[f]).length;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Gestión de Usuarios</h3>
          <span className="text-sm text-gray-500">({users.length})</span>
        </div>
        {expanded
          ? <ChevronUp className="w-5 h-5 text-gray-400" />
          : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Invitá nuevos usuarios al sistema y gestioná sus permisos.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-800 text-sm font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Invitar Usuario
            </button>
          </div>

          {loadingUsers ? (
            <div className="text-center py-8 text-gray-400">Cargando usuarios...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No hay usuarios registrados.</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Permisos</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorías</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(user => (
                      <tr key={user.email} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {enabledCount(user)} / {ALL_PERMISSION_KEYS.length}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.categoria && user.categoria.length > 0
                            ? user.categoria.join(', ')
                            : <span className="text-gray-400">Todas</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {user.role === 'admin' ? (
                            <span className="text-xs text-gray-400 italic px-2">Protegido</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingUser(user)}
                                title="Editar permisos"
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(user.email)}
                                title="Eliminar"
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite Modal */}
      {showModal && (
        <Modal title="Invitar Nuevo Usuario" onClose={() => setShowModal(false)}>
          <div className="p-6">
            <UserInviteForm
              onSubmit={handleInvite}
              onCancel={() => setShowModal(false)}
            />
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <Modal title="Editar Permisos" onClose={() => setEditingUser(null)}>
          <div className="p-6">
            <UserInviteForm
              existingUser={editingUser}
              onSubmit={handleEdit}
              onCancel={() => setEditingUser(null)}
            />
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmModal
          message={`¿Eliminar los permisos de ${deleteConfirm}? El usuario no podrá acceder al sistema.`}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Invite Link Modal */}
      {inviteLink && (
        <Modal title="Enlace de Invitación" onClose={() => setInviteLink(null)}>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Link className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                Copiá este enlace y envialo al usuario por WhatsApp u otro medio. El enlace expira en 24 horas.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-900 break-all font-mono select-all">{inviteLink}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setInviteLink(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cerrar
              </button>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-800 text-sm font-medium"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar Enlace'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
