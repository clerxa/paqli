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

export interface ScoreBreakdown {
  total: number;
  categories: {
    remuneration: number;
    avantages: number;
    poste: number;
    clauses: number;
  };
  maxes: {
    remuneration: number;
    avantages: number;
    poste: number;
    clauses: number;
  };
}

export const SCORE_MAXES = {
  remuneration: 40,
  avantages: 25,
  poste: 20,
  clauses: 15,
};

export function computeTransparencyScore(
  pkg: TransparencyPackage | null | undefined,
  company: TransparencyCompany | null | undefined,
): ScoreBreakdown {
  const p = pkg ?? {};
  const c = company ?? {};

  let remuneration = 0;
  let avantages = 0;
  let poste = 0;
  let clauses = 0;

  // Rémunération (40)
  if (p.fixed_salary || p.gross_salary) remuneration += 15;
  if (p.salary_range_min && p.salary_range_max) remuneration += 5;
  if (p.variable_enabled !== null && p.variable_enabled !== undefined)
    remuneration += 8;
  if (p.variable_enabled && p.variable_criteria) remuneration += 4;
  if (p.equity_type) remuneration += 8;

  // Avantages (25)
  if (c.health_insurance_employer_rate) avantages += 6;
  if (c.meal_voucher_enabled !== null && c.meal_voucher_enabled !== undefined)
    avantages += 4;
  if (c.remote_work_policy) avantages += 5;
  if (
    (c.profit_sharing_enabled !== null && c.profit_sharing_enabled !== undefined) ||
    (c.incentive_enabled !== null && c.incentive_enabled !== undefined)
  )
    avantages += 5;
  if (c.training_budget_per_person || p.training_budget_specific)
    avantages += 5;

  // Poste (20)
  if (p.job_title || p.title) poste += 4;
  if (p.seniority) poste += 3;
  if (p.hiring_manager) poste += 4;
  if (p.team_description) poste += 4;
  if (p.career_path) poste += 5;

  // Clauses (15)
  if (p.non_compete_enabled !== null && p.non_compete_enabled !== undefined)
    clauses += 8;
  if (p.probation_months) clauses += 4;
  if (p.probation_objectives) clauses += 3;

  const total = Math.min(
    100,
    remuneration + avantages + poste + clauses,
  );

  return {
    total,
    categories: { remuneration, avantages, poste, clauses },
    maxes: SCORE_MAXES,
  };
}

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 85)
    return { label: "Offre très transparente", color: "#22863a" };
  if (score >= 65) return { label: "Offre transparente", color: "#2D5F6E" };
  if (score >= 45)
    return { label: "Offre partiellement documentée", color: "#C4A882" };
  return { label: "Offre incomplète", color: "#E8835A" };
}
