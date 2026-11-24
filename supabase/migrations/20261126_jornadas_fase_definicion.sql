-- Semifinal y Final definen el campeonato entre los ganadores del Apertura y el Clausura:
-- no pertenecen a ninguna fase y se guardan con fase null.
-- Un CHECK sobre fase deja pasar null, así que alcanza con quitar el NOT NULL (si lo tiene).
-- No crea tablas.

alter table public.jornadas alter column fase drop not null;
