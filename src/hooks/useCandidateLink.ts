import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PackageData } from "@/lib/clientCalc";

export interface CandidateLinkData {
  id: string;
  token: string;
  candidate_name: string | null;
  expires_at: string | null;
  opened_at: string | null;
  packages: PackageData;
}

export type LinkError = "not_found" | "expired" | null;

export function useCandidateLink(token: string) {
  const [data, setData] = useState<CandidateLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LinkError>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);

      const { data: link, error: err } = await supabase
        .from("candidate_links")
        .select(
          `id, token, candidate_name, expires_at, opened_at,
           packages (
             id, title, gross_salary, variable_target, benefits,
             scenario_message, scenario_display,
             organizations ( name, logo_url ),
             equity_devices (*),
             savings_devices (*),
             scenarios (*)
           )`,
        )
        .eq("token", token)
        .maybeSingle();

      if (cancelled) return;

      if (err || !link || !link.packages) {
        setError("not_found");
        setLoading(false);
        return;
      }

      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        setError("expired");
        setLoading(false);
        return;
      }

      setData(link as unknown as CandidateLinkData);
      setLoading(false);

      if (!link.opened_at) {
        await supabase
          .from("candidate_links")
          .update({ opened_at: new Date().toISOString() })
          .eq("token", token);
        await supabase
          .from("link_events")
          .insert({ link_id: link.id, event_type: "opened" });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return { data, loading, error };
}

export async function trackEvent(
  linkId: string,
  eventType: "simulated" | "question" | "rdv_click",
  metadata?: Record<string, any>,
) {
  await supabase.from("link_events").insert({
    link_id: linkId,
    event_type: eventType,
    metadata: metadata ?? {},
  });
}
