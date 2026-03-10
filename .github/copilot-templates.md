# Copilot Templates - football-stock-app

Reusable templates for common feature work. Keep these as reference patterns, not strict boilerplate.

## Template: New Tab Component (`src/components/*Tab.jsx`)
```jsx
import React, { useMemo, useState } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import { SearchInput } from './ui/SearchInput';

export const ExampleTab = ({ items = [], setShowModal, onDataChange, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const canEdit = currentUser?.role === 'admin' || currentUser?.canEditExample;

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleCreate = () => {
    setShowModal({
      type: 'example',
      mode: 'create',
      title: 'Nuevo registro',
      data: null,
      onSuccess: () => onDataChange('example'),
    });
  };

  const handleEdit = (item) => {
    setShowModal({
      type: 'example',
      mode: 'edit',
      title: `Editar ${item.name}`,
      data: item,
      onSuccess: () => onDataChange('example'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar..."
        />

        {canEdit && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
          >
            <Plus size={16} />
            Nuevo
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{item.active ? 'Activo' : 'Inactivo'}</td>
                <td className="px-4 py-3 text-right">
                  {canEdit && (
                    <button
                      onClick={() => handleEdit(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50"
                    >
                      <Edit2 size={14} />
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

## Template: Controlled Form (`src/forms/*Form.jsx`)
```jsx
import React, { useEffect, useRef, useState } from 'react';

export const ExampleForm = ({ data, onSubmit, readOnly = false, onDirtyChange }) => {
  const [formData, setFormData] = useState(
    data || {
      name: '',
      description: '',
      active: true,
    }
  );

  const initialData = useRef(JSON.stringify(data || {}));

  useEffect(() => {
    onDirtyChange?.(JSON.stringify(formData) !== initialData.current);
  }, [formData, onDirtyChange]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={readOnly}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={readOnly}
          rows={4}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          type="checkbox"
          checked={formData.active}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          disabled={readOnly}
        />
        <label htmlFor="active" className="text-sm text-gray-700">Activo</label>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-900"
          >
            Guardar
          </button>
        </div>
      )}
    </form>
  );
};
```

## Template: Database Helper (`src/utils/database.js`)
```jsx
// Add inside the `database` object
async getExamples() {
  const { data, error } = await supabase
    .from('examples')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
},

async addExample(payload) {
  const { data, error } = await supabase
    .from('examples')
    .insert([payload])
    .select();

  if (error) throw error;
  return data[0];
},

async updateExample(id, payload) {
  const { data, error } = await supabase
    .from('examples')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
},

async deleteExample(id) {
  const { error } = await supabase
    .from('examples')
    .delete()
    .eq('id', id);

  if (error) throw error;
},
```

## Quick Checklist For New Features
- Add table and permissions to `SPEC.md` first if behavior changes.
- Keep text in Spanish and dates in `es-UY` where shown to users.
- Reuse shared hooks/components before creating new ones.
- Route all Supabase CRUD through `src/utils/database.js`.
- Keep player deletion disabled unless explicitly requested.
