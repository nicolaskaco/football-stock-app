import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Renders the appropriate sort direction arrow for a table column header.
 *
 * Props:
 *   columnKey  string  — the sort key this column represents
 *   sortConfig object  — { key: string, direction: 'asc'|'desc' }
 */
export function SortIcon({ columnKey, sortConfig }) {
  if (sortConfig.key !== columnKey) {
    return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
  }
  return sortConfig.direction === 'asc'
    ? <ArrowUp className="w-4 h-4 text-blue-600" />
    : <ArrowDown className="w-4 h-4 text-blue-600" />;
}
