/**
 * VEGA — Paramètres fiscaux 2026.
 * Source : règles fiscales FR au 1er janvier 2026.
 * Mise à jour annuelle = simple edit. Une bascule en table Supabase
 * `fiscal_rules` est possible plus tard si besoin.
 */
import type { RSUFiscalParams } from "./types";

export const FISCAL_RULES_2026: RSUFiscalParams = {
  pvCessionPfuIr: 12.8,
  pvCessionPs: 17.2,
  pvAbattement2ans: 50,
  pvAbattement8ans: 65,
  abattementSeuil: 300_000,
  agaPre2012Ir: 30,
  agaPre2012Ps: 17.2,
  agaPre2012Contrib: 10,
  aga20122015Ps: 9.7,
  aga20122015Contrib: 10,
  aga20152016Ps: 17.2,
  aga2017Ps: 17.2,
  agaPost2018AbattementTaux: 50,
  agaPost2018Ps: 17.2,
  nqPs: 9.7,
  nqContrib: 10,
};

export function getFiscalRules(_year?: number): RSUFiscalParams {
  // v1 : on retourne toujours 2026. Hook pour évolution future.
  return FISCAL_RULES_2026;
}

/** TMI standard FR (barème 2026 simplifié). */
export const TMI_OPTIONS = [
  { value: 0, label: "0 % (non imposable)" },
  { value: 0.11, label: "11 %" },
  { value: 0.3, label: "30 %" },
  { value: 0.41, label: "41 %" },
  { value: 0.45, label: "45 %" },
];
