// DocumentUpload.jsx
import React, { useState, useEffect } from 'react';
import { Upload, File, Trash2 } from 'lucide-react';
import { database } from '../utils/database';
import { AlertModal } from './AlertModal';

export const DocumentUpload = ({ playerId, playerName, readOnly }) => {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [documentUrls, setDocumentUrls] = useState({});
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'info' });

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

  const handleDelete = async (doc) => {
    if (window.confirm('¿Eliminar este documento?')) {
      await database.deleteDocument(doc.id, doc.file_path);
      await loadDocuments();
    }
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
                    <button onClick={() => handleDelete(doc)} className="text-red-600">
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
    </div>
  );
};