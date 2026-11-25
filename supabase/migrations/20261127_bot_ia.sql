-- Bot de Telegram: /pregunta con IA (Claude Haiku traduce la pregunta a un filtro de jugadores).
--
-- Antes de prenderlo:
--   supabase secrets set ANTHROPIC_API_KEY=<clave de platform.claude.com>
--   supabase functions deploy telegram-bot --no-verify-jwt
--   npm run telegram:setup -- --solo-comandos   (agrega /pregunta al menú)
-- No crea tablas. Cada pregunta queda en activity_log (telegram_pregunta), que también sirve
-- para contar el tope diario por usuario.

-- Arranca apagado: se prende desde Configuración → "Preguntas con IA en el bot".
insert into public.app_settings (key, value)
values ('bot_ia_enabled', 'false'), ('bot_ia_limite_diario', '30')
on conflict (key) do nothing;
