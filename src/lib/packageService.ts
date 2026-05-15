import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  ContractType,
  GrowthPath,
  ManagerStyle,
  PackageConfig,
  ProcessStep,
  RemotePolicy,
  ScenarioLabel,
} from "./packageConfig";
import { defaultBenefits, defaultScenarios, defaultVariableConfig, emptyConfig } from "./packageConfig";
import type { VariableConfig } from "./packageConfig";

export async function upsertPackage(
  config: PackageConfig,
  orgId: string,
  userId: string,
): Promise<string> {
  const packageData = {
    organization_id: orgId,
    created_by: userId,
    title: config.title || "Nouveau package",
    status: config.status,
    gross_salary: config.grossSalary || null,
    variable_target: config.variableTarget || null,
    variable_config: (config.variableConfig ?? defaultVariableConfig) as unknown as Json,
    benefits: config.benefits as unknown as Json,
    scenario_message: config.scenarioMessage || null,
    scenario_display: config.scenarioDisplay,
    updated_at: new Date().toISOString(),

    // Step 0
    job_summary: config.jobSummary || null,
    missions: (config.missions ?? []) as unknown as Json,
    stack: config.stack && config.stack.length > 0 ? config.stack : null,
    contract_type: config.contractType,
    remote_policy: config.remotePolicy,
    remote_days: config.remoteDays ?? null,
    remote_guaranteed: config.remoteGuaranteed,
    flexible_hours: config.flexibleHours,
    location_city: config.locationCity || null,
    location_details: config.locationDetails || null,
    team_size: config.teamSize ?? null,
    team_description: config.teamDescription || null,
    manager_style: config.managerStyle ?? null,
    company_values:
      config.companyValues && config.companyValues.length > 0
        ? config.companyValues
        : null,
    culture_note: config.cultureNote || null,
    glassdoor_url: config.glassdoorUrl || null,
    wtj_url: config.wtjUrl || null,
    growth_paths: (config.growthPaths ?? []) as unknown as Json,
    training_budget: config.trainingBudget ?? null,
    onboarding_note: config.onboardingNote || null,
    process_steps: (config.processSteps ?? []) as unknown as Json,
    process_duration: config.processDuration || null,
    start_date: config.startDate || null,
    trial_period_months: config.trialPeriodMonths ?? null,
    trial_period_renewable: !!config.trialPeriodRenewable,
  };

  let packageId = config.packageId;
  if (packageId) {
    const { error } = await supabase
      .from("packages")
      .update(packageData)
      .eq("id", packageId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("packages")
      .insert(packageData)
      .select("id")
      .single();
    if (error) throw error;
    packageId = data!.id;
  }

  await supabase.from("equity_devices").delete().eq("package_id", packageId);
  if (config.equityDevices.length > 0) {
    const { error } = await supabase.from("equity_devices").insert(
      config.equityDevices.map((d) => ({
        package_id: packageId!,
        type: d.type,
        quantity: d.quantity || 0,
        strike_price: d.strikePrice || 0,
        current_valuation_m: d.currentValuationM || 0,
        vesting_years: d.vestingYears || 4,
        cliff_months: d.cliffMonths || 0,
        special_conditions: d.specialConditions || null,
      })),
    );
    if (error) throw error;
  }

  await supabase.from("savings_devices").delete().eq("package_id", packageId);
  if (config.savingsDevices.length > 0) {
    const { error } = await supabase.from("savings_devices").insert(
      config.savingsDevices.map((d) => ({
        package_id: packageId!,
        type: d.type,
        matching_rate: d.matchingRate || 0,
        cap_amount: d.capAmount || 0,
        avg_3y: d.avg3y || null,
      })),
    );
    if (error) throw error;
  }

  await supabase.from("scenarios").delete().eq("package_id", packageId);
  if (config.scenarios.length > 0) {
    const { error } = await supabase.from("scenarios").insert(
      config.scenarios.map((s, i) => ({
        package_id: packageId!,
        label: s.label,
        target_valuation_m: s.targetValuationM,
        horizon_years: s.horizonYears,
        display_order: i,
      })),
    );
    if (error) throw error;
  }

  return packageId!;
}

export async function loadPackage(id: string): Promise<PackageConfig | null> {
  const { data: pkg, error } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !pkg) return null;

  const { data: eq } = await supabase
    .from("equity_devices")
    .select("*")
    .eq("package_id", id);
  const { data: sv } = await supabase
    .from("savings_devices")
    .select("*")
    .eq("package_id", id);
  const { data: sc } = await supabase
    .from("scenarios")
    .select("*")
    .eq("package_id", id)
    .order("display_order", { ascending: true });

  const benefits = {
    ...defaultBenefits,
    ...((pkg.benefits as Record<string, unknown>) ?? {}),
  } as PackageConfig["benefits"];

  const missions = Array.isArray(pkg.missions)
    ? (pkg.missions as unknown[]).filter((m): m is string => typeof m === "string")
    : [];
  const growthPaths = Array.isArray(pkg.growth_paths)
    ? (pkg.growth_paths as unknown[]).filter(
        (g): g is GrowthPath =>
          typeof g === "object" &&
          g !== null &&
          "horizon" in g &&
          "path" in g,
      )
    : [];
  const processSteps = Array.isArray(pkg.process_steps)
    ? (pkg.process_steps as unknown[]).filter(
        (s): s is ProcessStep =>
          typeof s === "object" &&
          s !== null &&
          "step" in s &&
          "duration" in s,
      )
    : [];

  return {
    ...emptyConfig,
    packageId: pkg.id,
    status: (pkg.status as "draft" | "active") ?? "draft",
    currentStep: 0,
    isDirty: false,
    title: pkg.title ?? "",

    jobSummary: pkg.job_summary ?? "",
    missions,
    stack: (pkg.stack as string[] | null) ?? [],
    contractType: ((pkg.contract_type as ContractType) ?? "cdi") as ContractType,
    remotePolicy: ((pkg.remote_policy as RemotePolicy) ?? "hybrid") as RemotePolicy,
    remoteDays: pkg.remote_days ?? null,
    remoteGuaranteed: !!pkg.remote_guaranteed,
    flexibleHours: !!pkg.flexible_hours,
    locationCity: pkg.location_city ?? "",
    locationDetails: pkg.location_details ?? "",
    teamSize: pkg.team_size ?? null,
    teamDescription: pkg.team_description ?? "",
    managerStyle: (pkg.manager_style as ManagerStyle | null) ?? null,
    companyValues: (pkg.company_values as string[] | null) ?? [],
    cultureNote: pkg.culture_note ?? "",
    glassdoorUrl: pkg.glassdoor_url ?? "",
    wtjUrl: pkg.wtj_url ?? "",
    growthPaths,
    trainingBudget: pkg.training_budget ?? null,
    onboardingNote: pkg.onboarding_note ?? "",
    processSteps,
    processDuration: pkg.process_duration ?? "",
    startDate: pkg.start_date ?? "",
    trialPeriodMonths: pkg.trial_period_months ?? null,
    trialPeriodRenewable: !!pkg.trial_period_renewable,

    grossSalary: Number(pkg.gross_salary) || 0,
    variableTarget: Number(pkg.variable_target) || 0,
    variableConfig: {
      ...defaultVariableConfig,
      ...((pkg.variable_config as Record<string, unknown>) ?? {}),
    } as VariableConfig,
    benefits,
    equityDevices: (eq ?? []).map((d) => ({
      id: d.id,
      type: d.type as PackageConfig["equityDevices"][number]["type"],
      quantity: Number(d.quantity) || 0,
      strikePrice: Number(d.strike_price) || 0,
      currentValuationM: Number(d.current_valuation_m) || 0,
      vestingYears: Number(d.vesting_years) || 4,
      cliffMonths: Number(d.cliff_months) || 0,
      specialConditions: d.special_conditions ?? "",
    })),
    savingsDevices: (sv ?? []).map((d) => ({
      id: d.id,
      type: d.type as PackageConfig["savingsDevices"][number]["type"],
      matchingRate: Number(d.matching_rate) || 0,
      capAmount: Number(d.cap_amount) || 0,
      avg3y: Number(d.avg_3y) || 0,
    })),
    scenarios:
      sc && sc.length > 0
        ? sc.map((s) => ({
            label: s.label as ScenarioLabel,
            targetValuationM: Number(s.target_valuation_m) || 0,
            horizonYears: Number(s.horizon_years) || 4,
          }))
        : defaultScenarios,
    scenarioMessage: pkg.scenario_message ?? "",
    scenarioDisplay:
      (pkg.scenario_display as PackageConfig["scenarioDisplay"]) ?? "all",
  };
}
