-- Fotos de jugadores: columna con la ruta del archivo + bucket PRIVADO en Storage.
--
-- Son fotos de menores: el bucket es privado y se leen con links firmados. Puede ver la foto
-- quien puede ver al jugador (la RLS de players decide), y subirla / cambiarla / borrarla quien
-- además es admin o tiene can_edit_players. El rol finanzas no ve ni toca nada.
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

-- 3. Policies de Storage.
-- Lectura (links firmados): el jugador de la carpeta tiene que ser visible para el usuario.
-- El subquery sobre players pasa por su RLS, así que respeta las categorías del usuario.
DROP POLICY IF EXISTS player_photos_select ON storage.objects;
CREATE POLICY player_photos_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'player-photos'
    AND NOT (SELECT public.current_user_is_finanzas())
    AND EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id::text = (storage.foldername(name))[1]
    )
  );

-- Escritura: además, admin o can_edit_players.
-- El subquery lee la fila propia de user_permissions (policy users_select_own).
DROP POLICY IF EXISTS player_photos_insert ON storage.objects;
CREATE POLICY player_photos_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'player-photos'
    AND NOT (SELECT public.current_user_is_finanzas())
    AND EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id::text = (storage.foldername(name))[1]
    )
    AND EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE email = auth.email() AND (role = 'admin' OR can_edit_players)
    )
  );

DROP POLICY IF EXISTS player_photos_update ON storage.objects;
CREATE POLICY player_photos_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'player-photos'
    AND NOT (SELECT public.current_user_is_finanzas())
    AND EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id::text = (storage.foldername(name))[1]
    )
    AND EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE email = auth.email() AND (role = 'admin' OR can_edit_players)
    )
  )
  WITH CHECK (
    bucket_id = 'player-photos'
    AND NOT (SELECT public.current_user_is_finanzas())
    AND EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id::text = (storage.foldername(name))[1]
    )
    AND EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE email = auth.email() AND (role = 'admin' OR can_edit_players)
    )
  );

DROP POLICY IF EXISTS player_photos_delete ON storage.objects;
CREATE POLICY player_photos_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'player-photos'
    AND NOT (SELECT public.current_user_is_finanzas())
    AND EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id::text = (storage.foldername(name))[1]
    )
    AND EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE email = auth.email() AND (role = 'admin' OR can_edit_players)
    )
  );

-- 4. Toggle en Configuración → "Fotos de jugadores". Arranca apagado.
INSERT INTO public.app_settings (key, value)
VALUES ('jugadores_fotos_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

COMMIT;
