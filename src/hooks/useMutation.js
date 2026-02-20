import { useState } from 'react';
import { useToast } from '../context/ToastContext';

export const useMutation = (onError) => {
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const execute = async (fn, errorLabel = 'Error', successMessage = null) => {
    setIsSaving(true);
    try {
      await fn();
      if (successMessage) showToast(successMessage, 'success');
    } catch (error) {
      console.error(errorLabel, error);
      onError?.(`${errorLabel}: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return { execute, isSaving };
};
