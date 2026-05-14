import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ChangesSchema = z.object({
  grossSalary: z.number().min(0).max(1_000_000).optional().nullable(),
  variableTarget: z.number().min(0).max(1_000_000).optional().nullable(),
  remoteDays: z.number().int().min(0).max(5).optional().nullable(),
  equityQuantity: z.number().int().min(0).max(10_000_000).optional().nullable(),
  peeMatchingRate: z.number().min(0).max(10).optional().nullable(),
});

const InputSchema = z.object({
  originalLinkId: z.string().uuid(),
  changes: ChangesSchema,
  message: z.string().max(500).optional().nullable(),
});

/**
 * Crée une contre-offre :
 * 1. Clone le package original avec les modifications du RH
 * 2. Crée un nouveau lien candidat (même email/nom)
 * 3. Insère un enregistrement dans `counter_offers`
 * 4. Logge un événement "counter_offer_sent" dans link_events
 *
 * TODO: envoyer un email au candidat quand un fournisseur est configuré.
 */
export const sendCounterOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const changes = data.changes;

    // 1. Récupérer le lien original + package complet
    const { data: link, error: linkErr } = await supabase
      .from("candidate_links")
      .select(
        `id, candidate_email, candidate_name, organization_id,
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
           equity_devices ( type, quantity, strike_price, current_valuation_m, vesting_years, cliff_months, special_conditions ),
           savings_devices ( type, matching_rate, cap_amount, avg_3y ),
           scenarios ( label, target_valuation_m, horizon_years, display_order )
         )`,
      )
      .eq("id", data.originalLinkId)
      .maybeSingle();

    if (linkErr) throw new Error(linkErr.message);
    if (!link || !link.packages) throw new Error("Lien introuvable");

    const pkg = link.packages as any;
    const orgId = link.organization_id;

    // 2. Cloner le package avec les modifications
    const newPkgInsert: any = {
      organization_id: orgId,
      created_by: userId,
      title: `${pkg.title} — Contre-offre`,
      status: "active",
      gross_salary: changes.grossSalary ?? pkg.gross_salary,
      variable_target: changes.variableTarget ?? pkg.variable_target,
      benefits: pkg.benefits,
      scenario_message: pkg.scenario_message,
      scenario_display: pkg.scenario_display,
      job_summary: pkg.job_summary,
      missions: pkg.missions,
      stack: pkg.stack,
      contract_type: pkg.contract_type,
      job_type: pkg.job_type,
      remote_policy: pkg.remote_policy,
      remote_days: changes.remoteDays ?? pkg.remote_days,
      remote_guaranteed: pkg.remote_guaranteed,
      flexible_hours: pkg.flexible_hours,
      location_city: pkg.location_city,
      location_details: pkg.location_details,
      team_size: pkg.team_size,
      team_description: pkg.team_description,
      manager_style: pkg.manager_style,
      company_values: pkg.company_values,
      culture_note: pkg.culture_note,
      glassdoor_url: pkg.glassdoor_url,
      wtj_url: pkg.wtj_url,
      growth_paths: pkg.growth_paths,
      training_budget: pkg.training_budget,
      onboarding_note: pkg.onboarding_note,
      process_steps: pkg.process_steps,
      process_duration: pkg.process_duration,
      start_date: pkg.start_date,
    };

    const { data: newPkg, error: pkgErr } = await supabase
      .from("packages")
      .insert(newPkgInsert)
      .select("id")
      .single();

    if (pkgErr || !newPkg) {
      throw new Error(pkgErr?.message ?? "Erreur création contre-offre");
    }

    // 3. Cloner equity / savings / scenarios
    if (pkg.equity_devices?.length) {
      await supabase.from("equity_devices").insert(
        pkg.equity_devices.map((d: any) => ({
          package_id: newPkg.id,
          type: d.type,
          quantity:
            d.type === "bspce" && changes.equityQuantity != null
              ? changes.equityQuantity
              : d.quantity,
          strike_price: d.strike_price,
          current_valuation_m: d.current_valuation_m,
          vesting_years: d.vesting_years,
          cliff_months: d.cliff_months,
          special_conditions: d.special_conditions,
        })),
      );
    }

    if (pkg.savings_devices?.length) {
      await supabase.from("savings_devices").insert(
        pkg.savings_devices.map((d: any) => ({
          package_id: newPkg.id,
          type: d.type,
          matching_rate:
            d.type === "pee" && changes.peeMatchingRate != null
              ? changes.peeMatchingRate
              : d.matching_rate,
          cap_amount: d.cap_amount,
          avg_3y: d.avg_3y,
        })),
      );
    }

    if (pkg.scenarios?.length) {
      await supabase.from("scenarios").insert(
        pkg.scenarios.map((s: any) => ({
          package_id: newPkg.id,
          label: s.label,
          target_valuation_m: s.target_valuation_m,
          horizon_years: s.horizon_years,
          display_order: s.display_order,
        })),
      );
    }

    // 4. Créer le nouveau lien candidat
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    const { data: newLink, error: newLinkErr } = await supabase
      .from("candidate_links")
      .insert({
        package_id: newPkg.id,
        organization_id: orgId,
        candidate_email: link.candidate_email,
        candidate_name: link.candidate_name,
        expires_at: expiresAt,
      })
      .select("id, token")
      .single();

    if (newLinkErr || !newLink) {
      throw new Error(newLinkErr?.message ?? "Erreur création lien");
    }

    // 5. Enregistrer la contre-offre
    const { data: counter, error: coErr } = await supabase
      .from("counter_offers")
      .insert({
        original_link_id: data.originalLinkId,
        new_link_id: newLink.id,
        organization_id: orgId,
        created_by: userId,
        changes: changes as any,
        message: data.message ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (coErr) throw new Error(coErr.message);

    // 6. Lier le lien original à la contre-offre
    await supabase
      .from("candidate_links")
      .update({ counter_offer_id: counter.id })
      .eq("id", data.originalLinkId);

    // 7. Logger un événement
    await supabase.from("link_events").insert({
      link_id: data.originalLinkId,
      event_type: "counter_offer_sent",
      metadata: {
        counter_offer_id: counter.id,
        new_link_id: newLink.id,
        new_token: newLink.token,
        changes,
      } as any,
    });

    // TODO: envoyer un email au candidat avec le nouveau lien
    console.log(
      `[counter-offer TODO email] candidat=${link.candidate_email} new_token=${newLink.token}`,
    );

    return {
      success: true,
      newToken: newLink.token,
      newLinkId: newLink.id,
      counterOfferId: counter.id,
    };
  });
