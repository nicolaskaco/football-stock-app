// ============================================================
// Player-specific calculation utilities for the CAP internal app.
// Import from here instead of defining inline in components.
// ============================================================

/**
 * Returns the financial total for a player.
 * Players with a contract (contrato = true) have their viatico/complemento
 * replaced by a fixed contract — their total is treated as 0 for sum purposes.
 */
export function calculateTotal(player) {
  if (player.contrato) return 0;
  return (player.viatico || 0) + (player.complemento || 0);
}
