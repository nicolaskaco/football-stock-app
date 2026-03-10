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

---

## Próximas features sugeridas

### 1. Historial de partidos por jugador

Agregar una pestaña o sección en el detalle de cada jugador que muestre todos los partidos en los que participó: fecha, rival, resultado, si fue titular o suplente, goles y tarjetas en ese partido.

### 2. Exportar comparación de jugadores

Agregar botón de exportar a Excel o copiar al portapapeles en `PlayerComparisonModal`, para compartir la tabla comparativa fuera de la app.

### 3. Reportes PDF del dashboard

Generar un PDF con un snapshot de los widgets del dashboard (lesionados, fichas médicas, distribución por categoría, cumpleaños) para compartir en reuniones sin acceso a la app.

### 4. Mejoras de responsive/mobile

Revisar y optimizar tablas, modales y formularios para pantallas chicas. Priorizar PlayersTab, PartidoForm y el dashboard de widgets.

### 5. Dark mode

Implementar un toggle de tema oscuro usando las clases `dark:` de Tailwind. Guardar preferencia en `localStorage`.

### 6. Code splitting y lazy loading

Implementar `React.lazy()` + `Suspense` para cargar tabs bajo demanda y reducir el bundle inicial.

### 7. Paginación server-side

Para tablas con muchos registros (jugadores, distribuciones), implementar paginación con Supabase `.range()` en lugar de cargar todo en memoria.

### 8. Notificaciones in-app

Sistema de notificaciones para alertar sobre: lesiones nuevas, fichas médicas por vencer, solicitudes de cambio pendientes, cumpleaños del día.

### 9. Calendario de entrenamientos

Extender `CalendarioView` para incluir entrenamientos además de partidos, con distinción visual entre ambos tipos de evento.

### 10. Registro de transferencias/movimientos

Historial de movimientos de jugadores entre categorías, con fecha, motivo, y categoría de origen/destino. Útil para auditoría y seguimiento de desarrollo.
