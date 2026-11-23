// Consulta del carné de deportista en la Secretaría Nacional de Deporte (SND).
// La comparten check-ficha-medica (consulta manual desde la app) y
// refresh-fichas-medicas (chequeo automático nocturno).

export type FichaSND = { deporte: string; desde: string; hasta: string; vencido: boolean };
export type ConsultaSND = { found: false } | { found: true; nombre: string; fichas: FichaSND[] };

const SND_URL = "https://aps.deporte.gub.uy/ConsultaCarneDeportista/Carnes/consultar";

/** tipo_documento de players → idtipodocumento de SND (mismo mapeo que database.checkFichaMedica). */
export function idTipoDocumento(tipoDocumento: string | null): number {
  return ({ "Cédula de Identidad": 1, "Pasaporte": 2, "Otro": 3 } as Record<string, number>)[tipoDocumento ?? ""] ?? 1;
}

/** Solo a las cédulas se les quitan los caracteres que no son dígitos. */
export function normalizarDocumento(govId: string, tipoDocumento: string | null): string {
  const raw = String(govId);
  return (tipoDocumento ?? "Cédula de Identidad") === "Cédula de Identidad" ? raw.replace(/\D/g, "") : raw.trim();
}

export async function consultarSND(documento: string, idtipodocumento = 1): Promise<ConsultaSND> {
  const body = new URLSearchParams();
  body.append("documento", String(documento));
  body.append("idtipodocumento", String(idtipodocumento));

  const res = await fetch(SND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`SND respondió ${res.status}`);
  const html = await res.text();

  if (html.includes("No existen resultados")) return { found: false };

  const nameMatch = html.match(/<h4>([^<(]+)/);
  const nombre = nameMatch ? nameMatch[1].trim() : "";

  // Cada deporte: <strong>FÚTBOL</strong>: desde DD/MM/YYYY hasta DD/MM/YYYY
  const fichas: FichaSND[] = [];
  const blockRegex = /<strong>([^<]+)<\/strong>[^]*?desde\s+([\d\/]+)[^]*?hasta\s+([\d\/]+)/g;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let match;
  while ((match = blockRegex.exec(html)) !== null) {
    const hasta = match[3].trim();
    const [d, m, y] = hasta.split("/").map(Number);
    fichas.push({
      deporte: match[1].trim(),
      desde: match[2].trim(),
      hasta,
      vencido: new Date(y, m - 1, d) < today,
    });
  }

  return { found: true, nombre, fichas };
}

/** La ficha de fútbol (coincidencia exacta, igual que la app). */
export function fichaFutbol(fichas: FichaSND[]): FichaSND | undefined {
  return fichas.find((f) => ["FÚTBOL", "FUTBOL"].includes(f.deporte.toUpperCase()));
}

/** 'DD/MM/YYYY' → 'YYYY-MM-DD' */
export function hastaToISO(hasta: string): string {
  const [d, m, y] = hasta.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
