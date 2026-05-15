// Server-only HTML builder for the hiring promise document.
// V1: returns HTML stored in Storage; rendered in iframe; printable via browser.

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildOfferLetterHtml(s: OfferLetterSnapshot): string {
  const generatedDate = new Date(s.generatedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const salaryLine = s.variableTarget
    ? `${s.grossSalary.toLocaleString("fr-FR")} € bruts annuels, auxquels s'ajoute une rémunération variable cible de ${s.variableTarget.toLocaleString("fr-FR")} € bruts annuels selon les objectifs définis`
    : `${s.grossSalary.toLocaleString("fr-FR")} € bruts annuels`;

  const trialLine = s.trialPeriodMonths
    ? `${s.trialPeriodMonths} mois${s.trialPeriodRenewable ? ", renouvelable une fois dans les conditions légales" : ""}`
    : null;

  const remoteLine =
    s.remotePolicy && s.remotePolicy !== "on_site"
      ? s.remotePolicy === "hybrid" && s.remoteDays
        ? `Télétravail : ${s.remoteDays} jour${s.remoteDays > 1 ? "s" : ""} par semaine${s.remoteGuaranteed ? " (mentionné au contrat)" : ""}`
        : REMOTE_LABELS[s.remotePolicy] ?? null
      : null;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Promesse d'embauche — ${escapeHtml(s.candidateName)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #2D2640;
    font-size: 11pt;
    line-height: 1.55;
    margin: 0;
    padding: 32px;
    background: #FAF8F5;
  }
  .doc {
    max-width: 760px;
    margin: 0 auto;
    background: white;
    padding: 48px 56px;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  h1 {
    font-size: 22pt;
    text-align: center;
    margin: 32px 0 24px;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  h2 {
    font-size: 13pt;
    border-bottom: 1px solid rgba(45,38,64,0.15);
    padding-bottom: 6px;
    margin: 24px 0 12px;
    font-weight: 600;
  }
  .header { display: flex; justify-content: space-between; gap: 24px; font-size: 10pt; }
  .header .org strong { display: block; font-size: 12pt; margin-bottom: 4px; }
  .header .meta { text-align: right; color: #524970; }
  .recipient { margin: 24px 0; }
  .recipient .label { text-transform: uppercase; font-size: 9pt; letter-spacing: 1px; color: #9B97A0; margin-bottom: 4px; }
  .recipient strong { font-size: 12pt; }
  dl.facts { margin: 0; }
  dl.facts > div { display: flex; gap: 16px; margin-bottom: 6px; }
  dl.facts dt { width: 200px; flex-shrink: 0; color: #524970; font-style: italic; }
  dl.facts dd { margin: 0; flex: 1; font-weight: 500; }
  p { margin: 0 0 10px; }
  .disclaimer {
    margin: 24px 0;
    padding: 12px 16px;
    background: #FAEEDA;
    border-left: 3px solid #B85A6A;
    font-size: 10pt;
    color: #633806;
    border-radius: 4px;
  }
  .signatures {
    display: flex;
    gap: 32px;
    margin-top: 40px;
  }
  .sig {
    flex: 1;
    border-top: 1px solid rgba(45,38,64,0.2);
    padding-top: 8px;
    font-size: 10pt;
  }
  .sig .role { text-transform: uppercase; font-size: 9pt; letter-spacing: 1px; color: #9B97A0; margin-bottom: 4px; }
  .sig .name { font-weight: 600; margin-top: 48px; }
  .sig .hint { font-style: italic; color: #524970; font-size: 9pt; margin-top: 4px; }
  footer { margin-top: 32px; text-align: center; font-size: 9pt; color: #9B97A0; }
  @media print {
    body { background: white; padding: 0; }
    .doc { box-shadow: none; padding: 0; }
  }
</style>
</head>
<body>
<div class="doc">
  <header class="header">
    <div class="org">
      <strong>${escapeHtml(s.orgName)}</strong>
      ${escapeHtml(s.orgAddress)}<br/>
      SIRET : ${escapeHtml(s.orgSiret)}
    </div>
    <div class="meta">Le ${generatedDate}</div>
  </header>

  <h1>Promesse d'embauche</h1>

  <div class="recipient">
    <div class="label">À l'attention de</div>
    <strong>${escapeHtml(s.candidateName)}</strong>
    ${s.candidateEmail ? `<div>${escapeHtml(s.candidateEmail)}</div>` : ""}
  </div>

  <p>
    <strong>${escapeHtml(s.orgName)}</strong> a le plaisir de vous confirmer
    sa décision de vous recruter aux conditions suivantes :
  </p>

  <h2>1. Poste proposé</h2>
  <dl class="facts">
    <div><dt>Intitulé du poste</dt><dd>${escapeHtml(s.jobTitle)}</dd></div>
    <div><dt>Type de contrat</dt><dd>${escapeHtml(CONTRACT_LABELS[s.contractType] ?? s.contractType)}</dd></div>
    <div><dt>Lieu de travail</dt><dd>${escapeHtml(s.locationCity)}${s.locationDetails ? ` — ${escapeHtml(s.locationDetails)}` : ""}</dd></div>
    ${remoteLine ? `<div><dt>Modalités de télétravail</dt><dd>${escapeHtml(remoteLine)}</dd></div>` : ""}
  </dl>

  <h2>2. Rémunération</h2>
  <dl class="facts">
    <div><dt>Rémunération fixe</dt><dd>${escapeHtml(salaryLine)}.</dd></div>
  </dl>

  <h2>3. Conditions d'embauche</h2>
  <dl class="facts">
    <div>
      <dt>Date de prise de poste</dt>
      <dd>${s.startDate ? escapeHtml(s.startDate) : "À définir conjointement avec le candidat"}</dd>
    </div>
    ${trialLine ? `<div><dt>Période d'essai</dt><dd>${escapeHtml(trialLine)}</dd></div>` : ""}
  </dl>

  <h2>4. Validité de la présente promesse</h2>
  <p>
    La présente promesse d'embauche est établie sous réserve de la réalisation
    des conditions habituelles d'embauche (obtention des justificatifs
    d'identité, visite médicale d'embauche, etc.).
  </p>
  <p>
    Nous vous remercions de nous retourner ce document daté et signé,
    avec la mention manuscrite « Bon pour accord », dans un délai
    raisonnable à compter de sa réception.
  </p>

  <div class="disclaimer">
    ⚠️ Ce document a été généré automatiquement par Paqli à partir des
    informations du package de rémunération. Il constitue une base de
    travail et doit être relu et validé par votre service juridique ou
    un avocat spécialisé en droit social avant envoi. Paqli ne fournit
    pas de conseil juridique.
  </div>

  <div class="signatures">
    <div class="sig">
      <div class="role">Pour ${escapeHtml(s.orgName)}</div>
      <div class="name">${escapeHtml(s.rhName)}</div>
      <div class="hint">Date et signature</div>
    </div>
    <div class="sig">
      <div class="role">Le candidat</div>
      <div class="name">${escapeHtml(s.candidateName)}</div>
      <div class="hint">Date, signature et mention « Bon pour accord »</div>
    </div>
  </div>

  <footer>Document généré par Paqli · paqli.fr · ${generatedDate}</footer>
</div>
</body>
</html>`;
}

// V1 MVP: store as HTML (Workers don't ship Puppeteer). RH prints from browser.
// V2: brancher Browserless / Playwright Cloud pour un vrai PDF.
export function buildOfferLetterDocument(snapshot: OfferLetterSnapshot): {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
} {
  const html = buildOfferLetterHtml(snapshot);
  return {
    bytes: new TextEncoder().encode(html),
    contentType: "text/html; charset=utf-8",
    extension: "html",
  };
}
