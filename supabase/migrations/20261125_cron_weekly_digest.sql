-- Resumen semanal al grupo de Telegram (Edge Function weekly-digest).
--
-- Reusa los secretos de Vault de 20261124_cron_fichas_medicas.sql (project_url, cron_secret).
-- Antes de aplicarla:
--   supabase secrets set TELEGRAM_BOT_TOKEN=<token de @BotFather> TELEGRAM_CHAT_ID=<id del grupo>
--   supabase functions deploy weekly-digest --no-verify-jwt
--   supabase functions deploy send-telegram
-- No crea tablas.

-- Arranca apagado: se prende desde Configuración → "Resumen semanal por Telegram".
insert into public.app_settings (key, value)
values ('telegram_digest_enabled', 'false')
on conflict (key) do nothing;

-- Lunes 11:00 UTC = 08:00 en Uruguay.
select cron.unschedule('resumen-semanal-telegram')
where exists (select 1 from cron.job where jobname = 'resumen-semanal-telegram');

select cron.schedule(
  'resumen-semanal-telegram',
  '0 11 * * 1',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
