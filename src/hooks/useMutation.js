import { useState } from 'react';

export const useMutation = (onError) => {
  const [isSaving, setIsSaving] = useState(false);

  const execute = async (fn, errorLabel = 'Error') => {
    setIsSaving(true);
    try {
      await fn();
    } catch (error) {
      console.error(errorLabel, error);
      onError?.(`${errorLabel}: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return { execute, isSaving };
};
