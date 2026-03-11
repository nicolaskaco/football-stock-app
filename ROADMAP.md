# ROADMAP — football-stock-app

---

## Fases completadas ✅

### Phase 1: Bulk Operations with Safe Previews ✅

Operaciones masivas con preview antes→después para evitar errores.

- **PlayersTab bulk actions**: cambiar categoría, toggle casita, ocultar jugadores (dropdown con `BulkActionModal`).
- **PlayersTab XLSX import**: importar jugadores desde Excel con auto-mapeo de columnas, validación, detección de duplicados (`ImportPreviewModal`).
- **InventoryTab bulk stock adjustment**: selección múltiple + ajuste de stock con preview.
- **Database helpers**: `bulkUpdatePlayers()`, `bulkAdjustInventory()`, `bulkAddPlayers()`.

### Phase 2: Injury & Availability Log ✅

Registro de lesiones para gestión de disponibilidad (admin-only).

- **Tabla `player_injuries`** con RLS: tipo, severidad, descripción, fechas de inicio/retorno estimado/alta.
- **Tipos de lesión**: Lesión muscular, Fractura, Esguince, Contusión, Tendinitis, Ligamentos cruzados, Meniscos, Otro.
- **PlayersTab**: icono swiss-cross (InjuryIcon) coloreado por severidad, filtro de disponibilidad, CRUD de lesiones.
- **PlayerForm**: lista de lesiones relacionadas por jugador (más antigua primero).
- **PartidoForm**: jugadores lesionados con prefijo 🏥 en dropdowns.
- **InjuredPlayersWidget**: widget de lesiones activas con filtro de categoría y nombres clickeables para editar.
- **Database**: `getInjuries()`, `addInjury()`, `updateInjury()`, `dischargeInjury()`.

### Phase 3: Advanced Analytics with Charts ✅

Gráficos interactivos con recharts para estadísticas avanzadas.

- **GoalTrendChart**: LineChart de goles por jornada por categoría.
- **CardDistributionChart**: BarChart de amarillas vs rojas por categoría.
- **AgeCurveChart**: BarChart apilado de distribución de edad por categoría (respeta filtro de categoría).
- **RivalPerformanceChart**: BarChart horizontal de victorias/empates/derrotas por rival.
- **EstadisticasTab**: nuevo sub-tab "Gráficos" con los 4 charts, comparte filtros con Rivales.
- **CategoryDistributionWidget**: reemplazado barra horizontal con donut chart (PieChart con innerRadius).

### Phase 4: Player Comparison Tool ✅

Comparación lado a lado de 2-3 jugadores.

- **PlayerComparisonModal**: secciones Datos Personales, Estado, Financiero, Estadísticas de Partido, más timeline de goles (LineChart superpuesto).
- **Highlight automático**: mejores valores resaltados en verde via helper `getBest()`.
- **PlayersTab**: botón "Comparar" (indigo, ícono Users) visible al seleccionar 2-3 jugadores.
- **AdminDashboard**: pasa `jornadas` a PlayersTab para alimentar el chart de comparación.

### Phase 5: Historial de Partidos por Jugador ✅

Sección en el detalle de cada jugador mostrando todos los partidos en los que participó.

- **PlayerForm**: sección "Historial de Partidos" al final del formulario de edición/lectura.
- **Datos por partido**: fecha, rival, resultado, titular/suplente, goles y tarjetas en ese partido.
- **Database**: consulta `partido_players` + `partidos` + `jornadas` + `rivales` + `partido_eventos` para armar el historial completo.

### Phase 6: Exportar Comparación de Jugadores ✅

Exportar la tabla comparativa de jugadores a Excel o copiar al portapapeles.

- **PlayerComparisonModal**: botones "Exportar Excel" y "Copiar" en el header del modal.
- **Excel export**: genera archivo `.xlsx` con nombre `comparacion_Jugador1_vs_Jugador2.xlsx` via `xlsx`.
- **Copiar al portapapeles**: copia la tabla como texto tabulado con `navigator.clipboard.writeText()`.
- **Datos exportados**: Datos Personales, Estado, Financiero, Estadísticas de Partido (PJ, titular, suplente, goles, amarillas, rojas, G/PJ).

### Phase 7: Reportes PDF del Dashboard ✅

Generación de PDF con snapshot de los widgets del dashboard para compartir sin acceso a la app.

- **`src/utils/pdfExport.js`**: utilidad de generación PDF con `jspdf` + `jspdf-autotable`.
- **Header**: branding Club Atlético Peñarol con colores institucionales (amarillo #D4A017 + gris oscuro).
- **Secciones del reporte**: Jugadores Lesionados, Fichas Médicas (vencidas/por vencer), Cumpleaños Próximos, Distribución por Categoría.
- **OverviewTab**: botón "Exportar PDF" (ícono FileDown) que genera `Reporte-Dashboard-DD-MM-YYYY.pdf`.
- **Respeta categoría**: el PDF filtra datos según `currentUser.categoria`.

### Phase 8: Mejoras de Responsive/Mobile ✅

Optimización de tablas, modales y formularios para pantallas chicas.

- **AdminDashboard**: hamburger menu + slide-in drawer para navegación mobile en lugar de tab bar horizontal.
- **PlayersTab / PlayersTabViatico**: columna Nombre sticky en scroll horizontal.
- **DirigentesTab / ComisionesTab**: nombre sticky con truncado en mobile, tap para expandir.
- **PartidosTab**: label de botón "Nueva Jornada" colapsa a "Nueva" en pantallas chicas.
- **Formularios y modales**: padding responsivo (`px-4 sm:px-6 lg:px-8`), scroll vertical en modales.

### Phase 9: Dark Mode ✅

Modo oscuro con toggle y persistencia via `localStorage`.

- **`src/context/DarkModeContext.jsx`**: Context + Provider con estado `dark`, persiste en `localStorage` con key `cap-dark-mode`.
- **`tailwind.config.js`**: `darkMode: 'class'` para activación por clase CSS.
- **Toggle**: botón Moon/Sun en la nav bar de `AdminDashboard` y `EmployeeView`.
- **`src/index.css`**: overrides globales CSS para backgrounds, texto, bordes, gradientes, formularios, badges, recharts, scrollbar.
- **Transiciones suaves**: CSS transitions de 0.2s para background/border y 0.15s para color.

### Phase 10: Notificaciones in-app ✅

Centro de notificaciones unificado accesible desde un ícono de campana en la barra de navegación.

- **`src/components/NotificationCenter.jsx`**: campana con badge de conteo, panel dropdown con lista de notificaciones.
- **Tipos de notificación**: cumpleaños (jugadores/dirigentes), fichas médicas vencidas/por vencer, solicitudes de cambio pendientes, lesiones activas.
- **Severidad visual**: bordes coloreados (rojo=crítico, naranja=advertencia, amarillo=info) + puntos de no leído.
- **Lectura/no leída**: estado persistido en `localStorage`, con opción "Marcar todas como leídas".
- **Navegación directa**: click en notificación lleva al tab correspondiente (Jugadores, Solicitudes, etc.).
- **Permisos**: Admins ven los 4 tipos filtrados por categoría; Funcionarios solo cumpleaños.
- **Dark mode**: estilos via clase `.notification-panel` en `index.css`.
- **Integración**: AdminDashboard (entre toggle dark y logout) y EmployeeView (solo cumpleaños).

### Phase 11: Code splitting y lazy loading ✅

Implementar `React.lazy()` + `Suspense` para cargar tabs bajo demanda y reducir el bundle inicial.

### Phase 12: Paginación server-side ✅

Para tablas con muchos registros (jugadores, distribuciones), implementar paginación con Supabase `.range()` en lugar de cargar todo en memoria.

---

## Próximas features sugeridas

### 1. Registro de transferencias/movimientos

Historial de movimientos de jugadores entre categorías, con fecha, motivo, y categoría de origen/destino. Útil para auditoría y seguimiento de desarrollo.
