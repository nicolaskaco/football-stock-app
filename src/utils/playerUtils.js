// ============================================================
// Player-specific calculation utilities for the CAP internal app.
// Import from here instead of defining inline in components.
// ============================================================

/**
 * Returns the financial total for a player.
 * Players with a contract (contrato = true) have their viatico/complemento
 * replaced by a fixed contract — their total is treated as 0 for sum purposes.
 * If a temporary complemento override is active (not expired), it's used instead
 * of the base complemento value.
 */
export function calculateTotal(player) {
  if (player.contrato) return 0;
  const { valor: complementoEfectivo } = getComplementoEfectivo(player);
  return (player.viatico || 0) + complementoEfectivo;
}

/**
 * Returns the effective complemento value for a player, considering overrides.
 * @returns {{ valor: number, activo: boolean }}
 *   - valor: the complemento to use (override if active, else base)
 *   - activo: true if a temporary override is currently in effect
 */
export function getComplementoEfectivo(player) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const usoOverride =
    player.complemento_override != null &&
    player.complemento_override_expira != null &&
    new Date(player.complemento_override_expira + 'T00:00:00') >= hoy;
  return {
    valor: usoOverride ? player.complemento_override : (player.complemento || 0),
    activo: usoOverride,
  };
}

/** Columnas de exportación de la cuenta de cobro de viáticos (reemplazan a bank / bank_account) */
export const CUENTA_EXPORT_LABELS = {
  cuenta_titular: 'Titular Cuenta',
  cuenta_titular_documento: 'Documento Titular',
  cuenta_banco: 'Banco',
  cuenta_numero: 'Número de Cuenta',
};

/** Valor de una columna de cuenta para exportar; para cuenta propia el titular es el jugador. */
export function getCuentaExportValue(player, field) {
  const esFamiliar = player.cuenta_titular_tipo === 'familiar';
  switch (field) {
    case 'cuenta_titular':
      if (esFamiliar) return player.cuenta_titular_nombre || '';
      return player.cuenta_titular_tipo === 'jugador' ? player.name : '';
    case 'cuenta_titular_documento':
      if (esFamiliar) return player.cuenta_titular_documento || '';
      return player.cuenta_titular_tipo === 'jugador' ? player.gov_id : '';
    case 'cuenta_banco':
      return player.cuenta_banco || '';
    case 'cuenta_numero':
      return player.cuenta_numero || '';
    default:
      return '';
  }
}
