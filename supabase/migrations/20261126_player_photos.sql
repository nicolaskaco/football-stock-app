-- Fotos de jugadores: columna con la ruta del archivo + bucket PRIVADO en Storage.
--
-- Son fotos de menores: el bucket es privado y se leen con links firmados.
--  - Ver la foto: quien puede ver al jugador (la RLS de players decide). Nunca finanzas.
--  - Subirla / cambiarla / borrarla: admin, o can_edit_players con el jugador en sus categorías
--    (no alcanza con verlo en una planilla de partido). Nunca finanzas.
-- Ruta de cada archivo: <player_id>/<timestamp>.webp
--
-- No crea tablas (players ya tiene grants, RLS y deny_finanzas).

BEGIN;

-- 1. Ruta de la foto dentro del bucket (no la URL)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS foto_path text;

-- 2. Bucket privado. La app comprime a WebP 400x400 (~40 KB); el límite es por si acaso.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-photos',
  'player-photos',
  false,
  1048576, -- 1 MB
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- 3. ¿El usuario actual puede cambiar la foto de este jugador?
-- SECURITY DEFINER: lee players y user_permissions sin depender de sus policies de SELECT
-- (que dejan ver jugadores de otras categorías si figuran en una planilla).
CREATE OR REPLACE FUNCTION public.puede_editar_foto_jugador(p_player_id text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.user_permissions u
    JOIN   public.players p ON p.id::text = p_player_id
    WHERE  u.email = auth.email()
      AND  coalesce(u.role, '') <> 'finanzas'
      AND  (
             u.role = 'admin'
             OR (
               u.can_edit_players
               AND (u.categoria IS NULL OR u.categoria = '{}' OR p.categoria = ANY (u.categoria))
             )
           )
  );
$$;

REVOKE ALL ON FUNCTION public.puede_editar_foto_jugador(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.puede_editar_foto_jugador(text) TO authenticated;

-- 4. Policies de Storage.
-- Ojo: dentro del subquery sobre players, `name` sería players.name; por eso objects.name.
DROP POLICY IF EXISTS player_photos_select ON storage.objects;
CREATE POLICY player_photos_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'player-photos'
    AND NOT (SELECT public.current_user_is_finanzas())
    -- El subquery pasa por la RLS de players: mismo acceso que al jugador
    AND EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id::text = (storage.foldername(objects.name))[1]
    )
  );

DROP POLICY IF EXISTS player_photos_insert ON storage.objects;
CREATE POLICY player_photos_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'player-photos'
    AND public.puede_editar_foto_jugador((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS player_photos_update ON storage.objects;
CREATE POLICY player_photos_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'player-photos'
    AND public.puede_editar_foto_jugador((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'player-photos'
    AND public.puede_editar_foto_jugador((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS player_photos_delete ON storage.objects;
CREATE POLICY player_photos_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'player-photos'
    AND public.puede_editar_foto_jugador((storage.foldername(name))[1])
  );

-- 5. Toggle en Configuración → "Fotos de jugadores". Arranca apagado.
INSERT INTO public.app_settings (key, value)
VALUES ('jugadores_fotos_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

COMMIT;
