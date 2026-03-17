import { useEffect, useRef } from 'react';

/**
 * Encapsulates the form dirty-state notification pattern.
 * Calls onDirtyChange(boolean) whenever formData diverges from / returns to its initial value.
 */
export function useFormDirty(formData, initialValue, onDirtyChange) {
  const initialData = useRef(JSON.stringify(initialValue || {}));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onDirtyChange?.(JSON.stringify(formData) !== initialData.current);
  }, [formData]);
}
