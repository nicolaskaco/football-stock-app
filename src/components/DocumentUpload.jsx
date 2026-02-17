// DocumentUpload.jsx
import React, { useState, useEffect } from 'react';
import { Upload, File, Trash2 } from 'lucide-react';
import { database } from '../utils/database';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';

export const DocumentUpload = ({ playerId, playerName, readOnly }) => {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [documentUrls, setDocumentUrls] = useState({});
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });

  useEffect(() => {
    loadDocuments();
  }, [playerId]);

  const loadDocuments = async () => {
    const docs = await database.getPlayerDocuments(playerId);
    setDocuments(docs);
    
    // Generate signed URLs for each document
    const urls = {};
    for (const doc of docs) {
        urls[doc.id] = await database.getDocumentUrl(doc.file_path);
    }
    setDocumentUrls(urls);
  };

  const handleUpload = async (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await database.uploadDocument(playerId, file, docType);
      await loadDocuments();

      setAlertModal({
        isOpen: true,
        title: 'Éxito',
        message: 'Documento subido exitosamente',
        type: 'success'
      });
    } catch (error) {
      alert('Error subiendo documento: ' + error.message);
    }
    setUploading(false);
  };

  const handleDelete = (doc) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro que deseas eliminar este documento?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        
        try {
          await database.deleteDocument(doc.id, doc.file_path);
          await loadDocuments();
        } catch (error) {
          console.error('Error deleting document:', error);
          // Optionally show an alert modal here
        }
      }
    });
  };

  const documentTypes = [
    { id: 'gov_id', label: 'Cédula' },
    { id: 'passport_uy', label: 'Pasaporte Uruguayo' },
    { id: 'passport_ext', label: 'Pasaporte Extranjero' },
    { id: 'contract', label: 'Contrato' }
    ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Cédula, Pasaportes y Contrato</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {documentTypes.map(type => (
            <div key={type.id} className="border rounded p-4">
            <label className="block text-sm font-medium mb-2">
                {type.label}
            </label>
            <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleUpload(e, type.id)}
                disabled={readOnly || uploading}
                className="text-sm"
            />
            </div>
        ))}
        </div>

        <div className="space-y-2">
            {documents.map(doc => {
                const docType = documentTypes.find(t => t.id === doc.document_type);
                return (
                <div key={doc.id} className="flex items-center justify-between border rounded p-2">
                    <div className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    <span className="text-sm">{docType?.label || doc.document_type} - {playerName}</span>
                    </div>
                    <div className="flex gap-2">
                    <a 
                        href={documentUrls[doc.id]} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm"
                    >
                        Ver
                    </a>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(doc);
                      }} 
                      className="text-red-600"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    </div>
                </div>
                );
            })}
        </div>
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
        />
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
        />
    </div>
  );
};