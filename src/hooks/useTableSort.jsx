import React, { useState } from 'react';

export const SORT_DEFAULTS = {
  pj: 'desc', titular: 'desc', suplente: 'desc',
  goles: 'desc', amarillas: 'desc', rojas: 'desc',
  golesRatio: 'desc', amarillasRatio: 'desc',
  name_visual: 'asc', categoria: 'asc',
  rival: 'asc', fecha: 'desc', fase: 'asc',
  g: 'desc', e: 'desc', p: 'desc', gf: 'desc', ga: 'asc', dif: 'desc',
};

export const thClass =
  'px-3 py-2 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap';

export const useTableSort = (initialKey, initialDir = 'desc') => {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState(initialDir);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(SORT_DEFAULTS[key] || 'desc');
    }
  };

  const sortFn = (data) =>
    [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });

  const SortIcon = ({ col }) =>
    sortKey !== col
      ? <span className="text-gray-300 ml-1">↕</span>
      : <span className="text-yellow-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;

  return { handleSort, sortFn, SortIcon, sortKey, sortDir };
};
