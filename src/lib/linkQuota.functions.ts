import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getLinkQuotaFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .maybeSingle();

    const orgId = profile?.organization_id;
    if (!orgId) return { used: 0, quota: null as number | null, plan: null as string | null };

    const [{ data: org }, { data: countData }] = await Promise.all([
      supabase
        .from("organizations")
        .select("monthly_link_quota, plan")
        .eq("id", orgId)
        .maybeSingle(),
      supabase.rpc("links_sent_this_month", { _org_id: orgId }),
    ]);

    return {
      used: typeof countData === "number" ? countData : 0,
      quota: (org?.monthly_link_quota as number | null) ?? null,
      plan: (org?.plan as string | null) ?? null,
    };
  });
