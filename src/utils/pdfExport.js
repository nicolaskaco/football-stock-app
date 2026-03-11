import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { database } from './database';
import { CATEGORIAS } from './constants';

// Peñarol brand color
const BRAND_YELLOW = [212, 160, 23]; // #D4A017
const DARK_GRAY = [31, 41, 55];      // #1F2937
const LIGHT_GRAY = [243, 244, 246];  // #F3F4F6

const formatDatePDF = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Generate a PDF report of the dashboard overview.
 *
 * @param {Object} opts
 * @param {Array}  opts.players       - All visible players
 * @param {Array}  opts.injuries      - All injury records
 * @param {Array}  opts.distributions - Distribution records
 * @param {Array}  opts.inventory     - Inventory items
 * @param {Object} opts.currentUser   - Current user (for category scoping)
 */
export async function exportDashboardPDF({ players, injuries, distributions, inventory, currentUser }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // ─── Header ───────────────────────────────────────────
  doc.setFillColor(...DARK_GRAY);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(...BRAND_YELLOW);
  doc.rect(0, 28, pageWidth, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('Club Atlético Peñarol', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Reporte Dashboard — Divisiones Formativas', pageWidth / 2, 21, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-UY', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Generado: ${dateStr}`, pageWidth - 15, 37, { align: 'right' });
  y = 42;

  // Helper: add section title
  const addSectionTitle = (title) => {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 15;
    }
    doc.setFillColor(...BRAND_YELLOW);
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK_GRAY);
    doc.text(title, 18, y + 5.5);
    y += 12;
  };

  // ─── 1. Jugadores Lesionados ──────────────────────────
  const activeInjuries = injuries.filter(inj => !inj.fecha_alta);
  if (activeInjuries.length > 0) {
    const playerMap = {};
    players.forEach(p => { playerMap[p.id] = p; });

    const catOrder = {};
    CATEGORIAS.forEach((c, i) => { catOrder[c] = i; });

    const injuryRows = activeInjuries
      .map(inj => ({ ...inj, player: playerMap[inj.player_id] }))
      .filter(r => r.player)
      .sort((a, b) => {
        const catDiff = (catOrder[a.player.categoria] ?? 99) - (catOrder[b.player.categoria] ?? 99);
        if (catDiff !== 0) return catDiff;
        return new Date(a.fecha_inicio) - new Date(b.fecha_inicio);
      });

    addSectionTitle(`Jugadores Lesionados (${injuryRows.length})`);
    autoTable(doc, {
      startY: y,
      margin: { left: 15, right: 15 },
      head: [['Jugador', 'Categoría', 'Lesión', 'Severidad', 'Desde']],
      body: injuryRows.map(r => [
        r.player.name_visual || r.player.name,
        r.player.categoria,
        r.tipo_lesion || '—',
        r.severidad || '—',
        formatDatePDF(r.fecha_inicio),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DARK_GRAY, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ─── 2. Fichas Médicas Vencidas / Por Vencer ──────────
  try {
    const categorias = currentUser?.categoria?.length > 0 ? currentUser.categoria : null;
    const fichas = await database.getPlayersWithExpiredFichaMedica(categorias);
    if (fichas.length > 0) {
      addSectionTitle(`Fichas Médicas — Atención Requerida (${fichas.length})`);
      autoTable(doc, {
        startY: y,
        margin: { left: 15, right: 15 },
        head: [['Jugador', 'Categoría', 'Documento', 'Vencimiento', 'Estado']],
        body: fichas.map(p => [
          p.name_visual || p.name,
          p.categoria_juego || p.categoria,
          p.gov_id || '—',
          formatDatePDF(p.ficha_medica_hasta),
          p.expired ? 'Vencida' : 'Próxima a vencer',
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: DARK_GRAY, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: LIGHT_GRAY },
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 4) {
            if (data.cell.raw === 'Vencida') {
              data.cell.styles.textColor = [185, 28, 28];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [180, 83, 9];
            }
          }
        },
      });
      y = doc.lastAutoTable.finalY + 8;
    }
  } catch (err) {
    console.error('Error fetching ficha médica data for PDF:', err);
  }

  // ─── 3. Cumpleaños Próximos ───────────────────────────
  try {
    const categorias = currentUser?.categoria?.length > 0 ? currentUser.categoria : null;
    const [birthPlayers, birthDirigentes] = await Promise.all([
      database.getUpcomingBirthdays(7, categorias),
      database.getUpcomingBirthdaysDirigentes(7),
    ]);

    const allBirthdays = [
      ...birthPlayers.map(p => ({ ...p, type: 'Jugador' })),
      ...birthDirigentes.map(d => ({ ...d, type: 'Dirigente' })),
    ].sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

    if (allBirthdays.length > 0) {
      addSectionTitle(`Cumpleaños Próximos (${allBirthdays.length})`);
      autoTable(doc, {
        startY: y,
        margin: { left: 15, right: 15 },
        head: [['Nombre', 'Tipo', 'Fecha de Nacimiento', 'Días']],
        body: allBirthdays.map(b => [
          b.name_visual || b.name,
          b.type,
          formatDatePDF(b.date_of_birth),
          b.daysUntilBirthday === 0 ? '¡Hoy!' : `En ${b.daysUntilBirthday} día(s)`,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: DARK_GRAY, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: LIGHT_GRAY },
      });
      y = doc.lastAutoTable.finalY + 8;
    }
  } catch (err) {
    console.error('Error fetching birthday data for PDF:', err);
  }

  // ─── 4. Distribución por Categoría ────────────────────
  const catCounts = {};
  players.forEach(p => {
    const cat = p.categoria || 'Sin categoría';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });
  const totalPlayers = players.length;

  if (totalPlayers > 0) {
    const catRows = CATEGORIAS
      .filter(c => catCounts[c])
      .map(c => [c, catCounts[c], ((catCounts[c] / totalPlayers) * 100).toFixed(1) + '%']);

    // Add any categories not in CATEGORIAS
    Object.keys(catCounts)
      .filter(c => !CATEGORIAS.includes(c))
      .forEach(c => catRows.push([c, catCounts[c], ((catCounts[c] / totalPlayers) * 100).toFixed(1) + '%']));

    addSectionTitle(`Distribución por Categoría (${totalPlayers} jugadores)`);
    autoTable(doc, {
      startY: y,
      margin: { left: 15, right: 15 },
      head: [['Categoría', 'Cantidad', 'Porcentaje']],
      body: catRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DARK_GRAY, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ─── 5. Distribución por Edad ─────────────────────────
  const ageGroups = [
    { label: '13-14', min: 13, max: 14 },
    { label: '15-16', min: 15, max: 16 },
    { label: '17-18', min: 17, max: 18 },
    { label: '19-20', min: 19, max: 20 },
    { label: '21-23', min: 21, max: 23 },
  ];

  const ageCounts = ageGroups.map(g => ({ ...g, count: 0 }));
  const today = new Date();
  players.forEach(p => {
    if (!p.date_of_birth) return;
    const birth = new Date(p.date_of_birth);
    const age = today.getFullYear() - birth.getFullYear() -
      (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
    const group = ageCounts.find(g => age >= g.min && age <= g.max);
    if (group) group.count++;
  });

  const totalWithAge = ageCounts.reduce((s, g) => s + g.count, 0);
  if (totalWithAge > 0) {
    addSectionTitle('Distribución por Edad');
    autoTable(doc, {
      startY: y,
      margin: { left: 15, right: 15 },
      head: [['Rango de Edad', 'Cantidad', 'Porcentaje']],
      body: ageCounts.map(g => [
        g.label,
        g.count,
        ((g.count / totalWithAge) * 100).toFixed(1) + '%',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DARK_GRAY, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ─── 6. Distribución por Departamento ─────────────────
  const deptCounts = {};
  players.forEach(p => {
    const dept = p.departamento || 'Sin dato';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const deptRows = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([dept, count]) => [dept, count, ((count / totalPlayers) * 100).toFixed(1) + '%']);

  if (deptRows.length > 0) {
    addSectionTitle('Distribución por Departamento (Top 10)');
    autoTable(doc, {
      startY: y,
      margin: { left: 15, right: 15 },
      head: [['Departamento', 'Cantidad', 'Porcentaje']],
      body: deptRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DARK_GRAY, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ─── 7. Ropa Más Distribuida ──────────────────────────
  if (distributions.length > 0 && inventory.length > 0) {
    const itemMap = {};
    inventory.forEach(item => { itemMap[item.id] = item.name; });

    const itemCounts = {};
    const itemReturned = {};
    distributions.forEach(d => {
      const name = itemMap[d.item_id] || 'Desconocido';
      itemCounts[name] = (itemCounts[name] || 0) + 1;
      if (d.return_date) itemReturned[name] = (itemReturned[name] || 0) + 1;
    });

    const topItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => [name, count, itemReturned[name] || 0]);

    addSectionTitle('Ropa Más Distribuida (Top 10)');
    autoTable(doc, {
      startY: y,
      margin: { left: 15, right: 15 },
      head: [['Ítem', 'Entregas', 'Devueltos']],
      body: topItems,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DARK_GRAY, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ─── Footer on last page ──────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  // ─── Save ─────────────────────────────────────────────
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const fileName = `Reporte-Dashboard-${dd}-${mm}-${yyyy}.pdf`;
  doc.save(fileName);
}
