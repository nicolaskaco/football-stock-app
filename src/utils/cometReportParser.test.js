import { describe, it, expect } from 'vitest';
import { parseCometPages, faseDelTorneo } from './cometReportParser';
import { paginasItext, paginasWebSinId } from './__fixtures__/cometPaginas';

describe('parseCometPages — formato iText (PDF viejo)', () => {
  const r = parseCometPages(paginasItext());

  it('lee encabezado, fase, N° de fecha y árbitros', () => {
    expect(r).toMatchObject({
      formato: 'itext',
      torneo: 'TORNEO APERTURA 4A 2026',
      fase: 'Apertura',
      numeroFecha: 8,
      fecha: '2026-05-23',
      local: 'PEÑAROL',
      visitante: 'RIVAL FC',
      escenario: 'Local',
      golesLocal: 3,
      golesVisitante: 1,
      arbitro: 'Juan Perez',
      primerLinea: 'Ana Lopez',
      segundaLinea: 'Luis Diaz',
    });
    expect(r.warnings).toEqual([]);
  });

  it('separa titulares y suplentes de Peñarol, con el ID sin lo que viene después de la barra', () => {
    expect(r.titulares).toHaveLength(11);
    expect(r.titulares[0]).toEqual({ dorsal: 1, nombre: 'UNO, JUGADOR', cometId: '2800001' });
    expect(r.titulares[1].cometId).toBe('2800002');
    expect(r.suplentes.map((s) => s.dorsal)).toEqual([12, 13, 14]);
  });

  it('lee los cambios de la fila del suplente que entra', () => {
    expect(r.cambios).toEqual([
      { minuto: 84, sale: 10, entra: 12 },
      { minuto: 92, sale: 9, entra: 13 },
    ]);
  });

  it('lee los goles de la grilla y no le da a nadie el autogol a favor', () => {
    expect(r.goles.map(({ dorsal, minuto }) => ({ dorsal, minuto }))).toEqual([
      { dorsal: 10, minuto: 33 },
      { dorsal: 5, minuto: 70 },
    ]);
  });

  it('lee solo las tarjetas de Peñarol; "Después del partido" va sin minuto', () => {
    expect(r.tarjetas.map(({ tipo, dorsal, minuto }) => ({ tipo, dorsal, minuto }))).toEqual([
      { tipo: 'amarilla', dorsal: 8, minuto: 28 },
      { tipo: 'roja', dorsal: 2, minuto: null },
    ]);
  });
});

describe('parseCometPages — formato web sin COMET ID', () => {
  const r = parseCometPages(paginasWebSinId());

  it('acepta el marcador con asterisco y lee fase y N° de fecha', () => {
    expect(r).toMatchObject({
      formato: 'web',
      fase: 'Clausura',
      numeroFecha: 15,
      fecha: '2026-07-31',
      escenario: 'Visitante',
      golesLocal: 0,
      golesVisitante: 2,
      arbitro: 'Juan Perez',
    });
  });

  it('lee la alineación sin ID, ignorando los minutos e íconos de cada fila', () => {
    expect(r.titulares).toHaveLength(11);
    expect(r.titulares[9]).toEqual({ dorsal: 10, nombre: 'DIEZ APELLIDO, JUGADOR', cometId: null });
    expect(r.titulares[8].nombre).toBe('NUEVE APELLIDO, JUGADOR');
    expect(r.suplentes.map((s) => s.dorsal)).toEqual([12, 14]);
    expect(r.cambios).toEqual([{ minuto: 61, sale: 10, entra: 12 }]);
  });

  it('no avisa por la tarjeta del DT ni por el autogol del rival', () => {
    expect(r.tarjetas.map((t) => t.dorsal)).toEqual([5]);
    expect(r.goles.map((g) => g.dorsal)).toEqual([9]);
    expect(r.warnings).toEqual([]);
  });
});

describe('faseDelTorneo', () => {
  it('saca Apertura o Clausura del nombre del torneo', () => {
    expect(faseDelTorneo('TORNEO APERTURA 6A 2026')).toBe('Apertura');
    expect(faseDelTorneo('TORNEO CLAUSURA SUB-16 A 2026')).toBe('Clausura');
    expect(faseDelTorneo('COPA URUGUAY')).toBeNull();
  });
});
