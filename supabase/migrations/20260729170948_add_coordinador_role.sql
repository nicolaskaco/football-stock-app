-- Add 'coordinador' role (same access level as 'delegado')
alter table public.user_permissions
  drop constraint if exists user_permissions_role_check;

alter table public.user_permissions
  add constraint user_permissions_role_check
  check (role in (
    'admin',
    'ejecutivo',
    'presidente',
    'presidente_categoria',
    'delegado',
    'comision',
    'coordinador'
  ));
