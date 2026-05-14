import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { inferJobFamily, inferSeniority } from "./jobBenchmark";

const InputSchema = z.object({
  token: z.string().min(4).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});

export const getPackagePublic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: link, error } = await supabaseAdmin
      .from("candidate_links")
      .select(
        `id, token, candidate_name, expires_at, opened_at,
         status, status_updated_at,
         packages (
           id, title, gross_salary, variable_target, benefits,
           scenario_message, scenario_display,
           job_summary, missions, stack, contract_type, job_type,
           remote_policy, remote_days, remote_guaranteed, flexible_hours,
           location_city, location_details,
           team_size, team_description, manager_style, company_values, culture_note,
           glassdoor_url, wtj_url,
           growth_paths, training_budget, onboarding_note,
           process_steps, process_duration, start_date,
           organizations ( name, logo_url ),
           equity_devices (
             id, type, quantity, strike_price,
             current_valuation_m, vesting_years, cliff_months,
             special_conditions
           ),
           savings_devices ( id, type, matching_rate, cap_amount, avg_3y ),
           scenarios ( id, label, target_valuation_m, horizon_years, display_order )
         )`,
      )
      .eq("token", data.token)
      .maybeSingle();

    if (error || !link || !link.packages) {
      throw new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      throw new Response(JSON.stringify({ error: "expired" }), {
        status: 410,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("id, sender, content, created_at")
      .eq("link_id", link.id)
      .order("created_at", { ascending: true });

    const pkg = link.packages as any;
    const scenarios = (pkg.scenarios ?? []).slice().sort(
      (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0),
    );

    // Benchmark salarial : heuristique sur le titre
    const jobFamily = inferJobFamily(pkg.title ?? "");
    const seniority = inferSeniority(pkg.title ?? "");
    let benchmark: {
      job_family: string;
      seniority: string;
      location: string;
      p25: number;
      p50: number;
      p75: number;
      version: string;
      source: string | null;
    } | null = null;

    if (jobFamily !== "other") {
      const { data: bench } = await supabaseAdmin
        .from("salary_benchmarks")
        .select("job_family, seniority, location, p25, p50, p75, version, source")
        .eq("job_family", jobFamily)
        .eq("seniority", seniority)
        .eq("location", "paris")
        .maybeSingle();
      if (bench) benchmark = bench as any;
    }

    return {
      linkId: link.id as string,
      token: link.token as string,
      candidateName: link.candidate_name as string | null,
      openedAt: link.opened_at as string | null,
      expiresAt: link.expires_at as string | null,
      offerStatus: (link.status ?? "pending") as string,
      statusUpdatedAt: link.status_updated_at as string | null,
      messages: (messages ?? []) as Array<{
        id: string;
        sender: "candidate" | "rh";
        content: string;
        created_at: string;
      }>,
      package: {
        id: pkg.id,
        title: pkg.title,
        gross_salary: pkg.gross_salary,
        variable_target: pkg.variable_target,
        benefits: pkg.benefits,
        scenario_message: pkg.scenario_message,
        scenario_display: pkg.scenario_display,
        job_summary: pkg.job_summary ?? null,
        missions: Array.isArray(pkg.missions) ? pkg.missions : [],
        stack: pkg.stack ?? [],
        contract_type: pkg.contract_type ?? null,
        job_type: pkg.job_type ?? null,
        remote_policy: pkg.remote_policy ?? null,
        remote_days: pkg.remote_days ?? null,
        remote_guaranteed: !!pkg.remote_guaranteed,
        flexible_hours: !!pkg.flexible_hours,
        location_city: pkg.location_city ?? null,
        location_details: pkg.location_details ?? null,
        team_size: pkg.team_size ?? null,
        team_description: pkg.team_description ?? null,
        manager_style: pkg.manager_style ?? null,
        company_values: pkg.company_values ?? [],
        culture_note: pkg.culture_note ?? null,
        glassdoor_url: pkg.glassdoor_url ?? null,
        wtj_url: pkg.wtj_url ?? null,
        growth_paths: Array.isArray(pkg.growth_paths) ? pkg.growth_paths : [],
        training_budget: pkg.training_budget ?? null,
        onboarding_note: pkg.onboarding_note ?? null,
        process_steps: Array.isArray(pkg.process_steps) ? pkg.process_steps : [],
        process_duration: pkg.process_duration ?? null,
        start_date: pkg.start_date ?? null,
        benchmark,
        organizations: pkg.organizations,
        equity_devices: pkg.equity_devices ?? [],
        savings_devices: pkg.savings_devices ?? [],
        scenarios,
      },
    };
  });
