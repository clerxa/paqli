import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeRichnessFromRow } from "@/lib/packageConfig";
import { useAuth } from "./useAuth";

export type PackageFilter = "all" | "active" | "draft" | "archived";

export interface PackageWithStats {
  id: string;
  title: string;
  status: "active" | "draft" | "archived";
  gross_salary: number | null;
  variable_target: number | null;
  created_at: string;
  updated_at: string;
  deviceTypes: string[];
  totalLinks: number;
  openedLinks: number;
  simulatedLinks: number;
  openRate: number;
  richness: number;
  attractivenessScore: number | null;
}

export function usePackages(filter: PackageFilter = "all") {
  const { organization } = useAuth();
  const [packages, setPackages] = useState<PackageWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (orgId: string, f: PackageFilter) => {
      setLoading(true);
      let query = supabase
        .from("packages")
        .select(
          `id, title, status, gross_salary, variable_target, created_at, updated_at,
           job_summary, missions, stack, remote_policy, location_city,
           team_description, company_values, growth_paths, process_steps,
           attractiveness_score,
           equity_devices (type),
           savings_devices (type),
           candidate_links (id, opened_at, simulated_at)`,
        )
        .eq("organization_id", orgId)
        .order("updated_at", { ascending: false });

      if (f !== "all") query = query.eq("status", f);
      const { data, error } = await query;
      if (error) {
        console.error(error);
        setPackages([]);
      } else {
        setPackages((data ?? []).map(enrich));
      }
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (!organization) return;
    load(organization.id, filter);
  }, [organization, filter, load]);

  return {
    packages,
    loading,
    reload: () => organization && load(organization.id, filter),
  };
}

function enrich(pkg: any): PackageWithStats {
  const links = pkg.candidate_links ?? [];
  const opened = links.filter((l: any) => l.opened_at).length;
  return {
    id: pkg.id,
    title: pkg.title,
    status: pkg.status,
    gross_salary: pkg.gross_salary,
    variable_target: pkg.variable_target,
    created_at: pkg.created_at,
    updated_at: pkg.updated_at,
    deviceTypes: [
      ...(pkg.equity_devices ?? []).map((d: any) => d.type),
      ...(pkg.savings_devices ?? []).map((d: any) => d.type),
    ],
    totalLinks: links.length,
    openedLinks: opened,
    simulatedLinks: links.filter((l: any) => l.simulated_at).length,
    openRate:
      links.length > 0 ? Math.round((opened / links.length) * 100) : 0,
    richness: computeRichnessFromRow({
      job_summary: pkg.job_summary,
      missions: pkg.missions,
      stack: pkg.stack,
      remote_policy: pkg.remote_policy,
      location_city: pkg.location_city,
      team_description: pkg.team_description,
      company_values: pkg.company_values,
      growth_paths: pkg.growth_paths,
      process_steps: pkg.process_steps,
      gross_salary: pkg.gross_salary,
      equity_devices: pkg.equity_devices,
    }),
    attractivenessScore:
      typeof pkg.attractiveness_score === "number"
        ? pkg.attractiveness_score
        : null,
  };
}

export async function duplicatePackage(packageId: string): Promise<string> {
  const { data: src, error } = await supabase
    .from("packages")
    .select("*")
    .eq("id", packageId)
    .single();
  if (error || !src) throw error ?? new Error("Package introuvable");

  const { data: created, error: insErr } = await supabase
    .from("packages")
    .insert({
      organization_id: src.organization_id,
      created_by: src.created_by,
      title: `${src.title} (copie)`,
      status: "draft",
      gross_salary: src.gross_salary,
      variable_target: src.variable_target,
      benefits: src.benefits,
      scenario_message: src.scenario_message,
      scenario_display: src.scenario_display,
    })
    .select("id")
    .single();
  if (insErr || !created) throw insErr ?? new Error("Erreur duplication");

  const newId = created.id;

  const [eq, sv, sc] = await Promise.all([
    supabase.from("equity_devices").select("*").eq("package_id", packageId),
    supabase.from("savings_devices").select("*").eq("package_id", packageId),
    supabase.from("scenarios").select("*").eq("package_id", packageId),
  ]);

  if (eq.data && eq.data.length > 0) {
    await supabase.from("equity_devices").insert(
      eq.data.map((d) => ({
        package_id: newId,
        type: d.type,
        quantity: d.quantity,
        strike_price: d.strike_price,
        current_valuation_m: d.current_valuation_m,
        vesting_years: d.vesting_years,
        cliff_months: d.cliff_months,
        special_conditions: d.special_conditions,
      })),
    );
  }
  if (sv.data && sv.data.length > 0) {
    await supabase.from("savings_devices").insert(
      sv.data.map((d) => ({
        package_id: newId,
        type: d.type,
        matching_rate: d.matching_rate,
        cap_amount: d.cap_amount,
        avg_3y: d.avg_3y,
      })),
    );
  }
  if (sc.data && sc.data.length > 0) {
    await supabase.from("scenarios").insert(
      sc.data.map((s) => ({
        package_id: newId,
        label: s.label,
        target_valuation_m: s.target_valuation_m,
        horizon_years: s.horizon_years,
        display_order: s.display_order,
      })),
    );
  }
  return newId;
}

export async function archivePackage(id: string) {
  const { error } = await supabase
    .from("packages")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePackage(id: string) {
  const { error } = await supabase.from("packages").delete().eq("id", id);
  if (error) throw error;
}
