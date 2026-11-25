import { describe, expect, it, vi } from 'vitest';
import {
  crearResolvedorFotos, PLAYER_PHOTO_URL_VIGENCIA_S, recorteCuadrado, urlVigente, validarFotoJugador,
} from './playerPhotos';

const HORA = 3600 * 1000;
const DIA = 24 * HORA;

function storageFalso(inicial = {}) {
  const datos = { ...inicial };
  return {
    datos,
    getItem: (k) => datos[k] ?? null,
    setItem: (k, v) => { datos[k] = v; },
    removeItem: (k) => { delete datos[k]; },
  };
}

/** Resolvedor con reloj y lote manuales: `flush()` manda el lote programado. */
function armar({ firmar, storage = storageFalso(), t = 1_000_000 } = {}) {
  const reloj = { t };
  let tarea = null;
  const resolvedor = crearResolvedorFotos({
    firmar,
    storage,
    ahora: () => reloj.t,
    programar: (fn) => { tarea = fn; },
  });
  const flush = async () => {
    const fn = tarea;
    tarea = null;
    await fn?.();
  };
  return { resolvedor, reloj, storage, flush };
}

const firmarOk = () => vi.fn(async (paths) => paths.map((path) => ({ path, signedUrl: `https://x/${path}?t=1` })));

describe('validarFotoJugador', () => {
  it('acepta imágenes de hasta 10 MB', () => {
    expect(validarFotoJugador({ type: 'image/jpeg', size: 3_000_000 })).toBeNull();
    expect(validarFotoJugador({ type: 'image/heic', size: 1000 })).toBeNull();
  });
  it('rechaza lo que no es imagen, lo muy pesado y la falta de archivo', () => {
    expect(validarFotoJugador({ type: 'application/pdf', size: 1000 })).toMatch(/no es una imagen/);
    expect(validarFotoJugador({ type: 'image/png', size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
    expect(validarFotoJugador(null)).toMatch(/ningún archivo/);
  });
});

describe('recorteCuadrado', () => {
  it('recorta al centro de una foto vertical', () => {
    expect(recorteCuadrado(300, 500)).toEqual({ sx: 0, sy: 100, lado: 300 });
  });
  it('recorta al centro de una foto horizontal', () => {
    expect(recorteCuadrado(800, 600)).toEqual({ sx: 100, sy: 0, lado: 600 });
  });
  it('no recorta una cuadrada', () => {
    expect(recorteCuadrado(400, 400)).toEqual({ sx: 0, sy: 0, lado: 400 });
  });
});

describe('urlVigente', () => {
  it('sirve si le queda más de una hora', () => {
    expect(urlVigente({ url: 'u', expira: 10 * HORA }, 8 * HORA)).toBe(true);
  });
  it('no sirve si le queda menos de una hora, si no hay url o si no hay entrada', () => {
    expect(urlVigente({ url: 'u', expira: 10 * HORA }, 9.5 * HORA)).toBe(false);
    expect(urlVigente({ url: '', expira: 10 * DIA }, 0)).toBe(false);
    expect(urlVigente(undefined, 0)).toBe(false);
  });
});

describe('crearResolvedorFotos', () => {
  it('junta los pedidos del mismo tick en una sola llamada', async () => {
    const firmar = firmarOk();
    const { resolvedor, flush } = armar({ firmar });
    const a = resolvedor.getUrl('p1/1.webp');
    const b = resolvedor.getUrl('p2/1.webp');
    const c = resolvedor.getUrl('p1/1.webp');
    await flush();
    expect(firmar).toHaveBeenCalledTimes(1);
    expect(firmar).toHaveBeenCalledWith(['p1/1.webp', 'p2/1.webp']);
    expect(await a).toBe('https://x/p1/1.webp?t=1');
    expect(await b).toBe('https://x/p2/1.webp?t=1');
    expect(await c).toBe('https://x/p1/1.webp?t=1');
  });

  it('reusa el link guardado sin volver a pedirlo', async () => {
    const firmar = firmarOk();
    const { resolvedor, flush } = armar({ firmar });
    const primera = resolvedor.getUrl('p1/1.webp');
    await flush();
    await primera;
    expect(resolvedor.peek('p1/1.webp')).toBe('https://x/p1/1.webp?t=1');
    expect(await resolvedor.getUrl('p1/1.webp')).toBe('https://x/p1/1.webp?t=1');
    expect(firmar).toHaveBeenCalledTimes(1);
  });

  it('renueva el link cuando le queda menos de una hora', async () => {
    const firmar = firmarOk();
    const { resolvedor, reloj, flush } = armar({ firmar });
    const primera = resolvedor.getUrl('p1/1.webp');
    await flush();
    await primera;
    reloj.t += PLAYER_PHOTO_URL_VIGENCIA_S * 1000 - HORA / 2;
    expect(resolvedor.peek('p1/1.webp')).toBeNull();
    const segunda = resolvedor.getUrl('p1/1.webp');
    await flush();
    await segunda;
    expect(firmar).toHaveBeenCalledTimes(2);
  });

  it('guarda los links en el storage y los recupera en otra sesión', async () => {
    const storage = storageFalso();
    const uno = armar({ firmar: firmarOk(), storage });
    const p = uno.resolvedor.getUrl('p1/1.webp');
    await uno.flush();
    await p;

    const firmar = firmarOk();
    const dos = armar({ firmar, storage, t: uno.reloj.t + HORA });
    expect(dos.resolvedor.peek('p1/1.webp')).toBe('https://x/p1/1.webp?t=1');
    expect(firmar).not.toHaveBeenCalled();
  });

  it('devuelve null si la firma falla o no hay ruta, sin romper', async () => {
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    const firmar = vi.fn(async () => { throw new Error('sin red'); });
    const { resolvedor, flush } = armar({ firmar });
    const p = resolvedor.getUrl('p1/1.webp');
    await flush();
    expect(await p).toBeNull();
    expect(await resolvedor.getUrl(null)).toBeNull();
    silencio.mockRestore();
  });

  it('devuelve null para una ruta que Storage no firmó', async () => {
    const firmar = vi.fn(async (paths) => paths.map((path) => (
      path === 'malo/1.webp' ? { path, signedUrl: null, error: 'Object not found' } : { path, signedUrl: `https://x/${path}` }
    )));
    const { resolvedor, flush } = armar({ firmar });
    const bueno = resolvedor.getUrl('p1/1.webp');
    const malo = resolvedor.getUrl('malo/1.webp');
    await flush();
    expect(await bueno).toBe('https://x/p1/1.webp');
    expect(await malo).toBeNull();
  });

  it('no recupera links vencidos de otra sesión', async () => {
    const storage = storageFalso();
    const uno = armar({ firmar: firmarOk(), storage });
    const p = uno.resolvedor.getUrl('p1/1.webp');
    await uno.flush();
    await p;
    const dos = armar({ firmar: firmarOk(), storage, t: uno.reloj.t + DIA });
    expect(dos.resolvedor.peek('p1/1.webp')).toBeNull();
  });

  it('olvidar() borra los links de la memoria y del storage', async () => {
    const { resolvedor, storage, flush } = armar({ firmar: firmarOk() });
    const p = resolvedor.getUrl('p1/1.webp');
    await flush();
    await p;
    expect(storage.datos.cap_fotos_jugadores).toBeDefined();
    resolvedor.olvidar();
    expect(resolvedor.peek('p1/1.webp')).toBeNull();
    expect(storage.datos.cap_fotos_jugadores).toBeUndefined();
  });

  it('ignora una caché rota en el storage', () => {
    const storage = storageFalso({ cap_fotos_jugadores: '{roto' });
    const { resolvedor } = armar({ firmar: firmarOk(), storage });
    expect(resolvedor.peek('p1/1.webp')).toBeNull();
  });
});
