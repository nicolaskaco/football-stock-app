import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildParteDisponibilidad, parteComoTexto } from './disponibilidad';
import { jornada, roja } from './__fixtures__/jornadas';

beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-06-30T12:00:00Z')); });
afterAll(() => { vi.useRealTimers(); });

const ficha = '2026-12-31';
const players = [
  { id: 'ok', name: 'Bruno Alvez', categoria: '5ta', ficha_medica_hasta: ficha },
  { id: 'susp', name: 'Carlos Díaz', categoria: '5ta', ficha_medica_hasta: ficha },
  { id: 'les', name: 'Diego Eguren', categoria: '5ta', ficha_medica_hasta: ficha },
  { id: 'fic', name: 'Emiliano Ferro', categoria: '5ta', ficha_medica_hasta: '2026-03-10' },
  { id: 'edad', name: 'Fabián Gil', categoria: '5ta', ficha_medica_hasta: ficha, date_of_birth: '2007-05-01' },
  { id: 'sube', name: 'Gonzalo Hernández', categoria: '6ta', categoria_juego: '5ta', ficha_medica_hasta: ficha },
  { id: 'cedido', name: 'Hugo Ibarra', categoria: '5ta', status: 'cedido', ficha_medica_hasta: ficha },
  { id: 'otra', name: 'Iván Juárez', categoria: '4ta' },
];
const injuries = [
  { player_id: 'les', tipo: 'Esguince', fecha_retorno_estimada: '2026-03-30', fecha_alta: null },
  { player_id: 'ok', tipo: 'Contusión', fecha_alta: '2026-03-01' }, // ya dada de alta
];
const appSettings = { ano_min_5ta: '2009' };

const j1 = jornada({ fecha: '2026-03-08', eventos: [roja('susp')] });
const j2 = jornada({ fecha: '2026-03-15', numero: 2 });
j2.partidos.push({ ...j2.partidos[0], id: 'p-4ta', categoria: '4ta' });

describe('buildParteDisponibilidad', () => {
  const parte = buildParteDisponibilidad({ jornada: j2, jornadas: [j1, j2], players, injuries, appSettings });
  const cat5 = parte.find((c) => c.categoria === '5ta');

  it('arma una entrada por partido en el orden de las categorías', () => {
    expect(parte.map((c) => c.categoria)).toEqual(['4ta', '5ta']);
    expect(parte[0].fecha).toBe('2026-03-14'); // la 4ta juega el día anterior
  });

  it('el plantel son los activos de su categoría de juego', () => {
    const ids = [...cat5.disponibles, ...cat5.noDisponibles.map((n) => n.player)].map((p) => p.id);
    expect(ids).toContain('sube');
    expect(ids).not.toContain('cedido');
    expect(ids).not.toContain('otra');
  });

  it('separa disponibles y no disponibles con su motivo', () => {
    expect(cat5.disponibles.map((p) => p.id)).toEqual(['ok', 'sube']);
    const motivo = (id) => cat5.noDisponibles.find((n) => n.player.id === id).motivos.map((m) => m.tipo);
    expect(motivo('susp')).toEqual(['suspendido']);
    expect(motivo('les')).toEqual(['lesionado']);
    expect(motivo('fic')).toEqual(['ficha']);
    expect(motivo('edad')).toEqual(['edad']);
  });

  it('el tipo de lesión solo aparece con detalleLesion', () => {
    const conDetalle = buildParteDisponibilidad({ jornada: j2, jornadas: [j1, j2], players, injuries, appSettings, detalleLesion: true });
    const les = conDetalle.find((c) => c.categoria === '5ta').noDisponibles.find((n) => n.player.id === 'les');
    expect(les.motivos[0].texto).toBe('Lesión: Esguince, vuelve 30/03/2026');
  });

  it('respeta las categorías del usuario', () => {
    const solo4 = buildParteDisponibilidad({ jornada: j2, jornadas: [j1, j2], players, injuries, appSettings, categorias: ['4ta'] });
    expect(solo4.map((c) => c.categoria)).toEqual(['4ta']);
    expect(solo4[0].noDisponibles[0].motivos[0].texto).toBe('Sin ficha médica');
  });

  it('el texto lista categorías, motivos y disponibles', () => {
    const texto = parteComoTexto(j2, parte);
    expect(texto).toContain('*5ta* (15/03/2026) — 2 disponibles, 4 no disponibles');
    expect(texto).toContain('• Carlos Díaz: 🚫 Suspendido (Roja (última fecha))');
    expect(texto).toContain('🏥 Lesionado, vuelve 30/03/2026');
    expect(texto).not.toContain('Esguince');
    expect(texto).toContain('Disponibles: Bruno Alvez, Gonzalo Hernández');
  });
});
