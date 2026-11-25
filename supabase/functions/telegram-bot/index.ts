// Bot de consultas por Telegram: webhook que recibe los mensajes al bot del club (privados y del grupo)
// y responde con datos de la app (ver comandos.ts y SPEC.md → Telegram).
//
// Seguridad:
//  - Telegram manda el header X-Telegram-Bot-Api-Secret-Token con el secreto registrado en
//    setWebhook; sin él la función no hace nada. Se despliega con --no-verify-jwt.
//  - Responde en chats privados y en el grupo del club (TELEGRAM_CHAT_ID, el mismo de
//    send-telegram); cualquier otro grupo se ignora. En el grupo solo atiende comandos para
//    este bot (TELEGRAM_BOT_USERNAME, opcional), responde citando el mensaje y la respuesta
//    la ve todo el grupo. /vincular nunca se acepta en el grupo.
//  - Solo a usuarios vinculados: user_permissions.telegram_user_id = id de Telegram de quien
//    escribe. Se vinculan con /vincular <código> (el código lo genera la app, 10 minutos).
//  - Cliente service-role: los permisos (flags, rol, categorías) se aplican en comandos.ts.
//    El rol finanzas no puede usar el bot.
//
// Siempre responde 200 a Telegram (si no, reintenta el mismo mensaje).
//
// Setup:
//   supabase functions deploy telegram-bot --no-verify-jwt
//   npm run telegram:setup -- --nuevo-secreto   (secreto en Supabase + webhook + menú de comandos)
// Después, al agregar comandos: npm run telegram:setup -- --solo-comandos

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { escapeHTML as e, sendTelegram, sendTelegramPhoto } from "../_shared/telegram.ts";
import {
  ALIAS, COMANDOS, comandoDesdeRespuesta, esParaEsteBot, parseCodigo, parseMensaje, PIDE_DATO, planFoto, textoPideDato, type Permisos,
} from "./logica.ts";
import { ayuda, EJECUTORES, type Respuesta } from "./comandos.ts";

const COLUMNAS_PERMISOS = "email, role, categoria, can_access_players, can_view_partidos, can_access_widgets, can_access_tareas, can_access_viatico";

const ok = () => new Response("ok");
const hoyUY = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date());

async function registrar(db: SupabaseClient, accion: string, email: string, details: Record<string, unknown>) {
  const { error } = await db.from("activity_log").insert([{ action_type: accion, performed_by: email, target_type: "telegram", details }]);
  if (error) console.error("activity_log:", error.message);
}

/** SHA-256 en hex, igual que encode(sha256(...), 'hex') en generar_codigo_telegram(). */
async function sha256Hex(texto: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** /vincular <código>: asocia este usuario de Telegram a la cuenta de la app que generó el código. */
async function vincular(db: SupabaseClient, telegramId: number, codigoTexto: string | undefined) {
  const codigo = parseCodigo(codigoTexto);
  if (!codigo) {
    return "Mandame el código que te da la app (botón de Telegram, arriba a la derecha): <code>/vincular ABCD1234</code>";
  }
  const { data: fila, error } = await db.from("user_permissions")
    .select("email, role")
    .eq("telegram_link_code", await sha256Hex(codigo))
    .gt("telegram_link_expira", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!fila) return "Código inválido o vencido: generá otro en la app.";
  if (fila.role === "finanzas") return "Tu rol no puede usar el bot.";

  // Un usuario de Telegram queda vinculado a una sola cuenta: se suelta de la anterior
  const suelta = await db.from("user_permissions").update({ telegram_user_id: null })
    .eq("telegram_user_id", telegramId).neq("email", fila.email);
  if (suelta.error) throw new Error(suelta.error.message);
  const { error: errUpd } = await db.from("user_permissions")
    .update({ telegram_user_id: telegramId, telegram_link_code: null, telegram_link_expira: null })
    .eq("email", fila.email);
  if (errUpd) throw new Error(errUpd.message);

  await registrar(db, "telegram_vinculo", fila.email, { vinculado: true });
  return `✅ Listo, quedaste vinculado como <b>${e(fila.email)}</b>.\nMandá /ayuda para ver qué podés consultar.`;
}

/**
 * Manda la respuesta de un comando. Con fotos (/jugador y /ficha): un mensaje por jugador, foto con
 * sus datos de pie; si la foto no se puede bajar o mandar, ese bloque va como texto.
 * Devuelve cuántas fotos se mandaron.
 */
async function enviarRespuesta(
  db: SupabaseClient,
  respuesta: Respuesta,
  responder: (html: string) => Promise<void>,
  mandarFoto: (foto: Blob, caption: string) => Promise<void>,
): Promise<number> {
  if (typeof respuesta === "string") {
    await responder(respuesta);
    return 0;
  }
  let enviadas = 0;
  for (const { html, foto } of respuesta.mensajes) {
    if (foto) {
      const { caption, textoAparte } = planFoto(html);
      let salio = false;
      try {
        const { data, error } = await db.storage.from("player-photos").download(foto);
        if (error || !data) throw error ?? new Error("Foto vacía");
        await mandarFoto(data, caption);
        salio = true;
      } catch (err) {
        console.error("telegram-bot (foto):", err);
      }
      if (salio) {
        enviadas++;
        // Fuera del try: si falla este texto, no se reintenta como si hubiera fallado la foto
        if (textoAparte) await responder(textoAparte);
        continue;
      }
    }
    await responder(html);
  }
  return enviadas;
}

serve(async (req) => {
  const secreto = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (!secreto || req.headers.get("x-telegram-bot-api-secret-token") !== secreto) {
    return new Response("No autorizado", { status: 401 });
  }

  // deno-lint-ignore no-explicit-any
  let update: any;
  try {
    update = await req.json();
  } catch {
    return ok();
  }
  const msg = update?.message;
  if (!msg?.text || !msg.from?.id) return ok();

  // Chats privados, o el grupo del club (el mismo de send-telegram). Cualquier otro grupo se ignora.
  const tipo = msg.chat?.type;
  const enGrupo = (tipo === "group" || tipo === "supergroup") && String(msg.chat.id) === Deno.env.get("TELEGRAM_CHAT_ID");
  if (tipo !== "private" && !enGrupo) return ok();

  const chatId: number = msg.chat.id;
  const telegramId: number = msg.from.id;
  // Respuesta a un pedido de dato del bot ("✍️ /pregunta: ¿Qué querés saber?"): se arma el comando completo
  const idBot = Number((Deno.env.get("TELEGRAM_BOT_TOKEN") || "").split(":")[0]);
  const respondeAlBot = !!idBot && msg.reply_to_message?.from?.id === idBot;
  const texto = (respondeAlBot && comandoDesdeRespuesta(msg.reply_to_message?.text, msg.text)) || msg.text;
  const { comando, destinatario, args, resto } = parseMensaje(texto);
  // En el grupo solo se atienden comandos de este bot: la charla, "/cmd@otrobot" y comandos
  // que no conoce (de otros bots) se ignoran sin contestar
  const nombre = comando ? (ALIAS[comando] ?? comando) : null;
  if (enGrupo) {
    if (!comando || !esParaEsteBot(destinatario, Deno.env.get("TELEGRAM_BOT_USERNAME"))) return ok();
    if (!COMANDOS[nombre!] && comando !== "vincular" && comando !== "start") return ok();
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const responder = (html: string) => sendTelegram(html, chatId, enGrupo ? { responderA: msg.message_id } : {});

  try {
    // /start <código> es el deep link t.me/<bot>?start=<código>
    if (comando === "vincular" || (comando === "start" && args.length > 0)) {
      if (enGrupo) {
        // El código quedó a la vista de todo el grupo: se anula para que nadie más lo use
        const codigo = parseCodigo(args[0]);
        if (codigo) {
          const { error } = await db.from("user_permissions")
            .update({ telegram_link_code: null, telegram_link_expira: null })
            .eq("telegram_link_code", await sha256Hex(codigo));
          if (error) throw new Error(error.message);
        }
        await responder(`🔒 El código va por privado: escribime directamente (tocá mi nombre → Enviar mensaje).${codigo ? " Ese código quedó anulado: generá otro en la app." : ""}`);
        return ok();
      }
      await responder(await vincular(db, telegramId, args[0]));
      return ok();
    }

    const { data: perm, error } = await db.from("user_permissions").select(COLUMNAS_PERMISOS)
      .eq("telegram_user_id", telegramId).maybeSingle<Permisos>();
    if (error) throw new Error(error.message);
    if (!perm) {
      if (enGrupo) {
        await responder("Para usar el bot, vinculá tu cuenta: en la app tocá el avioncito de Telegram y seguí los pasos (es por privado).");
        return ok();
      }
      await responder("Hola 👋 Todavía no estás vinculado.\nEn la app tocá el botón de Telegram (arriba a la derecha), generá un código y mandámelo así: <code>/vincular ABCD1234</code>");
      return ok();
    }
    if (perm.role === "finanzas") {
      await responder("Tu rol no puede usar el bot.");
      return ok();
    }

    if (!nombre || !COMANDOS[nombre]) {
      await responder(enGrupo ? "No conozco ese comando. Mandá /ayuda para ver la lista." : `No entendí ese pedido.\n\n${ayuda({ perm })}`);
      return ok();
    }
    if (!COMANDOS[nombre].permiso(perm)) {
      await responder(`No tenés permiso para /${e(nombre)}. Mandá /ayuda para ver lo que podés consultar.`);
      return ok();
    }

    // Sin el dato que necesita: se pide, y la respuesta vuelve como el comando completo
    if (PIDE_DATO[nombre] && !resto) {
      await sendTelegram(textoPideDato(nombre), chatId, {
        ...(enGrupo ? { responderA: msg.message_id } : {}),
        replyMarkup: { force_reply: true, selective: true, input_field_placeholder: PIDE_DATO[nombre].ejemplo.slice(0, 64) },
      });
      return ok();
    }

    const respuesta = await EJECUTORES[nombre]({ db, perm, args, resto, hoy: hoyUY(), enGrupo });
    const fotos = await enviarRespuesta(db, respuesta, responder, (foto, caption) =>
      sendTelegramPhoto(foto, caption, chatId, enGrupo ? { responderA: msg.message_id } : {}));
    // /pregunta deja su propio registro (telegram_pregunta, con el filtro y los tokens)
    if (nombre !== "pregunta") await registrar(db, "telegram_consulta", perm.email, {
      comando: nombre, args: resto.slice(0, 100) || null, chat: enGrupo ? "grupo" : "privado", ...(fotos ? { fotos } : {}),
    });
  } catch (err) {
    console.error("telegram-bot:", err);
    try {
      await responder("Hubo un error al buscar los datos. Probá de nuevo en un rato.");
    } catch (err2) {
      console.error("telegram-bot (aviso de error):", err2);
    }
  }
  return ok();
});
