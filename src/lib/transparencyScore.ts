export interface TransparencyPackage {
  fixed_salary?: number | null;
  gross_salary?: number | null;
  salary_range_min?: number | null;
  salary_range_max?: number | null;
  variable_enabled?: boolean | null;
  variable_criteria?: string | null;
  equity_type?: string | null;
  job_title?: string | null;
  title?: string | null;
  seniority?: string | null;
  hiring_manager?: string | null;
  team_description?: string | null;
  career_path?: string | null;
  non_compete_enabled?: boolean | null;
  probation_months?: number | null;
  probation_objectives?: string | null;
  training_budget_specific?: number | null;
}

export interface TransparencyCompany {
  health_insurance_employer_rate?: number | null;
  meal_voucher_enabled?: boolean | null;
  remote_work_policy?: string | null;
  profit_sharing_enabled?: boolean | null;
  incentive_enabled?: boolean | null;
  training_budget_per_person?: number | null;
}

export type ScoreCategory = "remuneration" | "avantages" | "poste" | "clauses";
export type ScoreSource = "package" | "company";

export interface MissingField {
  key: string;
  label: string;
  hint: string;
  points: number;
  category: ScoreCategory;
  source: ScoreSource;
  step?: string;
}

export interface ScoreBreakdown {
  total: number;
  categories: Record<ScoreCategory, number>;
  maxes: Record<ScoreCategory, number>;
  missing: MissingField[];
}

export const SCORE_MAXES: Record<ScoreCategory, number> = {
  remuneration: 40,
  avantages: 25,
  poste: 20,
  clauses: 15,
};

interface Rule {
  key: string;
  label: string;
  hint: string;
  points: number;
  category: ScoreCategory;
  source: ScoreSource;
  step?: string;
  ok: (p: TransparencyPackage, c: TransparencyCompany) => boolean;
}

const RULES: Rule[] = [
  // Rémunération (40)
  {
    key: "fixed_salary",
    label: "Salaire fixe annuel",
    hint: "Renseignez le brut annuel (ou la fourchette min/max).",
    points: 15,
    category: "remuneration",
    source: "package",
    step: "Étape Rémunération",
    ok: (p) => !!(p.fixed_salary || p.gross_salary),
  },
  {
    key: "salary_range",
    label: "Fourchette salariale (min/max)",
    hint: "Ajoutez un min et un max — exigé par la directive EU 2026.",
    points: 5,
    category: "remuneration",
    source: "package",
    step: "Étape Rémunération",
    ok: (p) => !!(p.salary_range_min && p.salary_range_max),
  },
  {
    key: "variable_enabled",
    label: "Présence d'un variable (oui/non)",
    hint: "Indiquez si le poste comporte une part variable.",
    points: 8,
    category: "remuneration",
    source: "package",
    step: "Étape Rémunération",
    ok: (p) => p.variable_enabled !== null && p.variable_enabled !== undefined,
  },
  {
    key: "variable_criteria",
    label: "Critères du variable",
    hint: "Décrivez les objectifs / critères qui déclenchent le variable.",
    points: 4,
    category: "remuneration",
    source: "package",
    step: "Étape Rémunération",
    ok: (p) => !p.variable_enabled || !!p.variable_criteria,
  },
  {
    key: "equity_type",
    label: "Type d'equity",
    hint: "BSPCE, AGA, RSU, ESPP… ou « aucun » si non applicable.",
    points: 8,
    category: "remuneration",
    source: "package",
    step: "Étape Equity",
    ok: (p) => !!p.equity_type,
  },

  // Avantages (25)
  {
    key: "health_insurance_employer_rate",
    label: "Prise en charge mutuelle",
    hint: "Renseignez le % employeur dans Paramètres → Mon entreprise.",
    points: 6,
    category: "avantages",
    source: "company",
    step: "Paramètres → Mon entreprise",
    ok: (_p, c) => !!c.health_insurance_employer_rate,
  },
  {
    key: "meal_voucher_enabled",
    label: "Tickets restaurant (oui/non)",
    hint: "Activez ou désactivez les TR dans Paramètres → Mon entreprise.",
    points: 4,
    category: "avantages",
    source: "company",
    step: "Paramètres → Mon entreprise",
    ok: (_p, c) =>
      c.meal_voucher_enabled !== null && c.meal_voucher_enabled !== undefined,
  },
  {
    key: "remote_work_policy",
    label: "Politique de télétravail",
    hint: "Précisez la politique remote dans Paramètres → Mon entreprise.",
    points: 5,
    category: "avantages",
    source: "company",
    step: "Paramètres → Mon entreprise",
    ok: (_p, c) => !!c.remote_work_policy,
  },
  {
    key: "epargne",
    label: "Épargne salariale (intéressement / participation)",
    hint: "Indiquez la présence d'intéressement ou de participation.",
    points: 5,
    category: "avantages",
    source: "company",
    step: "Paramètres → Mon entreprise",
    ok: (_p, c) =>
      (c.profit_sharing_enabled !== null &&
        c.profit_sharing_enabled !== undefined) ||
      (c.incentive_enabled !== null && c.incentive_enabled !== undefined),
  },
  {
    key: "training_budget",
    label: "Budget formation",
    hint: "Renseignez un budget par personne ou spécifique au poste.",
    points: 5,
    category: "avantages",
    source: "company",
    step: "Paramètres → Mon entreprise",
    ok: (p, c) =>
      !!c.training_budget_per_person || !!p.training_budget_specific,
  },

  // Poste (20)
  {
    key: "job_title",
    label: "Intitulé du poste",
    hint: "Ajoutez un intitulé clair.",
    points: 4,
    category: "poste",
    source: "package",
    step: "Étape Poste",
    ok: (p) => !!(p.job_title || p.title),
  },
  {
    key: "seniority",
    label: "Séniorité",
    hint: "Junior / Confirmé / Senior / Lead…",
    points: 3,
    category: "poste",
    source: "package",
    step: "Étape Poste",
    ok: (p) => !!p.seniority,
  },
  {
    key: "hiring_manager",
    label: "Manager direct",
    hint: "Indiquez qui sera le manager du candidat.",
    points: 4,
    category: "poste",
    source: "package",
    step: "Étape Poste",
    ok: (p) => !!p.hiring_manager,
  },
  {
    key: "team_description",
    label: "Description de l'équipe",
    hint: "Quelques lignes sur la taille et la composition de l'équipe.",
    points: 4,
    category: "poste",
    source: "package",
    step: "Étape Poste",
    ok: (p) => !!p.team_description,
  },
  {
    key: "career_path",
    label: "Perspectives d'évolution",
    hint: "Décrivez la trajectoire possible (rôles, niveaux, horizons).",
    points: 5,
    category: "poste",
    source: "package",
    step: "Étape Poste",
    ok: (p) => !!p.career_path,
  },

  // Clauses (15)
  {
    key: "non_compete_enabled",
    label: "Clause de non-concurrence (oui/non)",
    hint: "Précisez si une clause de non-concurrence s'applique.",
    points: 8,
    category: "clauses",
    source: "package",
    step: "Étape Clauses",
    ok: (p) =>
      p.non_compete_enabled !== null && p.non_compete_enabled !== undefined,
  },
  {
    key: "probation_months",
    label: "Durée de période d'essai",
    hint: "Renseignez la durée (en mois) de la période d'essai.",
    points: 4,
    category: "clauses",
    source: "package",
    step: "Étape Clauses",
    ok: (p) => !!p.probation_months,
  },
  {
    key: "probation_objectives",
    label: "Objectifs de période d'essai",
    hint: "Décrivez les attendus mesurables sur la période d'essai.",
    points: 3,
    category: "clauses",
    source: "package",
    step: "Étape Clauses",
    ok: (p) => !!p.probation_objectives,
  },
];

export function computeTransparencyScore(
  pkg: TransparencyPackage | null | undefined,
  company: TransparencyCompany | null | undefined,
): ScoreBreakdown {
  const p = pkg ?? {};
  const c = company ?? {};

  const categories: Record<ScoreCategory, number> = {
    remuneration: 0,
    avantages: 0,
    poste: 0,
    clauses: 0,
  };
  const missing: MissingField[] = [];

  for (const r of RULES) {
    if (r.ok(p, c)) {
      categories[r.category] += r.points;
    } else {
      missing.push({
        key: r.key,
        label: r.label,
        hint: r.hint,
        points: r.points,
        category: r.category,
        source: r.source,
        step: r.step,
      });
    }
  }

  const total = Math.min(
    100,
    categories.remuneration +
      categories.avantages +
      categories.poste +
      categories.clauses,
  );

  return { total, categories, maxes: SCORE_MAXES, missing };
}

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 85)
    return { label: "Offre très transparente", color: "#22863a" };
  if (score >= 65) return { label: "Offre transparente", color: "#2D5F6E" };
  if (score >= 45)
    return { label: "Offre partiellement documentée", color: "#C4A882" };
  return { label: "Offre incomplète", color: "#E8835A" };
}

export const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  remuneration: "Rémunération",
  avantages: "Avantages",
  poste: "Contexte du poste",
  clauses: "Clauses",
};
