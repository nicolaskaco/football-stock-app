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
- [x] **B4. Importar planilla COMET** — PartidoForm reads the AUF "Informe del partido" PDF (pdfjs, in the browser), matches players by COMET ID or name with a preview, and fills titulares, suplentes, cambios (new `minuto_entrada`/`minuto_salida`), tarjetas, marcador and árbitros. Learns `players.comet_id`. Minutes played in the player ficha for partidos with `duracion`. *(PR #343 · 2026-10-08)*
- [x] **B5. Escudos de los rivales** — Badge image per rival in a public `rival-badges` Storage bucket (`rivales.badge_path`). Upload from RivalForm or in bulk by file name; shown in Rivales, Partidos, the jornada detail, Calendario and the torneo detail. *(PR #348 · 2026-10-10)*
- [x] **B6. Por Rival agrupado con puntos** — Estadísticas → Por Rival shows one collapsible row per rival (escudo, PJ, G-E-P, points over possible for Apertura, Clausura and total) with a category × jornada detail grid and a totals row. Semifinal/Final don't add points. *(PR #351 · 2026-10-11)*
- [x] **B7. Jornada en el historial de partidos del jugador** — The Historial de Partidos in the player ficha shows the jornada with its fase (`Apertura · J5`, `Clausura · Final`). On mobile each partido is a card instead of the wide table. *(PR #353 · 2026-10-19)*
- [x] **B8. Suspensiones en el historial de partidos del jugador** — Jornadas the player is suspended for (red card or 5th yellow, upcoming ones included) appear in the Historial de Partidos as a red "Suspendido" row with the reason and the team's result, on desktop and mobile. *(PR #354 · 2026-10-19)*
- [x] **B9. Suspensiones actuales según el último partido cargado** — The Suspensiones widget (and TarjetasTab / PlayersTab) computes current suspensions for the jornada after the last loaded partido (result + lineup) of each category instead of using dates, so a 5th-yellow suspension shows the same as in the lineup until that partido is loaded. *(PR #355 · 2026-10-26)*
- [x] **B10. Partidos reprogramados y ajustes manuales de suspensión** — New `partidos.fecha` (default from the jornada: 4ta the day before, the rest the same day; backfilled for all jornadas, editable in PartidoForm, shown as "Reprog." in Partidos). Suspensions follow the order each category's partidos were actually played, so a postponed partido is served where it was played. Admins can clear or add a suspension per player + partido (`partido_suspension_ajustes`), logged in Actividad. *(PR #356 · 2026-10-29)*
- [x] **B11. Tarjetas del jugador desde el widget Suspensiones** — Clicking a player name in the Suspensiones widget opens a pop up with the current-year partidos of that category where he got a yellow or red card (fecha, jornada, rival, categoría, resultado, 🟨, 🟥). Rows up to the last reset (red card or 5th yellow) are dimmed. *(PR #357 · 2026-10-29)*
- [x] **B12. Posición automática al importar el COMET** — Titulares imported from a COMET report get a position: the one already in the partido, else their most frequent in the last 5 partidos, else their ficha position mapped to a partido position (second zaguero/lateral/extremo → izquierdo, second volante → ofensivo). *(PR #365 · 2026-11-16)*
- [x] **B13. Importar todos los COMET de una jornada** — "Importar COMETs" in the jornada detail takes several PDFs at once, sends each to the partido of the category in its file name (or the report's torneo), shows a review card per partido and saves all the checked ones together. "Cargar COMETs" in Partidos does it in one click: it reads a remembered local folder, keeps the reports of the last jornada's rival, saves the clean ones and leaves the doubtful ones for manual approval. *(PR #366 · 2026-11-23)*

### C. Inventario y Equipamiento

- [x] **C1. Asignación individual de equipamiento por jugador** — New `player_distributions` table (player_id, item_id, size, quantity, fecha, condicion). Section in PlayerForm ("Equipamiento") to record kit given to each player. Deducts stock from inventory (same pattern as employee distributions).

### D. Analíticas y Reportes

- [x] **D1. Reparar y expandir ReportsTab** — Translate all labels to Spanish. Add Excel export buttons per report. Add player-focused report: roster by category, viático + complemento totals per category, players with casita. *(completed — PR #257 · 2026-03-19)*
- [ ] **D2. Analítica de lesiones** — Historical injury analysis: most common injury types (bar chart), average recovery time per severity, players with most injury history. New sub-section in EstadisticasTab or OverviewTab.
- [x] **D3. Frecuencia de convocatoria del jugador** — Dynamic per-year convocatoria columns in EstadisticasTab General table (titular/suplente split, filterable by category). Player read-only modal shows per-year + per-category breakdown. *(completed — PR #272 · 2026-03-23)*
- [x] **D4. % Victorias sin estar convocado** — New card under "Cruces con el resultado" in the Estadísticas Jugadores ficha: team win % in matches of the player's categoría de juego where he was not convocado (from his first convocatoria on), with the convocado % as reference. *(PR #334 · 2026-10-02)*
- [x] **D5. Cruces en % de puntos** — Estadísticas Jugadores (ficha, tablas de contexto y comparación, incluido el export) pasa de % de victorias a % de puntos (3-1-0), con el G-E-P como subtítulo. Reemplaza el % de victorias de D4. Agrega la tarjeta "% Puntos estando convocado" (titular o suplente, en su categoría de juego) junto a la de sin convocar. *(PR #335 · 2026-10-02)*

### E. Mejoras de UX

- [x] **E1. Persistencia de filtros en URL en más tabs** — Apply `useSearchParams` (already used in PlayersTab) to EstadisticasTab (category filter, active sub-tab) and TorneosTab (search). *(completed — PR #254 · 2026-03-18)*
- [x] **E2. Filtro por temporada / año** — Year filter dropdown (2024, 2025, 2026…) on PartidosTab, EstadisticasTab, and TorneosTab. Defaults to current year. *(completed — 2026-03-18)*
- [x] **E3. Estadísticas rápidas en modal de jugador (solo lectura)** — Compact stats row at the bottom of read-only PlayerForm: PJ | Goles | Amarillas | Rojas. Reuses `jornadas` already in global state. *(completed — 2026-03-17)*
- [x] **E4. Cambiar contraseña desde la sesión** — KeyRound button in the AdminDashboard header opens a modal to change the logged-in user's password (current password re-verified). *(PR #340 · 2026-10-06)*
- [x] **E5. Búsqueda de jugadores más rápida en mobile** — Magnifier button in the mobile header opens Jugadores with the search focused *(PR #358 · 2026-10-29)*, and player/viático search ignores accents (`normalizeSearchText`) *(PR #359 · 2026-10-29)*.
- [x] **E6. Jugadores como cards en mobile** — Below `sm`, PlayersTab shows one card per player (`PlayerMobileCard`) with an "Ordenar…" selector and "Todos" select-all instead of the wide table. *(PR #363 · 2026-11-13)*

### F. Datos de Familia

- [x] **F1. Padres/Tutores en tabla de jugadores** — Add columns to `players` table: `madre_nombre`, `madre_telefono`, `padre_nombre`, `padre_telefono`. New section in PlayerForm to edit these fields. Planning to integrate with external Office Form for data collection.
- [x] **F2. Cuenta de cobro de viáticos (Prex / Mi Dinero)** — New `cuenta_*` columns on `players` (own account or padre/madre/tutor account). Replaces legacy `bank` / `bank_account` in PlayerForm, PlayerFormViatico, the Viáticos table and the Excel exports. Bulk import from the Google Form responses in PlayersTabViatico. *(PR #331 · 2026-10-02)*
- [x] **F3. Cuenta de cobro en el export de Tesorero** — Banco, Número de cuenta, Nombre y Documento del titular added to the Exportar Viáticos Excel; warning for players without an account. *(PR #332 · 2026-10-02)*
- [x] **F4. Resumen de pagos por medio en Tesorero** — Card in TesoreroTab with totals (monto, jugadores, %) paid through Prex, Mi Dinero and Efectivo (players without an account), plus a per-category breakdown. Same criteria as the export; the Excel gets a first "Resumen" sheet. *(PR #333 · 2026-10-02)*

### G. Calendario y Vistas

- [x] **G1. Calendario Unificado** — Enhance existing CalendarioView to show multiple event types beyond matches: birthdays (players + dirigentes), ficha médica expirations, active injuries/estimated returns. Toggle filters per event type. Color-coded indicators per event type. *(completed — PR #273 · 2026-03-23)*

### I. Automatización y calidad

- [x] **I1. CI, tests y aviso de ficha vencida** — GitHub Actions (tests + build en cada PR; lint visible sin bloquear hasta limpiar `main`), Vitest para la lógica pura (suspensiones, stats, edad, fechas, COMET) y aviso 🩺 de ficha médica vencida en PartidoForm. Arregla `checkLowStock` (usaba `supabase.raw`). *(PR #367 · 2026-11-23)*
- [x] **I2. Parte de disponibilidad pre-jornada** — Botón en el detalle de la jornada: por categoría, disponibles y no disponibles (suspendido, lesionado (tipo solo para admin), ficha vencida, excede edad), respetando las categorías del usuario. De los disponibles va solo la cantidad. Copiar texto y PDF. El envío a Telegram llega con I4. También arregla la columna Lesión del PDF del dashboard, que leía `tipo_lesion` en lugar de `tipo`. *(PR #368 · 2026-11-23)*
- [x] **I3. Fichas SND automáticas** — `pg_cron` llama a la Edge Function `refresh-fichas-medicas` cada 20 min entre las 03:00 y las 05:40. Cada corrida revisa una tanda de 40 jugadores activos con ficha vencida, sin ficha o por vencer en ≤30 días. Actualiza `ficha_medica_hasta` y deja el cambio en `player_history` y un resumen en Actividad. Agrega `players.ficha_medica_chequeada_at`. El scraping de SND pasa a `_shared/snd.ts`. *(PR #369 · 2026-11-23)*
- [x] **I4. Bot de Telegram** — Edge Functions `send-telegram` y `weekly-digest`. *(PR #370 · 2026-11-23)*
  - "Enviar a Telegram" en el parte pre-jornada, para admin, ejecutivo y presidentes, con confirmación y sin el tipo de lesión.
  - Resumen de los lunes a las 8:00 por `pg_cron`: fichas, chequeo SND, lesiones con el retorno vencido, solicitudes viejas y stock bajo. Se prende con un toggle en Configuración y tiene un modo `?preview=1`.
- [x] **I7. Parte a Telegram al crear la jornada** — Casilla en "Nueva Jornada" (marcada si la fecha es hoy o futura) que manda el parte de disponibilidad al grupo apenas se crea la jornada. Si el envío falla, la jornada queda creada y se avisa. *(PR #371 · 2026-11-24)*
- [x] **I8. Semifinales y finales por categoría, y escenario Neutral** — Semifinal y Final se crean para una sola categoría (con su rival; varias finales el mismo día son varias jornadas), con la fecha de la jornada también para la 4ta. Nuevo escenario `Neutral` (marcador guardado como Local, sin inversión en 6ta/7ma), con su badge, su fila en Por Cancha y en la ficha del jugador. Pts sobre el máximo real de la jornada. Semifinal y Final van sin fase ("Definición", después del Clausura). *(PR #372 · 2026-11-24)*
- [x] **I10. Bot de Telegram que responde consultas** — Edge Function `telegram-bot` (webhook). Responde en chat privado a usuarios vinculados desde la app con un código de un solo uso, con sus permisos y categorías: `/nacidos`, `/categoria`, `/jugador`, `/lesionados`, `/cumples`, `/proximo`, `/resultado`, `/contra`, `/goleadores`, `/tarjetas`, `/fichas`, `/tareas`. *(PR #373 · 2026-11-24)*
- [ ] **I11. Bot de Telegram: suspensiones, minutos y parte** — `/suspendidos`, `/amarillas`, `/minutos`, `/parte`. Antes hay que compartir `suspensions.js` / `playerStats.js` / `disponibilidad.js` con Deno (hoy importan sin extensión) en lugar de reescribirlos.
- [ ] **I12. Importar histórico COMET** — Elegir todos los PDF de partidos viejos juntos y asignar cada uno a su jornada y categoría por rival y fecha. Los partidos que ya tienen planilla quedan para revisar. Plan detallado listo.
- [ ] **I9. "Cargar COMETs" con varias jornadas el mismo día** — Hoy toma una sola "última jornada"; con varias finales el mismo día debería tomar todas las de esa fecha y repartir los informes por rival y categoría.
- [ ] **I6. Detalle del chequeo SND en Actividad** — Ver desde Actividad, con nombres, qué fichas se actualizaron y quiénes no se encontraron en SND en cada corrida automática.
- [ ] **I5. Limpiar errores de lint heredados** y volver bloqueante el lint en CI.

### H. Auditoría

- [x] **H1. Log de Actividad Global** — App-wide audit trail: logins, permission changes, approval/rejection of change requests, bulk operations. New `activity_log` table + ActivityLogTab (admin only). *(completed — PR #281 · 2026-03-27)*
  - [x] Paginación con "Cargar más" y filtros de tipo/usuario/fecha en la base *(PR #337 · 2026-10-04)*
- [x] **H2. Rol finanzas (solo lectura)** — New `finanzas` role for the club's finance staff: only a read-only Finanzas tab (datos personales básicos + viático, complemento, contrato, override, cuenta de cobro, comentario), change history and Excel export. Enforced in the DB: RESTRICTIVE `deny_finanzas` policy on every table + column-limited SECURITY DEFINER RPCs. *(PR #339 · 2026-10-06)*
  - [x] Vista mobile (tarjetas expandibles, filtros colapsables) y Nombre Visual en lugar del nombre completo *(PR #342 · 2026-10-07)*
- [x] **H3. Historial de la cuenta de viáticos** — Changes to the viático account fields (titular, nombre/documento del titular, banco, número) are written to `player_history` from the player forms and the Google Form import, and shown in the history modal (also for finanzas) and Actividad. *(PR #352 · 2026-10-14)*
