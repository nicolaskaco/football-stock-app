import React, { useState, useRef, useEffect } from 'react';

export function InlineEditCell({ value, type, options, isEditing, onStartEdit, onSave, onCancel, canEdit, displayValue }) {
  const [localValue, setLocalValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      setLocalValue(value);
    }
  }, [isEditing, value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' && inputRef.current.select) {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleSave = async (newValue) => {
    const saveValue = newValue !== undefined ? newValue : localValue;
    if (saveValue === value) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      await onSave(saveValue);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // Boolean type — always interactive when canEdit
  if (type === 'boolean') {
    return (
      <td className="px-3 py-4">
        {canEdit ? (
          <button
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(!value);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            className={`text-xl font-bold cursor-pointer hover:opacity-70 transition-opacity ${value ? 'text-green-600' : 'text-gray-400'} ${saving ? 'opacity-50' : ''}`}
          >
            {value ? '✓' : '☐'}
          </button>
        ) : (
          <span className={`text-xl font-bold ${value ? 'text-green-600' : 'text-gray-400'}`}>
            {value ? '✓' : '☐'}
          </span>
        )}
      </td>
    );
  }

  // Read mode
  if (!isEditing) {
    const content = displayValue || (value || '-');
    return (
      <td
        className={`px-3 py-4 text-sm ${canEdit ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`}
        onClick={canEdit ? onStartEdit : undefined}
      >
        {content}
      </td>
    );
  }

  // Edit mode — text input
  if (type === 'text') {
    return (
      <td className="px-3 py-4">
        <input
          ref={inputRef}
          type="text"
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => handleSave()}
          disabled={saving}
          className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </td>
    );
  }

  // Edit mode — select
  if (type === 'select') {
    return (
      <td className="px-3 py-4">
        <select
          ref={inputRef}
          value={localValue || ''}
          onChange={(e) => handleSave(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onCancel(); } }}
          onBlur={() => onCancel()}
          disabled={saving}
          className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">—</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </td>
    );
  }

  return <td className="px-3 py-4 text-sm">{value || '-'}</td>;
}
