import { useRef, useState } from 'react';
import { Camera, Loader2, UserRound } from 'lucide-react';
import { database } from '../../utils/database';
import { comprimirFoto, crearResolvedorFotos, PLAYER_PHOTO_ACCEPT, validarFotoJugador } from '../../utils/playerPhotos';
import { useMountEffect } from '../../hooks/useMountEffect';
import { useMutation } from '../../hooks/useMutation';
import { useToast } from '../../context/ToastContext';

// Un solo resolvedor para toda la app: junta los pedidos de links y los guarda (ver playerPhotos.js)
const resolvedor = crearResolvedorFotos({ firmar: (paths) => database.getPlayerPhotoUrls(paths) });

const SIZES = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};
const ICON_SIZES = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

/**
 * Foto del jugador, o una silueta si no tiene. Con `enabled` en false no renderiza nada (no deja
 * hueco). Con `editable`, tocarla abre el selector de archivo para subir o cambiar la foto.
 */
export function PlayerAvatar({ player, enabled = true, size = 'sm', editable = false, onUploaded, className = '' }) {
  if (!enabled || !player) return null;
  // La key remonta el avatar cuando cambia la foto: así arranca con el link nuevo, sin useEffect
  return (
    <AvatarConFoto
      key={player.foto_path || 'sin-foto'}
      player={player}
      size={size}
      editable={editable}
      onUploaded={onUploaded}
      className={className}
    />
  );
}

function AvatarConFoto({ player, size, editable, onUploaded, className }) {
  const path = player.foto_path || null;
  const [url, setUrl] = useState(() => resolvedor.peek(path));
  const [cargando, setCargando] = useState(() => !!path && !resolvedor.peek(path));
  const [fallo, setFallo] = useState(false);
  const inputRef = useRef(null);
  const { showToast } = useToast();
  const { execute, isSaving } = useMutation((msg) => showToast(msg, 'error'));

  useMountEffect(() => {
    if (!path || url) return undefined;
    let vivo = true;
    resolvedor.getUrl(path).then((u) => {
      if (!vivo) return;
      setUrl(u);
      setCargando(false);
    });
    return () => { vivo = false; };
  });

  const nombre = player.name_visual || player.name || 'jugador';
  const sizeClass = SIZES[size] || SIZES.sm;
  const iconClass = ICON_SIZES[size] || ICON_SIZES.sm;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const motivo = validarFotoJugador(file);
    if (motivo) {
      showToast(motivo, 'error');
      return;
    }
    execute(async () => {
      const blob = await comprimirFoto(file);
      const nuevoPath = await database.uploadPlayerPhoto(player, blob);
      await onUploaded?.(nuevoPath);
    }, 'Error al subir la foto', 'Foto actualizada');
  };

  let visual;
  if (url && !fallo) {
    visual = (
      <img
        src={url}
        alt={`Foto de ${nombre}`}
        loading="lazy"
        onError={() => setFallo(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 bg-gray-100 dark:bg-gray-700`}
      />
    );
  } else if (cargando) {
    visual = <span className={`${sizeClass} block rounded-full shrink-0 bg-gray-200 dark:bg-gray-700 animate-pulse`} aria-hidden="true" />;
  } else {
    visual = (
      <span
        className={`${sizeClass} rounded-full shrink-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden`}
        aria-hidden={editable ? undefined : 'true'}
        title={editable ? undefined : 'Sin foto'}
      >
        <UserRound className={`${iconClass} text-gray-400 dark:text-gray-500`} />
      </span>
    );
  }

  if (!editable) return <span className={`inline-flex shrink-0 ${className}`}>{visual}</span>;

  const titulo = path ? 'Cambiar foto' : 'Subir foto';
  return (
    // El span corta el click: tocar la foto no abre el modal de la fila ni marca el checkbox
    <span className={`inline-flex shrink-0 ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isSaving}
        title={titulo}
        aria-label={`${titulo} de ${nombre}`}
        className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
      >
        {visual}
        <span
          className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/50 transition-opacity ${
            isSaving ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
        >
          {isSaving
            ? <Loader2 className={`${iconClass} max-w-[60%] max-h-[60%] text-white animate-spin`} />
            : <Camera className={`${iconClass} max-w-[60%] max-h-[60%] text-white`} />}
        </span>
      </button>
      <input ref={inputRef} type="file" accept={PLAYER_PHOTO_ACCEPT} className="hidden" onChange={handleFile} />
    </span>
  );
}

/**
 * Encabezado de los modales de jugador: foto grande + nombre + categoría, y "Quitar foto".
 * Con `enabled` en false no renderiza nada.
 */
export function PlayerPhotoHeader({ player, enabled, editable, onChanged, className = 'pb-4 border-b border-gray-200 dark:border-gray-700' }) {
  const { showToast } = useToast();
  const { execute, isSaving } = useMutation((msg) => showToast(msg, 'error'));
  const [confirmando, setConfirmando] = useState(false);
  // El modal se armó con el jugador de cuando se abrió: la foto nueva se sigue acá
  const [fotoPath, setFotoPath] = useState(player?.foto_path || null);
  if (!enabled || !player?.id) return null;
  const actual = { ...player, foto_path: fotoPath };

  const subida = async (nuevoPath) => {
    setFotoPath(nuevoPath);
    await onChanged?.();
  };

  const quitar = () => {
    setConfirmando(false);
    execute(async () => {
      await database.removePlayerPhoto(actual);
      setFotoPath(null);
      await onChanged?.();
    }, 'Error al quitar la foto', 'Foto quitada');
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <PlayerAvatar player={actual} size="xl" editable={editable} onUploaded={subida} />
      <div className="min-w-0">
        <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">{player.name_visual || player.name}</p>
        {player.categoria && <p className="text-sm text-gray-500 dark:text-gray-400">{player.categoria}</p>}
        {editable && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {fotoPath ? 'Tocá la foto para cambiarla.' : 'Tocá la silueta para subir una foto.'}
            {fotoPath && !confirmando && (
              <button type="button" onClick={() => setConfirmando(true)} disabled={isSaving}
                className="ml-2 text-red-600 dark:text-red-400 hover:underline">
                Quitar foto
              </button>
            )}
            {confirmando && (
              <span className="ml-2">
                ¿Seguro?{' '}
                <button type="button" onClick={quitar} className="text-red-600 dark:text-red-400 font-semibold hover:underline">Sí, quitar</button>
                {' · '}
                <button type="button" onClick={() => setConfirmando(false)} className="hover:underline">Cancelar</button>
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
