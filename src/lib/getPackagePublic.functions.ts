import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { inferJobFamily, inferSeniority } from "./jobBenchmark";

export type CurrentPackagePayload = {
  gross_salary?: number | null;
  variable_target?: number | null;
  benefits?: Array<{ label: string; annual_value: number }>;
  note?: string | null;
};

const InputSchema = z.object({
  token: z.string().min(4).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});

export const getPackagePublic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: link, error } = await supabaseAdmin
      .from("candidate_links")
      .select(
        `id, token, organization_id, candidate_name, candidate_email, expires_at, opened_at,
         simulated_at, return_visits,
         status, status_updated_at, decision_deadline,
         thinking_note, thinking_at,
         candidate_current_package, candidate_current_package_at,
         packages (
           id, title, gross_salary, variable_target, variable_config, benefits,
           scenario_message, scenario_display, interview_notes,
           job_summary, missions, stack, contract_type, job_type,
           remote_policy, remote_days, remote_guaranteed, flexible_hours,
           location_city, location_details,
           team_size, team_description, manager_style, company_values, culture_note,
           glassdoor_url, wtj_url,
           growth_paths, training_budget, onboarding_note,
           process_steps, process_duration, start_date,
           fixed_salary, salary_range_min, salary_range_max,
           variable_enabled, variable_criteria, equity_type,
           job_title, seniority, hiring_manager, career_path,
           non_compete_enabled, probation_months, probation_objectives,
           training_budget_specific,
           organizations ( name, logo_url, description, key_figures, values, culture_note, links ),
           equity_devices (
             id, type, quantity, strike_price,
             current_valuation_m, vesting_years, cliff_months,
             special_conditions
           ),
           savings_devices ( id, type, matching_rate, cap_amount, avg_3y ),
           scenarios ( id, label, target_valuation_m, horizon_years, display_order ),
           package_benefits ( benefit_key, category, value_type, monthly_value, annual_value, employer_share, custom_label, custom_note, display_order )
         )`,
      )
      .eq("token", data.token)
      .maybeSingle();

    if (error || !link || !link.packages) {
      return { ok: false as const, reason: "not_found" as const };
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return { ok: false as const, reason: "expired" as const };
    }

    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("id, sender, content, created_at")
      .eq("link_id", link.id)
      .order("created_at", { ascending: true });

    // Counter-offer detection: is this link the *new* link of a counter-offer?
    const { data: counterOfferRow } = await supabaseAdmin
      .from("counter_offers")
      .select("id, changes, message, created_at, original_link_id")
      .eq("new_link_id", link.id)
      .maybeSingle();

    let counterOffer: {
      id: string;
      changes: any;
      message: string | null;
      createdAt: string;
      originalToken: string | null;
    } | null = null;

    if (counterOfferRow) {
      const { data: origLink } = await supabaseAdmin
        .from("candidate_links")
        .select("token")
        .eq("id", counterOfferRow.original_link_id)
        .maybeSingle();
      counterOffer = {
        id: counterOfferRow.id,
        changes: counterOfferRow.changes,
        message: counterOfferRow.message,
        createdAt: counterOfferRow.created_at,
        originalToken: origLink?.token ?? null,
      };
    }

    const pkg = link.packages as any;

    // Citations actives de collaborateurs (max 5)
    const { data: testimonialsRaw } = await supabaseAdmin
      .from("employee_testimonials" as any)
      .select("first_name, job_title, seniority_years, quote, quote_context, avatar_url")
      .eq("organization_id", (link as any).organization_id)
      .eq("is_active", true)
      .order("display_order")
      .limit(5);
    const testimonials = ((testimonialsRaw ?? []) as unknown) as Array<{
      first_name: string;
      job_title: string;
      seniority_years: number | null;
      quote: string;
      quote_context: string | null;
      avatar_url: string | null;
    }>;


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

    // Benchmark concurrentiel généré par IA (optionnel)
    const { data: competitorBench } = await supabaseAdmin
      .from("package_benchmarks")
      .select("content, generated_at")
      .eq("package_id", pkg.id)
      .maybeSingle();

    // Company profile (for transparency score: benefits, remote, training, …)
    const { data: companyProfileRow } = await supabaseAdmin
      .from("company_profile")
      .select(
        "health_insurance_employer_rate, meal_voucher_enabled, remote_work_policy, profit_sharing_enabled, incentive_enabled, training_budget_per_person",
      )
      .eq("organization_id", (link as any).organization_id)
      .maybeSingle();

    return {
      linkId: link.id as string,
      token: link.token as string,
      candidateName: link.candidate_name as string | null,
      candidateEmail: (link as any).candidate_email as string | null,
      openedAt: link.opened_at as string | null,
      simulatedAt: (link as any).simulated_at as string | null,
      returnVisits: ((link as any).return_visits ?? 0) as number,
      expiresAt: link.expires_at as string | null,
      offerStatus: (link.status ?? "pending") as string,
      statusUpdatedAt: link.status_updated_at as string | null,
      decisionDeadline: (link as any).decision_deadline as string | null,
      thinkingNote: (link as any).thinking_note as string | null,
      thinkingAt: (link as any).thinking_at as string | null,
      currentPackage: ((link as any).candidate_current_package ?? null) as CurrentPackagePayload | null,
      currentPackageAt: ((link as any).candidate_current_package_at ?? null) as string | null,
      counterOffer,
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
        variable_config: pkg.variable_config ?? {},
        benefits: pkg.benefits,
        scenario_message: pkg.scenario_message,
        scenario_display: pkg.scenario_display,
        interview_notes: pkg.interview_notes ?? null,
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
        fixed_salary: pkg.fixed_salary ?? null,
        salary_range_min: pkg.salary_range_min ?? null,
        salary_range_max: pkg.salary_range_max ?? null,
        variable_enabled: pkg.variable_enabled ?? null,
        variable_criteria: pkg.variable_criteria ?? null,
        equity_type: pkg.equity_type ?? null,
        job_title: pkg.job_title ?? null,
        seniority: pkg.seniority ?? null,
        hiring_manager: pkg.hiring_manager ?? null,
        career_path: pkg.career_path ?? null,
        non_compete_enabled: pkg.non_compete_enabled ?? null,
        probation_months: pkg.probation_months ?? null,
        probation_objectives: pkg.probation_objectives ?? null,
        training_budget_specific: pkg.training_budget_specific ?? null,
        company_profile: companyProfileRow
          ? {
              health_insurance_employer_rate:
                (companyProfileRow as any).health_insurance_employer_rate ?? null,
              meal_voucher_enabled:
                (companyProfileRow as any).meal_voucher_enabled ?? null,
              remote_work_policy:
                (companyProfileRow as any).remote_work_policy ?? null,
              profit_sharing_enabled:
                (companyProfileRow as any).profit_sharing_enabled ?? null,
              incentive_enabled:
                (companyProfileRow as any).incentive_enabled ?? null,
              training_budget_per_person:
                (companyProfileRow as any).training_budget_per_person ?? null,
            }
          : null,
        benchmark,
        competitor_benchmark: competitorBench
          ? {
              content: competitorBench.content as any,
              generated_at: competitorBench.generated_at as string,
            }
          : null,
        organizations: pkg.organizations
          ? {
              name: (pkg.organizations as any).name,
              logo_url: (pkg.organizations as any).logo_url ?? null,
              description: (pkg.organizations as any).description ?? null,
              key_figures: Array.isArray((pkg.organizations as any).key_figures)
                ? (pkg.organizations as any).key_figures
                : [],
              values: Array.isArray((pkg.organizations as any).values)
                ? (pkg.organizations as any).values
                : [],
              culture_note: (pkg.organizations as any).culture_note ?? null,
              links: Array.isArray((pkg.organizations as any).links)
                ? (pkg.organizations as any).links
                : [],
            }
          : null,
        testimonials,
        equity_devices: pkg.equity_devices ?? [],
        savings_devices: pkg.savings_devices ?? [],
        scenarios,
        package_benefits: (pkg.package_benefits ?? [])
          .slice()
          .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map((b: any) => ({
            benefit_key: b.benefit_key,
            category: b.category,
            value_type: b.value_type ?? "fixed",
            monthly_value: b.monthly_value !== null ? Number(b.monthly_value) : null,
            annual_value: b.annual_value !== null ? Number(b.annual_value) : null,
            employer_share: b.employer_share !== null ? Number(b.employer_share) : null,
            custom_label: b.custom_label ?? null,
            custom_note: b.custom_note ?? null,
            display_order: b.display_order ?? 0,
          })),
      },
    };
  });
