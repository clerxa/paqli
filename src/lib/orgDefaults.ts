import { supabase } from "@/integrations/supabase/client";
import type {
  EquityDeviceForm,
  PackageConfig,
  SavingsDeviceForm,
} from "./packageConfig";
import { emptyConfig, defaultBenefits } from "./packageConfig";
import type { PackageBenefit } from "./benefitCatalog";

/**
 * Loads all org-level defaults and returns a PackageConfig pre-filled with
 * everything that's already known about the company:
 *  - company_profile (remote, training, RTT, meal vouchers, etc.)
 *  - org_benefit_catalog (benefitsV2)
 *  - org_equity_catalog  (equityDevices templates)
 *  - org_savings_catalog (savingsDevices templates)
 *
 * This is the engine that makes Quick Create actually feel "smart" — a new
 * package starts ~60-80% complete instead of empty.
 */
export interface OrgDefaultsResult {
  config: PackageConfig;
  prefilled: {
    benefits: number;
    equity: number;
    savings: number;
    companyProfile: boolean;
  };
}

export async function loadOrgDefaultsConfig(
  orgId: string,
): Promise<OrgDefaultsResult> {
  const [cp, b, e, s, org] = await Promise.all([
    supabase
      .from("company_profile")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle(),
    supabase
      .from("org_benefit_catalog")
      .select("*")
      .eq("organization_id", orgId)
      .order("display_order"),
    supabase
      .from("org_equity_catalog")
      .select("*")
      .eq("organization_id", orgId)
      .order("display_order"),
    supabase
      .from("org_savings_catalog")
      .select("*")
      .eq("organization_id", orgId)
      .order("display_order"),
    supabase
      .from("organizations")
      .select(
        "default_scenario_pessimistic_m, default_scenario_realistic_m, default_scenario_optimistic_m, default_scenario_pessimistic_years, default_scenario_realistic_years, default_scenario_optimistic_years, default_scenario_message, default_scenario_display",
      )
      .eq("id", orgId)
      .maybeSingle(),
  ]);

  let cfg: PackageConfig = { ...emptyConfig, status: "draft" };
  const profile = cp.data;

  if (profile) {
    cfg = {
      ...cfg,
      remotePolicy:
        (profile.remote_work_policy as PackageConfig["remotePolicy"]) ??
        cfg.remotePolicy,
      remoteDays:
        profile.remote_work_days_per_week ?? cfg.remoteDays,
      trainingBudget:
        profile.training_budget_per_person ?? cfg.trainingBudget,
      trainingBudgetSpecific:
        profile.training_budget_per_person ?? cfg.trainingBudgetSpecific,
      benefits: {
        ...defaultBenefits,
        ...cfg.benefits,
        rtt: (profile.rtt_days_per_year ?? 0) > 0,
        rttJours: profile.rtt_days_per_year ?? 0,
        ticketsResto: !!profile.meal_voucher_enabled,
        ticketsRestoValeur: profile.meal_voucher_daily_amount ?? 0,
        mutuelle: (profile.health_insurance_employer_rate ?? 0) > 0,
      },
    };
  }

  // Benefits catalog → benefitsV2
  const benefitsV2: PackageBenefit[] = (b.data ?? []).map((row) => ({
    benefit_key: row.benefit_key,
    category: row.category as PackageBenefit["category"],
    value_type: row.value_type as PackageBenefit["value_type"],
    monthly_value: row.monthly_value,
    annual_value: row.annual_value,
    employer_share: row.employer_share,
    custom_label: row.custom_label,
    display_order: row.display_order,
  }));

  // Equity catalog → first device pre-instanciated as template
  const equityDevices: EquityDeviceForm[] = (e.data ?? []).slice(0, 1).map(
    (row) => ({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2),
      type: row.type as EquityDeviceForm["type"],
      quantity: 0,
      strikePrice: row.default_strike_price ?? 0,
      currentValuationM: row.default_valuation_m ?? 0,
      vestingYears: row.vesting_years ?? 4,
      cliffMonths: row.cliff_months ?? 12,
      specialConditions: row.special_conditions ?? "",
    }),
  );

  const savingsDevices: SavingsDeviceForm[] = (s.data ?? []).map((row) => ({
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    type: row.type as SavingsDeviceForm["type"],
    matchingRate: row.default_matching_rate ?? 0,
    capAmount: row.default_cap_amount ?? 0,
    avg3y: row.default_avg_3y ?? 0,
  }));

  cfg = {
    ...cfg,
    benefitsV2,
    equityDevices,
    savingsDevices,
  };

  const orgRow = org.data as any;
  if (orgRow) {
    cfg = {
      ...cfg,
      scenarios: [
        {
          label: "pessimiste",
          targetValuationM: Number(orgRow.default_scenario_pessimistic_m ?? 80),
          horizonYears: Number(orgRow.default_scenario_pessimistic_years ?? 5),
        },
        {
          label: "realiste",
          targetValuationM: Number(orgRow.default_scenario_realistic_m ?? 200),
          horizonYears: Number(orgRow.default_scenario_realistic_years ?? 4),
        },
        {
          label: "optimiste",
          targetValuationM: Number(orgRow.default_scenario_optimistic_m ?? 500),
          horizonYears: Number(orgRow.default_scenario_optimistic_years ?? 5),
        },
      ],
      scenarioMessage: orgRow.default_scenario_message ?? cfg.scenarioMessage,
      scenarioDisplay: (orgRow.default_scenario_display ?? cfg.scenarioDisplay) as PackageConfig["scenarioDisplay"],
    };
  }

  return {
    config: cfg,
    prefilled: {
      benefits: benefitsV2.length,
      equity: equityDevices.length,
      savings: savingsDevices.length,
      companyProfile: !!profile,
    },
  };
}
