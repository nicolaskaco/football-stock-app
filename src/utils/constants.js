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

/** Bancos disponibles para cobro de viáticos */
export const BANCOS = ['Itau', 'Prex', 'Mi Dinero', 'BROU', 'Santander', 'Scotia', 'HSBC', 'Otro'];

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

/** Estados de solicitudes de cambio financiero */
export const CHANGE_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};
