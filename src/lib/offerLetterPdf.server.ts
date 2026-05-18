// Real PDF generation for hiring promise documents — runs in Workers via pdf-lib.
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
// Bundle real TTFs as base64 strings so viewers don't substitute Standard14
// fonts (which causes visible character gaps in Chrome/poppler/PDFium).
import interRegularB64 from "@/assets/fonts/Inter_400Regular.ttf.base64";
import interBoldB64 from "@/assets/fonts/Inter_700Bold.ttf.base64";

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface OfferLetterSnapshot {
  candidateName: string;
  candidateEmail: string;
  orgName: string;
  orgSiret: string;
  orgAddress: string;
  jobTitle: string;
  contractType: string;
  locationCity: string;
  locationDetails: string | null;
  grossSalary: number;
  variableTarget: number | null;
  startDate: string | null;
  trialPeriodMonths: number | null;
  trialPeriodRenewable: boolean;
  remotePolicy: string | null;
  remoteDays: number | null;
  remoteGuaranteed: boolean;
  rhName: string;
  rhEmail: string;
  generatedAt: string;
  /** Free-form additional clauses written by the RH */
  additionalClauses?: string | null;
}

const CONTRACT_LABELS: Record<string, string> = {
  cdi: "Contrat à Durée Indéterminée (CDI)",
  cdd: "Contrat à Durée Déterminée (CDD)",
  freelance: "Contrat de prestation de services",
  alternance: "Contrat d'alternance",
  stage: "Convention de stage",
};

const REMOTE_LABELS: Record<string, string> = {
  full_remote: "Télétravail complet (full remote)",
  hybrid: "Télétravail hybride",
  office_first: "Majoritairement en présentiel",
  on_site: "Présentiel complet",
};

// ── Sanitize text for WinAnsi-encoded standard fonts ─────────────────────────
function sanitize(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\u20AC/g, "€")
    // Strip any remaining non-WinAnsi chars (emoji etc.)
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF€]/g, "");
}

function fmtEUR(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface Cursor {
  page: PDFPage;
  y: number;
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = { left: 56, right: 56, top: 56, bottom: 64 };
const CONTENT_WIDTH = A4.width - MARGIN.left - MARGIN.right;

const INK = rgb(0.176, 0.149, 0.251); // #2D2640
const MUTED = rgb(0.322, 0.286, 0.439); // #524970
const FAINT = rgb(0.608, 0.592, 0.627); // #9B97A0
const RULE = rgb(0.85, 0.83, 0.88);

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (!rawLine.trim()) {
      lines.push("");
      continue;
    }
    const words = rawLine.split(/\s+/);
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function ensureSpace(
  doc: PDFDocument,
  cur: Cursor,
  needed: number,
): Cursor {
  if (cur.y - needed < MARGIN.bottom) {
    const page = doc.addPage([A4.width, A4.height]);
    return { page, y: A4.height - MARGIN.top };
  }
  return cur;
}

function drawParagraph(
  doc: PDFDocument,
  cur: Cursor,
  text: string,
  opts: { font: PDFFont; size: number; color?: ReturnType<typeof rgb>; lineHeight?: number; gapAfter?: number },
): Cursor {
  const lh = opts.lineHeight ?? opts.size * 1.45;
  const lines = wrapText(sanitize(text), opts.font, opts.size, CONTENT_WIDTH);
  let c = cur;
  for (const line of lines) {
    c = ensureSpace(doc, c, lh);
    c.page.drawText(line, {
      x: MARGIN.left,
      y: c.y - opts.size,
      size: opts.size,
      font: opts.font,
      color: opts.color ?? INK,
    });
    c = { page: c.page, y: c.y - lh };
  }
  if (opts.gapAfter) c = { page: c.page, y: c.y - opts.gapAfter };
  return c;
}

function drawSectionTitle(
  doc: PDFDocument,
  cur: Cursor,
  text: string,
  font: PDFFont,
): Cursor {
  let c = ensureSpace(doc, cur, 32);
  c = { page: c.page, y: c.y - 14 };
  c.page.drawText(sanitize(text), {
    x: MARGIN.left,
    y: c.y - 11,
    size: 11,
    font,
    color: INK,
  });
  c = { page: c.page, y: c.y - 14 };
  c.page.drawLine({
    start: { x: MARGIN.left, y: c.y },
    end: { x: MARGIN.left + CONTENT_WIDTH, y: c.y },
    thickness: 0.6,
    color: RULE,
  });
  return { page: c.page, y: c.y - 10 };
}

function drawFact(
  doc: PDFDocument,
  cur: Cursor,
  label: string,
  value: string,
  fontReg: PDFFont,
  fontBold: PDFFont,
): Cursor {
  const labelSize = 9.5;
  const valueSize = 10;
  const labelW = 170;
  const valueMaxW = CONTENT_WIDTH - labelW - 8;
  const valueLines = wrapText(sanitize(value), fontBold, valueSize, valueMaxW);
  const blockH = Math.max(14, valueLines.length * valueSize * 1.35) + 4;
  let c = ensureSpace(doc, cur, blockH);
  c.page.drawText(sanitize(label), {
    x: MARGIN.left,
    y: c.y - labelSize,
    size: labelSize,
    font: fontReg,
    color: MUTED,
  });
  let ly = c.y;
  for (const line of valueLines) {
    c.page.drawText(line, {
      x: MARGIN.left + labelW,
      y: ly - valueSize,
      size: valueSize,
      font: fontBold,
      color: INK,
    });
    ly -= valueSize * 1.35;
  }
  return { page: c.page, y: c.y - blockH };
}

export async function buildOfferLetterPdf(s: OfferLetterSnapshot): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Promesse d'embauche — ${s.candidateName}`);
  doc.setAuthor(s.orgName);
  doc.setProducer("Paqli");
  doc.setCreator("Paqli");

  doc.registerFontkit(fontkit);
  const fontSans = await doc.embedFont(b64ToBytes(interRegularB64));
  const fontSansBold = await doc.embedFont(b64ToBytes(interBoldB64));
  // Use regular for "italic" slots (Inter italic not bundled); visual hierarchy
  // is preserved via color/size, and viewers no longer substitute glyph widths.
  const fontReg = fontSans;
  const fontBold = fontSansBold;
  const fontItalic = fontSans;

  const page = doc.addPage([A4.width, A4.height]);
  let cur: Cursor = { page, y: A4.height - MARGIN.top };

  // Header
  cur.page.drawText(sanitize(s.orgName), {
    x: MARGIN.left,
    y: cur.y - 12,
    size: 12,
    font: fontSansBold,
    color: INK,
  });
  cur = { page: cur.page, y: cur.y - 16 };
  const headerLines = [s.orgAddress, `SIRET : ${s.orgSiret}`];
  for (const l of headerLines) {
    cur.page.drawText(sanitize(l), {
      x: MARGIN.left,
      y: cur.y - 9,
      size: 9,
      font: fontSans,
      color: MUTED,
    });
    cur = { page: cur.page, y: cur.y - 12 };
  }
  // Date right-aligned
  const dateText = `Le ${fmtDate(s.generatedAt)}`;
  const dateW = fontSans.widthOfTextAtSize(sanitize(dateText), 9);
  cur.page.drawText(sanitize(dateText), {
    x: A4.width - MARGIN.right - dateW,
    y: A4.height - MARGIN.top - 12,
    size: 9,
    font: fontSans,
    color: MUTED,
  });

  cur = { page: cur.page, y: cur.y - 24 };

  // Title
  const title = "Promesse d'embauche";
  const titleSize = 22;
  const titleW = fontReg.widthOfTextAtSize(title, titleSize);
  cur.page.drawText(title, {
    x: (A4.width - titleW) / 2,
    y: cur.y - titleSize,
    size: titleSize,
    font: fontReg,
    color: INK,
  });
  cur = { page: cur.page, y: cur.y - titleSize - 20 };

  // Recipient
  cur.page.drawText("À L'ATTENTION DE", {
    x: MARGIN.left,
    y: cur.y - 8,
    size: 8,
    font: fontSansBold,
    color: FAINT,
  });
  cur = { page: cur.page, y: cur.y - 14 };
  cur.page.drawText(sanitize(s.candidateName), {
    x: MARGIN.left,
    y: cur.y - 12,
    size: 12,
    font: fontBold,
    color: INK,
  });
  cur = { page: cur.page, y: cur.y - 14 };
  if (s.candidateEmail) {
    cur.page.drawText(sanitize(s.candidateEmail), {
      x: MARGIN.left,
      y: cur.y - 10,
      size: 10,
      font: fontReg,
      color: MUTED,
    });
    cur = { page: cur.page, y: cur.y - 14 };
  }

  cur = { page: cur.page, y: cur.y - 8 };
  cur = drawParagraph(
    doc,
    cur,
    `${s.orgName} a le plaisir de vous confirmer sa décision de vous recruter aux conditions suivantes :`,
    { font: fontReg, size: 10.5, gapAfter: 6 },
  );

  // Section 1 — Poste
  cur = drawSectionTitle(doc, cur, "1. Poste proposé", fontSansBold);
  cur = drawFact(doc, cur, "Intitulé du poste", s.jobTitle, fontItalic, fontBold);
  cur = drawFact(
    doc,
    cur,
    "Type de contrat",
    CONTRACT_LABELS[s.contractType] ?? s.contractType,
    fontItalic,
    fontBold,
  );
  cur = drawFact(
    doc,
    cur,
    "Lieu de travail",
    `${s.locationCity}${s.locationDetails ? ` — ${s.locationDetails}` : ""}`,
    fontItalic,
    fontBold,
  );
  const remoteLine =
    s.remotePolicy && s.remotePolicy !== "on_site"
      ? s.remotePolicy === "hybrid" && s.remoteDays
        ? `Télétravail : ${s.remoteDays} jour${s.remoteDays > 1 ? "s" : ""} par semaine${s.remoteGuaranteed ? " (mentionné au contrat)" : ""}`
        : REMOTE_LABELS[s.remotePolicy] ?? null
      : null;
  if (remoteLine) {
    cur = drawFact(doc, cur, "Modalités de télétravail", remoteLine, fontItalic, fontBold);
  }

  // Section 2 — Rémunération
  cur = drawSectionTitle(doc, cur, "2. Rémunération", fontSansBold);
  cur = drawFact(
    doc,
    cur,
    "Salaire fixe brut annuel",
    fmtEUR(s.grossSalary),
    fontItalic,
    fontBold,
  );
  if (s.variableTarget && s.variableTarget > 0) {
    cur = drawFact(
      doc,
      cur,
      "Variable cible annuel",
      `${fmtEUR(s.variableTarget)} bruts (selon objectifs définis)`,
      fontItalic,
      fontBold,
    );
    cur = drawFact(
      doc,
      cur,
      "Rémunération totale cible",
      `${fmtEUR(s.grossSalary + s.variableTarget)} bruts annuels`,
      fontItalic,
      fontBold,
    );
  }

  // Section 3 — Conditions d'embauche
  cur = drawSectionTitle(doc, cur, "3. Conditions d'embauche", fontSansBold);
  cur = drawFact(
    doc,
    cur,
    "Date de prise de poste",
    s.startDate ? s.startDate : "À définir conjointement avec le candidat",
    fontItalic,
    fontBold,
  );
  if (s.trialPeriodMonths) {
    cur = drawFact(
      doc,
      cur,
      "Période d'essai",
      `${s.trialPeriodMonths} mois${s.trialPeriodRenewable ? ", renouvelable une fois dans les conditions légales" : ""}`,
      fontItalic,
      fontBold,
    );
  }

  // Section 4 — Clauses additionnelles (si présentes)
  if (s.additionalClauses && s.additionalClauses.trim()) {
    cur = drawSectionTitle(doc, cur, "4. Clauses additionnelles", fontSansBold);
    cur = drawParagraph(doc, cur, s.additionalClauses.trim(), {
      font: fontReg,
      size: 10.5,
      gapAfter: 4,
    });
  }

  // Section validité
  const validitySection = s.additionalClauses?.trim()
    ? "5. Validité de la présente promesse"
    : "4. Validité de la présente promesse";
  cur = drawSectionTitle(doc, cur, validitySection, fontSansBold);
  cur = drawParagraph(
    doc,
    cur,
    "La présente promesse d'embauche est établie sous réserve de la réalisation des conditions habituelles d'embauche (obtention des justificatifs d'identité, visite médicale d'embauche, etc.).",
    { font: fontReg, size: 10.5, gapAfter: 4 },
  );
  cur = drawParagraph(
    doc,
    cur,
    "Nous vous remercions de nous retourner ce document daté et signé, avec la mention manuscrite « Bon pour accord », dans un délai raisonnable à compter de sa réception.",
    { font: fontReg, size: 10.5, gapAfter: 12 },
  );

  // Signatures (forcer une nouvelle page si besoin)
  cur = ensureSpace(doc, cur, 120);
  cur = { page: cur.page, y: cur.y - 20 };
  const sigBlockW = (CONTENT_WIDTH - 32) / 2;
  // Rules
  cur.page.drawLine({
    start: { x: MARGIN.left, y: cur.y },
    end: { x: MARGIN.left + sigBlockW, y: cur.y },
    thickness: 0.6,
    color: RULE,
  });
  cur.page.drawLine({
    start: { x: MARGIN.left + sigBlockW + 32, y: cur.y },
    end: { x: MARGIN.left + CONTENT_WIDTH, y: cur.y },
    thickness: 0.6,
    color: RULE,
  });
  cur.page.drawText(sanitize(`POUR ${s.orgName.toUpperCase()}`), {
    x: MARGIN.left,
    y: cur.y - 10,
    size: 8,
    font: fontSansBold,
    color: FAINT,
  });
  cur.page.drawText("LE CANDIDAT", {
    x: MARGIN.left + sigBlockW + 32,
    y: cur.y - 10,
    size: 8,
    font: fontSansBold,
    color: FAINT,
  });
  cur.page.drawText(sanitize(s.rhName || ""), {
    x: MARGIN.left,
    y: cur.y - 60,
    size: 10,
    font: fontBold,
    color: INK,
  });
  cur.page.drawText(sanitize(s.candidateName), {
    x: MARGIN.left + sigBlockW + 32,
    y: cur.y - 60,
    size: 10,
    font: fontBold,
    color: INK,
  });
  cur.page.drawText("Date et signature", {
    x: MARGIN.left,
    y: cur.y - 74,
    size: 9,
    font: fontItalic,
    color: MUTED,
  });
  cur.page.drawText("Date, signature et mention « Bon pour accord »", {
    x: MARGIN.left + sigBlockW + 32,
    y: cur.y - 74,
    size: 9,
    font: fontItalic,
    color: MUTED,
  });

  // Footer on each page
  const total = doc.getPageCount();
  doc.getPages().forEach((p, idx) => {
    const footer = sanitize(`Paqli · paqli.fr · ${fmtDate(s.generatedAt)} · Page ${idx + 1}/${total}`);
    const w = fontSans.widthOfTextAtSize(footer, 8);
    p.drawText(footer, {
      x: (A4.width - w) / 2,
      y: 32,
      size: 8,
      font: fontSans,
      color: FAINT,
    });
  });

  return await doc.save();
}

export async function buildOfferLetterDocument(snapshot: OfferLetterSnapshot): Promise<{
  bytes: Uint8Array;
  contentType: string;
  extension: string;
}> {
  const bytes = await buildOfferLetterPdf(snapshot);
  return {
    bytes,
    contentType: "application/pdf",
    extension: "pdf",
  };
}
