import React, { useState, useEffect } from 'react';
import { ClipboardList, AlertCircle, ExternalLink } from 'lucide-react';
import { database } from '../utils/database';

export const PendingChangeRequestsWidget = ({ setActiveTab }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const data = await database.getPendingChangeRequests();
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-UY', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-orange-600" />
          <h3 className="text-lg font-bold text-gray-900">
            Solicitudes Pendientes
          </h3>
        </div>
        {pendingRequests.length > 0 && (
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
            {pendingRequests.length}
          </span>
        )}
      </div>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-8">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay solicitudes pendientes</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {pendingRequests.slice(0, 5).map(request => (
              <div 
                key={request.id} 
                className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {request.players?.name_visual || request.players?.name || 'Jugador desconocido'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Solicitado por: {request.requested_by}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(request.request_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                    Pendiente
                  </span>
                </div>
              </div>
            ))}
          </div>

          {pendingRequests.length > 5 && (
            <p className="text-sm text-gray-600 mb-3">
              + {pendingRequests.length - 5} solicitud(es) más
            </p>
          )}

          <button
            onClick={() => setActiveTab('change_requests')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
          >
            Ver todas las solicitudes
            <ExternalLink className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};