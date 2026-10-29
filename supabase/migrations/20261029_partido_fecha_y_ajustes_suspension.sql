-- Partidos reprogramados + ajustes manuales de suspensión.
--  - partidos.fecha: día en que se jugó (o se juega) cada partido. Por defecto sale de la
--    jornada: 4ta un día antes (viernes), el resto el mismo día. Se puede editar a mano
--    (partido postergado o adelantado). Las suspensiones se ordenan por esta fecha.
--  - partido_suspension_ajustes: override manual de un admin sobre la suspensión automática
--    de un jugador en un partido ('quitar' = habilitado, 'agregar' = suspendido).

-- 1. Fecha por partido + backfill retroactivo para todas las jornadas existentes
ALTER TABLE public.partidos
  ADD COLUMN IF NOT EXISTS fecha date;

UPDATE public.partidos p
   SET fecha = (j.fecha::date - CASE WHEN p.categoria = '4ta' THEN 1 ELSE 0 END)
  FROM public.jornadas j
 WHERE p.jornada_id = j.id
   AND p.fecha IS NULL;

-- 2. Ajustes manuales de suspensión
CREATE TABLE IF NOT EXISTS public.partido_suspension_ajustes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id uuid NOT NULL REFERENCES public.partidos(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  accion text NOT NULL CHECK (accion IN ('quitar', 'agregar')),
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partido_id, player_id)
);

-- Required: grant Data API access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partido_suspension_ajustes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partido_suspension_ajustes TO service_role;

ALTER TABLE public.partido_suspension_ajustes ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado (se necesita para calcular suspensiones).
DROP POLICY IF EXISTS partido_suspension_ajustes_select ON public.partido_suspension_ajustes;
CREATE POLICY partido_suspension_ajustes_select
  ON public.partido_suspension_ajustes
  FOR SELECT
  TO authenticated
  USING (true);

-- Escritura: solo admins.
DROP POLICY IF EXISTS partido_suspension_ajustes_admin_write ON public.partido_suspension_ajustes;
CREATE POLICY partido_suspension_ajustes_admin_write
  ON public.partido_suspension_ajustes
  FOR ALL
  TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

-- Rol finanzas bloqueado (ver SPEC.md, "Rol finanzas")
DROP POLICY IF EXISTS deny_finanzas ON public.partido_suspension_ajustes;
CREATE POLICY deny_finanzas ON public.partido_suspension_ajustes AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT (SELECT public.current_user_is_finanzas()))
  WITH CHECK (NOT (SELECT public.current_user_is_finanzas()));
