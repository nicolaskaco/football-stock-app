-- Escudos de los rivales: columna con la ruta del archivo + bucket público en Storage

BEGIN;

-- 1. Ruta del escudo dentro del bucket (no la URL)
ALTER TABLE public.rivales ADD COLUMN IF NOT EXISTS badge_path text;

-- 2. Bucket público: los escudos no son datos sensibles y se sirven por URL pública
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rival-badges',
  'rival-badges',
  true,
  524288, -- 512 KB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Policies de Storage. La lectura pública va por la URL pública y no necesita
--    policy; el SELECT es para que el cliente pueda reemplazar y borrar archivos.
DROP POLICY IF EXISTS rival_badges_select ON storage.objects;
CREATE POLICY rival_badges_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'rival-badges');

-- Escritura: solo usuarios con can_edit_partidos (y nunca el rol finanzas).
-- El subquery lee la fila propia de user_permissions (policy users_select_own).
DROP POLICY IF EXISTS rival_badges_insert ON storage.objects;
CREATE POLICY rival_badges_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'rival-badges'
    AND NOT (SELECT public.current_user_is_finanzas())
    AND EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE email = auth.email() AND can_edit_partidos
    )
  );

DROP POLICY IF EXISTS rival_badges_update ON storage.objects;
CREATE POLICY rival_badges_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'rival-badges'
    AND NOT (SELECT public.current_user_is_finanzas())
    AND EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE email = auth.email() AND can_edit_partidos
    )
  )
  WITH CHECK (
    bucket_id = 'rival-badges'
    AND NOT (SELECT public.current_user_is_finanzas())
    AND EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE email = auth.email() AND can_edit_partidos
    )
  );

DROP POLICY IF EXISTS rival_badges_delete ON storage.objects;
CREATE POLICY rival_badges_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'rival-badges'
    AND NOT (SELECT public.current_user_is_finanzas())
    AND EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE email = auth.email() AND can_edit_partidos
    )
  );

COMMIT;
