import React from 'react';

const btnClass = (active) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium ${
    active ? 'bg-black text-yellow-400' : 'bg-white text-gray-600 border border-gray-200'
  }`;

/**
 * Generic toggle-button group for filters.
 *
 * Props:
 *   options   string[]        — list of option values
 *   value     string | null   — currently selected value (null = all)
 *   onChange  (v) => void     — called with the selected value, or null when toggled off
 *   label     string?         — small label shown before the buttons (e.g. "Fase:")
 *   allLabel  string          — label for the "all" button (default: "Todas")
 */
export const FilterButtonGroup = ({ options, value, onChange, label, allLabel = 'Todas' }) => (
  <div className="flex gap-2 flex-wrap items-center">
    {label && <span className="text-xs text-gray-500 mr-1">{label}</span>}
    <button onClick={() => onChange(null)} className={btnClass(!value)}>
      {allLabel}
    </button>
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt === value ? null : opt)}
        className={btnClass(value === opt)}
      >
        {opt}
      </button>
    ))}
  </div>
);
