# Copilot Conventions - football-stock-app

Use this file as implementation guidance in addition to `.github/copilot-instructions.md`.

## Core Principles
- Align behavior with `SPEC.md` first.
- Prefer minimal, local changes over broad refactors.
- Preserve existing UX and tab flows unless the task explicitly asks for redesign.

## Frontend Conventions
- Keep app source in `.jsx` files. Do not add `.ts` or `.tsx` files.
- Follow existing component patterns in `src/components/` and `src/forms/`.
- Reuse shared UI and hooks before creating new abstractions.
- Keep forms controlled and consistent with existing form components.
- Keep user-facing copy in Uruguayan Spanish.
- Format user-visible dates with locale `es-UY`.

## Data And Supabase Conventions
- Prefer data operations through `src/utils/database.js`.
- Keep Supabase client setup centralized in `src/supabaseClient.js`.
- Avoid duplicating query logic across tabs/forms when an existing helper can be extended.
- Respect role boundaries (Admins vs Funcionarios) defined in `SPEC.md`.

## Product Constraints
- Do not enable player deletion in `src/components/PlayersTab.jsx` unless explicitly requested.

## Change Management
- For features and bug fixes, create and work on a dedicated branch.
- If requirements are ambiguous, document assumptions in the response.
- If a requested change conflicts with `SPEC.md`, call out the conflict and ask for direction.

## Validation Checklist
- Run `npm run lint` for non-trivial code changes.
- Run `npm run build` when changes affect routing, major components, or data flow.
- Mention any checks not run and why.

## Useful References
- `SPEC.md`
- `.claude/docs/architectural_patterns.md`
- `.github/copilot-templates.md`
- `src/App.jsx`
- `src/components/AdminDashboard.jsx`
- `src/utils/database.js`
