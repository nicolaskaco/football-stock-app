#!/usr/bin/env node
// Configura el bot de consultas de Telegram (Edge Function telegram-bot):
// webhook, menú de comandos y chequeos. Se puede correr las veces que haga falta.
//
//   npm run telegram:setup                     todo: webhook + menú + chequeos
//   npm run telegram:setup -- --estado         solo muestra cómo está (no cambia nada)
//   npm run telegram:setup -- --solo-comandos  solo actualiza el menú de comandos
//   npm run telegram:setup -- --nuevo-secreto  genera otro secreto, lo carga en Supabase y registra el webhook
//   npm run telegram:setup -- --apagar         borra el webhook (el bot deja de responder)
//
// TELEGRAM_CHAT_ID (opcional, el id del grupo): limita el menú de comandos de grupo a ese grupo.
// Datos: TELEGRAM_BOT_TOKEN y TELEGRAM_WEBHOOK_SECRET de las variables de entorno o, si no
// están, se piden por teclado (sin mostrarlos). El proyecto sale de supabase/.temp/project-ref.
// No guarda nada en disco.

import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`✗ Necesitás Node 22.18 o más nuevo (tenés ${process.versions.node}): el script lee los comandos de logica.ts.`);
  process.exit(1);
}
const { COMANDOS } = await import('../supabase/functions/telegram-bot/logica.ts');

const OPCIONES = ['--estado', '--solo-comandos', '--nuevo-secreto', '--apagar'];
const args = new Set(process.argv.slice(2));
const desconocidas = [...args].filter((a) => !OPCIONES.includes(a));
if (desconocidas.length) {
  console.error(`✗ Opción desconocida: ${desconocidas.join(' ')}. Opciones: ${OPCIONES.join(', ')}.`);
  process.exit(1);
}
const modos = ['--estado', '--solo-comandos', '--apagar'].filter((a) => args.has(a));
if (modos.length > 1 || (modos.length === 1 && args.has('--nuevo-secreto'))) {
  console.error(`✗ Elegí una sola opción entre --estado, --solo-comandos, --apagar y --nuevo-secreto.`);
  process.exit(1);
}
const modo = args.has('--estado') ? 'estado'
  : args.has('--solo-comandos') ? 'comandos'
  : args.has('--apagar') ? 'apagar'
  : 'todo';
const nuevoSecreto = args.has('--nuevo-secreto');

// ── Entrada ─────────────────────────────────────────────────────────

function preguntar(texto, { oculto = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let respondida = false;
    // Ctrl+C o fin de la entrada: salir con un mensaje en lugar de dejar la promesa colgada
    rl.on('close', () => {
      if (!respondida) {
        process.stdout.write('\n');
        console.error('✗ Cancelado.');
        process.exit(1);
      }
    });
    if (oculto) {
      rl._writeToOutput = (s) => {
        if (s.startsWith(texto)) rl.output.write(texto);
      };
    }
    rl.question(texto, (respuesta) => {
      respondida = true;
      rl.close();
      if (oculto) process.stdout.write('\n');
      resolve(respuesta.trim());
    });
  });
}

const leerRef = () => {
  try {
    return readFileSync(new URL('../supabase/.temp/project-ref', import.meta.url), 'utf8').trim();
  } catch {
    return '';
  }
};

const token = process.env.TELEGRAM_BOT_TOKEN || await preguntar('Token del bot (el de @BotFather): ', { oculto: true });
if (!token) salir('Falta el token del bot.');
const tapar = (s) => String(s).split(token).join('<TOKEN>');

// ── Telegram ────────────────────────────────────────────────────────

let avisoSiFalla = ''; // se agrega a cualquier error de Telegram (p. ej. secreto ya cambiado)

async function telegram(metodo, body) {
  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  } catch (err) {
    salir(`${metodo}: no se pudo conectar con Telegram (${tapar(err.message)}).`);
  }
  const data = await res.json().catch(() => ({}));
  if (!data.ok) salir(`${metodo}: ${tapar(data.description || `HTTP ${res.status}`)}`);
  return data.result;
}

function salir(mensaje) {
  console.error(`✗ ${mensaje}${avisoSiFalla}`);
  process.exit(1);
}
const ok = (mensaje) => console.log(`✓ ${mensaje}`);

// ── Pasos ───────────────────────────────────────────────────────────

async function mostrarBot() {
  const bot = await telegram('getMe');
  ok(`Bot: @${bot.username} (${bot.first_name})`);
  console.log(`  En Vercel: VITE_TELEGRAM_BOT_USERNAME=${bot.username} (y redeploy) para el link directo de vinculación.`);
  return bot;
}

/** El bot usa TELEGRAM_BOT_USERNAME para ignorar en el grupo los comandos dirigidos a otros bots. */
function cargarUsuarioBot(ref, usuario) {
  try {
    execFileSync('supabase', ['secrets', 'set', `TELEGRAM_BOT_USERNAME=${usuario}`, '--project-ref', ref], { stdio: ['ignore', 'ignore', 'pipe'] });
    ok(`Supabase: TELEGRAM_BOT_USERNAME=${usuario}.`);
  } catch (err) {
    console.log(`✗ No se pudo cargar TELEGRAM_BOT_USERNAME en Supabase (${err.stderr?.toString().trim() || err.message}). El bot funciona igual, pero en el grupo también contesta "/comando@otrobot".`);
  }
}

async function mostrarWebhook(urlEsperada) {
  const info = await telegram('getWebhookInfo');
  if (!info.url) {
    console.log('• Webhook: no registrado (el bot no responde consultas).');
    return;
  }
  const marca = urlEsperada && info.url !== urlEsperada ? '✗' : '✓';
  console.log(`${marca} Webhook: ${info.url}`);
  if (urlEsperada && info.url !== urlEsperada) console.log(`  Se esperaba ${urlEsperada}`);
  console.log(`  Mensajes pendientes: ${info.pending_update_count ?? 0}`);
  if (info.last_error_message) {
    const cuando = info.last_error_date ? new Date(info.last_error_date * 1000).toLocaleString('es-UY') : '';
    console.log(`  Último error (${cuando}): ${info.last_error_message}`);
  }
}

async function registrarComandos() {
  const nombres = Object.keys(COMANDOS);
  const ordenados = ['ayuda', ...nombres.filter((c) => c !== 'ayuda')];
  const commands = ordenados.map((c) => ({ command: c, description: COMANDOS[c].descripcion.slice(0, 256) }));
  await telegram('setMyCommands', { scope: { type: 'all_private_chats' }, commands });
  // En grupos el bot solo contesta en el del club: si se conoce su id, el menú va solo ahí
  const grupo = process.env.TELEGRAM_CHAT_ID;
  await telegram('setMyCommands', { scope: grupo ? { type: 'chat', chat_id: grupo } : { type: 'all_group_chats' }, commands });
  ok(`Menú de comandos: ${commands.length} comandos (en privado y ${grupo ? 'en el grupo del club' : 'en grupos'}).`);
}

async function probarFuncion(url) {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const texto = (await res.text()).trim();
    if (res.status === 401 && texto === 'No autorizado') ok('La función responde y rechaza pedidos sin el secreto.');
    else if (res.status === 401) console.log(`✗ La función pide JWT: volvé a desplegarla con "supabase functions deploy telegram-bot --no-verify-jwt".`);
    else if (res.status === 404) console.log('✗ La función telegram-bot no está desplegada: "supabase functions deploy telegram-bot --no-verify-jwt".');
    else console.log(`✗ Respuesta inesperada de la función: HTTP ${res.status} ${texto.slice(0, 100)}`);
  } catch (err) {
    console.log(`✗ No se pudo llamar a la función: ${err.message}`);
  }
}

/** Genera un secreto, lo carga en el proyecto `ref` con la CLI de Supabase y lo devuelve. */
function cargarSecretoNuevo(ref) {
  const secreto = randomBytes(32).toString('hex');
  try {
    execFileSync('supabase', ['secrets', 'set', `TELEGRAM_WEBHOOK_SECRET=${secreto}`, '--project-ref', ref], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (err) {
    const detalle = (err.stderr?.toString().trim() || err.message).split(secreto).join('<SECRETO>');
    salir(`No se pudo cargar el secreto en Supabase: ${detalle}`);
  }
  ok('Secreto nuevo generado y cargado en Supabase (TELEGRAM_WEBHOOK_SECRET).');
  return secreto;
}

/** { secreto, nuevo }: el de la variable de entorno, el que se escribe, o uno nuevo (--nuevo-secreto o Enter vacío). */
async function obtenerSecreto(ref) {
  if (nuevoSecreto) return { secreto: cargarSecretoNuevo(ref), nuevo: true };
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET
    || await preguntar('Secreto del webhook (TELEGRAM_WEBHOOK_SECRET; Enter vacío = generar uno nuevo): ', { oculto: true });
  return secreto ? { secreto, nuevo: false } : { secreto: cargarSecretoNuevo(ref), nuevo: true };
}

// ── Main ────────────────────────────────────────────────────────────

const bot = await mostrarBot();

if (modo === 'apagar') {
  await telegram('deleteWebhook');
  ok('Webhook borrado: el bot ya no responde consultas (el parte y el resumen siguen funcionando).');
  process.exit(0);
}

if (modo === 'comandos') {
  await registrarComandos();
  process.exit(0);
}

const ref = leerRef() || await preguntar('ID del proyecto de Supabase (el de la URL del dashboard): ');
if (!/^[a-z0-9]{10,40}$/.test(ref)) salir(`ID de proyecto inválido: "${ref}".`);
const url = `https://${ref}.supabase.co/functions/v1/telegram-bot`;

if (modo === 'todo') {
  const { secreto, nuevo } = await obtenerSecreto(ref);
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secreto)) salir('El secreto solo puede tener letras, números, "_" y "-" (lo exige Telegram).');
  if (nuevo) avisoSiFalla = '\n  ⚠️ El secreto en Supabase ya cambió: hasta que el webhook se registre con el nuevo, el bot no responde. Volvé a correr "npm run telegram:setup -- --nuevo-secreto".';
  await telegram('setWebhook', { url, secret_token: secreto, allowed_updates: ['message'] });
  avisoSiFalla = '';
  ok(`Webhook registrado${nuevo ? ' con el secreto nuevo' : ''}.`);
  cargarUsuarioBot(ref, bot.username);
  await registrarComandos();
}

await mostrarWebhook(url);
await probarFuncion(url);
