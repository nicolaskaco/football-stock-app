-- Add parent/guardian contact fields to players table
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS madre_nombre text,
  ADD COLUMN IF NOT EXISTS madre_telefono text,
  ADD COLUMN IF NOT EXISTS padre_nombre text,
  ADD COLUMN IF NOT EXISTS padre_telefono text;
