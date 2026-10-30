/**
 * Consistent search input for tab filter bars.
 * Calls onChange with the string value (not the DOM event).
 *
 * Props:
 *   value        string  — controlled value
 *   onChange     fn      — called with the new string value on every keystroke
 *   placeholder  string  — placeholder text
 *   className    string  — layout classes (default: 'flex-1')
 *                          Base styles (px-4 py-2 border rounded-lg) are always applied.
 *   autoFocus    bool    — focus the input on mount (default: false)
 */
export function SearchInput({ value, onChange, placeholder, className = 'flex-1', autoFocus = false }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      className={`${className} px-4 py-2 border rounded-lg`}
    />
  );
}
