import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { MODULOS_COMPARTIDOS, ENCABEZADO, origen, destino } from '../../scripts/sync-shared.mjs';

// El bot de Telegram usa copias de estos módulos (supabase/functions/_shared/app). Si cambiás uno
// en src/utils, corré `npm run sync:shared` para que el bot calcule lo mismo que la app.
describe('copias de src/utils para las Edge Functions', () => {
  it.each(MODULOS_COMPARTIDOS)('%s.js está al día (si falla: npm run sync:shared)', (m) => {
    expect(existsSync(destino(m))).toBe(true);
    expect(readFileSync(destino(m), 'utf8')).toBe(ENCABEZADO + readFileSync(origen(m), 'utf8'));
  });
});
