# Architectural Patterns

Patterns confirmed across multiple files in the codebase.

---

## 1. Global State via Prop Drilling from App.jsx

All application state lives as `useState` hooks in [src/App.jsx:24-32](../../src/App.jsx#L24). There is no Context, Redux, Zustand, or any other state management library.

```
App.jsx
  └─ AdminDashboard  (receives all state + setters as props)
       └─ PlayersTab, InventoryTab, etc.  (receive slices they need)
            └─ PlayerForm, etc.  (receive further slices)
```

When adding new state, add it in `App.jsx` and thread it down as props. Do not introduce a state management library without explicit discussion.

---

## 2. onDataChange Refresh Cycle

After any mutation (add/edit/delete), components call `onDataChange()` — a prop originating in `App.jsx`. This triggers a full `Promise.all` re-fetch of all entities ([src/App.jsx:87-95](../../src/App.jsx#L87)).

Pattern in leaf components ([src/components/PlayersTab.jsx:209-218](../../src/components/PlayersTab.jsx#L209)):
```js
const handleAdd = async (player) => {
  await database.addPlayer(player);
  await onDataChange();   // re-fetches everything
  setShowModal(null);
};
```

All tab components follow this same pattern. Do not call Supabase directly in components for writes — always go through `database.js`, then call `onDataChange()`.

---

## 3. Centralized Data Access Layer

All Supabase queries go through the `database` exported object in [src/utils/database.js](../../src/utils/database.js). Every method follows the same shape:

```js
async methodName(params) {
  const { data, error } = await supabase.from('table').select/insert/update/delete(...);
  if (error) throw error;
  return data;
}
```

~30 methods covering players, employees, inventory, distributions, dirigentes, torneos, comisiones, change requests, documents, and history.

**Exception:** `PendingChangeRequestsWidget` calls `supabase` directly ([src/components/PendingChangeRequestsWidget.jsx:15](../../src/components/PendingChangeRequestsWidget.jsx#L15)) — this is a known inconsistency, not the intended pattern.

---

## 4. Modal Content Injection via setShowModal

`AdminDashboard` owns a single `showModal` state (`{ title, content }`). Tabs set it with JSX as the content value; `Modal.jsx` renders it.

Pattern in tabs ([src/components/PlayersTab.jsx:424-428](../../src/components/PlayersTab.jsx#L424)):
```jsx
setShowModal({
  title: "Agregar Nuevo Jugador",
  content: <PlayerForm onSubmit={handleAdd} currentUser={currentUser} />
});
```

`Modal.jsx` is a generic wrapper — it stops click propagation and renders `children` in a scrollable overlay. Do not create new modal components for standard add/edit flows; use this pattern.

---

## 5. Role and Permission-Flag Gating

Two coexisting authorization patterns:

**A — Boolean permission flags** (for tab-level visibility, sourced from `user_permissions` table):
```js
// src/components/AdminDashboard.jsx:38-46
const canAccessPlayers = currentUser?.canAccessPlayers || false;
const canAccessViaticos = currentUser?.canAccessViaticos || false;
```

**B — Role string array checks** (for in-tab field/action visibility):
```js
// src/components/AdminDashboard.jsx:45
const canViewChangeRequests = ['admin', 'ejecutivo', 'presidente', 'presidente_categoria']
  .includes(currentUser?.role);

// src/forms/PlayerForm.jsx:45
const canEditFinancialFields = ['ejecutivo', 'admin', 'presidente'].includes(currentUser?.role);
```

Use pattern A to gate tab access, pattern B to gate individual fields or actions within a tab/form. Both patterns receive `currentUser` as a prop drilled from `App.jsx`.

---

## 6. Controlled Forms with Local formData State

All 9 forms in [src/forms/](../../src/forms/) use the same shape:
- `useState` initialized from the incoming entity prop or empty defaults
- Every input uses the spread-update pattern
- Accept `onSubmit` callback and optional `readOnly` prop (makes all fields disabled)

```js
// src/forms/PlayerForm.jsx:5-32
const [formData, setFormData] = useState(player || { name: '', gov_id: '', ... });

onChange={(e) => setFormData({ ...formData, name: e.target.value })}
```

This makes forms reusable for add, edit, and view-only modes by passing `readOnly={true}`.

---

## 7. AlertModal / ConfirmModal / PromptModal Replacing Native Dialogs

Instead of `alert()` / `confirm()`, components use local modal state:

```js
// src/components/PlayersTab.jsx:20
const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'info' });

setAlertModal({ isOpen: true, title: 'Error', message: 'Something went wrong', type: 'warning' });

<AlertModal
  isOpen={alertModal.isOpen}
  onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
  title={alertModal.title}
  message={alertModal.message}
  type={alertModal.type}
/>
```

Appears in: `PlayersTab`, `PlayersTabViatico`, `ChangeRequestsTab`, and others. Prefer this over `window.alert/confirm` for all new features.

---

## 8. Self-Fetching Dashboard Widgets

Widgets in [src/components/](../../src/components/) (`BirthdayWidget`, `PendingChangeRequestsWidget`) fetch their own data independently on mount — they are **not** passed data as props.

```js
// src/components/BirthdayWidget.jsx:8-25
useEffect(() => {
  const loadBirthdays = async () => {
    const [players, dirigentes] = await Promise.all([
      database.getUpcomingBirthdays(7),
      database.getUpcomingBirthdaysDirigentes(7)
    ]);
    setBirthdays(combined);
  };
  loadBirthdays();
}, []);
```

This is intentional — widgets are self-contained dashboard cards that own their data lifecycle. Follow this pattern for new widgets.

---

## 9. Supabase Nested Select for Relational Queries

Complex joins use PostgREST's nested select syntax ([src/utils/database.js:521-534](../../src/utils/database.js#L521)):

```js
await supabase.from('torneos').select(`
  *,
  torneo_dirigentes(dirigente_id, dirigentes(id, name, rol, categoria)),
  torneo_players(player_id, players(id, name, categoria, posicion, gov_id, date_of_birth)),
  torneo_funcionarios(employee_id, employees(id, name, role, categoria))
`)
```

Used in `getTorneos`, `getComisiones`, `getPendingChangeRequests`. Always place new relational queries in `database.js` using this pattern rather than multiple sequential queries.

---

## 10. Dual Authentication

Two separate login flows coexist in [src/components/LoginView.jsx](../../src/components/LoginView.jsx):

- **Admins**: `supabase.auth.signInWithPassword({ email, password })` — standard Supabase Auth
- **Funcionarios**: POST to the `validate-employee` Supabase Edge Function with `{ govId, employeeId }` — returns a synthetic session object with `role` and `permissions` flags

The session type is distinguished in `App.jsx` by whether `currentUser.supabaseSession` is present (admin) or not (funcionario). Both paths produce a `currentUser` object with consistent shape (`role`, `canAccessPlayers`, `canAccessViaticos`, etc.).
