// ============================================================
// Centralised constants for the CAP internal app.
// Import from here instead of defining inline in components.
// ============================================================

/** Categorías de jugadores/empleados (orden canónico) */
export const CATEGORIAS = ['3era', '4ta', '5ta', 'S16', '6ta', '7ma', 'Sub13'];

/** Departamentos de Uruguay + países extranjeros */
export const DEPARTAMENTOS = [
  'Montevideo',
  'Canelones (Ciudad de la Costa)',
  'Canelones',
  'Artigas',
  'Cerro Largo',
  'Colonia',
  'Durazno',
  'Flores',
  'Florida',
  'Lavalleja',
  'Maldonado',
  'Paysandú',
  'Río Negro',
  'Rivera',
  'Rocha',
  'Salto',
  'San José',
  'Soriano',
  'Tacuarembó',
  'Treinta y Tres',
  'Argentina',
  'Brasil',
  'Colombia',
  'España',
  'Estados Unidos',
  'Venezuela',
];

/** LEGACY: bancos de las columnas players.bank / bank_account, ya no se muestran en la UI */
export const BANCOS = ['Itau', 'Prex', 'Mi Dinero', 'BROU', 'Santander', 'Scotia', 'HSBC', 'Otro'];

/** Bancos habilitados para el cobro de viáticos */
export const BANCOS_VIATICO = ['Prex', 'Mi Dinero'];

/** Titular de la cuenta de cobro de viáticos */
export const CUENTA_TITULAR_TIPOS = [
  { value: 'jugador', label: 'Cuenta propia (del jugador)' },
  { value: 'familiar', label: 'Padre, madre o tutor' },
];

/** Columnas de la cuenta de viáticos en la tabla players */
export const CUENTA_VIATICO_FIELDS = [
  'cuenta_titular_tipo',
  'cuenta_banco',
  'cuenta_numero',
  'cuenta_titular_nombre',
  'cuenta_titular_documento',
];

/** Posiciones de jugadores (orden para ordenamiento en tabla) */
export const POSICIONES_JUGADOR = ['Arquero', 'Zaguero', 'Lateral', 'Volante', 'Extremo', 'Delantero'];

/** Tallas de ropa */
export const TALLAS_ROPA = ['S', 'M', 'L', 'XL', 'XXL'];

/** Categorías de inventario */
export const CATEGORIAS_INVENTARIO = [
  'Remeras',
  'Shorts',
  'Pantalones',
  'Camperas de invierno',
  'Ropa de entrenamiento',
  'Otro',
];

// ============================================================
// Constantes del módulo Partidos / Campeonato
// ============================================================

/** Categorías que participan en el campeonato juvenil */
export const CATEGORIAS_PARTIDO = ['4ta', '5ta', 'S16', '6ta', '7ma'];

/**
 * Duración reglamentaria (minutos) por categoría, usada como valor por defecto de
 * `partidos.duracion` al cargar minutos de entrada/salida.
 * TODO: confirmar duraciones reales de las categorías menores.
 */
export const DURACION_PARTIDO_DEFAULT = { '4ta': 90, '5ta': 90, 'S16': 90, '6ta': 90, '7ma': 90 };

/**
 * Categorías "mayores" que invierten el escenario respecto al valor base.
 * Si la jornada se crea como Local → estas categorías juegan Visitante.
 */
export const CATEGORIAS_ESCENARIO_INVERTIDO = ['6ta', '7ma'];

/** Fases del campeonato */
export const FASES_CAMPEONATO = ['Apertura', 'Clausura'];

/** Escenarios posibles */
export const ESCENARIOS = ['Local', 'Visitante'];

/** Tipos de césped */
export const CESPED_TIPOS = ['Natural', 'Sintético'];

/** Canchas propias (solo aplica cuando escenario = Local) */
export const CANCHAS_LOCAL = ['Ciudad Deportiva', 'Las Acacias', 'CAR'];

/** Posiciones específicas para la planilla de partidos */
export const POSICIONES_PARTIDO = [
  'Arquero',
  'Lateral derecho',
  'Zaguero derecho',
  'Zaguero izquierdo',
  'Lateral izquierdo',
  'Volante defensivo',
  'Volante ofensivo',
  'Extremo derecho',
  'Delantero Centro',
  'Extremo Izquierdo',
];

/** Posición por defecto según el número de titular (índice 0 = titular 1) */
export const POSICIONES_DEFAULT_TITULAR = [
  'Arquero',            // 1
  'Lateral derecho',    // 2
  'Zaguero derecho',    // 3
  'Zaguero izquierdo',  // 4
  'Lateral izquierdo',  // 5
  'Volante defensivo',  // 6
  'Volante defensivo',  // 7
  'Extremo derecho',    // 8
  'Volante ofensivo',   // 9
  'Extremo Izquierdo',  // 10
  'Delantero Centro',   // 11
];

/** Números de jornada del campeonato */
export const NUMEROS_JORNADA = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','Semifinal','Final'];

/** Estados de solicitudes de cambio financiero */
export const CHANGE_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

/** Tipos de evento del calendario unificado */
export const CALENDAR_EVENT_TYPES = {
  PARTIDOS: 'partidos',
  CUMPLEANOS: 'cumpleanos',
  FICHA_MEDICA: 'ficha_medica',
  LESIONES: 'lesiones',
};

// Etiquetas de estado de jugador (players.status) distintos de 'activo'
export const PLAYER_STATUS_LABELS = {
  cedido: 'Cedido',
  transferido: 'Transferido',
  egresado: 'Egresado',
  'dado de baja': 'Baja',
};
