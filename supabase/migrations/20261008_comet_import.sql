-- Importar planillas COMET (AUF) en los partidos.
--  - players.comet_id: ID del jugador en COMET, se aprende al confirmar un import.
--  - partido_players.minuto_entrada / minuto_salida: cambios del partido.
--  - partidos.duracion: minutos reglamentarios; null = el partido no tiene minutos cargados
--    y no cuenta para "minutos jugados".
-- No crea tablas nuevas: las columnas heredan grants y RLS existentes
-- (get_players_finanzas lista columnas explícitas, así que no expone comet_id).

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS comet_id text;

CREATE UNIQUE INDEX IF NOT EXISTS players_comet_id_key
  ON public.players (comet_id)
  WHERE comet_id IS NOT NULL;

ALTER TABLE public.partido_players
  ADD COLUMN IF NOT EXISTS minuto_entrada smallint,
  ADD COLUMN IF NOT EXISTS minuto_salida smallint;

ALTER TABLE public.partidos
  ADD COLUMN IF NOT EXISTS duracion smallint;
