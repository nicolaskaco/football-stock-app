# CLAUDE.md — football-stock-app

## Project Overview

Internal management app for Club Atletico Peñarol (CAP) formative divisions. Tracks players, employees (funcionarios), inventory/uniforms, viáticos, torneos, partidos/jornadas, rivales, comisiones, dirigentes, injuries/suspensions, tareas (sprints), change requests, documents, and stats.

Three kinds of users:
- **Admin-dashboard users**: Supabase Auth (email + password). What they see is controlled by the `user_permissions` row that matches their email.
- **Funcionarios**: custom login (cédula + employee number) through the `validate-employee` Edge Function. They get a limited, read-only `EmployeeView` of their own distributions.
- **Players**: the public `/jugador` portal (login by cédula through `validate-player`) for a one-time questionnaire, plus the public `/formulario` form.

Authoritative spec: [SPEC.md](SPEC.md) covers all roles, the DB schema, permissions and features. Read the relevant section before changing behavior.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build | Vite 7 |
| Styling | Tailwind CSS 3 (`darkMode: 'class'`) |
| Routing | React Router v7 |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Charts | recharts |
| Exports | xlsx (Excel), jspdf + jspdf-autotable (PDF) |
| Icons | lucide-react |
| Deployment | Vercel (SPA rewrites in `vercel.json`) |

App source is `.js`/`.jsx`, with no TypeScript. The only `.ts` files are the Supabase Edge Functions (Deno). There is no test framework.

---

## Build Commands

```
npm run dev       # Vite dev server (HMR)
npm run build     # Production build → dist/
npm run lint      # ESLint (flat config, react-hooks + react-refresh)
npm run preview   # Preview the production build
```

There is no test command, so verify changes with `npm run lint`, `npm run build` and a manual check in `npm run dev`.

Environment: copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Production values are set in the Vercel dashboard.

---

## Directory Map

| Path | Purpose |
|---|---|
| [src/main.jsx](src/main.jsx) | Entry point. Wraps `<App>` in `DarkModeProvider` |
| [src/App.jsx](src/App.jsx) | Root: all global entity state (`useState`), the auth/session flow (login, invite, recovery), `loadData` / `handleDataChange`, and routes (`/formulario`, `/jugador`, `/*`) |
| [src/supabaseClient.js](src/supabaseClient.js) | Supabase client init |
| [src/utils/database.js](src/utils/database.js) | **Data access layer**: a single `database` object with ~90 async methods (~1600 lines) grouped by entity |
| [src/utils/constants.js](src/utils/constants.js) | Canonical enums: `CATEGORIAS`, `POSICIONES_*`, `DEPARTAMENTOS`, `CESPED_TIPOS`, `CHANGE_REQUEST_STATUS`, and others. Import from here and never redefine them inline |
| [src/utils/](src/utils/) | Also `dateUtils`, `playerStats`, `playerUtils`, `viaticoExport` (Tesorero/Finanzas viático Excel), `suspensions`, `ageEligibility`, `pdfExport`. `storage.js` is legacy localStorage code and unused |
| [src/components/AdminDashboard.jsx](src/components/AdminDashboard.jsx) | Tab shell: derives permission flags, builds the `tabs` list, lazy-loads each tab, owns `showModal` and dirty-tracking state. The active tab lives in the URL (`?tab=`) |
| [src/components/*Tab.jsx](src/components/) | One component per dashboard tab (Players, Viáticos, Tesorero, Torneos, Partidos, Estadísticas, Tareas, Configuración, Actividad, and more) |
| [src/components/*Widget.jsx](src/components/) | Overview-tab cards (birthdays, ficha médica, injuries, suspensions, spending trends, and more) |
| [src/components/charts/](src/components/charts/) | recharts visualizations used by the Estadísticas tabs |
| [src/components/playerstats/](src/components/playerstats/) | Player ficha and comparison views |
| [src/components/ui/](src/components/ui/) | Small shared UI: `SearchInput`, `SortIcon`, `StatusBadge`, `FilterButtonGroup`, `InlineEditCell`, status icons |
| [src/forms/](src/forms/) | 16 controlled forms (Player, PlayerViatico, PlayerPublic, Partido, Torneo, Jornada, Tarea, Injury, and more) |
| [src/context/](src/context/) | `ToastContext` (`useToast().showToast(msg, type)`) and `DarkModeContext`. These are UI-only contexts; entity data does **not** go here |
| [src/hooks/](src/hooks/) | `useMutation`, `useMountEffect`, `useFormDirty`, `useTableSort`, `useDebouncedSearch`, `useAlertModal`, `useChartPalette` |
| [supabase/migrations/](supabase/migrations/) | SQL migrations (only recent ones are in the repo; the base schema is described in SPEC.md) |
| [supabase/functions/](supabase/functions/) | Edge Functions: `validate-player`, `invite-user`, `reset-password-link`, `check-ficha-medica`. `validate-employee` is deployed but its source is **not** in the repo |
| [.claude/docs/](.claude/docs/) | `architectural_patterns.md` and `feature_backlog.md` (mark items done with the PR number and date) |

---

## Core Patterns

These are summarized here. [.claude/docs/architectural_patterns.md](.claude/docs/architectural_patterns.md) has code examples, but parts of it are out of date, and where they conflict **this file wins**.

1. **State lives in `App.jsx` and is passed down as props.** Each entity has a `useState` and a `loadX()` function. Add new entity state there and pass it down through `AdminDashboard`. Do not add Redux, Zustand or entity-data Contexts.
2. **Selective refresh after mutations.** `onDataChange(...entityNames)` reloads only the entities you name, using the `entityLoaders` map in `App.jsx`. Examples: `await onDataChange('players')` and `onDataChange('jornadas', 'injuries')`. When you add a new entity, also register its loader in `entityLoaders` and in `loadData`.
3. **All Supabase access goes through `database.js`.** Each method follows the same shape: `const { data, error } = await supabase...; if (error) throw error; return data;`. Use PostgREST nested selects for joins. A few legacy direct `supabase` imports remain (App auth, `PasswordReset`, `SetPassword`, `PlayerFormPublic`, `SpendingTrendsWidget`). Don't add more.
4. **Modals are injected through `setShowModal({ title, content })`.** `AdminDashboard` owns this state, and forms report unsaved changes through `onDirtyChange` / `useFormDirty`. Use `AlertModal` / `ConfirmModal` / `PromptModal` (or `useAlertModal`) instead of `alert()` / `confirm()`, and `useToast` for success feedback.
5. **Mutations go through `useMutation`.** Call `execute(fn, errorLabel, successMessage)`. It handles `isSaving`, the error callback and the success toast.
6. **Avoid `useEffect`.** Follow [.claude/skills/no-use-effect.md](.claude/skills/no-use-effect.md). Derive values inline, handle actions in event handlers, reset state with `key`, and use `useMountEffect` for one-time mount work such as widgets that fetch their own data. The lint rule the skill mentions is **not** currently in `eslint.config.js`, so this is enforced by review only.
7. **Two permission patterns:**
   - **Boolean flags** from `user_permissions` (mapped to camelCase in `App.jsx`, e.g. `can_view_partidos` → `canViewPartidos`) gate tabs.
   - **Role arrays** (`admin`, `ejecutivo`, `presidente`, `presidente_categoria`, `delegado`, `comision`, `coordinador`) gate fields and actions inside a tab.
   - `currentUser.categoria` (an array) limits which categories a user sees.
   - The `finanzas` role is the exception: it ignores flags, sees only the Finanzas tab, skips `loadData` and is blocked from every table by RLS (data comes from the `get_players_finanzas` RPC).
   - Some tabs also need an `app_settings` toggle (`tabEnabled('xxx_tab_enabled')`, edited in ConfiguracionTab).
   - **Adding a permission touches four places:** a DB column, **both** `setCurrentUser` blocks in `App.jsx` (`checkSession` and `handleLogin`, which are duplicated), and the tab gating in `AdminDashboard`.
8. **Tabs are lazy-loaded** with `React.lazy` plus named-export remapping in `AdminDashboard`. A new tab needs the lazy import, an entry in the `tabs` array, and an `activeTab === '...'` render block.
9. **Activity logging.** Call `database.logActivity(action, ...)` fire-and-forget for auditable actions. Results appear in ActivityLogTab.
10. **Styling.** Use Tailwind with the club palette (black / yellow-400). Add `dark:` variants to any new UI, because dark mode is class-based.

---

## Key Constraints

- **Player deletion is intentionally disabled.** [PlayersTab.jsx](src/components/PlayersTab.jsx) shows an alert pointing to "Kaco" instead of deleting. Do not re-enable it without explicit instruction.
- **The UI language is Uruguayan Spanish.** All user-facing strings are in Spanish (voseo, e.g. "podés"), and dates use the `'es-UY'` locale (helpers are in `dateUtils.js`).
- **No TypeScript in app code.** Keep additions as `.js`/`.jsx`. The Deno Edge Functions are the only exception.
- **Don't commit secrets.** `.env.local` is gitignored.

---

## Git Workflow

**IMPORTANT**: Before touching any file, run `git checkout main && git pull` and create a branch (`feature/<name>`). Never commit to `main`. When done, push and open a PR with `gh pr create`.

---

## Supabase Migrations: Required Boilerplate for New Tables

From **October 30, 2026**, Supabase no longer exposes new `public` schema tables through the Data API (supabase-js / PostgREST) without explicit grants. Every migration that creates a new table **must** include:

```sql
-- Required: grant Data API access
grant select, insert, update, delete on public.your_new_table to authenticated;
grant select, insert, update, delete on public.your_new_table to service_role;

-- Required: enable RLS (add policies as needed)
alter table public.your_new_table enable row level security;
```

Every new table must also block the read-only `finanzas` role (see SPEC.md, "Rol finanzas"). Without it, finance users can read the new table through the API:

```sql
create policy deny_finanzas on public.your_new_table as restrictive for all to authenticated
  using (not (select public.current_user_is_finanzas()))
  with check (not (select public.current_user_is_finanzas()));
```

Without the grant lines, supabase-js returns a `42501` error when it queries the new table. Tables created before October 30, 2026 are not affected. Name migration files `YYYYMMDD_description.sql`.

---

## Additional Documentation

| Topic | File |
|---|---|
| Roles, schema, permissions, feature behavior | [SPEC.md](SPEC.md) |
| Architecture patterns with code examples | [.claude/docs/architectural_patterns.md](.claude/docs/architectural_patterns.md) |
| Feature backlog and completion log | [.claude/docs/feature_backlog.md](.claude/docs/feature_backlog.md) |
| No-useEffect rules | [.claude/skills/no-use-effect.md](.claude/skills/no-use-effect.md) |
| Roadmap | [ROADMAP.md](ROADMAP.md) |
