// Copia a supabase/functions/_shared/app/ los módulos puros de src/utils que usan las Edge
// Functions (el bot de Telegram arma el parte de disponibilidad con el mismo código que la app).
// Uso: npm run sync:shared   ·   src/utils/sharedSync.test.js falla si las copias quedan viejas.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const MODULOS_COMPARTIDOS = ['constants', 'dateUtils', 'ageEligibility', 'suspensions', 'playerStats', 'disponibilidad', 'textUtils'];
export const ENCABEZADO = '// Generado desde src/utils — no editar a mano: corré npm run sync:shared.\n';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
export const origen = (m) => join(raiz, 'src/utils', `${m}.js`);
export const destino = (m) => join(raiz, 'supabase/functions/_shared/app', `${m}.js`);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(dirname(destino(MODULOS_COMPARTIDOS[0])), { recursive: true });
  for (const m of MODULOS_COMPARTIDOS) {
    writeFileSync(destino(m), ENCABEZADO + readFileSync(origen(m), 'utf8'));
    console.log(`✓ ${m}.js`);
  }
}
