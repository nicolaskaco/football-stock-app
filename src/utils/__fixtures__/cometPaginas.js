// Páginas de informes COMET como las devuelve extractPdfPages: fragmentos { str, x, y, w }.
// Copian las posiciones de informes reales, con nombres e IDs inventados.

const it = (str, x, y, w = str.length * 4.5) => ({ str, x, y, w });
// Títulos de sección: centrados en la página
const titulo = (str, y, width = 596) => {
  const w = str.length * 5;
  return it(str, width / 2 - w / 2, y, w);
};
const NOMBRES = ['UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE'];

/**
 * Formato iText (PDF viejo de COMET). Peñarol local, 3:1.
 * - Cambios: 12 entra por 10 (84'), 13 entra por 9 (90+2').
 * - Goles: 10 (33'), rival (50'), 5 (70') y un autogol a favor (61', dorsal 4 del rival).
 * - Amarilla de 8 (28'); roja de 2 después del partido. Hay tarjetas del rival y una expulsión
 *   de un oficial que no son de Peñarol.
 */
export function paginasItext() {
  const items = [
    it('COMET - Asociación Uruguaya de Fútbol', 20, 814),
    it('Impreso por: ALGUIEN', 407, 814),
    it('Informe del partido', 243, 791),
    it('TORNEO APERTURA 4A 2026', 198, 774),
    it('PEÑAROL', 224, 751, 40), it('-', 295, 751, 3), it('RIVAL FC', 302, 751, 40),
    it('3:1 (1:0)', 271, 734),
    it('Fecha/hora: 23.05.2026 09:00 UYT', 90, 711),
    it('Fecha: 8', 284, 711),
    it('Categoría de edad: U-19', 417, 711),
    it('Árbitro: PEREZ GOMEZ, JUAN', 20, 653),
    it('1° asistente: LOPEZ, ANA', 20, 643),
    it('2° asistente: DIAZ, LUIS', 20, 633),
    it('4to árbitro:', 20, 623),
    it('Equipo A', 20, 593), it('PEÑAROL', 62, 593), it('Núm/ID de', 250, 593),
    it('Equipo B', 300, 593), it('RIVAL FC', 342, 593), it('Núm/ID de', 530, 593),
    it('referencia', 251, 583), it('referencia', 531, 583),
  ];
  // Titulares 1..11 (el 1 es arquero) y el rival en la otra columna
  for (let d = 1; d <= 11; d++) {
    const y = 574 - (d - 1) * 11;
    items.push(it(String(d), d < 10 ? 30 : 25, y, 5), it(`${NOMBRES[d - 1]}, JUGADOR`, 35, y), it(String(2800000 + d), 254, y, 30));
    if (d === 1) items.push(it('AR', 234, y, 10));
    items.push(it(String(d), 310, y, 5), it(`RIVAL${d}, X`, 315, y), it(String(5000000 + d), 534, y, 30));
  }
  // El ID del 2 viene con otro número pegado
  items.find((x) => x.str === '2800002').str = '2800002/39761623';
  // Suplentes, después del salto
  [[12, '(10) 84'], [13, '(9) 90+2'], [14, null]].forEach(([d, cambio], i) => {
    const y = 443 - i * 11;
    items.push(it(String(d), 25, y, 10), it(`${NOMBRES[d - 1]}, SUPLENTE`, 35, y), it(String(2800000 + d), 254, y, 30));
    if (cambio) items.push(it(cambio, 217, y, 25));
  });
  items.push(
    it('ENTRENADOR, PEPE', 20, 311), it('3765496', 204, 311), it('Director técnico', 270, 311),
    it('Resultado', 20, 218), it('1:0', 87, 218, 12), it('1:1', 113, 218, 12), it('2:1', 139, 218, 12), it('3:1', 165, 218, 12),
    it('Goleador/Min', 20, 208), it('10 33', 82, 208, 18), it('7', 110, 208, 5), it('50', 121, 208, 8), it('4', 160, 208, 5), it('61', 171, 208, 8), it('5', 136, 208, 5), it('70', 147, 208, 8),
    it('PEN/AG', 20, 198), it('AG', 165, 198, 10),
    it('Tarjetas amarillas:', 20, 166), it('PEÑAROL: 8 OCHO, JUGADOR (28 - Conducta antideportiva); RIVAL FC: 7 RIVAL7, X (80 - Retardar); 3', 96, 166, 470),
    it('RIVAL3, X (Después del partido - Desaprobación)', 20, 156, 200),
    it('Tarjetas rojas:', 20, 136), it('PEÑAROL: 2 DOS, JUGADOR (Después del partido - Insulto)', 77, 136, 250),
    it('Expulsiones:', 20, 104), it('PEÑAROL: ENTRENADOR, PEPE (87 - Conducta inadecuada)', 72, 104, 250),
    it('PEN:', 23, 56), it('Penal', 42, 56), it('AG:', 117, 56), it('Autogol', 132, 56),
    it('COMET - Asociación Uruguaya de Fútbol - PEÑAROL - RIVAL FC', 20, 25),
  );
  return [{ width: 595, items }];
}

/**
 * Formato web sin COMET ID: en la alineación vienen los minutos de las incidencias.
 * Peñarol visitante, 0:2* (con asterisco).
 * - Cambio: 12 entra por 10 (61').
 * - Goles: 9 (47') y un autogol a favor (80', dorsal 4 del rival, en la columna del rival).
 * - Amarilla de 5 (32') y una amarilla al DT, que no es de un jugador.
 */
export function paginasWebSinId() {
  const W = 596;
  const p1 = [
    it('COMET - Asociación Uruguaya de Fútbol', 18, 822),
    it('Fecha/Hora: 03.08.2026 14:31:29 UYT Impreso por: ALGUIEN', 303, 822),
    titulo('Informe del partido', 802),
    titulo('TORNEO CLAUSURA 5A 2026', 788),
    it('N/A', 30, 759), it('N/A', 544, 759),
    it('RIVAL FC', 192, 755, 40), it('0:2*', 291, 755, 18), it('PEÑAROL', 344, 755, 40),
    it('J', 33, 746), it('AR', 45, 746),
    it('Fecha/Hora:', 45, 725, 40), it('31.07.2026 09:00', 88, 725, 60), it('Categoría de edad:', 315, 725, 58), it('U-17 M Fútbol', 376, 725),
    it('Estadio:', 45, 708, 28), it('ALGUNO (Montevideo)', 74, 708), it('Fecha:', 315, 708, 22), it('15', 339, 708, 8),
    titulo('OFICIALES DE PARTIDO', 670),
    it('Árbitro', 26, 652, 20), it(': PEREZ GOMEZ, JUAN', 47, 652, 100),
    it('1° árbitro asistente', 304, 652, 56), it(': LOPEZ SILVA, ANA', 362, 652, 100),
    titulo('ALINEACIONES', 614),
    it('RIVAL FC', 26, 596), it('PEÑAROL', 304, 596),
  ];
  for (let d = 1; d <= 11; d++) {
    const y = 583 - (d - 1) * 14;
    p1.push(it(String(d), 304, y, 8), it(`${NOMBRES[d - 1]} APELLIDO, JUGADOR`, 317, y, 120));
    if (d === 1) p1.push(it('AR', 456, y, 10));
    if (d === 10) p1.push(it('', 553, y, 6), it("61'", 562, y, 12));
    if (d === 5) p1.push(it("32'", 542, y, 12));
    if (d === 9) p1.push(it("46', 86'", 551, y, 25));
    p1.push(it(String(d + 20), 26, y, 8), it(`RIVAL${d}, X`, 38, y, 60));
  }
  p1.push(titulo('SUBSTITUCIONES', 423));
  [12, 14].forEach((d, i) => {
    const y = 406 - i * 15;
    p1.push(it(String(d), 304, y, 8), it(`${NOMBRES[d - 1]} APELLIDO, SUPLENTE`, 317, y, 120));
    if (d === 12) p1.push(it("61'", 562, y, 12));
  });
  p1.push(
    titulo('CUERPO TÉCNICO', 255),
    it('Director técnico', 304, 237, 46), it(': ENTRENADOR, PEPE', 352, 237, 80),
    titulo('DISCIPLINARIO', 138),
    titulo('TARJETAS AMARILLAS', 125),
    it('5 CINCO APELLIDO, JUGADOR', 349, 110, 120), it("32'", 311, 106, 12), it('Conducta antideportiva', 349, 102, 90),
    it("60'", 311, 82, 12), it('ENTRENADOR, PEPE', 349, 82, 80), it('Director técnico', 470, 82, 46),
    it('Informe del partido: RIVAL FC - PEÑAROL', 18, 16), it('Página', 522, 16),
  );
  const p2 = [
    it('COMET - Asociación Uruguaya de Fútbol', 18, 822),
    titulo('SUSTITUCIONES', 804),
    it("61'", 311, 782, 12), it('10', 333, 782, 8), it('DIEZ APELLIDO, JUGADOR', 347, 786, 100), it('', 453, 782, 6), it('12', 468, 782, 8), it('DOCE APELLIDO, SUPLENTE', 483, 782, 100),
    titulo('GOLES', 700),
    it("47'", 311, 690, 12), it('9 NUEVE APELLIDO, JUGADOR', 329, 690, 120),
    it("80'", 32, 670, 12), it('4 RIVAL4, X', 51, 670, 60), it('Autogol', 250, 670, 30),
    titulo('RESUMEN DEL PARTIDO', 661),
  ];
  return [{ width: W, items: p1 }, { width: W, items: p2 }];
}
