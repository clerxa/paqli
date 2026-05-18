/**
 * Calcul de la complétude du profil entreprise par section.
 * Toutes les fonctions retournent un score entier 0-100.
 */

export interface CompletenessOrg {
  name?: string | null;
  siret?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  tagline?: string | null;
  description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  key_figures?: Array<{ label: string; value: string }> | null;
  values?: string[] | null;
  culture_note?: string | null;
}

function pct(filled: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((filled / total) * 100);
}

export function calcLegalCompleteness(org: CompletenessOrg): number {
  const fields = [org.name, org.siret, org.address_street, org.address_city];
  return pct(fields.filter(Boolean).length, fields.length);
}

export function calcPresentationCompleteness(org: CompletenessOrg): number {
  const fields = [org.tagline, org.description, org.logo_url, org.website_url];
  return pct(fields.filter(Boolean).length, fields.length);
}

export function calcKeyFiguresCompleteness(org: CompletenessOrg): number {
  const figures = org.key_figures ?? [];
  if (figures.length === 0) return 0;
  if (figures.length >= 4) return 100;
  return pct(figures.length, 4);
}

export function calcValuesCompleteness(org: CompletenessOrg): number {
  const hasValues = (org.values?.length ?? 0) > 0;
  const hasCulture = !!org.culture_note;
  return pct([hasValues, hasCulture].filter(Boolean).length, 2);
}

export function calcTestimonialsCompleteness(count: number): number {
  if (count === 0) return 0;
  if (count >= 3) return 100;
  return pct(count, 3);
}
