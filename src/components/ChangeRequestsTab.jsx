import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { database } from '../utils/database';

export const ChangeRequestsTab = ({ currentUser }) => {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const canApprove = ['admin', 'ejecutivo', 'presidente'].includes(currentUser?.role);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = filter === 'pending' 
        ? await database.getPendingChangeRequests()
        : await database.getAllChangeRequests();
      
      // Filter by categoria if user is presidente_categoria
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
    loadRequests();
  }, [filter]);

  const handleApprove = async (requestId, notes = '') => {
    if (!window.confirm('¿Aprobar esta solicitud de cambio?')) return;
    
    try {
      await database.approveChangeRequest(requestId, currentUser.email, notes);
      await loadRequests();
      alert('Solicitud aprobada exitosamente');
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error aprobando solicitud: ' + error.message);
    }
  };

  const handleReject = async (requestId) => {
    const notes = window.prompt('Razón del rechazo (opcional):');
    if (notes === null) return; // User cancelled
    
    try {
      await database.rejectChangeRequest(requestId, currentUser.email, notes);
      await loadRequests();
      alert('Solicitud rechazada');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rechazando solicitud: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-UY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Solicitudes de Cambio</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazadas</option>
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
                <div>
                  <h3 className="text-lg font-bold">
                    {request.players?.name_visual || request.players?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Categoría: {request.players?.categoria}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Solicitado por: {request.requested_by} el {formatDate(request.request_date)}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  request.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {request.status === 'pending' ? 'Pendiente' :
                   request.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Viático</p>
                  <p className="text-sm">
                    <span className="text-red-600 line-through">${request.old_viatico || 0}</span>
                    {' → '}
                    <span className="text-green-600 font-semibold">${request.new_viatico || 0}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Complemento</p>
                  <p className="text-sm">
                    <span className="text-red-600 line-through">${request.old_complemento || 0}</span>
                    {' → '}
                    <span className="text-green-600 font-semibold">${request.new_complemento || 0}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Contrato</p>
                  <p className="text-sm">
                    <span className="text-red-600 line-through">{request.old_contrato ? 'Sí' : 'No'}</span>
                    {' → '}
                    <span className="text-green-600 font-semibold">{request.new_contrato ? 'Sí' : 'No'}</span>
                  </p>
                </div>
              </div>

              {request.request_notes && (
                <div className="bg-gray-50 p-3 rounded mb-4">
                  <p className="text-xs text-gray-500 mb-1">Notas de la solicitud:</p>
                  <p className="text-sm">{request.request_notes}</p>
                </div>
              )}

              {request.status !== 'pending' && (
                <div className="bg-blue-50 p-3 rounded mb-4">
                  <p className="text-xs text-gray-500 mb-1">
                    Revisado por: {request.reviewed_by} el {formatDate(request.review_date)}
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
    </div>
  );
};