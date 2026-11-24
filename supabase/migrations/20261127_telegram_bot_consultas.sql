-- Bot de consultas por Telegram (Edge Function telegram-bot).
--
-- Cada usuario del dashboard vincula su cuenta de Telegram: la app genera un código de un
-- solo uso (10 minutos) y el usuario se lo manda al bot con /vincular <código>.
-- No crea tablas: agrega columnas a user_permissions y dos RPC, porque la RLS de
-- user_permissions solo deja actualizar a los admins.
--
-- Antes de usarlo:
--   supabase secrets set TELEGRAM_WEBHOOK_SECRET=<texto al azar>
--   supabase functions deploy telegram-bot --no-verify-jwt
--   y registrar el webhook (ver el encabezado de supabase/functions/telegram-bot/index.ts).

alter table public.user_permissions
  add column if not exists telegram_user_id bigint unique,
  add column if not exists telegram_link_code text unique,
  add column if not exists telegram_link_expira timestamptz;

comment on column public.user_permissions.telegram_user_id is 'ID de Telegram vinculado (bot de consultas). Solo lo escriben el bot y desvincular_telegram()';
comment on column public.user_permissions.telegram_link_code is 'SHA-256 (hex) del código de vinculación de un solo uso (generar_codigo_telegram). Se guarda el hash para que un admin que lee user_permissions no pueda usar el código de otro';

-- Genera (o reemplaza) el código de vinculación del usuario logueado: 8 caracteres hex.
-- Devuelve el código en claro y guarda solo su hash (el bot hashea lo que recibe y compara).
create or replace function public.generar_codigo_telegram()
  returns text
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_codigo text;
begin
  if auth.email() is null then
    raise exception 'Sin sesión';
  end if;
  if public.current_user_is_finanzas() then
    raise exception 'Tu rol no puede usar el bot de Telegram';
  end if;

  v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  update public.user_permissions
     set telegram_link_code = encode(sha256(convert_to(v_codigo, 'UTF8')), 'hex'),
         telegram_link_expira = now() + interval '10 minutes'
   where email = auth.email();
  if not found then
    raise exception 'Usuario sin permisos';
  end if;
  return v_codigo;
end;
$$;

-- Desvincula el Telegram del usuario logueado (y descarta un código pendiente).
create or replace function public.desvincular_telegram()
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if auth.email() is null then
    raise exception 'Sin sesión';
  end if;
  update public.user_permissions
     set telegram_user_id = null,
         telegram_link_code = null,
         telegram_link_expira = null
   where email = auth.email();
end;
$$;

revoke all on function public.generar_codigo_telegram() from public, anon;
revoke all on function public.desvincular_telegram() from public, anon;
grant execute on function public.generar_codigo_telegram() to authenticated;
grant execute on function public.desvincular_telegram() to authenticated;
