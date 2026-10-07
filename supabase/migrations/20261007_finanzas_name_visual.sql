-- Agrega name_visual a get_players_finanzas para que la pestaña Finanzas
-- muestre el Nombre Visual del jugador (con fallback al nombre completo).
-- Mismo cuerpo que en 20261006_add_finanzas_role.sql, solo se suma la columna.

BEGIN;

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
      SELECT id, name, name_visual, date_of_birth, tipo_documento, gov_id, categoria,
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

REVOKE ALL ON FUNCTION public.get_players_finanzas FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_players_finanzas TO authenticated;

COMMIT;
