-- Enable RLS on public.user_permissions
-- Fixes: policy_exists_rls_disabled, rls_disabled_in_public

BEGIN;

-- Drop existing unenforced policy (replacing with explicit per-operation policies)
DROP POLICY IF EXISTS admin_all ON public.user_permissions;

-- SECURITY DEFINER helper to check admin role without circular RLS recursion.
-- Runs as the function owner (postgres), bypassing RLS, so it can safely query
-- user_permissions without triggering the policies defined below.
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
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
      AND  role  = 'admin'
  );
$$;

-- Enable RLS (resolves both security advisor errors)
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read their own row (App.jsx login flow)
CREATE POLICY "users_select_own"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING ( email = auth.email() );

-- Admins can read all rows (UserManagementSection)
CREATE POLICY "admins_select_all"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING ( public.current_user_is_admin() );

-- Admins can update any row (database.js updateUserPermissions)
CREATE POLICY "admins_update"
  ON public.user_permissions
  FOR UPDATE
  TO authenticated
  USING  ( public.current_user_is_admin() )
  WITH CHECK ( public.current_user_is_admin() );

-- Admins can delete any row (database.js deleteUserPermissions)
CREATE POLICY "admins_delete"
  ON public.user_permissions
  FOR DELETE
  TO authenticated
  USING ( public.current_user_is_admin() );

-- No INSERT policy for authenticated: the invite-user Edge Function uses
-- service_role (adminClient), which bypasses RLS unconditionally.

COMMIT;
