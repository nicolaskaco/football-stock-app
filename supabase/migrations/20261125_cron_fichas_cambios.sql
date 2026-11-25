-- Aviso diario al grupo de Telegram con las fichas médicas que cambió el chequeo de SND
-- (Edge Function fichas-cambios).
--
-- Reusa los secretos de Vault de 20261124_cron_fichas_medicas.sql (project_url, cron_secret)
-- y los de Telegram de weekly-digest (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).
-- Antes de aplicarla:
--   supabase functions deploy fichas-cambios --no-verify-jwt
-- No crea tablas.

-- Arranca prendido: se apaga desde Configuración → "Cambios de fichas médicas por Telegram".
insert into public.app_settings (key, value)
values ('telegram_fichas_cambios_enabled', 'true')
on conflict (key) do nothing;

-- Todos los días 09:00 UTC = 06:00 en Uruguay, después de las tandas de fichas-snd (03:00–05:40).
select cron.unschedule('fichas-cambios-telegram')
where exists (select 1 from cron.job where jobname = 'fichas-cambios-telegram');

select cron.schedule(
  'fichas-cambios-telegram',
  '0 9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/fichas-cambios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
