/**
 * Carpeta local de informes COMET (File System Access API, solo Chrome/Edge de escritorio).
 * El handle de la carpeta se guarda en IndexedDB de este navegador para no pedirla cada vez;
 * si no se puede guardar o leer, se vuelve a pedir la carpeta.
 */

const DB_NAME = 'cap-comet';
const STORE = 'handles';
const KEY = 'carpeta';

export const soportaCarpeta = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

function abrirDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function leerHandle() {
  try {
    const db = await abrirDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function guardarHandle(handle) {
  try {
    const db = await abrirDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(handle, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Sin IndexedDB solo se pierde la comodidad: la próxima vez se vuelve a pedir la carpeta
  }
}

/**
 * Carpeta de informes con permiso de lectura. Llamar desde un click (los permisos lo exigen).
 * @param elegirNueva  true para pedir otra carpeta aunque haya una guardada ("Elegir otra carpeta")
 * @returns handle, o null si la persona canceló o no dio permiso
 */
export async function obtenerCarpeta({ elegirNueva = false } = {}) {
  let handle = elegirNueva ? null : await leerHandle();
  if (handle) {
    try {
      const opts = { mode: 'read' };
      if ((await handle.queryPermission(opts)) === 'granted' || (await handle.requestPermission(opts)) === 'granted') return handle;
    } catch {
      // Handle inválido (carpeta borrada o movida): se pide de nuevo
    }
  }
  try {
    handle = await window.showDirectoryPicker({ id: 'comet', mode: 'read' });
  } catch (err) {
    if (err?.name === 'AbortError') return null;
    throw err;
  }
  await guardarHandle(handle);
  return handle;
}

/** PDFs de la carpeta (sin subcarpetas) modificados desde `desde` (Date). */
export async function leerPdfsRecientes(handle, desde) {
  const files = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file' || !/\.pdf$/i.test(entry.name)) continue;
    const file = await entry.getFile();
    if (!desde || file.lastModified >= desde.getTime()) files.push(file);
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}
