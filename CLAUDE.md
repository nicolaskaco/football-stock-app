# CLAUDE.md — football-stock-app

## Project Overview

Internal management app for Club Atletico Peñarol (CAP) formative divisions. Tracks players, employees, inventory/uniforms, viáticos (financial allowances), torneos, comisiones, and documents. Two user types: **Admins** (full dashboard via Supabase Auth) and **Funcionarios** (limited read-only view via custom auth).

Authoritative spec: [SPEC.md](SPEC.md) — covers all roles, DB schema, permissions, and features.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build | Vite 7 |
| Styling | Tailwind CSS 3 |
| Routing | React Router v7 |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Icons | lucide-react |
| Excel export | xlsx |
| Deployment | Vercel (SPA rewrites in `vercel.json`) |

All source files are `.jsx` — no TypeScript in use (despite `@types/react` being installed). No test framework.

---

## Key Directories and Files

| Path | Purpose |
|---|---|
| [src/App.jsx](src/App.jsx) | Root: ALL global state (`useState` hooks), session management, routing between login/dashboard/employee-view |
| [src/supabaseClient.js](src/supabaseClient.js) | Supabase client init — credentials currently hardcoded, should move to `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` |
| [src/utils/database.js](src/utils/database.js) | Sole data access layer — all Supabase CRUD operations (~887 lines) |
| [src/utils/storage.js](src/utils/storage.js) | Legacy localStorage wrapper — largely unused, kept for reference |
| [src/components/](src/components/) | Tab-level views, dashboard widgets, modals, shared UI |
| [src/components/AdminDashboard.jsx](src/components/AdminDashboard.jsx) | Tab shell: reads permission flags, renders visible tabs, owns `showModal` state |
| [src/forms/](src/forms/) | 9 controlled CRUD forms (PlayerForm, EmployeeForm, etc.) |
| [SPEC.md](SPEC.md) | Authoritative project specification |

---

## Build Commands

```
npm run dev       # Start dev server (Vite HMR)
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test command — no testing framework is configured.

---

## Key Constraints

- **Player deletion is intentionally disabled** — [src/components/PlayersTab.jsx](src/components/PlayersTab.jsx) shows an alert directing to "Kaco" instead of deleting. Do not re-enable without explicit instruction.
- **UI language is Uruguayan Spanish** — all user-facing strings use Spanish; dates use `'es-UY'` locale.
- **No TypeScript** — do not introduce `.ts`/`.tsx` files; keep all additions as `.jsx`.

---

## Adding New Features or Fixing Bugs

**IMPORTANT**: When you work on a new feature or bug, create a git branch first.
Then work on changes in that branch for the remainder of the session.

---

## Additional Documentation

Check these files when working on the relevant area:

| Topic | File |
|---|---|
| Architecture, state management, API patterns, modal/form/widget patterns | [.claude/docs/architectural_patterns.md](.claude/docs/architectural_patterns.md) |
