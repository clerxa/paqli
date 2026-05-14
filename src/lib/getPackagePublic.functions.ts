import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
        organizations: pkg.organizations,
        equity_devices: pkg.equity_devices ?? [],
        savings_devices: pkg.savings_devices ?? [],
        scenarios,
      },
    };
  });
