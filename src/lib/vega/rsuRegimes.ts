/**
 * VEGA — Inférence et libellés des régimes fiscaux RSU.
 */
import type { RSURegime } from "./types";

/**
 * Infère le régime fiscal par défaut depuis l'année d'attribution.
 * NON_QUALIFIE doit être saisi manuellement (hors AGA).
 */
export function inferRegimeFromYear(year: number): RSURegime {
  if (year < 2012) return "AGA_PRE2012";
  if (year < 2016) return "AGA_2012_2015"; // jusqu'à août 2015 — simplification
  if (year < 2017) return "AGA_2015_2016";
  if (year < 2018) return "AGA_2017";
  return "AGA_POST2018";
}

export const REGIME_LABELS: Record<RSURegime, string> = {
  AGA_PRE2012: "AGA — avant 2012",
  AGA_2012_2015: "AGA — 2012 à août 2015",
  AGA_2015_2016: "AGA — août 2015 à 2016",
  AGA_2017: "AGA — 2017 (seuil 300 k€)",
  AGA_POST2018: "AGA — depuis 2018 (abattement 50 %)",
  NON_QUALIFIE: "Non qualifié (assimilé salaire)",
};

export const REGIME_SHORT_DESCRIPTIONS: Record<RSURegime, string> = {
  AGA_PRE2012:
    "Régime forfaitaire : IR 30 % + prélèvements sociaux 17,2 % + contribution salariale 10 %.",
  AGA_2012_2015:
    "Imposition au barème (TMI) avec PS 9,7 % et contribution salariale 10 %.",
  AGA_2015_2016:
    "Barème + abattement durée de détention (50 % entre 2 et 8 ans, 65 % après 8 ans).",
  AGA_2017:
    "Abattement durée de détention sous le seuil 300 k€, barème plein au-dessus.",
  AGA_POST2018:
    "Abattement fixe de 50 % sous 300 k€, barème plein au-dessus. PS 17,2 %.",
  NON_QUALIFIE:
    "Traité comme du salaire : IR au barème, PS 9,7 %, contribution 10 %, impact bulletin.",
};

export const REGIME_OPTIONS: { value: RSURegime; label: string }[] = (
  Object.keys(REGIME_LABELS) as RSURegime[]
).map((value) => ({ value, label: REGIME_LABELS[value] }));
