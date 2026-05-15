export type EquityType = "bspce" | "aga" | "rsu" | "stock_options" | "espp";
export type SavingsType = "pee" | "perco" | "interessement" | "participation";

export interface BenefitsConfig {
  mutuelle: boolean;
  mutuelleMontant: number;
  ticketsResto: boolean;
  ticketsRestoValeur: number;
  teletravail: number; // 0=non, 1, 2, 3, 5
  rtt: boolean;
  rttJours: number;
  vehicule: boolean;
  vehiculeMontant: number;
  formation: boolean;
  formationBudget: number;
  creche: boolean;
}

export const defaultBenefits: BenefitsConfig = {
  mutuelle: false,
  mutuelleMontant: 0,
  ticketsResto: false,
  ticketsRestoValeur: 0,
  teletravail: 0,
  rtt: false,
  rttJours: 0,
  vehicule: false,
  vehiculeMontant: 0,
  formation: false,
  formationBudget: 0,
  creche: false,
};

export interface EquityDeviceForm {
  id: string;
  type: EquityType;
  quantity: number;
  strikePrice: number;
  currentValuationM: number;
  vestingYears: number;
  cliffMonths: number;
  specialConditions: string;
}

export interface SavingsDeviceForm {
  id: string;
  type: SavingsType;
  matchingRate: number;
  capAmount: number;
  avg3y: number;
}

export type ContractType = "cdi" | "cdd" | "freelance" | "alternance" | "stage";
export type RemotePolicy =
  | "full_remote"
  | "hybrid"
  | "office_first"
  | "on_site";
export type ManagerStyle =
  | "autonomy"
  | "coaching"
  | "structured"
  | "collaborative";

export interface GrowthPath {
  horizon: string; // "6 mois" | "1 an" | "2 ans" | "3 ans+"
  path: string;
}

export interface ProcessStep {
  step: string;
  duration: string;
}

export type VariableObjectiveType = "individual" | "collective" | "mixed";
export type VariablePayoutFrequency =
  | "monthly"
  | "quarterly"
  | "semestrial"
  | "annual";

export interface VariableIndicator {
  label: string;
  weight: number; // % (0-100), optional
}

export interface VariableComponent {
  id: string;
  label: string;
  frequency: VariablePayoutFrequency;
  amount: number; // montant annuel cible (€)
  objectiveType: VariableObjectiveType | null;
  indicators: VariableIndicator[];
  calcMethod: string;
}

export interface VariableConfig {
  // Nouveau modèle : plusieurs composants en parallèle (mensuel + trimestriel + ...)
  components: VariableComponent[];
  // Legacy (lecture seule, conservé pour compat ascendante des packages existants)
  objectiveType?: VariableObjectiveType | null;
  payoutFrequency?: VariablePayoutFrequency | null;
  calcMethod?: string;
  indicators?: VariableIndicator[];
}

export const defaultVariableConfig: VariableConfig = {
  components: [],
  objectiveType: null,
  payoutFrequency: null,
  calcMethod: "",
  indicators: [],
};

export function makeVariableComponent(
  freq: VariablePayoutFrequency = "annual",
  amount = 0,
): VariableComponent {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    label: "",
    frequency: freq,
    amount,
    objectiveType: null,
    indicators: [],
    calcMethod: "",
  };
}

export const FREQUENCY_LABELS_FR: Record<VariablePayoutFrequency, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  semestrial: "Semestriel",
  annual: "Annuel",
};

export interface PackageConfig {
  packageId: string | null;
  status: "draft" | "active";
  currentStep: number;
  isDirty: boolean;

  title: string;

  // Step 0 — Le poste
  jobSummary: string;
  missions: string[];
  stack: string[];
  contractType: ContractType;
  remotePolicy: RemotePolicy;
  remoteDays: number | null;
  remoteGuaranteed: boolean;
  flexibleHours: boolean;
  locationCity: string;
  locationDetails: string;
  teamSize: number | null;
  teamDescription: string;
  managerStyle: ManagerStyle | null;
  companyValues: string[];
  cultureNote: string;
  glassdoorUrl: string;
  wtjUrl: string;
  growthPaths: GrowthPath[];
  trainingBudget: number | null;
  onboardingNote: string;
  processSteps: ProcessStep[];
  processDuration: string;
  startDate: string;

  // Steps 1-3
  grossSalary: number;
  variableTarget: number;
  variableConfig: VariableConfig;
  benefits: BenefitsConfig;
  trialPeriodMonths: number | null;
  trialPeriodRenewable: boolean;

  equityDevices: EquityDeviceForm[];
  savingsDevices: SavingsDeviceForm[];

  scenarios: ScenarioForm[];
  scenarioMessage: string;
  scenarioDisplay: "all" | "realistic_only" | "realistic_optimistic";
}

export type ScenarioLabel = "pessimiste" | "realiste" | "optimiste";

export interface ScenarioForm {
  label: ScenarioLabel;
  targetValuationM: number;
  horizonYears: number;
}

export const defaultScenarios: ScenarioForm[] = [
  { label: "pessimiste", targetValuationM: 80, horizonYears: 5 },
  { label: "realiste", targetValuationM: 200, horizonYears: 4 },
  { label: "optimiste", targetValuationM: 500, horizonYears: 5 },
];

export const emptyConfig: PackageConfig = {
  packageId: null,
  status: "draft",
  currentStep: 0,
  isDirty: false,
  title: "",

  jobSummary: "",
  missions: [],
  stack: [],
  contractType: "cdi",
  remotePolicy: "hybrid",
  remoteDays: 2,
  remoteGuaranteed: false,
  flexibleHours: false,
  locationCity: "",
  locationDetails: "",
  teamSize: null,
  teamDescription: "",
  managerStyle: null,
  companyValues: [],
  cultureNote: "",
  glassdoorUrl: "",
  wtjUrl: "",
  growthPaths: [],
  trainingBudget: null,
  onboardingNote: "",
  processSteps: [],
  processDuration: "",
  startDate: "",

  grossSalary: 0,
  variableTarget: 0,
  variableConfig: defaultVariableConfig,
  benefits: defaultBenefits,
  trialPeriodMonths: null,
  trialPeriodRenewable: false,
  equityDevices: [],
  savingsDevices: [],
  scenarios: defaultScenarios,
  scenarioMessage: "",
  scenarioDisplay: "all",
};

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

// Step 1 — fixed compensation
export function calcStep1Preview(c: PackageConfig) {
  const netFactor = (1 - 0.22) * (1 - 0.9 * 0.3);
  const salaryEst = roundForDisplay(c.grossSalary * netFactor);
  const variableEst = roundForDisplay(c.variableTarget * netFactor);

  let benefitsTotal = 0;
  const b = c.benefits;
  if (b.mutuelle) benefitsTotal += (b.mutuelleMontant || 0) * 12;
  if (b.ticketsResto) benefitsTotal += (b.ticketsRestoValeur || 0) * 218 * 0.6;
  if (b.vehicule) benefitsTotal += (b.vehiculeMontant || 0) * 12;
  if (b.formation) benefitsTotal += b.formationBudget || 0;
  const benefitsEst = roundForDisplay(benefitsTotal);

  return { salaryEst, variableEst, benefitsEst };
}

// Step 2 — equity (réaliste, x4 valuation, flat tax 31.4%)
export function calcStep2Preview(c: PackageConfig): { equityEst: number } {
  let total = 0;
  for (const d of c.equityDevices) {
    if (!d.quantity || !d.currentValuationM) continue;
    if (d.type === "bspce" || d.type === "stock_options") {
      if (!d.strikePrice) continue;
      const exitMultiple = 4;
      // Per-share gain : strike * (multiple - 1)
      const grossGain = d.strikePrice * (exitMultiple - 1) * d.quantity;
      total += grossGain * (1 - 0.314);
    } else if (d.type === "aga" || d.type === "rsu" || d.type === "espp") {
      const ref = d.strikePrice > 0 ? d.strikePrice : 1;
      const exit = ref * 4;
      total += exit * d.quantity * (1 - 0.314);
    }
  }
  return { equityEst: roundForDisplay(total) };
}

// Step 3 — savings
export function calcStep3Preview(c: PackageConfig) {
  let peeEst = 0;
  let interEst = 0;
  let participationEst = 0;

  for (const d of c.savingsDevices) {
    if (d.type === "pee" || d.type === "perco") {
      const cap = d.type === "pee" ? 3768 : 7536;
      const matching = Math.min(d.capAmount || 0, cap);
      peeEst += matching;
    } else if (d.type === "interessement" && d.avg3y) {
      interEst += d.avg3y * (1 - 0.097);
    } else if (d.type === "participation" && d.avg3y) {
      participationEst += d.avg3y * (1 - 0.097);
    }
  }
  return {
    peeEst: roundForDisplay(peeEst),
    interEst: roundForDisplay(interEst),
    participationEst: roundForDisplay(participationEst),
  };
}

export function validateStep(c: PackageConfig, step: number): string | null {
  if (step === 0) {
    if (!c.title || c.title.trim().length < 3)
      return "L'intitulé du poste est obligatoire (min. 3 caractères).";
    if (!c.jobSummary || c.jobSummary.trim().length < 10)
      return "L'accroche du poste est obligatoire (min. 10 caractères).";
    if (!c.missions.filter((m) => m.trim()).length)
      return "Ajoutez au moins une mission principale.";
    if (!c.remotePolicy) return "Choisissez une politique de télétravail.";
    if (!c.locationCity || !c.locationCity.trim())
      return "Indiquez la ville / lieu de travail.";
    return null;
  }
  if (step === 1) {
    if (!c.title || c.title.trim().length < 3)
      return "L'intitulé du poste est obligatoire (min. 3 caractères).";
    if (!c.grossSalary || c.grossSalary <= 0)
      return "Le salaire brut annuel est obligatoire.";
    const b = c.benefits;
    if (b.mutuelle && !b.mutuelleMontant)
      return "Indiquez la part employeur mutuelle.";
    if (b.ticketsResto && !b.ticketsRestoValeur)
      return "Indiquez la valeur faciale des tickets restaurant.";
    if (b.vehicule && !b.vehiculeMontant)
      return "Indiquez la valeur du véhicule.";
    if (b.rtt && !b.rttJours) return "Indiquez le nombre de jours RTT.";
    if (b.formation && !b.formationBudget)
      return "Indiquez le budget formation.";
    return null;
  }
  if (step === 2) {
    for (const d of c.equityDevices) {
      if (!d.quantity || d.quantity <= 0)
        return "Quantité equity manquante.";
      if (
        (d.type === "bspce" || d.type === "stock_options") &&
        d.strikePrice <= 0
      )
        return "Prix d'exercice manquant.";
      if (d.currentValuationM <= 0)
        return "Valorisation actuelle manquante.";
    }
    return null;
  }
  if (step === 3) {
    for (const d of c.savingsDevices) {
      if (d.type === "pee" || d.type === "perco") {
        if (!d.matchingRate) return "Taux d'abondement manquant.";
        if (!d.capAmount) return "Plafond d'abondement manquant.";
      }
      if (
        (d.type === "interessement" || d.type === "participation") &&
        d.avg3y === undefined
      )
        return "Indiquez le montant moyen.";
    }
    return null;
  }
  return null;
}

// Step 4 — equity scenarios
export function estimateEquityScenario(
  device: EquityDeviceForm | undefined,
  targetValuationM: number,
): number {
  if (!device || targetValuationM <= 0) return 0;
  if (!device.quantity || !device.currentValuationM) return 0;

  if (device.type === "bspce" || device.type === "stock_options") {
    if (!device.strikePrice) return 0;
    const multiple = targetValuationM / device.currentValuationM;
    const exitPrice = device.strikePrice * multiple;
    const grossGain = (exitPrice - device.strikePrice) * device.quantity;
    if (grossGain <= 0) return 0;
    return roundForDisplay(grossGain * (1 - 0.314));
  }
  // shares-like (aga/rsu/espp)
  const ref = device.strikePrice > 0 ? device.strikePrice : 1;
  const multiple = targetValuationM / Math.max(device.currentValuationM, 0.0001);
  const exit = ref * multiple;
  const gross = exit * device.quantity;
  if (gross <= 0) return 0;
  return roundForDisplay(gross * (1 - 0.314));
}

export function estimateScenarioTotal(
  devices: EquityDeviceForm[],
  targetValuationM: number,
): number {
  let total = 0;
  for (const d of devices) total += estimateEquityScenario(d, targetValuationM);
  return roundForDisplay(total);
}

export function validateScenarios(scenarios: ScenarioForm[]): string | null {
  const pess = scenarios.find((s) => s.label === "pessimiste")?.targetValuationM ?? 0;
  const real = scenarios.find((s) => s.label === "realiste")?.targetValuationM ?? 0;
  const opti = scenarios.find((s) => s.label === "optimiste")?.targetValuationM ?? 0;
  if (pess <= 0 || real <= 0 || opti <= 0)
    return "Tous les scénarios doivent avoir une valorisation supérieure à 0.";
  if (real <= pess)
    return "Le scénario réaliste doit être supérieur au pessimiste.";
  if (opti <= real)
    return "Le scénario optimiste doit être supérieur au réaliste.";
  return null;
}

export function computeRichness(c: PackageConfig): number {
  let score = 0;
  if (c.jobSummary && c.jobSummary.trim().length >= 10) score += 10;
  if (c.missions.filter((m) => m.trim()).length >= 3) score += 15;
  if (c.stack.length > 0) score += 5;
  if (c.remotePolicy) score += 10;
  if (c.locationCity) score += 5;
  if (c.teamDescription && c.teamDescription.trim().length >= 20) score += 10;
  if (c.companyValues.length >= 3) score += 10;
  if (c.growthPaths.length >= 1) score += 10;
  if (c.processSteps.length >= 2) score += 10;
  if (c.grossSalary > 0) score += 10;
  if (c.equityDevices.length > 0) score += 5;
  return Math.min(score, 100);
}

export function computeRichnessFromRow(pkg: {
  job_summary?: string | null;
  missions?: unknown;
  stack?: string[] | null;
  remote_policy?: string | null;
  location_city?: string | null;
  team_description?: string | null;
  company_values?: string[] | null;
  growth_paths?: unknown;
  process_steps?: unknown;
  gross_salary?: number | null;
  equity_devices?: unknown[];
}): number {
  const missions = Array.isArray(pkg.missions) ? (pkg.missions as string[]) : [];
  const growth = Array.isArray(pkg.growth_paths) ? (pkg.growth_paths as unknown[]) : [];
  const steps = Array.isArray(pkg.process_steps) ? (pkg.process_steps as unknown[]) : [];
  let score = 0;
  if (pkg.job_summary && pkg.job_summary.trim().length >= 10) score += 10;
  if (missions.filter((m) => typeof m === "string" && m.trim()).length >= 3) score += 15;
  if (pkg.stack && pkg.stack.length > 0) score += 5;
  if (pkg.remote_policy) score += 10;
  if (pkg.location_city) score += 5;
  if (pkg.team_description && pkg.team_description.trim().length >= 20) score += 10;
  if (pkg.company_values && pkg.company_values.length >= 3) score += 10;
  if (growth.length >= 1) score += 10;
  if (steps.length >= 2) score += 10;
  if ((pkg.gross_salary ?? 0) > 0) score += 10;
  if (pkg.equity_devices && pkg.equity_devices.length > 0) score += 5;
  return Math.min(score, 100);
}
