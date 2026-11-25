-- Parte de disponibilidad automático al grupo de Telegram (Edge Function parte-semanal).
--
-- Reusa los secretos de Vault de 20261124_cron_fichas_medicas.sql (project_url, cron_secret)
-- y los de Telegram de weekly-digest (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).
-- Antes de aplicarla:
--   supabase functions deploy parte-semanal --no-verify-jwt
-- No crea tablas.

-- Arranca prendido: se apaga desde Configuración → "Parte semanal por Telegram".
insert into public.app_settings (key, value)
values ('parte_semanal_enabled', 'true')
on conflict (key) do nothing;

-- Miércoles 15:59 UTC = 12:59 en Uruguay (UTC-3 todo el año, sin horario de verano).
select cron.unschedule('parte-semanal-telegram')
where exists (select 1 from cron.job where jobname = 'parte-semanal-telegram');

select cron.schedule(
  'parte-semanal-telegram',
  '59 15 * * 3',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/parte-semanal',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
