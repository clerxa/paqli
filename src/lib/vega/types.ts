/**
 * VEGA — Types pour le moteur de calcul RSU.
 * Réplique fidèle de src/types/rsu.ts (myfincare.fr).
 */

export type RSURegime =
  | "AGA_PRE2012"
  | "AGA_2012_2015"
  | "AGA_2015_2016"
  | "AGA_2017"
  | "AGA_POST2018"
  | "NON_QUALIFIE";

export type Currency = "EUR" | "USD";

export interface VestingLine {
  date: string; // ISO date
  nbRsu: number;
  cours: number;
  tauxChange: number; // 1 si EUR
  gainEur: number; // déjà converti
}

export interface RSUPlan {
  id: string;
  nom: string;
  ticker?: string;
  entrepriseNom?: string;
  anneeAttribution: number;
  regime: RSURegime;
  devise: Currency;
  dateFinConservation?: string; // ISO
  vestings: VestingLine[];
  gainAcquisitionTotal: number;
  nbRsuTotal: number;
}

export interface RSUCessionParams {
  mode: "simple" | "avance";
  prixVente: number; // dans la devise du plan
  tauxChangeVente: number; // si USD
  tmi: number; // 0, 0.11, 0.30, 0.41, 0.45
  dateCession: string; // mode simple
  datesCessionParPlan?: Record<string, string>; // mode avancé
}

export interface RSUFiscalParams {
  pvCessionPfuIr: number;
  pvCessionPs: number;
  pvAbattement2ans: number;
  pvAbattement8ans: number;
  abattementSeuil: number;
  agaPre2012Ir: number;
  agaPre2012Ps: number;
  agaPre2012Contrib: number;
  aga20122015Ps: number;
  aga20122015Contrib: number;
  aga20152016Ps: number;
  aga2017Ps: number;
  agaPost2018AbattementTaux: number;
  agaPost2018Ps: number;
  nqPs: number;
  nqContrib: number;
}

export interface RSUPlanResult {
  planId: string;
  nom: string;
  regime: RSURegime;
  dateCession: string;
  // Gain d'acquisition
  gainAcquisition: number;
  ir: number;
  ps: number;
  contrib: number;
  abattementApplique: number; // 0 .. 1
  // PV cession
  pvCession: number;
  irPv: number;
  psPv: number;
  // Total
  totalImpots: number;
  gainNet: number;
  // Tranches (consolidées)
  trancheA: number;
  trancheB: number;
}

export interface RSUResultatAnnuel {
  annee: number;
  plans: RSUPlanResult[];
  gainAcquisitionTotal: number;
  pvTotal: number;
  totalImpots: number;
  gainNet: number;
  impactBulletin: number; // IR+PS+contrib des plans NON_QUALIFIE
}

export interface RSUSimulationResult {
  plans: RSUPlanResult[];
  gainBrutTotal: number; // gain acquisition + PV
  gainAcquisitionTotal: number;
  pvTotal: number;
  totalImpots: number;
  gainNet: number;
  tauxEffectif: number; // 0..1
  resultatsParAnnee?: RSUResultatAnnuel[]; // mode avancé
}
