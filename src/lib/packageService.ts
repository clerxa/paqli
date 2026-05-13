import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { PackageConfig, ScenarioLabel } from "./packageConfig";
import { defaultBenefits, defaultScenarios } from "./packageConfig";

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
    benefits: config.benefits as unknown as Json,
    scenario_message: config.scenarioMessage || null,
    scenario_display: config.scenarioDisplay,
    updated_at: new Date().toISOString(),
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

  return {
    packageId: pkg.id,
    status: (pkg.status as "draft" | "active") ?? "draft",
    currentStep: 1,
    isDirty: false,
    title: pkg.title ?? "",
    grossSalary: Number(pkg.gross_salary) || 0,
    variableTarget: Number(pkg.variable_target) || 0,
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
    scenarios: [],
    scenarioMessage: pkg.scenario_message ?? "",
    scenarioDisplay: "realistic_only",
  };
}
