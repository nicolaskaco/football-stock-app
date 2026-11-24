import { useState } from 'react';
import { Loader2, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { database } from '../utils/database';
import { useMutation } from '../hooks/useMutation';
import { useMountEffect } from '../hooks/useMountEffect';
import { useToast } from '../context/ToastContext';

// Usuario del bot (sin @). Opcional: con él se ofrece el link directo t.me/<bot>?start=<código>.
const BOT = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';

/**
 * Vinculación del usuario logueado con el bot de consultas de Telegram (Edge Function
 * telegram-bot): genera un código de un solo uso para mandarle al bot con /vincular.
 */
export const TelegramVinculoPanel = ({ currentUser }) => {
  const [estado, setEstado] = useState(null); // null = cargando | { vinculado }
  const [codigo, setCodigo] = useState(null);
  const { showToast } = useToast();
  const { execute, isSaving } = useMutation((msg) => showToast(msg, 'error'));

  const cargar = async () => {
    try {
      setEstado(await database.getTelegramVinculo(currentUser.email));
    } catch (err) {
      console.error('Error leyendo la vinculación de Telegram:', err);
      setEstado({ vinculado: false, error: true });
    }
  };

  useMountEffect(() => {
    cargar();
  });

  const generar = () => execute(async () => {
    setCodigo(await database.generarCodigoTelegram());
  }, 'No se pudo generar el código');

  const verificar = () => execute(async () => {
    const nuevo = await database.getTelegramVinculo(currentUser.email);
    setEstado(nuevo);
    if (nuevo.vinculado) {
      setCodigo(null);
      showToast('Telegram vinculado', 'success');
    } else {
      showToast('Todavía no está vinculado: mandale el código al bot', 'error');
    }
  }, 'No se pudo verificar');

  const desvincular = () => execute(async () => {
    await database.desvincularTelegram();
    database.logActivity('telegram_vinculo', currentUser.email, 'telegram', null, { vinculado: false });
    setEstado({ vinculado: false });
  }, 'No se pudo desvincular', 'Telegram desvinculado');

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`/vincular ${codigo}`);
      showToast('Copiado: pegalo en el chat con el bot', 'success');
    } catch {
      showToast('No se pudo copiar al portapapeles', 'error');
    }
  };

  if (!estado) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
      </div>
    );
  }

  const botonSecundario = 'px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60';
  const botonPrincipal = 'px-4 py-2 rounded-lg bg-black text-yellow-400 text-sm font-semibold hover:bg-gray-900 disabled:opacity-60';

  return (
    <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200">
      <p>
        Con el bot del club podés consultar datos desde Telegram, en un chat privado: por ejemplo{' '}
        <code className="px-1 rounded bg-gray-100 dark:bg-gray-700">/nacidos 2008</code> o{' '}
        <code className="px-1 rounded bg-gray-100 dark:bg-gray-700">/goleadores 5ta</code>. Ves lo mismo que en la app, según tus permisos.
      </p>

      {estado.error && (
        <p className="text-amber-800 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200 rounded p-2">
          No se pudo leer el estado de la vinculación.
        </p>
      )}

      {estado.vinculado ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Tu Telegram está vinculado. Mandale /ayuda al bot para ver las consultas.
          </p>
          <button type="button" onClick={desvincular} disabled={isSaving} className={botonSecundario}>
            Desvincular
          </button>
        </div>
      ) : codigo ? (
        <div className="space-y-3">
          <p>Abrí el chat privado con el bot{BOT ? <> (<span className="font-semibold">@{BOT}</span>)</> : ''} y mandale este mensaje. Vence en 10 minutos.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-base font-mono">/vincular {codigo}</code>
            <button type="button" onClick={copiar} className={`${botonSecundario} flex items-center gap-1`}>
              <Copy className="w-4 h-4" /> Copiar
            </button>
            {BOT && (
              <a
                href={`https://t.me/${BOT}?start=${codigo}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${botonSecundario} flex items-center gap-1`}
              >
                <ExternalLink className="w-4 h-4" /> Abrir el bot
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={verificar} disabled={isSaving} className={botonPrincipal}>
              Ya lo mandé
            </button>
            <button type="button" onClick={generar} disabled={isSaving} className={botonSecundario}>
              Generar otro código
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={generar} disabled={isSaving} className={botonPrincipal}>
          {isSaving ? 'Generando…' : 'Vincular Telegram'}
        </button>
      )}
    </div>
  );
};
