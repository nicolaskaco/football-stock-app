-- El historial del rol finanzas incluye los cambios de la cuenta de cobro de viáticos.
BEGIN;

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
        AND  field_name IN (
               'viatico', 'complemento', 'contrato',
               'cuenta_titular_tipo', 'cuenta_titular_nombre', 'cuenta_titular_documento',
               'cuenta_banco', 'cuenta_numero'
             )
    ) h
  ), '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_history_finanzas FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_player_history_finanzas TO authenticated;

COMMIT;
