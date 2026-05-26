/**
 * Simulateur equity simplifié.
 * Calcule la valorisation d'un plan d'equity (cotée ou non cotée),
 * un planning de vesting et 3 scénarios (non cotée uniquement).
 *
 * Hypothèses :
 * - Pour BSPCE / stock-options : gain par action = max(0, prix - strike).
 * - Pour AGA / RSU / ESPP : gain par action = max(0, prix - strike)
 *   (strike = 0 si actions gratuites).
 * - Imposition forfaitaire indicative : PFU 30%.
 * - Vesting linéaire annuel avec cliff (cliff = 1/vestingYears au mois du cliff,
 *   puis répartition uniforme annuelle ensuite).
 */

import type { EquityDeviceForm } from "./packageConfig";

export interface ScenarioMultiples {
  bear: number;
  base: number;
  bull: number;
}

export interface EquityValuationInput {
  device: EquityDeviceForm;
  // Coté
  currentPrice?: number | null;
  currentPriceCurrency?: "EUR" | "USD" | null;
  // Non coté
  companyValuation?: number | null;
  totalShares?: number | null;
  scenarios?: ScenarioMultiples;
}

export interface VestingStep {
  label: string;
  monthsFromNow: number;
  sharesVested: number;
  valueGross: number;
  netEstimate: number; // PFU 30%
}

export interface EquityValuation {
  pricePerShare: number;
  currency: "EUR" | "USD";
  currentTotalValueGross: number;
  currentTotalValueNet: number;
  vestingSchedule: VestingStep[];
  scenarios?: {
    bear: { multiple: number; pricePerShare: number; totalValue: number };
    base: { multiple: number; pricePerShare: number; totalValue: number };
    bull: { multiple: number; pricePerShare: number; totalValue: number };
  };
  hasData: boolean;
}

const PFU = 0.3;

export function computeEquityValuation(
  input: EquityValuationInput,
): EquityValuation {
  const { device } = input;
  const quantity = device.quantity || 0;
  const strike = device.strikePrice || 0;
  const vestingYears = device.vestingYears || 4;
  const cliffMonths = device.cliffMonths ?? 12;

  // Prix par action :
  // - Si coté : currentPrice
  // - Sinon : valorisation entreprise / total actions
  const pricePerShare =
    input.currentPrice ??
    (input.companyValuation && input.totalShares
      ? input.companyValuation / input.totalShares
      : 0);

  const currency: "EUR" | "USD" =
    (input.currentPriceCurrency as "EUR" | "USD" | null) ?? "EUR";

  const perShareGain = Math.max(0, pricePerShare - strike);
  const currentTotalValueGross = perShareGain * quantity;
  const currentTotalValueNet = currentTotalValueGross * (1 - PFU);

  // Vesting schedule
  const steps: VestingStep[] = [];

  // Cliff = 1/vestingYears des actions
  if (cliffMonths > 0) {
    const cliffShares = Math.round(quantity / vestingYears);
    steps.push({
      label: `Après cliff (${cliffMonths} mois)`,
      monthsFromNow: cliffMonths,
      sharesVested: cliffShares,
      valueGross: perShareGain * cliffShares,
      netEstimate: perShareGain * cliffShares * (1 - PFU),
    });
  }

  const startYear = cliffMonths > 0 ? 2 : 1;
  for (let year = startYear; year <= vestingYears; year++) {
    const shares = Math.round(quantity * (year / vestingYears));
    const label =
      year === vestingYears ? `Fully vested (An ${year})` : `An ${year}`;
    steps.push({
      label,
      monthsFromNow: year * 12,
      sharesVested: shares,
      valueGross: perShareGain * shares,
      netEstimate: perShareGain * shares * (1 - PFU),
    });
  }

  // Scénarios (non cotée)
  let scenarios: EquityValuation["scenarios"];
  const basePricePerShare =
    input.companyValuation && input.totalShares
      ? input.companyValuation / input.totalShares
      : 0;

  if (input.scenarios && basePricePerShare > 0) {
    const mk = (m: number) => {
      const p = basePricePerShare * m;
      const totalValue = Math.max(0, p - strike) * quantity;
      return { multiple: m, pricePerShare: p, totalValue };
    };
    scenarios = {
      bear: mk(input.scenarios.bear),
      base: mk(input.scenarios.base),
      bull: mk(input.scenarios.bull),
    };
  }

  return {
    pricePerShare,
    currency,
    currentTotalValueGross,
    currentTotalValueNet,
    vestingSchedule: steps,
    scenarios,
    hasData: pricePerShare > 0 && quantity > 0,
  };
}

export function formatMoney(v: number, currency: "EUR" | "USD" = "EUR"): string {
  if (!Number.isFinite(v) || v <= 0) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(v);
}
