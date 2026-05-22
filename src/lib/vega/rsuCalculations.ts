/**
 * VEGA — Pipeline de calcul RSU.
 * Réplique fidèle de src/utils/rsuCalculations.ts (myfincare.fr).
 *
 * 100 % client-side. Aucun résultat n'est persisté.
 */
import type {
  RSUCessionParams,
  RSUFiscalParams,
  RSUPlan,
  RSUPlanResult,
  RSUResultatAnnuel,
  RSURegime,
  RSUSimulationResult,
} from "./types";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function resoudreDateCession(
  plan: RSUPlan,
  params: RSUCessionParams,
): string {
  if (params.mode === "avance" && params.datesCessionParPlan?.[plan.id]) {
    return params.datesCessionParPlan[plan.id];
  }
  return params.dateCession;
}

function anneeFiscale(dateIso: string): number {
  return new Date(dateIso).getFullYear();
}

function getAbattementDureeDetention(
  plan: RSUPlan,
  dateCessionIso: string,
  fiscal: RSUFiscalParams,
): number {
  if (!plan.dateFinConservation) return 0;
  const start = new Date(plan.dateFinConservation).getTime();
  const end = new Date(dateCessionIso).getTime();
  const years = (end - start) / (365.25 * 24 * 3600 * 1000);
  if (years < 2) return 0;
  if (years < 8) return fiscal.pvAbattement2ans / 100;
  return fiscal.pvAbattement8ans / 100;
}

// ------------------------------------------------------------------
// Étape 1 — Consolidation tranches 300 k€
// ------------------------------------------------------------------

interface TrancheInfo {
  trancheA: number;
  trancheB: number;
}

function computeConsolidatedTranches(
  plans: RSUPlan[],
  params: RSUCessionParams,
  fiscal: RSUFiscalParams,
): Map<string, TrancheInfo> {
  const result = new Map<string, TrancheInfo>();
  // Regroupement par année fiscale, uniquement pour AGA_2017 + AGA_POST2018
  const groupes = new Map<number, RSUPlan[]>();
  for (const plan of plans) {
    if (plan.regime !== "AGA_2017" && plan.regime !== "AGA_POST2018") continue;
    const dateCession = resoudreDateCession(plan, params);
    const annee = anneeFiscale(dateCession);
    const list = groupes.get(annee) ?? [];
    list.push(plan);
    groupes.set(annee, list);
  }
  for (const [, group] of groupes) {
    const gainAnnee = group.reduce((s, p) => s + p.gainAcquisitionTotal, 0);
    if (gainAnnee <= 0) continue;
    const trancheATotal = Math.min(gainAnnee, fiscal.abattementSeuil);
    const trancheBTotal = Math.max(0, gainAnnee - fiscal.abattementSeuil);
    for (const plan of group) {
      const ratio = plan.gainAcquisitionTotal / gainAnnee;
      result.set(plan.id, {
        trancheA: trancheATotal * ratio,
        trancheB: trancheBTotal * ratio,
      });
    }
  }
  return result;
}

// ------------------------------------------------------------------
// Étape 2 — Calcul par plan
// ------------------------------------------------------------------

function getPVCession(
  plan: RSUPlan,
  params: RSUCessionParams,
): number {
  const prixCessionEur =
    plan.devise === "USD"
      ? params.prixVente * params.tauxChangeVente
      : params.prixVente;
  if (plan.nbRsuTotal <= 0) return 0;
  const valeurMoyAcq = plan.gainAcquisitionTotal / plan.nbRsuTotal;
  const pv = plan.nbRsuTotal * (prixCessionEur - valeurMoyAcq);
  return Math.max(0, pv);
}

interface GainTaxResult {
  ir: number;
  ps: number;
  contrib: number;
  abattementApplique: number;
}

function computeGainTax(
  plan: RSUPlan,
  dateCessionIso: string,
  tranches: TrancheInfo | undefined,
  fiscal: RSUFiscalParams,
  tmi: number,
): GainTaxResult {
  const gain = plan.gainAcquisitionTotal;
  const regime: RSURegime = plan.regime;

  switch (regime) {
    case "AGA_PRE2012": {
      return {
        ir: gain * (fiscal.agaPre2012Ir / 100),
        ps: gain * (fiscal.agaPre2012Ps / 100),
        contrib: gain * (fiscal.agaPre2012Contrib / 100),
        abattementApplique: 0,
      };
    }
    case "AGA_2012_2015": {
      return {
        ir: gain * tmi,
        ps: gain * (fiscal.aga20122015Ps / 100),
        contrib: gain * (fiscal.aga20122015Contrib / 100),
        abattementApplique: 0,
      };
    }
    case "AGA_2015_2016": {
      const abat = getAbattementDureeDetention(plan, dateCessionIso, fiscal);
      return {
        ir: gain * (1 - abat) * tmi,
        ps: gain * (fiscal.aga20152016Ps / 100),
        contrib: 0,
        abattementApplique: abat,
      };
    }
    case "AGA_2017": {
      const abat = getAbattementDureeDetention(plan, dateCessionIso, fiscal);
      const trancheA = tranches?.trancheA ?? Math.min(gain, fiscal.abattementSeuil);
      const trancheB = tranches?.trancheB ?? Math.max(0, gain - fiscal.abattementSeuil);
      return {
        ir: trancheA * (1 - abat) * tmi + trancheB * tmi,
        ps: gain * (fiscal.aga2017Ps / 100),
        contrib: 0,
        abattementApplique: abat,
      };
    }
    case "AGA_POST2018": {
      const abat = fiscal.agaPost2018AbattementTaux / 100;
      const trancheA = tranches?.trancheA ?? Math.min(gain, fiscal.abattementSeuil);
      const trancheB = tranches?.trancheB ?? Math.max(0, gain - fiscal.abattementSeuil);
      return {
        ir: trancheA * abat * tmi + trancheB * tmi,
        ps: gain * (fiscal.agaPost2018Ps / 100),
        contrib: 0,
        abattementApplique: abat,
      };
    }
    case "NON_QUALIFIE": {
      return {
        ir: gain * tmi,
        ps: gain * (fiscal.nqPs / 100),
        contrib: gain * (fiscal.nqContrib / 100),
        abattementApplique: 0,
      };
    }
  }
}

function computePlanResult(
  plan: RSUPlan,
  params: RSUCessionParams,
  fiscal: RSUFiscalParams,
  tranches: TrancheInfo | undefined,
): RSUPlanResult {
  const dateCession = resoudreDateCession(plan, params);
  const pvCession = getPVCession(plan, params);
  const gainTax = computeGainTax(plan, dateCession, tranches, fiscal, params.tmi);
  // PV cession : PFU systématique
  const irPv = pvCession * (fiscal.pvCessionPfuIr / 100);
  const psPv = pvCession * (fiscal.pvCessionPs / 100);

  const totalImpots = gainTax.ir + gainTax.ps + gainTax.contrib + irPv + psPv;
  const gainNet = plan.gainAcquisitionTotal + pvCession - totalImpots;

  return {
    planId: plan.id,
    nom: plan.nom,
    regime: plan.regime,
    dateCession,
    gainAcquisition: plan.gainAcquisitionTotal,
    ir: gainTax.ir,
    ps: gainTax.ps,
    contrib: gainTax.contrib,
    abattementApplique: gainTax.abattementApplique,
    pvCession,
    irPv,
    psPv,
    totalImpots,
    gainNet,
    trancheA: tranches?.trancheA ?? 0,
    trancheB: tranches?.trancheB ?? 0,
  };
}

// ------------------------------------------------------------------
// Étape 3 — Agrégation portfolio + mode avancé
// ------------------------------------------------------------------

export function calculateRSUSimulation(
  plans: RSUPlan[],
  params: RSUCessionParams,
  fiscal: RSUFiscalParams,
): RSUSimulationResult {
  const tranchesMap = computeConsolidatedTranches(plans, params, fiscal);

  const planResults: RSUPlanResult[] = plans.map((plan) =>
    computePlanResult(plan, params, fiscal, tranchesMap.get(plan.id)),
  );

  const gainAcquisitionTotal = planResults.reduce(
    (s, r) => s + r.gainAcquisition,
    0,
  );
  const pvTotal = planResults.reduce((s, r) => s + r.pvCession, 0);
  const gainBrutTotal = gainAcquisitionTotal + pvTotal;
  const totalImpots = planResults.reduce((s, r) => s + r.totalImpots, 0);
  const gainNet = planResults.reduce((s, r) => s + r.gainNet, 0);
  const tauxEffectif = gainBrutTotal > 0 ? totalImpots / gainBrutTotal : 0;

  let resultatsParAnnee: RSUResultatAnnuel[] | undefined;
  if (params.mode === "avance") {
    const groupes = new Map<number, RSUPlanResult[]>();
    for (const r of planResults) {
      const annee = anneeFiscale(r.dateCession);
      const list = groupes.get(annee) ?? [];
      list.push(r);
      groupes.set(annee, list);
    }
    resultatsParAnnee = [...groupes.entries()]
      .sort(([a], [b]) => a - b)
      .map(([annee, items]) => {
        const gainAcq = items.reduce((s, r) => s + r.gainAcquisition, 0);
        const pv = items.reduce((s, r) => s + r.pvCession, 0);
        const impots = items.reduce((s, r) => s + r.totalImpots, 0);
        const net = items.reduce((s, r) => s + r.gainNet, 0);
        // Impact bulletin : seuls les plans NON_QUALIFIE
        const impactBulletin = items
          .filter((r) => r.regime === "NON_QUALIFIE")
          .reduce((s, r) => s + r.ir + r.ps + r.contrib, 0);
        return {
          annee,
          plans: items,
          gainAcquisitionTotal: gainAcq,
          pvTotal: pv,
          totalImpots: impots,
          gainNet: net,
          impactBulletin,
        };
      });
  }

  return {
    plans: planResults,
    gainBrutTotal,
    gainAcquisitionTotal,
    pvTotal,
    totalImpots,
    gainNet,
    tauxEffectif,
    resultatsParAnnee,
  };
}
