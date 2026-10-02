-- Cuenta para el cobro de viáticos (Prex / Mi Dinero).
-- Si el jugador no tiene cuenta propia, se paga a la cuenta de un padre, madre o tutor.
-- Las columnas bank / bank_account quedan como legacy: no se borran pero ya no se muestran en la UI.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS cuenta_titular_tipo text CHECK (cuenta_titular_tipo IN ('jugador', 'familiar')),
  ADD COLUMN IF NOT EXISTS cuenta_banco text CHECK (cuenta_banco IN ('Prex', 'Mi Dinero')),
  ADD COLUMN IF NOT EXISTS cuenta_numero text,
  ADD COLUMN IF NOT EXISTS cuenta_titular_nombre text,
  ADD COLUMN IF NOT EXISTS cuenta_titular_documento text;

COMMENT ON COLUMN players.bank IS 'LEGACY: reemplazado por cuenta_banco';
COMMENT ON COLUMN players.bank_account IS 'LEGACY: reemplazado por cuenta_numero';
