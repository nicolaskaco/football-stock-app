import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, FileText, Edit2 } from 'lucide-react';
import { database } from '../utils/database';
import { CHANGE_REQUEST_STATUS } from '../utils/constants';
import { formatDateTime, daysSince } from '../utils/dateUtils';
import { AlertModal } from './AlertModal';
import { PromptModal } from './PromptModal';
import { ConfirmModal } from './ConfirmModal';
import { useAlertModal } from '../hooks/useAlertModal';
import { ViaticosCongeladosBanner } from './ViaticosCongeladosBanner';
import { ChangeRequestModal } from './ChangeRequestModal';

export const ChangeRequestsTab = ({ currentUser, appSettings = {} }) => {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const { alertModal, showAlert, closeAlert } = useAlertModal();
  const [promptModal, setPromptModal] = useState({ isOpen: false });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });

  const [editModal, setEditModal] = useState(null);

  const viaticosCongelados = appSettings['viaticos_congelados'] === 'true';
  const canApprove = ['admin', 'ejecutivo', 'presidente'].includes(currentUser?.role) && !viaticosCongelados;

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = filter === 'pending'
        ? await database.getPendingChangeRequests()
        : await database.getAllChangeRequests();

      let filteredData = data;
      if (currentUser?.role === 'presidente_categoria' && currentUser?.categoria?.length > 0) {
        filteredData = data.filter(request =>
          request.players?.categoria && currentUser.categoria.includes(request.players.categoria)
        );
      }

      setRequests(filteredData);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedIds(new Set());
    loadRequests();
  }, [filter]);

  // ── Selection helpers ──────────────────────────────────────────
  const pendingInView = filteredRequests => filteredRequests.filter(r => r.status === CHANGE_REQUEST_STATUS.PENDING);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (pending) => {
    const allSelected = pending.length > 0 && pending.every(r => selectedIds.has(r.id));
    setSelectedIds(allSelected ? new Set() : new Set(pending.map(r => r.id)));
  };

  // ── Individual actions ─────────────────────────────────────────
  const handleApprove = async (requestId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Aprobar Solicitud',
      message: '¿Estás seguro que deseas aprobar esta solicitud de cambio?',
      confirmText: 'Aprobar',
      cancelText: 'Cancelar',
      type: 'primary',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try {
          await database.approveChangeRequest(requestId, currentUser.email, '');
          await loadRequests();
          showAlert('Éxito', 'Solicitud aprobada exitosamente', 'success');
        } catch (error) {
          console.error('Error approving request:', error);
          showAlert('Error', 'Error aprobando solicitud: ' + error.message, 'error');
        }
      }
    });
  };

  const handleReject = async (requestId) => {
    setPromptModal({
      isOpen: true,
      title: 'Rechazar Solicitud',
      message: 'Razón del rechazo (opcional):',
      placeholder: 'Escribe la razón aquí...',
      required: false,
      onConfirm: async (notes) => {
        setPromptModal({ isOpen: false });
        try {
          await database.rejectChangeRequest(requestId, currentUser.email, notes);
          await loadRequests();
          showAlert('Rechazada', 'Solicitud rechazada exitosamente', 'success');
        } catch (error) {
          console.error('Error rejecting request:', error);
          showAlert('Error', 'Error rechazando solicitud: ' + error.message, 'error');
        }
      }
    });
  };

  // ── Bulk actions ───────────────────────────────────────────────
  const handleBulkApprove = () => {
    const count = selectedIds.size;
    setConfirmModal({
      isOpen: true,
      title: 'Aprobar Solicitudes',
      message: `¿Aprobar las ${count} solicitud${count !== 1 ? 'es' : ''} seleccionada${count !== 1 ? 's' : ''}?`,
      confirmText: 'Aprobar todas',
      cancelText: 'Cancelar',
      type: 'primary',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try {
          for (const id of selectedIds) {
            await database.approveChangeRequest(id, currentUser.email, '');
          }
          setSelectedIds(new Set());
          await loadRequests();
          showAlert('Éxito', `${count} solicitud${count !== 1 ? 'es aprobadas' : ' aprobada'} exitosamente`, 'success');
        } catch (error) {
          console.error('Error bulk approving:', error);
          showAlert('Error', 'Error aprobando solicitudes: ' + error.message, 'error');
        }
      }
    });
  };

  const handleBulkReject = () => {
    const count = selectedIds.size;
    setPromptModal({
      isOpen: true,
      title: 'Rechazar Solicitudes',
      message: `Razón del rechazo para las ${count} solicitud${count !== 1 ? 'es' : ''} seleccionada${count !== 1 ? 's' : ''} (opcional):`,
      placeholder: 'Escribe la razón aquí...',
      required: false,
      onConfirm: async (notes) => {
        setPromptModal({ isOpen: false });
        try {
          for (const id of selectedIds) {
            await database.rejectChangeRequest(id, currentUser.email, notes);
          }
          setSelectedIds(new Set());
          await loadRequests();
          showAlert('Rechazadas', `${count} solicitud${count !== 1 ? 'es rechazadas' : ' rechazada'} exitosamente`, 'success');
        } catch (error) {
          console.error('Error bulk rejecting:', error);
          showAlert('Error', 'Error rechazando solicitudes: ' + error.message, 'error');
        }
      }
    });
  };

  // ── Edit pending solicitud ─────────────────────────────────────
  const handleEditSave = async (newValues, notes) => {
    try {
      await database.updatePlayerChangeRequest(editModal.request.id, newValues, notes);
      setEditModal(null);
      await loadRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      showAlert('Error', 'Error actualizando solicitud: ' + error.message, 'error');
    }
  };

  // ── Derived state ──────────────────────────────────────────────
  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  const pendingVisible = pendingInView(filteredRequests);
  const allPendingSelected = pendingVisible.length > 0 && pendingVisible.every(r => selectedIds.has(r.id));

  return (
    <div className="pb-20">
      {viaticosCongelados && (
        <div className="mb-4">
          <ViaticosCongeladosBanner contacto={appSettings['viaticos_congelados_contacto'] || 'Martín Arroyo'} />
        </div>
      )}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Solicitudes de Cambio</h2>
          {canApprove && pendingVisible.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allPendingSelected}
                onChange={() => toggleSelectAll(pendingVisible)}
                className="w-4 h-4 rounded"
              />
              Seleccionar todas pendientes
            </label>
          )}
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value={CHANGE_REQUEST_STATUS.PENDING}>Pendientes</option>
          <option value={CHANGE_REQUEST_STATUS.APPROVED}>Aprobadas</option>
          <option value={CHANGE_REQUEST_STATUS.REJECTED}>Rechazadas</option>
          <option value="all">Todas</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay solicitudes {filter !== 'all' ? filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : 'rechazadas' : ''}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(request => (
            <div key={request.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  {canApprove && request.status === CHANGE_REQUEST_STATUS.PENDING && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(request.id)}
                      onChange={() => toggleSelect(request.id)}
                      className="mt-1.5 w-4 h-4 rounded cursor-pointer flex-shrink-0"
                    />
                  )}
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-bold">
                      {request.players?.name_visual || request.players?.name}
                      {request.status === CHANGE_REQUEST_STATUS.PENDING && request.requested_by === currentUser?.email && (
                        <button
                          onClick={() => setEditModal({ request })}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar solicitud"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Categoría: {request.players?.categoria}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Solicitado por: {request.requested_by} el {formatDateTime(request.request_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {request.status === CHANGE_REQUEST_STATUS.PENDING && (() => {
                    const days = daysSince(request.request_date);
                    const label = days === 0 ? 'Hoy' : `Hace ${days} día${days !== 1 ? 's' : ''}`;
                    const color = days >= 7 ? 'bg-red-100 text-red-700' : days >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
                    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
                  })()}
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    request.status === CHANGE_REQUEST_STATUS.PENDING ? 'bg-yellow-100 text-yellow-800' :
                    request.status === CHANGE_REQUEST_STATUS.APPROVED ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.status === CHANGE_REQUEST_STATUS.PENDING ? 'Pendiente' :
                     request.status === CHANGE_REQUEST_STATUS.APPROVED ? 'Aprobada' : 'Rechazada'}
                  </span>
                </div>
              </div>

              {(() => {
                const viaticoCambiado     = request.old_viatico    !== request.new_viatico;
                const complementoCambiado = request.old_complemento !== request.new_complemento;
                const contratoCambiado    = request.old_contrato    !== request.new_contrato;
                return (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Viático</p>
                      {viaticoCambiado ? (
                        <p className="text-sm">
                          <span className="text-red-600 line-through">${request.old_viatico || 0}</span>
                          {' → '}
                          <span className="text-green-600 font-semibold">${request.new_viatico || 0}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600">${request.old_viatico || 0} <span className="italic">(sin cambio)</span></p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Complemento</p>
                      {complementoCambiado ? (
                        <p className="text-sm">
                          <span className="text-red-600 line-through">${request.old_complemento || 0}</span>
                          {' → '}
                          <span className="text-green-600 font-semibold">${request.new_complemento || 0}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600">${request.old_complemento || 0} <span className="italic">(sin cambio)</span></p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Contrato</p>
                      {contratoCambiado ? (
                        <p className="text-sm">
                          <span className="text-red-600 line-through">{request.old_contrato ? 'Sí' : 'No'}</span>
                          {' → '}
                          <span className="text-green-600 font-semibold">{request.new_contrato ? 'Sí' : 'No'}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600">{request.old_contrato ? 'Sí' : 'No'} <span className="italic">(sin cambio)</span></p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {request.request_notes && (
                <div className="bg-gray-50 p-3 rounded mb-4">
                  <p className="text-xs text-gray-500 mb-1">Notas de la solicitud:</p>
                  <p className="text-sm">{request.request_notes}</p>
                </div>
              )}

              {request.status !== 'pending' && (
                <div className="bg-blue-50 p-3 rounded mb-4">
                  <p className="text-xs text-gray-500 mb-1">
                    Revisado por: {request.reviewed_by} el {formatDateTime(request.review_date)}
                  </p>
                  {request.review_notes && (
                    <p className="text-sm mt-1">{request.review_notes}</p>
                  )}
                </div>
              )}

              {request.status === 'pending' && canApprove && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(request.id)}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sticky bulk action bar */}
      {canApprove && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg px-6 py-3 flex items-center gap-3 z-40">
          <span className="text-sm text-gray-700 font-medium">
            {selectedIds.size} solicitud{selectedIds.size !== 1 ? 'es' : ''} seleccionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleBulkApprove}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
          >
            <CheckCircle className="w-4 h-4" />
            Aprobar todas
          </button>
          <button
            onClick={handleBulkReject}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
          >
            <XCircle className="w-4 h-4" />
            Rechazar todas
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700 ml-auto"
          >
            Cancelar selección
          </button>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
      <PromptModal
        isOpen={promptModal.isOpen}
        onClose={() => setPromptModal({ ...promptModal, isOpen: false })}
        onConfirm={promptModal.onConfirm}
        title={promptModal.title}
        message={promptModal.message}
        placeholder={promptModal.placeholder}
        required={promptModal.required}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
      />
      {editModal && (
        <ChangeRequestModal
          player={editModal.request.players}
          currentValues={{
            viatico: editModal.request.old_viatico,
            complemento: editModal.request.old_complemento,
            contrato: editModal.request.old_contrato
          }}
          initialNewValues={{
            viatico: editModal.request.new_viatico,
            complemento: editModal.request.new_complemento,
            contrato: editModal.request.new_contrato
          }}
          initialNotes={editModal.request.request_notes}
          onSubmit={handleEditSave}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
};
