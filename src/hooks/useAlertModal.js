import { useState } from 'react';

/**
 * Manages AlertModal visibility and content.
 *
 * Returns:
 *   alertModal  object   — { isOpen, title, message, type } — spread onto <AlertModal>
 *   showAlert   fn       — showAlert(title, message, type='info') to open the modal
 *   closeAlert  fn       — closes the modal
 *
 * Usage:
 *   const { alertModal, showAlert, closeAlert } = useAlertModal();
 *   showAlert('Error', 'Something went wrong', 'error');
 *   <AlertModal {...alertModal} onClose={closeAlert} />
 */
export function useAlertModal() {
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (title, message, type = 'info') =>
    setAlertModal({ isOpen: true, title, message, type });

  const closeAlert = () => setAlertModal(prev => ({ ...prev, isOpen: false }));

  return { alertModal, showAlert, closeAlert };
}
