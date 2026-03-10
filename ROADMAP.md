# ROADMAP — football-stock-app

Cuatro features seleccionadas, ordenadas por dependencias y complejidad.

---

## Phase 1: Bulk Operations with Safe Previews

**Por qué primero:** No requiere nuevas tablas ni dependencias externas. Mejora la productividad inmediata del admin y sienta las bases (CSV/XLSX parsing) que se reutilizan después.

### Scope

1. **Bulk player updates**
   - Seleccionar múltiples jugadores (checkbox ya existe en PlayersTab).
   - Acciones masivas: cambiar categoría, marcar/desmarcar casita, marcar/desmarcar contrato, ocultar jugadores.
   - Preview modal: tabla mostrando "antes → después" por jugador antes de confirmar.

2. **Bulk inventory corrections**
   - Selección múltiple en InventoryTab.
   - Ajustar stock (+/-) de varios items a la vez con preview antes de guardar.

3. **CSV/XLSX import with validation preview**
   - Botón "Importar" en PlayersTab (similar al existente en RivalesTab).
   - Parsear archivo, mostrar tabla de validación (filas válidas en verde, errores en rojo).
   - El usuario revisa y confirma antes de insertar.

### Files to create/modify

| Action | File |
|--------|------|
| Create | `src/components/BulkActionModal.jsx` — preview + confirm modal |
| Create | `src/components/ImportPreviewModal.jsx` — CSV/XLSX validation preview |
| Modify | `src/components/PlayersTab.jsx` — add bulk action buttons to existing selection UI |
| Modify | `src/components/InventoryTab.jsx` — add selection + bulk adjust |
| Modify | `src/utils/database.js` — add `bulkUpdatePlayers()`, `bulkAdjustInventory()` |

### DB changes

Ninguno. Usa tablas existentes (`players`, `inventory`).

---

## Phase 2: Injury & Availability Log

**Por qué segundo:** Agrega una dimensión nueva y crítica (estado médico interno) sobre la base de jugadores existente. Impacta PlayersTab, PartidoForm, y overview.

### Scope

1. **Nueva tabla `player_injuries`**
   - Campos: `id` (uuid), `player_id` (FK → players), `tipo` (text: lesión muscular, fractura, esguince, otro), `severidad` (leve/moderada/grave), `descripcion` (text), `fecha_inicio` (date), `fecha_retorno_estimada` (date nullable), `fecha_alta` (date nullable), `created_by` (email), `created_at` (timestamptz).
   - Una lesión abierta = `fecha_alta IS NULL`.

2. **Injury CRUD**
   - Formulario para registrar lesión desde PlayersTab (botón junto a Ficha Médica).
   - Editar / dar de alta desde el mismo lugar.

3. **Red flag en player cards**
   - Icono de alerta (🔴 o ícono de Lucide `AlertTriangle`) junto al nombre en PlayersTab, al lado de `FichaMedicaIcon`.
   - Tooltip con tipo de lesión y fecha estimada de retorno.

4. **Filtro de disponibilidad**
   - Nuevo filtro en PlayersTab: "Disponibles" / "Lesionados" / "Todos".
   - En PartidoForm (al armar lineup): mostrar badge de lesión junto al nombre, prevenir selección de jugadores lesionados con alerta.

5. **Widget en Overview**
   - Card "Jugadores Lesionados" mostrando cantidad y lista resumida.

### Files to create/modify

| Action | File |
|--------|------|
| Create | `src/forms/InjuryForm.jsx` — registrar/editar lesión |
| Create | `src/components/ui/InjuryIcon.jsx` — icono de alerta con tooltip |
| Modify | `src/components/PlayersTab.jsx` — agregar InjuryIcon al lado de FichaMedicaIcon, nuevo filtro |
| Modify | `src/forms/PartidoForm.jsx` — badge de lesión en selector de jugadores |
| Modify | `src/components/OverviewTab.jsx` — widget de lesionados |
| Modify | `src/components/AdminDashboard.jsx` — cargar injuries en state y pasarlas como prop |
| Modify | `src/App.jsx` — estado global `injuries`, función de carga |
| Modify | `src/utils/database.js` — `getInjuries()`, `addInjury()`, `updateInjury()`, `dischargeInjury()` |

### DB changes

```sql
CREATE TABLE player_injuries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL,
  severidad text NOT NULL CHECK (severidad IN ('leve', 'moderada', 'grave')),
  descripcion text,
  fecha_inicio date NOT NULL,
  fecha_retorno_estimada date,
  fecha_alta date,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS: same policies as players table
ALTER TABLE player_injuries ENABLE ROW LEVEL SECURITY;
```

---

## Phase 3: Advanced Analytics with Charts

**Por qué tercero:** Reutiliza datos existentes en `partido_eventos` y `partido_players`. No requiere tablas nuevas, solo UI nueva con una librería de gráficos.

### Scope

1. **Instalar Recharts**
   - `npm install recharts` — librería ligera, compatible con React 19.

2. **Ampliar EstadisticasTab con gráficos**
   - **Tendencia de goles por jornada** — LineChart: eje X = jornada, eje Y = goles del equipo (filtrando por categoría).
   - **Distribución de tarjetas por categoría** — BarChart: amarillas vs rojas por categoría.
   - **Curva de edad por categoría** — BarChart/Histogram: distribución de edades de jugadores por cada categoría.
   - **Rendimiento por rival** — BarChart horizontal: PG/PE/PP contra cada rival.

3. **Gráficos en OverviewTab (widgets)**
   - **Mini sparkline** en el StatCard de goles: tendencia de las últimas 5 jornadas.
   - **Donut chart** en categoría distribution widget (ya existe como texto, agregar visual).

4. **Gráficos en detalle de jugador**
   - Al abrir un jugador en modo lectura: mini gráfico de goles acumulados por jornada.

### Files to create/modify

| Action | File |
|--------|------|
| Create | `src/components/charts/GoalTrendChart.jsx` |
| Create | `src/components/charts/CardDistributionChart.jsx` |
| Create | `src/components/charts/AgeCurveChart.jsx` |
| Create | `src/components/charts/RivalPerformanceChart.jsx` |
| Modify | `src/components/EstadisticasTab.jsx` — agregar sub-tab "Gráficos" o integrar charts en tabs existentes |
| Modify | `src/components/OverviewTab.jsx` — sparklines en widgets |
| Modify | `src/components/CategoryDistributionWidget.jsx` — donut chart |
| Modify | `package.json` — add `recharts` dependency |

### DB changes

Ninguno. Usa `partido_eventos`, `partido_players`, `jornadas`, `players`.

---

## Phase 4: Player Comparison Tool

**Por qué último:** Es 100% UI, sin cambios de datos. Se beneficia de que las fases anteriores ya estén listas (lesiones y charts enriquecen la comparación).

### Scope

1. **Selector de comparación**
   - En PlayersTab: botón "Comparar" que aparece cuando se seleccionan 2 o 3 jugadores (reusar checkboxes existentes).
   - Abre modal de comparación.

2. **Modal de comparación lado a lado**
   - Columnas: un jugador por columna (2 o 3 columnas).
   - Secciones:
     - **Datos personales** — Nombre, edad, categoría, posición, departamento.
     - **Estado** — Contrato, casita, ficha médica, lesión activa (de Phase 2).
     - **Financiero** — Viático, complemento, total.
     - **Estadísticas de partido** — PJ, titular, suplente, goles, amarillas, rojas, G/PJ.
     - **Mini chart comparativo** — Goles por jornada superpuestos (de Phase 3).
   - Highlight automático: el mejor valor en cada fila se resalta en verde.

3. **Exportar comparación**
   - Botón para exportar la tabla comparativa a Excel o copiar al portapapeles.

### Files to create/modify

| Action | File |
|--------|------|
| Create | `src/components/PlayerComparisonModal.jsx` — modal con tabla comparativa |
| Modify | `src/components/PlayersTab.jsx` — botón "Comparar" en toolbar de selección |
| Modify | `src/utils/database.js` — `getPlayerStats(playerIds)` helper si no existe |

### DB changes

Ninguno.

---

## Resumen de dependencias

```
Phase 1 (Bulk Ops)          → sin dependencias, empezar aquí
Phase 2 (Injuries)          → sin dependencias, puede ir en paralelo con Phase 1
Phase 3 (Charts)            → instalar recharts, usa datos existentes
Phase 4 (Comparación)       → se enriquece con Phase 2 (lesiones) + Phase 3 (charts)
```

## Orden sugerido de implementación

| Orden | Feature | Dependencia de npm | Nuevas tablas |
|-------|---------|-------------------|---------------|
| 1 | Bulk Operations | — | — |
| 2 | Injury & Availability | — | `player_injuries` |
| 3 | Advanced Analytics | `recharts` | — |
| 4 | Player Comparison | — | — |
