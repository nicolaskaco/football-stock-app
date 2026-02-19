# SPEC.md — App interna CAP v2

Internal management system for Club Atlético Peñarol (CAP) formative divisions.

---

## 1. Project Overview

| Field | Value |
|-------|-------|
| App name | App interna CAP v2 |
| Organization | Club Atlético Peñarol |
| Purpose | Manage players, staff, inventory, tournaments, and board members for formative divisions |
| Language | Spanish (Uruguayan locale — `es-UY`) |
| Deployment | Vercel |
| Version | 0.0.0 |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 3 |
| Routing | React Router v7 |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Icons | lucide-react |
| Excel export | xlsx |

---

## 2. Architecture

The app is a **Single-Page Application (SPA)** with client-side routing.

### Top-Level Views

```
/               → App.jsx (session check)
  login         → LoginView
  dashboard     → AdminDashboard (admin users)
  employee-view → EmployeeView (staff self-service)
/formulario     → PlayerFormPublic (public, no auth)
```

### Data Flow

- All Supabase interactions go through `src/utils/database.js`
- Global state (employees, inventory, distributions, players, dirigentes, torneos, comisiones) is held in `App.jsx` and passed down as props
- No Redux or React Context — pure prop drilling
- On login, `loadData()` fetches all entities in parallel via `Promise.all`

### Key Files

| File | Role |
|------|------|
| [src/App.jsx](src/App.jsx) | Root component — routing, session management, global state |
| [src/supabaseClient.js](src/supabaseClient.js) | Supabase client initialization |
| [src/main.jsx](src/main.jsx) | React entry point |
| [src/utils/database.js](src/utils/database.js) | All Supabase data access methods |
| [src/utils/storage.js](src/utils/storage.js) | Storage utilities |
| [src/PasswordReset.jsx](src/PasswordReset.jsx) | Password reset page |

---

## 3. Authentication & User Roles

### Two Login Modes

**Admin login** (email + password):
1. `supabase.auth.signInWithPassword()` against Supabase Auth
2. Fetches `user_permissions` row by email to load role + permission flags
3. Routes to `AdminDashboard`

**Funcionario (staff) login** (gov ID + employee ID):
1. Calls Supabase Edge Function `validate-employee`
2. Only loads that employee's distributions and inventory items
3. Routes to `EmployeeView`

### Roles

Stored as `user_permissions.role`:

| Role | Description |
|------|-------------|
| `admin` | Full system access |
| `ejecutivo` | Management-level access |
| `presidente` | Presidential access |
| `presidente_categoria` | Category manager — must submit change requests for financial edits |
| (default) | Limited view-only, controlled by permission flags |

### Permission Flags (`user_permissions` table)

| Flag | Controls access to |
|------|--------------------|
| `can_access_players` | Jugadores tab |
| `can_edit_players` | Edit player records |
| `can_access_viatico` | Viáticos tab |
| `can_access_widgets` | Analytics widgets on Overview |
| `can_access_dirigentes` | Dirigentes tab |
| `can_access_ropa` | Inventory, Funcionarios, Distribuciones, Reportes tabs |
| `editar_nombre_especial` | Edit visual name (`name_visual`) |
| `view_torneo` | Torneos tab |
| `edit_torneo` | Edit tournament records |
| `can_view_comisiones` | Comisiones tab |
| `can_edit_comisiones` | Edit committee records |
| `categoria[]` | Array — restricts access to specific player categories |

The "Solicitudes" tab is visible to roles: `admin`, `ejecutivo`, `presidente`, `presidente_categoria`.

---

## 4. Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `players` | Player records: personal info, financials, boarding, clothing sizes |
| `player_history` | Audit log of changes to `contrato`, `viatico`, `complemento` |
| `player_change_requests` | Approval workflow for financial field modifications |
| `player_documents` | Document metadata — file paths in `player-documents` storage bucket |
| `player_responses` | Public form submissions from `/formulario` |
| `employees` | Staff members (funcionarios) |
| `inventory` | Clothing items: name, category, size, quantity, min_stock |
| `distributions` | Clothing distribution records per employee |
| `dirigentes` | Club board members / officials |
| `torneos` | Tournaments |
| `torneo_players` | M2M: torneos ↔ players |
| `torneo_dirigentes` | M2M: torneos ↔ dirigentes |
| `torneo_funcionarios` | M2M: torneos ↔ employees |
| `comisiones` | Committees |
| `comision_dirigentes` | M2M: comisiones ↔ dirigentes |
| `user_permissions` | Role and permission flags per user email |

### Audit-Tracked Player Fields

Changes to `contrato`, `viatico`, and `complemento` are automatically written to `player_history` (old value, new value, changed_by email, timestamp) on every `database.updatePlayer()` call.

### Storage

Bucket: `player-documents` (private)
- Files stored at path: `{player_id}/{document_type}_{timestamp}.{ext}`
- Access via signed URLs (1-hour expiry via `createSignedUrl`)

---

## 5. Navigation & Modules

### Admin Dashboard Tabs

| Tab ID | Label | Visible When |
|--------|-------|--------------|
| `overview` | Resumen | Always |
| `inventory` | Inventario | `can_access_ropa` |
| `employees` | Funcionarios | `can_access_ropa` |
| `players` | Jugadores | `can_access_players` |
| `players_viatico` | Viáticos | `can_access_viatico` |
| `change_requests` | Solicitudes | role in `[admin, ejecutivo, presidente, presidente_categoria]` |
| `distributions` | Distribuciones | `can_access_ropa` |
| `dirigentes` | Dirigentes | `can_access_dirigentes` |
| `torneos` | Torneos | `view_torneo` |
| `comisiones` | Comisiones | `can_view_comisiones` |
| `reports` | Reportes | `can_access_ropa` |

### Components

#### Tab Components
| Component | Description |
|-----------|-------------|
| [AdminDashboard.jsx](src/components/AdminDashboard.jsx) | Tab shell + permission gating |
| [OverviewTab.jsx](src/components/OverviewTab.jsx) | Dashboard with stat cards and optional widgets |
| [PlayersTab.jsx](src/components/PlayersTab.jsx) | Player CRUD, document upload, history modal |
| [PlayersTabViatico.jsx](src/components/PlayersTabViatico.jsx) | Financial fields view with change-request flow |
| [ChangeRequestsTab.jsx](src/components/ChangeRequestsTab.jsx) | Approval/rejection UI for financial change requests |
| [InventoryTab.jsx](src/components/InventoryTab.jsx) | Inventory CRUD, low-stock alerts |
| [DistributionsTab.jsx](src/components/DistributionsTab.jsx) | Distribution CRUD with return tracking |
| [EmployeesTab.jsx](src/components/EmployeesTab.jsx) | Staff CRUD with photo and clothing size tracking |
| [DirigentesTab.jsx](src/components/DirigentesTab.jsx) | Board member CRUD |
| [TorneosTab.jsx](src/components/TorneosTab.jsx) | Tournament list and management |
| [TorneoDetailView.jsx](src/components/TorneoDetailView.jsx) | Detailed tournament view with participants |
| [ComisionesTab.jsx](src/components/ComisionesTab.jsx) | Committee list and management |
| [ComisionDetailView.jsx](src/components/ComisionDetailView.jsx) | Committee detail with member list |
| [ReportsTab.jsx](src/components/ReportsTab.jsx) | Excel export for distributions/inventory |
| [EmployeeView.jsx](src/components/EmployeeView.jsx) | Staff self-service: view own clothing distributions |
| [LoginView.jsx](src/components/LoginView.jsx) | Dual-mode login (admin / funcionario) |

#### Dashboard Widgets (OverviewTab — requires `can_access_widgets`)
| Widget | Description |
|--------|-------------|
| [BirthdayWidget.jsx](src/components/BirthdayWidget.jsx) | Upcoming birthdays for players and dirigentes (7-day window) |
| [SpendingTrendsWidget.jsx](src/components/SpendingTrendsWidget.jsx) | Viatico + complemento spend over time |
| [CategoryDistributionWidget.jsx](src/components/CategoryDistributionWidget.jsx) | Player count by category |
| [AgeDistributionWidget.jsx](src/components/AgeDistributionWidget.jsx) | Player age breakdown |
| [DepartamentoWidget.jsx](src/components/DepartamentoWidget.jsx) | Geographic distribution of players |
| [MostDistributedWidget.jsx](src/components/MostDistributedWidget.jsx) | Top distributed clothing items |
| [PendingChangeRequestsWidget.jsx](src/components/PendingChangeRequestsWidget.jsx) | Count of pending financial change requests (admin home) |

#### Forms
| Form | Description |
|------|-------------|
| [PlayerForm.jsx](src/forms/PlayerForm.jsx) | Full player add/edit (admin) |
| [PlayerFormViatico.jsx](src/forms/PlayerFormViatico.jsx) | Financial fields form for viatico tab |
| [PlayerFormPublic.jsx](src/forms/PlayerFormPublic.jsx) | Public-facing player registration at `/formulario` |
| [EmployeeForm.jsx](src/forms/EmployeeForm.jsx) | Staff add/edit |
| [InventoryForm.jsx](src/forms/InventoryForm.jsx) | Inventory item add/edit |
| [DistributionForm.jsx](src/forms/DistributionForm.jsx) | Distribution record add/edit |
| [DirigenteForm.jsx](src/forms/DirigenteForm.jsx) | Board member add/edit |
| [TorneoForm.jsx](src/forms/TorneoForm.jsx) | Tournament add/edit (multi-select players/dirigentes/staff) |
| [ComisionForm.jsx](src/forms/ComisionForm.jsx) | Committee add/edit |

#### Modals & Utilities
| Component | Description |
|-----------|-------------|
| [Modal.jsx](src/components/Modal.jsx) | Generic modal shell |
| [ConfirmModal.jsx](src/components/ConfirmModal.jsx) | Confirmation dialog |
| [AlertModal.jsx](src/components/AlertModal.jsx) | Informational alerts |
| [PromptModal.jsx](src/components/PromptModal.jsx) | Text input prompt dialog |
| [ChangeRequestModal.jsx](src/components/ChangeRequestModal.jsx) | Financial change request submission form |
| [PlayerHistoryModal.jsx](src/components/PlayerHistoryModal.jsx) | Audit trail viewer for player field changes |
| [ExportConfigModal.jsx](src/components/ExportConfigModal.jsx) | Excel export field selector |
| [DocumentUpload.jsx](src/components/DocumentUpload.jsx) | Supabase Storage document upload/download |
| [NameVisualEditor.jsx](src/components/NameVisualEditor.jsx) | Visual name editing (dual-name system) |
| [StatCard.jsx](src/components/StatCard.jsx) | Reusable stat summary card |

---

## 6. Special Features

### Dual-Name System

Players have two name fields:
- `name` — legal name (always stored and displayed internally)
- `name_visual` — custom display name (optional; shown in place of `name` where applicable)

Only users with `editar_nombre_especial = true` can edit `name_visual`, via the `NameVisualEditor` component.

### Financial Change Request Workflow

Applies when `currentUser.role === 'presidente_categoria'` attempts to edit `viatico`, `complemento`, or `contrato`:

1. A `player_change_requests` row is inserted with `status: 'pending'`
2. A reviewer (admin / ejecutivo / presidente) sees it in the "Solicitudes" tab and via the `PendingChangeRequestsWidget`
3. **Approve**: player's financial fields are updated, request notes appended to `comentario_viatico`, history record created
4. **Reject**: request marked `rejected`, player unchanged

### Player Document Management

- Documents uploaded to Supabase Storage bucket `player-documents` (private)
- Metadata saved to `player_documents` table
- Downloads via signed URLs with 1-hour expiry
- Types: any document type string (e.g. cedula, contrato, foto)

### Public Player Registration Form

- Route: `/formulario` (no authentication required)
- Fields: full name, date of birth, email, category, representative name, department
- Supported categories: 3era, 4ta, 5ta, S16, 6ta, 7ma, Sub13
- Departments: all 19 Uruguayan departments + Argentina, Brasil, Colombia, España, Venezuela
- Submissions saved to `player_responses` table (reviewed manually by admin)

### Low-Stock Alerts

`database.checkLowStock()` queries inventory items where `quantity <= min_stock`. Called after every inventory save.

---

## 7. Data Export

- Format: Excel (`.xlsx`) via the `xlsx` library
- Available in: PlayersTab, PlayersTabViatico, DistributionsTab, ReportsTab
- `ExportConfigModal` lets the user select which fields to include before downloading

---

## 8. Deployment

| Setting | Value |
|---------|-------|
| Platform | Vercel |
| Config file | `vercel.json` |
| Dev server | `npm run dev` → `vite` |
| Production build | `npm run build` → `vite build` |
| Preview | `npm run preview` → `vite preview` |

> **Note:** Supabase URL and anon key are currently hardcoded in `src/supabaseClient.js`. These should be moved to environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) before sharing the repository publicly.

---

## 9. Project File Structure

```
football-stock-app/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── vercel.json
├── package.json
├── SPEC.md                        ← this file
├── Summary App.md                 ← legacy feature summary
├── public/
│   ├── logo.jpeg
│   └── apple-touch-icon.png
└── src/
    ├── App.jsx                    # Root: routing, session, global state
    ├── main.jsx                   # React entry point
    ├── supabaseClient.js          # Supabase client
    ├── PasswordReset.jsx          # Password reset page
    ├── App.css
    ├── index.css
    ├── logo.jpeg
    ├── components/                # UI components (tabs, widgets, modals)
    │   ├── AdminDashboard.jsx
    │   ├── LoginView.jsx
    │   ├── EmployeeView.jsx
    │   ├── OverviewTab.jsx
    │   ├── PlayersTab.jsx
    │   ├── PlayersTabViatico.jsx
    │   ├── ChangeRequestsTab.jsx
    │   ├── InventoryTab.jsx
    │   ├── DistributionsTab.jsx
    │   ├── EmployeesTab.jsx
    │   ├── DirigentesTab.jsx
    │   ├── TorneosTab.jsx
    │   ├── TorneoDetailView.jsx
    │   ├── ComisionesTab.jsx
    │   ├── ComisionDetailView.jsx
    │   ├── ReportsTab.jsx
    │   ├── BirthdayWidget.jsx
    │   ├── SpendingTrendsWidget.jsx
    │   ├── CategoryDistributionWidget.jsx
    │   ├── AgeDistributionWidget.jsx
    │   ├── DepartamentoWidget.jsx
    │   ├── MostDistributedWidget.jsx
    │   ├── PendingChangeRequestsWidget.jsx
    │   ├── Modal.jsx
    │   ├── ConfirmModal.jsx
    │   ├── AlertModal.jsx
    │   ├── PromptModal.jsx
    │   ├── ChangeRequestModal.jsx
    │   ├── PlayerHistoryModal.jsx
    │   ├── ExportConfigModal.jsx
    │   ├── DocumentUpload.jsx
    │   ├── NameVisualEditor.jsx
    │   └── StatCard.jsx
    ├── forms/                     # Data entry forms
    │   ├── PlayerForm.jsx
    │   ├── PlayerFormViatico.jsx
    │   ├── PlayerFormPublic.jsx
    │   ├── EmployeeForm.jsx
    │   ├── InventoryForm.jsx
    │   ├── DistributionForm.jsx
    │   ├── DirigenteForm.jsx
    │   ├── TorneoForm.jsx
    │   └── ComisionForm.jsx
    └── utils/
        ├── database.js            # All Supabase data access methods
        └── storage.js
```
