// Client-side fiscal estimation engine for Paqli candidate view
// Rates hardcoded for 2026 — used for real-time recalculation

export const TAX_2026 = {
  FLAT_TAX: 0.314,
  IR_BSPCE_3Y_PLUS: 0.128,
  IR_BSPCE_UNDER_3Y: 0.30,
  PS_RATE: 0.186,
  CSG_CRDS: 0.097,
  SOCIAL_CHARGES_SALARY: 0.22,
};

export const BSPCE_TAX_HIGH_SENIORITY =
  TAX_2026.IR_BSPCE_3Y_PLUS + TAX_2026.PS_RATE; // 0.314 ≥ 3 ans
export const BSPCE_TAX_LOW_SENIORITY =
  TAX_2026.IR_BSPCE_UNDER_3Y + TAX_2026.PS_RATE; // 0.486 < 3 ans

export type TMI = 0.11 | 0.30 | 0.41 | 0.45;

export interface CandidateParams {
  tmi: TMI;
  seniority: 1 | 2 | 3 | 5;
  peeContribution: number;
}

export interface EquityDeviceRow {
  id: string;
  type: string;
  quantity: number;
  strike_price: number;
  current_valuation_m: number;
  vesting_years: number;
  cliff_months: number;
}

export interface SavingsDeviceRow {
  id: string;
  type: string;
  matching_rate: number | null;
  cap_amount: number | null;
  avg_3y: number | null;
}

export interface ScenarioRow {
  id: string;
  label: string;
  target_valuation_m: number;
  horizon_years: number;
  display_order: number;
}

export interface SalaryBenchmark {
  job_family: string;
  seniority: string;
  location: string;
  p25: number;
  p50: number;
  p75: number;
  version: string;
  source: string | null;
}

export interface GrowthPathRow { horizon: string; path: string }
export interface ProcessStepRow { step: string; duration: string }

export interface PackageData {
  id: string;
  title: string;
  gross_salary: number | null;
  variable_target: number | null;
  variable_config?: {
    components?: {
      id: string;
      label: string;
      frequency: "monthly" | "quarterly" | "semestrial" | "annual";
      amount: number;
      objectiveType?: "individual" | "collective" | "mixed" | null;
      indicators?: { label: string; weight: number }[];
      calcMethod?: string;
    }[];
    objectiveType?: "individual" | "collective" | "mixed" | null;
    payoutFrequency?: "monthly" | "quarterly" | "semestrial" | "annual" | null;
    calcMethod?: string;
    indicators?: { label: string; weight: number }[];
  } | null;
  benefits: Record<string, any> | null;
  scenario_message: string | null;
  scenario_display: "all" | "realistic_only" | "realistic_optimistic";

  // Step 0 — job content
  job_summary?: string | null;
  missions?: string[];
  stack?: string[];
  contract_type?: string | null;
  job_type?: string | null;
  remote_policy?: string | null;
  remote_days?: number | null;
  remote_guaranteed?: boolean;
  flexible_hours?: boolean;
  location_city?: string | null;
  location_details?: string | null;
  team_size?: number | null;
  team_description?: string | null;
  manager_style?: string | null;
  company_values?: string[];
  culture_note?: string | null;
  glassdoor_url?: string | null;
  wtj_url?: string | null;
  growth_paths?: GrowthPathRow[];
  training_budget?: number | null;
  onboarding_note?: string | null;
  process_steps?: ProcessStepRow[];
  process_duration?: string | null;
  start_date?: string | null;
  benchmark?: SalaryBenchmark | null;

  organizations:
    | {
        name: string;
        logo_url: string | null;
        description?: string | null;
        key_figures?: { label: string; value: string }[];
        values?: string[];
        culture_note?: string | null;
        links?: { label: string; url: string; type?: string | null }[];
      }
    | null;
  equity_devices: EquityDeviceRow[];
  savings_devices: SavingsDeviceRow[];
  scenarios: ScenarioRow[];
}

export interface ScenarioEstimate {
  label: string;
  /** Backwards-compat: high-seniority estimate (≥ 3 ans for BSPCE, sinon PFU). */
  estimate: number;
  targetValuationM: number;
  horizonYears: number;
  /** Backwards-compat: tax rate displayed for legacy single-rate UI. */
  taxRate: number;

  // New seniority-aware fields
  estimateHighSeniority: number; // ≥ 3 ans (ou PFU pour AGA/RSU)
  estimateLowSeniority: number; // < 3 ans (BSPCE uniquement)
  taxRateHighSeniority: number;
  taxRateLowSeniority: number;
  /** true uniquement pour les BSPCE avec un gain > 0. */
  isMultiRate: boolean;
}

export interface PackageEstimate {
  salaryEst: number;
  variableEst: number;
  benefitsEst: number;
  equityByScenario: ScenarioEstimate[];
  peeEst: number;
  interEst: number;
  participationEst: number;
  /** Total range. lowSeniority/highSeniority pertinents si hasBspce=true. */
  totalRange: {
    low: number;
    mid: number;
    high: number;
    lowSeniority: number; // total réaliste avec equity < 3 ans
    highSeniority: number; // total réaliste avec equity ≥ 3 ans
  };
  hasBspce: boolean;
}

export function roundForDisplay(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value < 1000) return Math.round(value / 100) * 100;
  if (value < 10000) return Math.round(value / 500) * 500;
  if (value < 100000) return Math.round(value / 1000) * 1000;
  return Math.round(value / 5000) * 5000;
}

export function formatEur(v: number): string {
  if (v <= 0) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

export function formatRange(low: number, high: number): string {
  if (low <= 0 && high <= 0) return "—";
  if (low === high) return `~${formatEur(low)}`;
  return `~${formatEur(low)} — ~${formatEur(high)}`;
}

function calcEquityScenarios(
  pkg: PackageData,
  _params: CandidateParams,
): ScenarioEstimate[] {
  const device = pkg.equity_devices?.[0];
  const scenarios = pkg.scenarios ?? [];
  if (!device || scenarios.length === 0) return [];

  const isBspce = device.type === "bspce" || device.type === "stock_options";
  const taxHigh = isBspce ? BSPCE_TAX_HIGH_SENIORITY : TAX_2026.FLAT_TAX;
  const taxLow = BSPCE_TAX_LOW_SENIORITY;

  return [...scenarios]
    .sort((a, b) => a.display_order - b.display_order)
    .map((scenario) => {
      let grossGain = 0;
      if (
        device.strike_price > 0 &&
        device.current_valuation_m > 0 &&
        device.quantity > 0
      ) {
        const totalShares =
          (device.current_valuation_m * 1_000_000) / device.strike_price;
        const exitPrice =
          (scenario.target_valuation_m * 1_000_000) / totalShares;
        grossGain = Math.max(
          0,
          (exitPrice - device.strike_price) * device.quantity,
        );
      }
      const estimateHigh =
        grossGain > 0 ? roundForDisplay(grossGain * (1 - taxHigh)) : 0;
      const estimateLow =
        grossGain > 0 && isBspce
          ? roundForDisplay(grossGain * (1 - taxLow))
          : 0;
      return {
        label: scenario.label,
        estimate: estimateHigh,
        targetValuationM: scenario.target_valuation_m,
        horizonYears: scenario.horizon_years,
        taxRate: taxHigh,
        estimateHighSeniority: estimateHigh,
        estimateLowSeniority: estimateLow,
        taxRateHighSeniority: taxHigh,
        taxRateLowSeniority: taxLow,
        isMultiRate: isBspce && grossGain > 0,
      };
    });
}

export function calcPackageEstimate(
  pkg: PackageData,
  params: CandidateParams,
): PackageEstimate {
  const tmiFactor = 1 - 0.9 * params.tmi;
  const salaryEst = roundForDisplay(
    (pkg.gross_salary ?? 0) * (1 - TAX_2026.SOCIAL_CHARGES_SALARY) * tmiFactor,
  );
  const variableEst = roundForDisplay(
    (pkg.variable_target ?? 0) *
      (1 - TAX_2026.SOCIAL_CHARGES_SALARY) *
      tmiFactor,
  );

  const b = pkg.benefits ?? {};
  let benefitsTotal = 0;
  if (b.mutuelle) benefitsTotal += (b.mutuelleMontant ?? 0) * 12;
  if (b.ticketsResto)
    benefitsTotal += (b.ticketsRestoValeur ?? 0) * 218 * 0.6;
  if (b.vehicule) benefitsTotal += (b.vehiculeMontant ?? 0) * 12;
  if (b.formation) benefitsTotal += b.formationBudget ?? 0;
  const benefitsEst = roundForDisplay(benefitsTotal);

  const equityByScenario = calcEquityScenarios(pkg, params);

  const peeDevice = pkg.savings_devices?.find((d) => d.type === "pee");
  const peeEst = peeDevice
    ? roundForDisplay(
        Math.min(
          (params.peeContribution ?? 0) * (peeDevice.matching_rate ?? 0),
          peeDevice.cap_amount ?? 0,
          3768,
        ),
      )
    : 0;

  const interDevice = pkg.savings_devices?.find(
    (d) => d.type === "interessement",
  );
  const interEst = interDevice?.avg_3y
    ? roundForDisplay(interDevice.avg_3y * (1 - TAX_2026.CSG_CRDS))
    : 0;

  const partDevice = pkg.savings_devices?.find(
    (d) => d.type === "participation",
  );
  const participationEst = partDevice?.avg_3y
    ? roundForDisplay(partDevice.avg_3y * (1 - TAX_2026.CSG_CRDS))
    : 0;

  const realisteScenario = equityByScenario.find((s) => s.label === "realiste");
  const realiste = realisteScenario?.estimate ?? 0;
  const realisteLow =
    realisteScenario?.estimateLowSeniority ?? 0;
  const pess =
    equityByScenario.find((s) => s.label === "pessimiste")?.estimate ?? 0;
  const opti =
    equityByScenario.find((s) => s.label === "optimiste")?.estimate ?? 0;
  const baseTotal =
    salaryEst +
    variableEst +
    benefitsEst +
    peeEst +
    interEst +
    participationEst;

  const hasBspce = equityByScenario.some((s) => s.isMultiRate);

  return {
    salaryEst,
    variableEst,
    benefitsEst,
    equityByScenario,
    peeEst,
    interEst,
    participationEst,
    totalRange: {
      low: roundForDisplay(baseTotal + (pess || realiste)),
      mid: roundForDisplay(baseTotal + realiste),
      high: roundForDisplay(baseTotal + (opti || realiste)),
      lowSeniority: roundForDisplay(
        baseTotal + (hasBspce ? realisteLow : realiste),
      ),
      highSeniority: roundForDisplay(baseTotal + realiste),
    },
    hasBspce,
  };
}
