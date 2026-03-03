import { useState, useEffect } from 'react';

/**
 * Manages a debounced search input tied to a URL search param.
 *
 * Keeps a local `inputValue` state that updates immediately on every
 * keystroke, then commits it to `setSearchTerm` after a 300ms delay
 * so the filter/query only fires when the user stops typing.
 *
 * Usage:
 *   const [inputValue, setInputValue] = useDebouncedSearch(searchTerm, setSearchTerm);
 *   <SearchInput value={inputValue} onChange={setInputValue} ... />
 *
 * Params:
 *   searchTerm     string  — current committed value (from URL params)
 *   setSearchTerm  fn      — commits the debounced value (updates URL params)
 *   delay          number  — debounce delay in ms (default: 300)
 */
export function useDebouncedSearch(searchTerm, setSearchTerm, delay = 300) {
  const [inputValue, setInputValue] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(inputValue), delay);
    return () => clearTimeout(timer);
  }, [inputValue]);

  return [inputValue, setInputValue];
}
