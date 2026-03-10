# Copilot Instructions - football-stock-app

## Project Context
- Internal management app for Club Atletico Penarol (CAP) formative divisions.
- Main domains: players, employees, inventory/uniforms, viaticos, torneos, comisiones, and documents.
- User roles:
- Admins: full dashboard access via Supabase Auth.
- Funcionarios: limited read-only view via custom auth.
- `SPEC.md` is the authoritative source for behavior, roles, DB schema, and permissions.

## Tech Stack
- React 19 + Vite 7
- Tailwind CSS 3
- React Router v7
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Icons: `lucide-react`
- Excel export: `xlsx`
- Deployment: Vercel (SPA rewrites in `vercel.json`)

## Codebase Rules
- Use `.jsx` for frontend source files.
- Do not introduce `.ts` or `.tsx` files for app code.
- There is no test framework configured.
- Keep user-facing text in Uruguayan Spanish.
- Format dates using locale `es-UY` where relevant.

## Hard Product Constraints
- Player deletion is intentionally disabled in `src/components/PlayersTab.jsx`.
- Do not re-enable player deletion unless explicitly requested.

## Key Files
- `src/App.jsx`: root global state, session handling, high-level routing.
- `src/supabaseClient.js`: Supabase client setup using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/utils/database.js`: primary data access layer for Supabase CRUD operations.
- `src/components/AdminDashboard.jsx`: tab shell and permission-based tab rendering.
- `src/forms/`: controlled CRUD forms.

## Workflow
- For new features or bug fixes, create and use a dedicated git branch before making changes.
- Prefer aligning implementation with `SPEC.md`; if unclear, surface assumptions.

## Commands
```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Extra Documentation
- Architecture patterns and UI/data flow references: `.claude/docs/architectural_patterns.md`
- Coding and implementation conventions: `.github/copilot-conventions.md`
- Reusable implementation templates: `.github/copilot-templates.md`
