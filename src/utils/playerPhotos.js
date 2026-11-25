// Fotos de jugadores: validación, compresión en el navegador y links firmados con caché.
// El bucket `player-photos` es privado (ver migración 20261126_player_photos.sql): cada foto
// se lee con un link firmado. Para no pedir un link por jugador ni bajar la misma foto en
// cada pantalla, los pedidos del mismo momento se juntan en una sola llamada y los links se
// guardan (memoria + sessionStorage) hasta una hora antes de vencer. Son fotos de menores y un
// link firmado anda sin sesión: por eso viven poco, se guardan solo en la pestaña (no en
// localStorage) y se borran al cerrar sesión. La ruta cambia con cada subida, así que un link
// guardado nunca apunta a una foto vieja.

export const PLAYER_PHOTO_ACCEPT = 'image/*';
export const PLAYER_PHOTO_MAX_INPUT_BYTES = 10 * 1024 * 1024;
/** Lado en píxeles de la foto que se sube (cuadrada). */
export const PLAYER_PHOTO_LADO = 400;
/** Vigencia de los links firmados, en segundos. */
export const PLAYER_PHOTO_URL_VIGENCIA_S = 12 * 3600;
/** Un link se renueva si le queda menos que esto. */
const RENOVAR_ANTES_MS = 3600 * 1000;
const STORAGE_KEY = 'cap_fotos_jugadores';

/** true si el toggle "Fotos de jugadores" de Configuración está prendido. */
export const fotosJugadoresActivas = (appSettings) => appSettings?.jugadores_fotos_enabled === 'true';

/** Motivo por el que el archivo no sirve como foto, o null si es válido. */
export function validarFotoJugador(file) {
  if (!file) return 'No se eligió ningún archivo';
  if (!String(file.type || '').startsWith('image/')) return 'El archivo no es una imagen';
  if (file.size > PLAYER_PHOTO_MAX_INPUT_BYTES) return 'La imagen pesa más de 10 MB';
  return null;
}

/** Recorte cuadrado centrado de una imagen de ancho × alto. */
export function recorteCuadrado(ancho, alto) {
  const lado = Math.min(ancho, alto);
  return { sx: Math.round((ancho - lado) / 2), sy: Math.round((alto - lado) / 2), lado };
}

/** true si el link guardado sigue sirviendo (le queda más de una hora). */
export function urlVigente(entrada, ahora) {
  return !!entrada?.url && entrada.expira - ahora > RENOVAR_ANTES_MS;
}

function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

const aBlob = (canvas, tipo, calidad) => new Promise((resolve) => canvas.toBlob(resolve, tipo, calidad));

/** Recorta al centro, achica a 400×400 y la pasa a WebP (o JPEG si el navegador no sabe WebP). */
export async function comprimirFoto(file) {
  const img = await cargarImagen(file);
  const { sx, sy, lado } = recorteCuadrado(img.naturalWidth, img.naturalHeight);
  const destino = Math.min(PLAYER_PHOTO_LADO, lado);
  const canvas = document.createElement('canvas');
  canvas.width = destino;
  canvas.height = destino;
  canvas.getContext('2d').drawImage(img, sx, sy, lado, lado, 0, 0, destino, destino);

  let blob = await aBlob(canvas, 'image/webp', 0.82);
  if (!blob || blob.type !== 'image/webp') blob = await aBlob(canvas, 'image/jpeg', 0.85);
  if (!blob) throw new Error('No se pudo procesar la imagen');
  return blob;
}

const storageSeguro = {
  getItem(key) {
    try { return globalThis.sessionStorage?.getItem(key) ?? null; } catch { return null; }
  },
  setItem(key, value) {
    try { globalThis.sessionStorage?.setItem(key, value); } catch { /* sin sessionStorage: solo memoria */ }
  },
  removeItem(key) {
    try { globalThis.sessionStorage?.removeItem(key); } catch { /* nada que borrar */ }
  },
};

const resolvedores = new Set();

/** Olvida todos los links guardados (al cerrar sesión). */
export function olvidarFotosGuardadas() {
  resolvedores.forEach((r) => r.olvidar());
  storageSeguro.removeItem(STORAGE_KEY);
}

/**
 * Resolvedor de links firmados con lotes y caché.
 * @param {object} opts
 * @param {(paths: string[]) => Promise<{path: string, signedUrl: string|null, error?: unknown}[]>} opts.firmar
 * @param {{getItem: Function, setItem: Function}} [opts.storage]
 * @param {() => number} [opts.ahora]
 * @param {(fn: Function) => void} [opts.programar] cuándo se manda el lote (por defecto, en el próximo tick)
 */
export function crearResolvedorFotos({
  firmar,
  storage = storageSeguro,
  ahora = () => Date.now(),
  programar = (fn) => setTimeout(fn, 0),
}) {
  let cache = null; // path → { url, expira }
  const pendientes = new Map(); // path → resolvers[]
  let programado = false;

  const leerCache = () => {
    if (cache) return cache;
    cache = new Map();
    try {
      const guardado = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
      const t = ahora();
      for (const [path, entrada] of Object.entries(guardado)) {
        if (urlVigente(entrada, t)) cache.set(path, entrada);
      }
    } catch { /* caché rota: se arranca de cero */ }
    return cache;
  };

  const guardarCache = () => {
    const t = ahora();
    const vigentes = Object.fromEntries([...leerCache()].filter(([, e]) => urlVigente(e, t)));
    storage.setItem(STORAGE_KEY, JSON.stringify(vigentes));
  };

  const mandarLote = async () => {
    programado = false;
    const lote = new Map(pendientes);
    pendientes.clear();
    const paths = [...lote.keys()];
    let firmados = [];
    try {
      firmados = (await firmar(paths)) || [];
    } catch (err) {
      console.error('Error al firmar fotos:', err);
    }
    const expira = ahora() + PLAYER_PHOTO_URL_VIGENCIA_S * 1000;
    const porPath = new Map(firmados.filter((f) => f?.signedUrl && !f.error).map((f) => [f.path, f.signedUrl]));
    for (const [path, url] of porPath) leerCache().set(path, { url, expira });
    if (porPath.size) guardarCache();
    for (const [path, resolvers] of lote) {
      const url = porPath.get(path) || null;
      resolvers.forEach((r) => r(url));
    }
  };

  const resolvedor = {
    /** Borra los links guardados en memoria y en el storage. */
    olvidar() {
      cache = new Map();
      storage.removeItem?.(STORAGE_KEY);
    },
    /** El link guardado y vigente, sin pedir nada (para el primer render). */
    peek(path) {
      if (!path) return null;
      const entrada = leerCache().get(path);
      return urlVigente(entrada, ahora()) ? entrada.url : null;
    },
    /** El link de la foto (null si no hay o falla). Los pedidos del mismo tick van en una sola llamada. */
    getUrl(path) {
      if (!path) return Promise.resolve(null);
      const guardada = this.peek(path);
      if (guardada) return Promise.resolve(guardada);
      return new Promise((resolve) => {
        pendientes.set(path, [...(pendientes.get(path) || []), resolve]);
        if (!programado) {
          programado = true;
          programar(mandarLote);
        }
      });
    },
  };
  resolvedores.add(resolvedor);
  return resolvedor;
}
