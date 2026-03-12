# SPEC.md — App interna CAP v3

Internal management system for Club Atlético Peñarol (CAP) formative divisions.

---

## 1. Project Overview

| Field | Value |
|-------|-------|
| App name | App interna CAP v3 |
| Organization | Club Atlético Peñarol |
| Purpose | Manage players, staff, inventory, tournaments, board members, and campeonato juvenil matches for formative divisions |
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
| Excel export/import | xlsx |
| PDF generation | jspdf + jspdf-autotable |
| Charts | recharts |

---

## 2. Architecture

The app is a **Single-Page Application (SPA)** with client-side routing.

### Top-Level Views

```
/               → App.jsx (session check)
  login         → LoginView
  dashboard     → AdminDashboard (admin users)
  employee-view → EmployeeView (staff self-service)
  set-password  → SetPassword (invite & password-recovery flow)
/formulario     → PlayerFormPublic (public, no auth)
```

### Data Flow

- All Supabase interactions go through `src/utils/database.js`
- Global state (employees, inventory, distributions, players, dirigentes, torneos, comisiones, rivales, jornadas) is held in `App.jsx` and passed down as props
- React Context used only for cross-cutting concerns: `ToastContext` (notifications) and `DarkModeContext` (theme toggle)
- All domain state uses pure prop drilling (no Redux)
- On login, `loadData()` fetches all entities in parallel via `Promise.all`

### Key Files

| File | Role |
|------|------|
| [src/App.jsx](src/App.jsx) | Root component — routing, session management, global state |
| [src/supabaseClient.js](src/supabaseClient.js) | Supabase client initialization |
| [src/main.jsx](src/main.jsx) | React entry point |
| [src/utils/database.js](src/utils/database.js) | All Supabase data access methods |
| [src/utils/constants.js](src/utils/constants.js) | Centralized enums and constant lists |
| [src/utils/dateUtils.js](src/utils/dateUtils.js) | Centralized date formatting helpers |
| [src/utils/storage.js](src/utils/storage.js) | Storage utilities |
| [src/utils/pdfExport.js](src/utils/pdfExport.js) | PDF dashboard report generation |
| [src/context/DarkModeContext.jsx](src/context/DarkModeContext.jsx) | Dark mode state + localStorage persistence |
| [src/PasswordReset.jsx](src/PasswordReset.jsx) | Password reset page |
| [src/components/SetPassword.jsx](src/components/SetPassword.jsx) | Password setup form shown when a user follows an invite or recovery link |

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

### Admin User Invite Flow

Admins can invite new users directly from `ConfiguracionTab` → `UserManagementSection`. No email is sent, bypassing the Supabase free-tier 2 emails/hour limit.

1. Admin fills `UserInviteForm`: email, role, permission flags, and optional category restrictions.
2. Frontend calls `database.inviteUser()`, which invokes the `invite-user` Edge Function with the caller's JWT.
3. The Edge Function:
   - Validates the caller is an `admin` via `user_permissions`.
   - Calls `auth.admin.generateLink({ type: 'invite', email })` — returns the invite URL **without sending an email**.
   - Extracts `hashed_token` from the response and builds a custom link: `<app-origin>/#type=invite&token_hash=<hashed_token>`. Using the URL hash fragment prevents WhatsApp's link-preview crawler from consuming the one-time token (hash is never sent in HTTP requests).
   - Inserts/upserts the `user_permissions` row with the chosen role and flags.
   - Returns `invite_link` in the JSON response.
4. The UI shows a modal with the invite link and a "Copiar Enlace" button so the admin can share it via WhatsApp or any other channel.
5. When the invitee opens the link, `App.jsx` detects `type=invite` and `token_hash` in the URL hash. It calls `supabase.auth.verifyOtp({ token_hash, type: 'invite' })` client-side to exchange the token for a session, then the `onAuthStateChange` listener routes the user to `SetPassword`. Legacy direct `action_link` behaviour (without `token_hash`) is kept as a fallback via `getSession()`.
6. After the user sets their password the hash is cleared and `checkSession()` refreshes the view.

**Edge Function:** `supabase/functions/invite-user/index.ts`  
**Deployed with:** `--no-verify-jwt` (the function performs its own caller-identity check internally using the `Authorization` header)

### Password Recovery Flow

`App.jsx` handles standard password recovery links via the same `onAuthStateChange` listener: the `PASSWORD_RECOVERY` event routes the user to `SetPassword`.

### Roles

Stored as `user_permissions.role`:

| Role | Description |
|------|-------------|
| `admin` | Full system access |
| `ejecutivo` | Management-level access |
| `presidente` | Presidential access |
| `presidente_categoria` | Category manager — must submit change requests for financial edits |
| `delegado` | Limited role — can view Solicitudes tab (read-only); no approve/reject/create; access to other tabs controlled by permission flags |
| `comision` | Limited role — same access model as `delegado` |
| (default) | Limited view-only, controlled by permission flags |

### Permission Flags (`user_permissions` table)

| Flag | Controls access to |
|------|--------------------|
| `can_access_players` | Jugadores tab |
| `can_edit_players` | Edit player records |
| `can_access_viatico` | Viáticos tab |
| `can_access_widgets` | Analytics widgets on Overview |
| `can_access_dirigentes` | Dirigentes tab (view) |
| `can_edit_dirigentes` | Add/edit/delete in DirigentesTab |
| `can_access_ropa` | Inventory, Funcionarios, Distribuciones, Reportes tabs |
| `editar_nombre_especial` | Edit visual name (`name_visual`) |
| `view_torneo` | Torneos tab |
| `edit_torneo` | Edit tournament records |
| `can_view_comisiones` | Comisiones tab |
| `can_edit_comisiones` | Edit committee records |
| `can_view_partidos` | Rivales + Partidos tabs |
| `can_edit_partidos` | Create/edit jornadas, partidos, rivales |
| `can_see_ropa_widgets` | Inventory/distribution widgets on OverviewTab |
| `categoria[]` | Array — restricts access to specific player categories |

The "Solicitudes" tab is visible to roles: `admin`, `ejecutivo`, `presidente`, `presidente_categoria`, `delegado`, `comision` (read-only for the last two — approve/reject/create buttons hidden).

---

## 4. Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `players` | Player records: personal info, financials, boarding, clothing sizes. Notable columns: `tipo_documento` (text, default `'Cédula de Identidad'`), `complemento_override` (integer, nullable), `complemento_override_expira` (date, nullable) |
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
| `rivales` | Rival teams catalog for the campeonato juvenil |
| `jornadas` | A matchday grouping 5 category matches vs. the same rival |
| `partidos` | Individual match per category (child of jornada) |
| `partido_players` | Players convoked per partido (titulares + suplentes) |
| `partido_eventos` | Match events (goals, yellow/red cards) per partido |
| `app_settings` | Global key-value feature flags toggled via ConfiguracionTab |
| `player_injuries` | Injury log per player: tipo, severidad, dates (inicio, retorno estimado, alta) |
| `user_permissions` | Role and permission flags per user email (RLS disabled — access controlled via Edge Function caller verification) |

### Campeonato Juvenil Tables Detail

#### `rivales`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | Rival team name |
| `created_at` | timestamptz | |

#### `jornadas`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `rival_id` | uuid FK → rivales | ON DELETE RESTRICT |
| `fecha` | date | Match date |
| `fase` | text | `'Apertura'` \| `'Clausura'` |
| `numero_jornada` | text | nullable — `'1'`–`'15'`, `'Semifinal'`, `'Final'` |
| `created_at` | timestamptz | |

#### `partidos`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `jornada_id` | uuid FK → jornadas | ON DELETE CASCADE |
| `categoria` | text | One of `CATEGORIAS_PARTIDO` |
| `escenario` | text | `'Local'` \| `'Visitante'` |
| `cesped` | text | `'Natural'` \| `'Sintético'` (default: Local→Sintético, Visitante→Natural) |
| `goles_local` | integer | nullable — filled after the match |
| `goles_visitante` | integer | nullable — filled after the match |
| `comentario` | text | nullable — freetext match notes |
| `arbitro` | text | nullable — referee name |
| `primer_linea` | text | nullable — first linesman name |
| `segundo_linea` | text | nullable — second linesman name |
| `created_at` | timestamptz | |

#### `partido_players`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `partido_id` | uuid FK → partidos | ON DELETE CASCADE |
| `player_id` | uuid FK → players | ON DELETE CASCADE |
| `tipo` | text | `'titular'` \| `'suplente'` |
| `posicion` | text | nullable — only for titulares |
| `orden` | integer | 1–11 for titulares, 1–10 for suplentes |

#### `partido_eventos`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `partido_id` | uuid FK → partidos | ON DELETE CASCADE |
| `player_id` | uuid FK → players | ON DELETE CASCADE |
| `tipo` | text | `'gol'` \| `'amarilla'` \| `'roja'` |
| `minuto` | integer | nullable — minute the event occurred |

Used by `EstadisticasTab` to compute per-player totals (goals, cards) and standings.

### Audit-Tracked Player Fields

Changes to `contrato`, `viatico`, `complemento`, `vianda`, and `casita` are automatically written to `player_history` (old value, new value, changed_by email, timestamp) on every `database.updatePlayer()` call. `complemento_override` and `complemento_override_expira` are **not** audit-tracked — they are transient by design.

### Row-Level Security (RLS) — `players` table

Three policies work together on the `players` table:

| Policy | Applies to | Effect |
|--------|-----------|--------|
| `admin_all` | Users with `role = 'admin'` | Full read/write access to all players |
| `Allow players access based on categoria` | All other authenticated users | Access restricted to players whose `categoria` matches the user's `user_permissions.categoria` array (NULL / `{}` = all categories) |
| `Allow players via partido access` | All authenticated users | Any player who appears in `partido_players` is visible regardless of their own category — allows all users to see full match lineups and scorers |

> **Important:** Supabase evaluates RLS policies with OR logic — a row is returned if *any* policy allows it. The `admin_all` policy is intentionally scoped to `role = 'admin'` so it does not bypass the categoria restriction for other roles.

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
| `inventory` | Inventario | `can_access_ropa` **and** `inventario_tab_enabled` app setting |
| `employees` | Funcionarios | `can_access_ropa` |
| `players` | Jugadores | `can_access_players` |
| `players_viatico` | Viáticos | `can_access_viatico` |
| `change_requests` | Solicitudes | role in `[admin, ejecutivo, presidente, presidente_categoria]` |
| `distributions` | Distribuciones | `can_access_ropa` **and** `distribuciones_tab_enabled` app setting |
| `dirigentes` | Dirigentes | `can_access_dirigentes` |
| `torneos` | Torneos | `view_torneo` |
| `comisiones` | Comisiones | `can_view_comisiones` |
| `rivales` | Rivales | `can_view_partidos` **and** `rivales_tab_enabled` app setting |
| `partidos` | Partidos | `can_view_partidos` |
| `estadisticas` | Estadísticas | `can_view_partidos` **and** `estadisticas_tab_enabled` app setting |
| `reports` | Reportes | `can_access_ropa` **and** `reportes_tab_enabled` app setting |
| `configuracion` | Configuración (includes User Management) | `role = 'admin'` only |

App settings (`app_settings` table) are loaded at login into `appSettings` global state in `App.jsx`. Admins toggle them via `ConfiguracionTab`. The `tabEnabled(key)` helper in `AdminDashboard` checks `appSettings[key] === 'true'`.

### Components

#### Tab Components
| Component | Description |
|-----------|-------------|
| [AdminDashboard.jsx](src/components/AdminDashboard.jsx) | Tab shell + permission gating. On desktop (`sm+`) renders a horizontal scrollable tab bar; on mobile, the tab bar is hidden and replaced by a hamburger icon + active tab label in the nav bar that opens a slide-in drawer. Clicking the logo/title navigates to the Resumen tab. |
| [OverviewTab.jsx](src/components/OverviewTab.jsx) | Dashboard with stat cards, optional widgets, and CalendarioView for `can_view_partidos` users |
| [PlayersTab.jsx](src/components/PlayersTab.jsx) | Player CRUD, document upload, history modal. Ficha Médica check (individual and bulk) maps `tipo_documento` → `idtipodocumento` (Cédula de Identidad=1, Pasaporte=2, Otro=3); only strips non-digits for Cédulas. Sticky Nombre column on horizontal scroll. Clicking a player name opens a read-only `PlayerForm` modal. Bulk actions (change category, toggle casita, hide, import from XLSX). Injury icon (Swiss cross) shown next to player name when injured. Injury CRUD button (admin only). "Comparar" button (indigo, Users icon) appears when 2-3 players are selected, opens `PlayerComparisonModal`. |
| [PlayersTabViatico.jsx](src/components/PlayersTabViatico.jsx) | Financial fields view with change-request flow. Complemento column shows the effective value (override if active) with a yellow "temp" badge and tooltip showing the expiry date. Sticky Nombre column on horizontal scroll. Clicking a player name opens a read-only `PlayerFormViatico` modal. |
| [ChangeRequestsTab.jsx](src/components/ChangeRequestsTab.jsx) | Approval/rejection UI for financial change requests. When viáticos are frozen, approve/reject buttons are hidden and a `ViaticosCongeladosBanner` is shown. |
| [InventoryTab.jsx](src/components/InventoryTab.jsx) | Inventory CRUD, low-stock alerts, bulk stock adjustment via multi-select |
| [DistributionsTab.jsx](src/components/DistributionsTab.jsx) | Distribution CRUD with return tracking |
| [EmployeesTab.jsx](src/components/EmployeesTab.jsx) | Staff CRUD with photo and clothing size tracking |
| [DirigentesTab.jsx](src/components/DirigentesTab.jsx) | Board member CRUD. Add/edit/delete buttons gated behind `can_edit_dirigentes` permission flag. Sticky Nombre column on horizontal scroll; name truncates on mobile. |
| [TorneosTab.jsx](src/components/TorneosTab.jsx) | Tournament list and management |
| [TorneoDetailView.jsx](src/components/TorneoDetailView.jsx) | Detailed tournament view with participants |
| [ComisionesTab.jsx](src/components/ComisionesTab.jsx) | Committee list and management. Sticky Nombre column on horizontal scroll; tap name on mobile to expand truncated text. |
| [ComisionDetailView.jsx](src/components/ComisionDetailView.jsx) | Committee detail with member list |
| [RivalesTab.jsx](src/components/RivalesTab.jsx) | Rival team CRUD + Excel bulk import |
| [PartidosTab.jsx](src/components/PartidosTab.jsx) | Jornadas list (Lista / Calendario toggle) with Nueva Jornada + edit/delete actions; list view shows escenario + result badge per category. Mobile-friendly header: button label collapses to "Nueva" on small screens. |
| [PartidoDetailView.jsx](src/components/PartidoDetailView.jsx) | Jornada detail: 5 category cards with lineup, color-coded result badge, and comment |
| [CalendarioView.jsx](src/components/CalendarioView.jsx) | Month/week calendar showing jornadas with color-coded category dots; used in PartidosTab and OverviewTab |
| [ReportsTab.jsx](src/components/ReportsTab.jsx) | Excel export for distributions/inventory |
| [EstadisticasTab.jsx](src/components/EstadisticasTab.jsx) | Player/match statistics; sub-tabs: General, Goleadores, Tarjetas, Por Rival, Gráficos; top-scorer podium; filterable by category and phase. Gráficos sub-tab renders GoalTrendChart, CardDistributionChart, AgeCurveChart, and RivalPerformanceChart |
| [ConfiguracionTab.jsx](src/components/ConfiguracionTab.jsx) | Admin-only toggle switches to enable/disable feature tabs; writes to `app_settings` via `database.updateAppSetting()`. Includes a **Congelar Viáticos** toggle — when enabled, all viatico/complemento/contrato fields are disabled app-wide, solicitud creation is blocked, and approve/reject actions in ChangeRequestsTab are hidden. A configurable contact name (stored in `app_settings`) is shown in freeze banners. Also renders `UserManagementSection` for inviting and managing admin users. |
| [UserManagementSection.jsx](src/components/UserManagementSection.jsx) | Collapsible section inside ConfiguracionTab. Displays a table of all `user_permissions` rows (email, role badge, permission count, category restrictions). Provides invite, edit-permissions, and delete actions. After a successful invite the admin sees a modal with a copyable invite link. |
| [SetPassword.jsx](src/components/SetPassword.jsx) | Full-page password setup form shown after an invite or password-recovery link is opened. Validates minimum 6 characters and confirmation match; calls `supabase.auth.updateUser({ password })`. Styled with the black/yellow CAP theme. |
| [NotificationCenter.jsx](src/components/NotificationCenter.jsx) | Bell icon with unread-count badge in the nav bar. Opens a dropdown panel listing notifications by type: cumpleaños (players & dirigentes within 7 days), fichas médicas vencidas/por vencer, solicitudes de cambio pendientes, and lesiones activas. Unread state persisted to `localStorage`. Clicking a notification navigates to the relevant tab. Admins see all four types (filtered by `categoria`); Funcionarios only see cumpleaños. |
| [EmployeeView.jsx](src/components/EmployeeView.jsx) | Staff self-service: view own clothing distributions |
| [LoginView.jsx](src/components/LoginView.jsx) | Dual-mode login (admin / funcionario) |

#### Dashboard Widgets (OverviewTab — requires `can_access_widgets`)
| Widget | Description |
|--------|-------------|
| [BirthdayWidget.jsx](src/components/BirthdayWidget.jsx) | Upcoming birthdays for players and dirigentes (7-day window); scoped to `currentUser.categoria` so `presidente_categoria` users only see their categories |
| [FichaMedicaWidget.jsx](src/components/FichaMedicaWidget.jsx) | Players with expired or expiring-soon (≤ 30 days) ficha médica, ordered by date; color-coded red (expired) / orange (soon). Visible to all named roles (`admin`, `ejecutivo`, `presidente`, `presidente_categoria`, `delegado`, `comision`) with `can_access_widgets`. Category filter pills. Clicking a row opens a detail modal. **SND refresh button (individual and bulk) is admin-only** — other roles see the widget read-only. |
| [SpendingTrendsWidget.jsx](src/components/SpendingTrendsWidget.jsx) | Viatico + complemento spend over time |
| [CategoryDistributionWidget.jsx](src/components/CategoryDistributionWidget.jsx) | Player count by category; rendered as a recharts donut chart (PieChart with innerRadius) |
| [AgeDistributionWidget.jsx](src/components/AgeDistributionWidget.jsx) | Player age breakdown |
| [DepartamentoWidget.jsx](src/components/DepartamentoWidget.jsx) | Geographic distribution of players |
| [MostDistributedWidget.jsx](src/components/MostDistributedWidget.jsx) | Top distributed clothing items |
| [PendingChangeRequestsWidget.jsx](src/components/PendingChangeRequestsWidget.jsx) | Count of pending financial change requests with SLA age badge (admin home) |
| [InjuredPlayersWidget.jsx](src/components/InjuredPlayersWidget.jsx) | Active (open) injuries summary. Admin-only. Category filter pills. Sorted by category order then injury start date ascending. |

> All player-based analytics widgets (`SpendingTrends`, `CategoryDistribution`, `AgeDistribution`, `Departamento`) receive a `visiblePlayers` array derived in `OverviewTab` — filtered by `currentUser.categoria` when the user has category restrictions. This prevents cross-category players (visible via the partido RLS policy) from leaking into home page statistics.

#### Forms
| Form | Description |
|------|-------------|
| [PlayerForm.jsx](src/forms/PlayerForm.jsx) | Full player add/edit (admin). Layout: row 1 = Nombre \| Categoría; row 2 = Tipo Documento dropdown (Cédula de Identidad / Pasaporte / Otro, stored as `tipo_documento`) \| Número de Documento. Shows "Override Temporal de Complemento" section in read-only mode (edit from Viático tab). Includes a "Lesiones" related list at the bottom showing all injuries for the player (oldest first) with tipo, severidad badge, dates, and description. Includes a "Historial de Partidos" related list showing all matches the player participated in: fecha, rival, resultado, titular/suplente, goles and tarjetas. |
| [PlayerFormViatico.jsx](src/forms/PlayerFormViatico.jsx) | Financial fields form for viatico tab. Includes "Override Temporal de Complemento" section: editable only by `admin`, `ejecutivo`, `presidente`; other roles see it read-only. Override auto-clears when `contrato` is activated. |
| [PlayerFormPublic.jsx](src/forms/PlayerFormPublic.jsx) | Public-facing player registration at `/formulario` |
| [EmployeeForm.jsx](src/forms/EmployeeForm.jsx) | Staff add/edit |
| [InventoryForm.jsx](src/forms/InventoryForm.jsx) | Inventory item add/edit |
| [DistributionForm.jsx](src/forms/DistributionForm.jsx) | Distribution record add/edit |
| [DirigenteForm.jsx](src/forms/DirigenteForm.jsx) | Board member add/edit |
| [TorneoForm.jsx](src/forms/TorneoForm.jsx) | Tournament add/edit (multi-select players/dirigentes/staff) |
| [ComisionForm.jsx](src/forms/ComisionForm.jsx) | Committee add/edit |
| [RivalForm.jsx](src/forms/RivalForm.jsx) | Rival team add/edit (name only) |
| [JornadaForm.jsx](src/forms/JornadaForm.jsx) | Jornada create/edit: rival, fecha, fase, numero_jornada; create mode adds escenario base → 5 partidos |
| [PartidoForm.jsx](src/forms/PartidoForm.jsx) | Individual partido: 11 titulares + posición, 10 suplentes, resultado (escenario-aware), comentario. On submit, eventos (goals/cards) are filtered to only include players currently in the lineup — removing a player from the lineup also removes their events. Injured players shown with 🏥 prefix and injury type in select dropdowns. |
| [InjuryForm.jsx](src/forms/InjuryForm.jsx) | Injury registration/editing: tipo (Lesión muscular, Fractura, Esguince, Contusión, Tendinitis, Ligamentos cruzados, Meniscos, Otro), severidad (leve/moderada/grave), descripción, fecha_inicio, fecha_retorno_estimada, fecha_alta. Admin-only. |
| [UserInviteForm.jsx](src/forms/UserInviteForm.jsx) | Invite / edit-permissions form. Fields: email (disabled in edit mode), role dropdown, 14 grouped permission checkboxes with select-all/none per group, and category chip multi-select. Used by `UserManagementSection` for both invite and edit flows. |

#### Modals & Utilities
| Component | Description |
|-----------|-------------|
| [Modal.jsx](src/components/Modal.jsx) | Generic modal shell |
| [ConfirmModal.jsx](src/components/ConfirmModal.jsx) | Confirmation dialog |
| [AlertModal.jsx](src/components/AlertModal.jsx) | Informational alerts |
| [PromptModal.jsx](src/components/PromptModal.jsx) | Text input prompt dialog |
| [ChangeRequestModal.jsx](src/components/ChangeRequestModal.jsx) | Financial change request submission form |
| [PlayerHistoryModal.jsx](src/components/PlayerHistoryModal.jsx) | Audit trail viewer for player field changes; includes per-field filter buttons when history spans multiple fields |
| [BulkActionModal.jsx](src/components/BulkActionModal.jsx) | Generic before→after preview modal for bulk player/inventory operations |
| [ImportPreviewModal.jsx](src/components/ImportPreviewModal.jsx) | XLSX import with field auto-mapping, row validation (required fields, category/position checks, duplicate detection), green/red preview rows |
| [PlayerComparisonModal.jsx](src/components/PlayerComparisonModal.jsx) | Side-by-side comparison for 2-3 players: Datos Personales, Estado, Financiero, Estadísticas de Partido, goal timeline LineChart. Best values highlighted in green via `getBest()` helper. Export to Excel (`.xlsx`) or copy to clipboard as tab-separated text |
| [ExportConfigModal.jsx](src/components/ExportConfigModal.jsx) | Excel export field selector |
| [DocumentUpload.jsx](src/components/DocumentUpload.jsx) | Supabase Storage document upload/download |
| [NameVisualEditor.jsx](src/components/NameVisualEditor.jsx) | Visual name editing (dual-name system) |
| [ViaticosCongeladosBanner.jsx](src/components/ViaticosCongeladosBanner.jsx) | Amber banner shown in PlayerForm, PlayerFormViatico, PlayersTabViatico, and ChangeRequestsTab when viáticos are frozen. Displays a configurable contact name from `app_settings`. |
| [StatCard.jsx](src/components/StatCard.jsx) | Reusable stat summary card |
| [Toast.jsx](src/components/Toast.jsx) | Toast notification display |
| [ui/FilterButtonGroup.jsx](src/components/ui/FilterButtonGroup.jsx) | Generic toggle-button filter bar; props: `options: string[]`, `value`, `onChange`, `label?`, `allLabel?` |
| [ui/SearchInput.jsx](src/components/ui/SearchInput.jsx) | Controlled text search input; `onChange` receives the string value (not the DOM event); base styles baked in, layout class passed as `className` prop (default: `flex-1`) |
| [ui/SortIcon.jsx](src/components/ui/SortIcon.jsx) | Sort direction arrow for table headers; shows neutral icon when column is unsorted, blue up/down arrow when active; requires `columnKey` and `sortConfig` props |
| [ui/ViandaIcons.jsx](src/components/ui/ViandaIcons.jsx) | Renders `Utensils` icons equal to the player's `vianda` count, capped at 10; returns null when count ≤ 0 |
| [ui/FichaMedicaIcon.jsx](src/components/ui/FichaMedicaIcon.jsx) | Stethoscope icon colored by ficha médica expiry status (red=expired, orange=expiring, green=valid) |
| [ui/InjuryIcon.jsx](src/components/ui/InjuryIcon.jsx) | Swiss-cross SVG icon colored by injury severity (yellow=leve, orange=moderada, red=grave); tooltip shows injury type and estimated return date |

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

#### Change Request UX features (ChangeRequestsTab)

- **SLA age badge**: each pending card shows a colored age pill — green (< 3 days), yellow (3–6 days), red (≥ 7 days) — calculated via `daysSince()` from `dateUtils.js`
- **Diff highlighting**: fields that changed are shown with red strikethrough (old) → green (new); fields that did not change are shown in muted gray with "(sin cambio)"
- **Bulk actions**: reviewers can select multiple pending requests via checkboxes and approve or reject them all at once. Bulk reject prompts for shared review notes via `PromptModal`. A sticky bottom bar appears while any requests are selected.

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

### Complemento Override Temporal

Allows temporarily changing a player's `complemento` for a specific date range without modifying the base value.

- Two nullable columns on `players`: `complemento_override` (integer) and `complemento_override_expira` (date)
- `calculateTotal()` and `getComplementoEfectivo()` use the override when it is set and `complemento_override_expira` is today or in the future; they fall back to `complemento` automatically once expired — no cron job or manual intervention needed
- Editable via "Override Temporal de Complemento" section in `PlayerFormViatico` — restricted to `admin`, `ejecutivo`, `presidente`; all other roles see it read-only
- `PlayerForm` shows the section read-only with a note to edit from the Viático tab
- `PlayersTabViatico` displays a yellow "temp" badge on the Complemento column when an active override is in effect
- When a player's `contrato` is activated, any active override is automatically cleared
- Override fields are **not** audit-tracked in `player_history`

### Ficha Médica SND Integration

Players have a `ficha_medica_hasta` (date) column that records when their SND sports medical license expires.

- **`database.checkFichaMedica(cedula, tipoDocumento)`** — calls the `check-ficha-medica` Supabase Edge Function (proxy to SND). Returns a `fichas` array of license records, each with `deporte` and `hasta` (DD/MM/YYYY).
- The app always filters for an **exact FÚTBOL match**: `['FÚTBOL', 'FUTBOL'].includes(f.deporte.toUpperCase())` — no fallback to other sports.
- **`database.saveFichaMedicaHasta(playerId, hastaStr)`** — converts `hastaStr` from DD/MM/YYYY to YYYY-MM-DD and writes it to `players.ficha_medica_hasta`.
- **PlayersTab** supports individual and bulk ficha checks for all filtered players.
- **FichaMedicaWidget** (home page) shows expired / expiring-soon players and lets admins trigger a per-player refresh directly from the modal.

### Bulk Operations

Multiple bulk action features are available for admin users:

- **PlayersTab bulk actions**: select multiple players via checkboxes, then use the dropdown menu to change category, toggle casita, or hide players. All bulk actions show a before→after preview via `BulkActionModal` before applying.
- **PlayersTab XLSX import**: import players from Excel via `ImportPreviewModal`; auto-maps columns, validates required fields, detects duplicates, and shows green/red preview rows before inserting.
- **InventoryTab bulk stock adjustment**: select items via checkboxes, enter a quantity adjustment, preview changes, and apply.

### Injury & Availability Log

Tracks player injuries for availability management. Admin-only feature (`role = 'admin'`).

- **`player_injuries` table**: `id` (uuid), `player_id` (FK → players), `tipo` (text), `severidad` (leve/moderada/grave), `descripcion`, `fecha_inicio` (date), `fecha_retorno_estimada` (date, nullable), `fecha_alta` (date, nullable), `created_by` (email), `created_at` (timestamptz). An injury is considered active (open) when `fecha_alta IS NULL`.
- **Injury types**: Lesión muscular, Fractura, Esguince, Contusión, Tendinitis, Ligamentos cruzados, Meniscos, Otro.
- **PlayersTab**: Swiss-cross icon (InjuryIcon) shown next to player name when actively injured, colored by severity. Admin users see a cross button per row to register a new injury or edit/discharge an existing one.
- **PartidoForm**: Injured players shown with 🏥 prefix and injury type in the player select dropdowns (titulares and suplentes).
- **InjuredPlayersWidget**: Overview widget showing all active injuries, with category filter pills and sorted by category then injury start date. Admin-only.
- **Database methods**: `getInjuries()`, `addInjury()`, `updateInjury()`, `dischargeInjury()` — discharge sets `fecha_alta` to today.

### Advanced Analytics with Charts

Interactive charts powered by `recharts` for match statistics and dashboard widgets.

- **GoalTrendChart**: LineChart showing goals per jornada, one line per category (colored using `CATEGORIAS_PARTIDO` palette).
- **CardDistributionChart**: BarChart of amarillas vs rojas per category.
- **AgeCurveChart**: Stacked BarChart of player age distribution per category; respects `categoriaFiltro` prop for filtering.
- **RivalPerformanceChart**: Horizontal stacked BarChart of wins/draws/losses per rival.
- **EstadisticasTab "Gráficos" sub-tab**: Renders all 4 charts above, shares category and phase filters with the existing sub-tabs.
- **CategoryDistributionWidget**: Replaced horizontal bar with a recharts donut chart (PieChart with `innerRadius`).
- Chart components located in `src/components/charts/`.

### Player Comparison Tool

Side-by-side comparison modal for 2-3 selected players.

- **PlayerComparisonModal**: Displays comparison across sections:
  - Datos Personales (edad, categoría, posición, departamento)
  - Estado (contrato, residencia, ficha médica, lesión activa)
  - Financiero (viático, complemento, total)
  - Estadísticas de Partido (PJ, titular, suplente, goles, amarillas, rojas, G/PJ)
  - Goal timeline LineChart (per-player lines overlaid)
- **Best value highlighting**: `getBest()` helper auto-highlights the best value in each row in green.
- **PlayersTab integration**: "Comparar" button (indigo, `Users` icon) appears when 2-3 players are selected via checkboxes.
- **AdminDashboard**: Passes `jornadas` prop to PlayersTab for the comparison chart data.
- **Export to Excel**: Generates a `.xlsx` file named `comparacion_Player1_vs_Player2.xlsx` containing all comparison sections.
- **Copy to clipboard**: Copies the comparison as tab-separated text via `navigator.clipboard.writeText()`.

### Player Match History

Embedded section in `PlayerForm` showing all matches a player participated in.

- **PlayerForm**: "Historial de Partidos" section at the bottom of the form, listing all `partido_players` records.
- **Data per match**: fecha, rival, resultado (color-coded), titular/suplente, goles and tarjetas in that match.
- **Data source**: Joins `partido_players` → `partidos` → `jornadas` → `rivales` + `partido_eventos` for events.

### Dashboard PDF Export

Generate a PDF report snapshot of the dashboard widgets for sharing in meetings without app access.

- **`src/utils/pdfExport.js`**: Utility using `jspdf` + `jspdf-autotable` (named import `autoTable`).
- **Header**: Club Atlético Peñarol branding with institutional colors (yellow `#D4A017` + dark gray `#1F2937`).
- **Report sections**: Jugadores Lesionados, Fichas Médicas (vencidas/por vencer), Cumpleaños Próximos, Distribución por Categoría.
- **Category scoping**: Respects `currentUser.categoria` to filter data.
- **Trigger**: "Exportar PDF" button (`FileDown` icon) on `OverviewTab`.
- **Output filename**: `Reporte-Dashboard-DD-MM-YYYY.pdf`.

### Dark Mode

Class-based dark theme with user preference persistence.

- **`src/context/DarkModeContext.jsx`**: React Context + Provider managing `dark` boolean state. Persists to `localStorage` under key `cap-dark-mode`. Toggles `dark` class on `document.documentElement`.
- **`tailwind.config.js`**: `darkMode: 'class'` config entry.
- **Toggle**: Moon/Sun button in the nav bars of `AdminDashboard` and `EmployeeView` using `useDarkMode()` hook.
- **`src/index.css`**: Global CSS overrides in `@layer base` for dark mode:
  - Backgrounds (`bg-white` → slate-800, `bg-gray-50` → slate-900, etc.)
  - Text colors (`text-gray-*` → slate equivalents)
  - Borders (`border-gray-*`, plus colored variants like orange, red, yellow, blue, green, zinc)
  - Gradient stops (gray and colored `-50` variants)
  - Colored badge backgrounds and text (`-50`, `-100` bg variants; `-700/-800` text → `-400`)
  - Form controls (input, select, textarea)
  - Recharts SVG text, grid lines, tooltip
  - Scrollbar styling (webkit)
  - Group-hover and hover states
- **Transitions**: Smooth CSS transitions (0.2s for background/border, 0.15s for color).

### Responsive / Mobile Optimizations

Optimized layouts for small screens across tabs, modals, and forms.

- **AdminDashboard**: On mobile (`< sm`), horizontal tab bar is hidden; replaced by hamburger icon + active tab label in the nav bar that opens a slide-in drawer for navigation.
- **PlayersTab / PlayersTabViatico**: Sticky Nombre column on horizontal scroll.
- **DirigentesTab / ComisionesTab**: Sticky Nombre column with text truncation on mobile; tap to expand.
- **PartidosTab**: "Nueva Jornada" button label collapses to "Nueva" on small screens.
- **Forms and modals**: Responsive padding (`px-4 sm:px-6 lg:px-8`), vertical scroll within modals.

### Low-Stock Alerts

`database.checkLowStock()` queries inventory items where `quantity <= min_stock`. Called after every inventory save.

### In-App Notification Center

A unified notification hub accessible from a bell icon in the nav bar of both `AdminDashboard` and `EmployeeView`.

- **Notification types**:
  - **Cumpleaños** — upcoming birthdays for players and dirigentes within 7 days.
  - **Fichas Médicas** — players with expired or expiring-soon (≤ 30 days) sports medical licenses.
  - **Solicitudes pendientes** — pending financial change requests awaiting approval.
  - **Lesiones activas** — players currently injured.
- **Severity styling**: border colors — red (crítico), orange (advertencia), yellow (info) — with unread dot indicators.
- **Read/unread tracking**: persisted to `localStorage`; "Marcar todas como leídas" button clears all.
- **Direct navigation**: clicking a notification switches to the relevant tab.
- **Permissions**: Admins see all four types filtered by their `categoria`; Funcionarios only see cumpleaños.
- **Dark mode**: styles applied via `.notification-panel` class in `index.css`.

### Admin User Management

Full CRUD for admin-level users managed from `ConfiguracionTab`. See [Admin User Invite Flow](#admin-user-invite-flow) for the invite sequence.

**Database methods (`database.js`):**

| Method | Description |
|--------|-------------|
| `listUserPermissions()` | Returns all rows in `user_permissions` ordered by email |
| `inviteUser(email, role, permissions)` | Calls the `invite-user` Edge Function; returns `{ invite_link, user_id }` |
| `updateUserPermissions(email, updates)` | Updates role and permission flags for an existing user |
| `deleteUserPermissions(email)` | Removes the user's `user_permissions` row (revokes dashboard access) |

**Supabase Edge Functions:**

| Function | Description |
|----------|-------------|
| `invite-user` | Verifies caller is admin, calls `auth.admin.generateLink({ type: 'invite' })`, upserts `user_permissions`, returns `invite_link` |
| `validate-employee` | Validates funcionario credentials and returns the employee record |
| `check-ficha-medica` | Proxies to SND API to retrieve sports medical license records by document number |

### Campeonato Juvenil — Partidos Module

Manages the internal youth football championship (Apertura / Clausura, round-robin format).

**Categories participating:** `4ta`, `5ta`, `S16`, `6ta`, `7ma`

#### Jornada management

A "Jornada" groups 5 matches (one per category) played on the same date against the same rival.

**Creating a jornada** — user selects:
- Rival (from the `rivales` catalog)
- Fecha
- Fase (Apertura / Clausura)
- Número de jornada (`1`–`15`, `Semifinal`, `Final`)
- Escenario base (Local / Visitante)

**Editing a jornada** — same fields except escenario (the 5 existing partidos are not recreated).

The escenario is automatically derived per category:

| Escenario base | 4ta | 5ta | S16 | 6ta | 7ma |
|----------------|-----|-----|-----|-----|-----|
| Local | Local | Local | Local | Visitante | Visitante |
| Visitante | Visitante | Visitante | Visitante | Local | Local |

Default césped: `Sintético` for Local matches, `Natural` for Visitante.

#### Individual partido editing

Each of the 5 partidos in a jornada is edited independently via `PartidoForm`:
- **Titulares**: up to 11 slots, each with a player dropdown (filtered by category) + position dropdown
- **Suplentes**: up to 10 slots, player dropdown only
- **Category filter**: defaults to the partido's own category; can be expanded to include other categories (e.g. 3era, 5ta playing up in 4ta). Players from other categories are labeled with their category in parentheses.
- **Resultado**: always displayed as Peñarol (left) vs. Rival (right), regardless of escenario. Inputs bind to `goles_local`/`goles_visitante` correctly based on escenario.
- **Comentario**: optional freetext field for match notes.
- Duplicate player prevention: a player already selected as titular cannot be chosen as suplente and vice versa.
- After saving, the modal returns automatically to the jornada detail view with refreshed data.

#### Result display

`PartidoDetailView` shows a color-coded badge per partido:
- 🟢 Green — Peñarol won
- 🔴 Red — Peñarol lost
- ⚫ Gray — draw
- No badge — match not yet played

#### Lista view (PartidosTab)

The default list view shows a table with columns: Jornada · Fase · Fecha · Rival · one column per category (4ta · 5ta · S16 · 6ta · 7ma).

Each category cell displays:
- **Escenario badge** — Local (green) or Visitante (blue)
- **Result circle** — only shown when a result has been recorded:
  - 🟢 **G** (green) — Ganamos
  - 🔴 **P** (red) — Perdimos
  - ⚫ **E** (gray) — Empate

#### Calendar view

`PartidosTab` has a **Lista / Calendario** toggle. The calendar (`CalendarioView`) also appears on the home page (OverviewTab) for users with `can_view_partidos`.

- Default view: current month
- Toggle to week view
- Each day cell shows: rival name + 5 colored dots (one per category in order: 4ta · 5ta · S16 · 6ta · 7ma)
  - 🟢 Green = win, 🔴 Red = loss, ⚫ Gray = draw, ⬜ Light gray = no result
- Clicking a jornada opens `PartidoDetailView` (edit capability respects `can_edit_partidos`)

#### Rivals management

- Separate "Rivales" tab (CRUD)
- Supports **Excel bulk import**: upload a `.xlsx` file with rival names in column A (row 1 is always skipped as header); a preview panel shows new vs. already-existing rivals before confirming

---

## 7. Data Export

- Format: Excel (`.xlsx`) via the `xlsx` library
- Available in: PlayersTab, PlayersTabViatico, DistributionsTab, ReportsTab, TorneoDetailView
- `ExportConfigModal` lets the user select which fields to include before downloading
- RivalesTab supports Excel **import** (column A = rival names; row 1 always skipped as header)

---

## 8. Utilities

### Constants (`src/utils/constants.js`)

All shared enums are centralized here — never defined inline in components:

| Export | Values |
|--------|--------|
| `CATEGORIAS` | `['3era', '4ta', '5ta', 'S16', '6ta', '7ma', 'Sub13']` |
| `CATEGORIAS_PARTIDO` | `['4ta', '5ta', 'S16', '6ta', '7ma']` |
| `NUMEROS_JORNADA` | `['1'…'15', 'Semifinal', 'Final']` |
| `CATEGORIAS_ESCENARIO_INVERTIDO` | `['6ta', '7ma']` |
| `FASES_CAMPEONATO` | `['Apertura', 'Clausura']` |
| `ESCENARIOS` | `['Local', 'Visitante']` |
| `CESPED_TIPOS` | `['Natural', 'Sintético']` |
| `POSICIONES_JUGADOR` | `['Arquero', 'Zaguero', 'Lateral', 'Volante', 'Extremo', 'Delantero']` |
| `POSICIONES_PARTIDO` | 10 specific match positions |
| `DEPARTAMENTOS` | All 19 Uruguayan departments + foreign countries |
| `BANCOS` | Itau, Prex, Mi Dinero, BROU, Santander, Scotia, HSBC, Otro |
| `TALLAS_ROPA` | `['S', 'M', 'L', 'XL', 'XXL']` |
| `CATEGORIAS_INVENTARIO` | Clothing categories |
| `CHANGE_REQUEST_STATUS` | `{ PENDING, APPROVED, REJECTED }` |

### Player Utilities (`src/utils/playerUtils.js`)

| Export | Description |
|--------|-------------|
| `calculateTotal(player)` | Returns viatico + effective complemento sum; returns 0 for players with `contrato = true`. Uses `complemento_override` instead of `complemento` when the override is set and `complemento_override_expira` is today or in the future. |
| `getComplementoEfectivo(player)` | Returns `{ valor: number, activo: boolean }` — the effective complemento value and whether a temporary override is currently active. |

### Date Utilities (`src/utils/dateUtils.js`)

| Export | Description |
|--------|-------------|
| `formatDate(str)` | `DD/MM/YYYY` |
| `formatDateLong(str)` | Full month name (es-UY) |
| `formatDateTime(str)` | `DD/MM/YYYY HH:MM` |
| `formatBirthday(str)` | `DD/MM` (no year, timezone-safe) |
| `todayISO()` | `YYYY-MM-DD` for date inputs |
| `parseDOB(str)` | Date from `YYYY-MM-DD` without timezone drift |
| `calculateAge(isoDate)` | Timezone-safe age in years from an ISO date string; returns `'-'` for null input |
| `daysSince(str)` | Full calendar days since a date (midnight-to-midnight, local time); returns 0 for future/null; used for SLA age badges |

### Hooks (`src/hooks/`)

| Hook | Description |
|------|-------------|
| `useMutation.jsx` | Wraps async operations with loading state, error handling, and toast feedback; returns `{ execute, isSaving }` |
| `useAlertModal.js` | Manages `AlertModal` state; returns `{ alertModal, showAlert(title, message, type), closeAlert }` |
| `useDebouncedSearch.js` | Syncs a local `inputValue` to a URL search param after a 300ms debounce; returns `[inputValue, setInputValue]` |
| `useTableSort.jsx` | Table sort state for `EstadisticasTab`; exports `SORT_DEFAULTS`, `thClass`, and `useTableSort(initialKey, initialDir)` returning `{ handleSort, sortFn, SortIcon, sortKey, sortDir }` |

---

## 9. Deployment

| Setting | Value |
|---------|-------|
| Platform | Vercel |
| Config file | `vercel.json` |
| Dev server | `npm run dev` → `vite` |
| Production build | `npm run build` → `vite build` |
| Preview | `npm run preview` → `vite preview` |

> **Environment variables:** Supabase credentials are loaded from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` via `import.meta.env`. Set these in `.env.local` for local development (see `.env.example` for the required keys) and in the Vercel project dashboard (Settings → Environment Variables) for production.

---

## 10. Project File Structure

```
football-stock-app/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── vercel.json
├── package.json
├── .env.example                   # Required env var keys (committed, no values)
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
    │   ├── ui/
    │   │   ├── FilterButtonGroup.jsx  # Shared toggle-button filter bar
    │   │   ├── SearchInput.jsx        # Shared debounced search input
    │   │   ├── SortIcon.jsx           # Shared sort direction arrow
    │   │   ├── ViandaIcons.jsx        # Shared vianda icon renderer
    │   │   ├── FichaMedicaIcon.jsx     # Ficha médica status icon
    │   │   └── InjuryIcon.jsx          # Swiss-cross injury severity icon
    │   ├── charts/
    │   │   ├── GoalTrendChart.jsx       # Goals per jornada line chart
    │   │   ├── CardDistributionChart.jsx # Cards by category bar chart
    │   │   ├── AgeCurveChart.jsx        # Age distribution stacked bar chart
    │   │   └── RivalPerformanceChart.jsx # W/D/L per rival horizontal bar chart
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
    │   ├── RivalesTab.jsx
    │   ├── PartidosTab.jsx
    │   ├── PartidoDetailView.jsx
    │   ├── CalendarioView.jsx
    │   ├── ReportsTab.jsx
    │   ├── EstadisticasTab.jsx
    │   ├── ConfiguracionTab.jsx
    │   ├── BirthdayWidget.jsx
    │   ├── FichaMedicaWidget.jsx
    │   ├── SpendingTrendsWidget.jsx
    │   ├── CategoryDistributionWidget.jsx
    │   ├── AgeDistributionWidget.jsx
    │   ├── DepartamentoWidget.jsx
    │   ├── MostDistributedWidget.jsx
    │   ├── PendingChangeRequestsWidget.jsx
    │   ├── InjuredPlayersWidget.jsx
    │   ├── NotificationCenter.jsx      # Bell icon + notification dropdown panel
    │   ├── SetPassword.jsx              # Password setup for invite / recovery flow
    │   ├── UserManagementSection.jsx    # User invite + permission management UI
    │   ├── Modal.jsx
    │   ├── ConfirmModal.jsx
    │   ├── AlertModal.jsx
    │   ├── PromptModal.jsx
    │   ├── ChangeRequestModal.jsx
    │   ├── PlayerHistoryModal.jsx
    │   ├── BulkActionModal.jsx
    │   ├── ImportPreviewModal.jsx
    │   ├── ExportConfigModal.jsx
    │   ├── PlayerComparisonModal.jsx
    │   ├── DocumentUpload.jsx
    │   ├── NameVisualEditor.jsx
    │   ├── StatCard.jsx
    │   └── Toast.jsx
    ├── forms/                     # Data entry forms
    │   ├── PlayerForm.jsx
    │   ├── PlayerFormViatico.jsx
    │   ├── PlayerFormPublic.jsx
    │   ├── EmployeeForm.jsx
    │   ├── InventoryForm.jsx
    │   ├── DistributionForm.jsx
    │   ├── DirigenteForm.jsx
    │   ├── TorneoForm.jsx
    │   ├── ComisionForm.jsx
    │   ├── RivalForm.jsx
    │   ├── JornadaForm.jsx
    │   ├── PartidoForm.jsx
    │   ├── InjuryForm.jsx
    │   └── UserInviteForm.jsx         # Invite / permission form for admin user management
    ├── context/
    │   ├── ToastContext.jsx       # Toast notification context + provider
    │   └── DarkModeContext.jsx    # Dark mode state + localStorage persistence
    ├── hooks/
    │   ├── useMutation.jsx        # Async mutation helper with toast feedback
    │   ├── useAlertModal.js       # AlertModal state manager
    │   ├── useDebouncedSearch.js  # Debounced URL-param search input
    │   └── useTableSort.jsx       # Table sort state for EstadisticasTab
    └── utils/
        ├── constants.js           # All shared enums and constant lists
        ├── database.js            # All Supabase data access methods
        ├── dateUtils.js           # Date formatting and age calculation helpers
        ├── pdfExport.js           # Dashboard PDF report generation
        ├── playerUtils.js         # Player business logic (calculateTotal)
        └── storage.js             # Legacy localStorage wrapper (largely unused)
supabase/
└── functions/
    ├── invite-user/               # Generate invite link + upsert user_permissions (no email sent)
    │   └── index.ts
    ├── validate-employee/         # Funcionario credential validation
    └── check-ficha-medica/        # SND API proxy for sports medical license lookup
```
