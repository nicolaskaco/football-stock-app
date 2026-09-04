-- Add comment field for the player's Estado (status)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS status_comment text;
