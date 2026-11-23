-- Chequeo automático de fichas médicas contra SND (Edge Function refresh-fichas-medicas).
--
-- Antes de aplicar esta migración, crear en Vault los dos secretos que usa el cron
-- (SQL Editor; los valores reales NO van al repo):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<un secreto largo al azar>', 'cron_secret');
-- y cargar el mismo secreto en la función:
--   supabase secrets set CRON_SECRET=<el mismo secreto>
--   supabase functions deploy refresh-fichas-medicas --no-verify-jwt

-- Cuándo se consultó SND por última vez para el jugador (lo escribe solo la Edge Function).
-- No crea tablas: players ya tiene grants, RLS y la política deny_finanzas.
alter table public.players
  add column if not exists ficha_medica_chequeada_at timestamptz;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- pg_cron usa UTC: 06:00–08:40 UTC = 03:00–05:40 en Uruguay. Cada corrida procesa una tanda
-- de hasta 40 jugadores, así que 9 corridas alcanzan para todo el plantel.
select cron.unschedule('fichas-snd') where exists (select 1 from cron.job where jobname = 'fichas-snd');

select cron.schedule(
  'fichas-snd',
  '*/20 6-8 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/refresh-fichas-medicas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
