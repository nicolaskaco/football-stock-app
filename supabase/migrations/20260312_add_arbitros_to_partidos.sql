-- Add referee/officials fields to partidos table
-- Each partido (per category) now tracks Árbitro, Primer Línea, and Segundo Línea.

ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS arbitro text,
  ADD COLUMN IF NOT EXISTS primer_linea text,
  ADD COLUMN IF NOT EXISTS segundo_linea text;
