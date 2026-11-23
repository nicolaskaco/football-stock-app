import { describe, it, expect } from 'vitest';
import { matchCometPlayers } from './cometMatch';
import { categoriaDelTorneo, categoriaDeArchivo, rivalCoincide } from './cometApply';

describe('categoriaDelTorneo', () => {
  it('reconoce la categoría en el nombre del torneo', () => {
    expect(categoriaDelTorneo('TORNEO CLAUSURA 5A 2026')).toBe('5ta');
    expect(categoriaDelTorneo('APERTURA SUB 16')).toBe('S16');
    expect(categoriaDelTorneo('TORNEO SIN CATEGORIA')).toBeNull();
  });
});

describe('categoriaDeArchivo', () => {
  it('acepta las distintas formas de escribir la categoría', () => {
    expect(categoriaDeArchivo('Informe 4ta Nacional.pdf')).toBe('4ta');
    expect(categoriaDeArchivo('informe_quinta.pdf')).toBe('5ta');
    expect(categoriaDeArchivo('Séptima - Danubio.pdf')).toBe('7ma');
    expect(categoriaDeArchivo('Sub-16 Wanderers.pdf')).toBe('S16');
  });

  it('devuelve null si no hay categoría o hay más de una', () => {
    expect(categoriaDeArchivo('informe.pdf')).toBeNull();
    expect(categoriaDeArchivo('4ta y 5ta.pdf')).toBeNull();
  });
});

describe('rivalCoincide', () => {
  it('ignora palabras genéricas y tildes', () => {
    expect(rivalCoincide('CLUB NACIONAL DE FOOTBALL', 'Nacional')).toBe(true);
    expect(rivalCoincide('CLUB ATLÉTICO RIVER PLATE', 'River Plate')).toBe(true);
    expect(rivalCoincide('DEFENSOR SPORTING CLUB', 'Danubio')).toBe(false);
  });
});

describe('matchCometPlayers', () => {
  const players = [
    { id: 'a', name: 'Juan Pérez Gómez', categoria: '5ta', comet_id: '111' },
    { id: 'b', name: 'Martín Rodríguez', categoria: '5ta' },
    { id: 'c', name: 'Martín Rodríguez Silva', categoria: '6ta' },
    { id: 'd', name: 'Lucas Fernández', categoria: '5ta' },
  ];

  it('matchea primero por COMET ID', () => {
    const [r] = matchCometPlayers([{ nombre: 'OTRO, NOMBRE', cometId: '111' }], players, '5ta');
    expect(r).toMatchObject({ player_id: 'a', status: 'id' });
  });

  it('matchea por nombre con "APELLIDOS, NOMBRES" sin tildes', () => {
    const [r] = matchCometPlayers([{ nombre: 'FERNANDEZ, LUCAS', cometId: '999' }], players, '5ta');
    expect(r).toMatchObject({ player_id: 'd', status: 'nombre' });
  });

  it('marca como dudoso cuando dos jugadores puntúan parecido', () => {
    const [r] = matchCometPlayers([{ nombre: 'RODRIGUEZ, MARTIN', cometId: '998' }], players, '5ta');
    expect(r.status).toBe('dudoso');
    expect(r.player_id).toBe('b'); // desempata por la categoría del partido
  });

  it('sin apellido en común no hay match', () => {
    const [r] = matchCometPlayers([{ nombre: 'SUAREZ, JUAN', cometId: '997' }], players, '5ta');
    expect(r).toMatchObject({ player_id: '', status: 'sin_match' });
  });

  it('no le da a un match por nombre un jugador con otro COMET ID', () => {
    const [r] = matchCometPlayers([{ nombre: 'PEREZ GOMEZ, JUAN', cometId: '222' }], players, '5ta');
    expect(r.player_id).not.toBe('a');
  });
});
