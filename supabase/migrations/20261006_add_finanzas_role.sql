-- Rol 'finanzas': acceso de solo lectura a los datos financieros de los jugadores.
--
-- Los usuarios finanzas NO acceden a ninguna tabla directamente: una policy
-- RESTRICTIVE en cada tabla de public (excepto user_permissions, que necesitan
-- para leer su propia fila al loguearse, y activity_log, donde solo pueden
-- insertar) los bloquea. Solo ven datos a través
-- de dos funciones SECURITY DEFINER que devuelven las columnas permitidas.
--
-- IMPORTANTE: toda tabla nueva creada después de esta migración también debe
-- llevar la policy deny_finanzas (ver CLAUDE.md).

BEGIN;

-- 1. Agregar el rol al check constraint
ALTER TABLE public.user_permissions
  DROP CONSTRAINT IF EXISTS user_permissions_role_check;

ALTER TABLE public.user_permissions
  ADD CONSTRAINT user_permissions_role_check
  CHECK (role IN (
    'admin',
    'ejecutivo',
    'presidente',
    'presidente_categoria',
    'delegado',
    'comision',
    'coordinador',
    'finanzas'
  ));

-- 2. Helper, igual que current_user_is_admin()
CREATE OR REPLACE FUNCTION public.current_user_is_finanzas()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.user_permissions
    WHERE  email = auth.email()
      AND  role  = 'finanzas'
  );
$$;

-- 3. Policy restrictive en todas las tablas de public (se combina con AND con
--    las policies permisivas existentes, sin modificarlas).
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname, c.relrowsecurity
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public'
      AND  c.relkind IN ('r', 'p')
      AND  c.relname NOT IN ('user_permissions', 'activity_log')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS deny_finanzas ON public.%I', t.relname);
    EXECUTE format(
      'CREATE POLICY deny_finanzas ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (NOT (SELECT public.current_user_is_finanzas())) '
      'WITH CHECK (NOT (SELECT public.current_user_is_finanzas()))',
      t.relname
    );
    IF NOT t.relrowsecurity THEN
      RAISE WARNING 'public.% tiene RLS deshabilitado: la policy deny_finanzas no tiene efecto', t.relname;
    END IF;
  END LOOP;
END $$;

-- activity_log: finanzas puede INSERTAR (login, exportaciones) pero no leer ni modificar
DROP POLICY IF EXISTS deny_finanzas_select ON public.activity_log;
DROP POLICY IF EXISTS deny_finanzas_update ON public.activity_log;
DROP POLICY IF EXISTS deny_finanzas_delete ON public.activity_log;
CREATE POLICY deny_finanzas_select ON public.activity_log AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT (SELECT public.current_user_is_finanzas()));
CREATE POLICY deny_finanzas_update ON public.activity_log AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT (SELECT public.current_user_is_finanzas()));
CREATE POLICY deny_finanzas_delete ON public.activity_log AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT (SELECT public.current_user_is_finanzas()));

-- Las vistas de public corren con los permisos del dueño y saltean RLS: avisar.
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN SELECT viewname FROM pg_views WHERE schemaname = 'public' LOOP
    RAISE WARNING 'La vista public.% no está cubierta por deny_finanzas: revisar', v.viewname;
  END LOOP;
END $$;

-- 4. Documentos de jugadores en Storage
DROP POLICY IF EXISTS deny_finanzas_player_documents ON storage.objects;
CREATE POLICY deny_finanzas_player_documents
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (bucket_id <> 'player-documents' OR NOT (SELECT public.current_user_is_finanzas()))
  WITH CHECK (bucket_id <> 'player-documents' OR NOT (SELECT public.current_user_is_finanzas()));

-- 5. Jugadores activos con solo las columnas financieras permitidas
CREATE OR REPLACE FUNCTION public.get_players_finanzas()
  RETURNS json
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NOT (public.current_user_is_finanzas() OR public.current_user_is_admin()) THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT json_agg(p ORDER BY p.name)
    FROM (
      SELECT id, name, date_of_birth, tipo_documento, gov_id, categoria,
             viatico, complemento, contrato,
             complemento_override, complemento_override_expira,
             incluir_viatico_export,
             cuenta_titular_tipo, cuenta_titular_nombre, cuenta_titular_documento,
             cuenta_banco, cuenta_numero,
             comentario_viatico
      FROM   public.players
      WHERE  hide_player = false
        AND  (status IS NULL OR status = 'activo')
    ) p
  ), '[]'::json);
END;
$$;

-- 6. Historial de cambios financieros de un jugador (sin changed_by)
CREATE OR REPLACE FUNCTION public.get_player_history_finanzas(p_player_id public.players.id%TYPE)
  RETURNS json
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NOT (public.current_user_is_finanzas() OR public.current_user_is_admin()) THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT json_agg(h ORDER BY h.changed_at DESC)
    FROM (
      SELECT field_name, old_value, new_value, changed_at
      FROM   public.player_history
      WHERE  player_id = p_player_id
        AND  field_name IN ('viatico', 'complemento', 'contrato')
    ) h
  ), '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION public.get_players_finanzas FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_player_history_finanzas FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_players_finanzas TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_history_finanzas TO authenticated;

COMMIT;
