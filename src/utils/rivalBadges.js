// Deben coincidir con el bucket `rival-badges` (ver migración 20261010_add_rival_badges.sql)
export const RIVAL_BADGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
export const RIVAL_BADGE_ACCEPT = '.png,.jpg,.jpeg,.webp,.svg';
export const RIVAL_BADGE_MAX_BYTES = 512 * 1024;

/** Devuelve el motivo por el que el archivo no sirve como escudo, o null si es válido. */
export function validateRivalBadgeFile(file) {
  if (!RIVAL_BADGE_TYPES.includes(file.type)) return 'Formato no permitido (usá PNG, JPG, WEBP o SVG)';
  if (file.size > RIVAL_BADGE_MAX_BYTES) return 'Pesa más de 512 KB';
  return null;
}

/** Normaliza un nombre para comparar: sin tildes, sin mayúsculas, solo letras y números. */
export function normalizeRivalName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Asocia cada archivo con un rival por el nombre del archivo (sin extensión).
 * @returns {{ matched: {file, rival}[], unmatched: File[], rejected: {file, reason}[] }}
 */
export function matchBadgeFiles(files, rivales) {
  const byName = new Map(rivales.map((r) => [normalizeRivalName(r.name), r]));
  const matched = [];
  const unmatched = [];
  const rejected = [];
  const seen = new Set();

  files.forEach((file) => {
    const reason = validateRivalBadgeFile(file);
    if (reason) {
      rejected.push({ file, reason });
      return;
    }
    const rival = byName.get(normalizeRivalName(file.name.replace(/\.[^.]+$/, '')));
    if (!rival) {
      unmatched.push(file);
    } else if (seen.has(rival.id)) {
      rejected.push({ file, reason: `Ya hay otro archivo para ${rival.name}` });
    } else {
      seen.add(rival.id);
      matched.push({ file, rival });
    }
  });

  return { matched, unmatched, rejected };
}
