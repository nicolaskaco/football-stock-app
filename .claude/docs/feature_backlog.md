# Feature Backlog — football-stock-app

Move items to **Completado** when shipped (change `- [ ]` to `- [x]` and add PR # + date).

---

## Backlog

### A. Gestión de Jugadores

- [x] **A1. Estado del jugador (activo / cedido / transferido / egresado / dado de baja)** — Add `status` field to `players`. PlayersTab filter by status; inactive hidden by default. Badge next to name (like injury icon). *(implemented incrementally — 2026-03-17)*
- [x] **A2. Seguimiento de suspensiones** — Track automatic suspensions per player (games suspended, reason, expiry jornada). Show suspension badge in PlayersTab and PartidoForm dropdowns alongside injury 🏥. *(completed — 2026-03-17)*
- [x] **A3. Alerta de edad / elegibilidad por categoría** — Configurable max age per category in ConfiguracionTab. Alert badge in PlayersTab for over-age players. Warning in PartidoForm when adding an over-age player. *(completed — 2026-03-17)*

### B. Partidos y Torneos
- [x] **B1. Mostrar minuto de gol/tarjeta en PartidoDetailView** — PR #229 · 2026-03-16
- [x] **B2. Resultado del torneo** — PR #230 · 2026-03-16
- [x] **B3. Advertencias de elegibilidad en PartidoForm** — PR #233 · 2026-03-16

### C. Inventario y Equipamiento

- [ ] **C1. Asignación individual de equipamiento por jugador** — New `player_distributions` table (player_id, item_id, size, quantity, fecha, condicion). Section in PlayerForm ("Equipamiento") to record kit given to each player. Deducts stock from inventory (same pattern as employee distributions).

### D. Analíticas y Reportes

- [ ] **D1. Reparar y expandir ReportsTab** — Translate all labels to Spanish. Add Excel export buttons per report. Add player-focused report: roster by category, viático + complemento totals per category, players with casita.
- [ ] **D2. Analítica de lesiones** — Historical injury analysis: most common injury types (bar chart), average recovery time per severity, players with most injury history. New sub-section in EstadisticasTab or OverviewTab.
- [ ] **D3. Frecuencia de convocatoria del jugador** — Add "Torneos" count column to EstadisticasTab General table. Show torneo callup count in player read-only modal.

### E. Mejoras de UX

- [ ] **E1. Persistencia de filtros en URL en más tabs** — Apply `useSearchParams` (already used in PlayersTab) to EstadisticasTab (category filter, active sub-tab) and TorneosTab (search).
- [ ] **E2. Filtro por temporada / año** — Year filter dropdown (2024, 2025, 2026…) on PartidosTab, EstadisticasTab, and TorneosTab. Defaults to current year.
- [x] **E3. Estadísticas rápidas en modal de jugador (solo lectura)** — Compact stats row at the bottom of read-only PlayerForm: PJ | Goles | Amarillas | Rojas. Reuses `jornadas` already in global state. *(completed — 2026-03-17)*
