import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LinkQuotaData {
  used: number;
  quota: number | null;
  plan: string | null;
}

async function fetchLinkQuota(orgId: string): Promise<LinkQuotaData> {
  const [{ data: org }, { data: usedRaw }] = await Promise.all([
    supabase
      .from("organizations")
      .select("monthly_link_quota, plan")
      .eq("id", orgId)
      .maybeSingle(),
    supabase.rpc("links_sent_this_month", { _org_id: orgId }),
  ]);

  return {
    used: typeof usedRaw === "number" ? usedRaw : 0,
    quota: (org?.monthly_link_quota as number | null) ?? null,
    plan: (org?.plan as string | null) ?? null,
  };
}

export function useLinkQuota() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["link-quota", organization?.id],
    queryFn: () => fetchLinkQuota(organization!.id),
    enabled: !!organization?.id,
    staleTime: 60_000,
  });
}