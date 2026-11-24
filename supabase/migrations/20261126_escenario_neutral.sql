-- Escenario Neutral para partidos (semifinales y finales en cancha neutral).
-- El CHECK original solo aceptaba 'Local' y 'Visitante'.
-- No crea tablas.

alter table public.partidos drop constraint if exists partidos_escenario_check;

alter table public.partidos
  add constraint partidos_escenario_check
  check (escenario = any (array['Local'::text, 'Visitante'::text, 'Neutral'::text]));
