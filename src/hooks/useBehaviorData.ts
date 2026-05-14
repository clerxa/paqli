import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BehaviorEvent {
  id: string;
  link_id: string;
  event_type: string;
  section: string | null;
  value: string | null;
  duration_s: number | null;
  created_at: string;
}

export interface BehaviorLink {
  id: string;
  opened_at: string | null;
  simulated_at: string | null;
  status: string;
  decline_category: string | null;
  engagement_score: number | null;
  engagement_label: string | null;
  intent_prediction: string | null;
  return_visits: number | null;
  time_on_page_total: number | null;
}

export function useBehaviorData(linkId: string | null) {
  const [behaviors, setBehaviors] = useState<BehaviorEvent[]>([]);
  const [link, setLink] = useState<BehaviorLink | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!linkId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load(id: string) {
      const [behaviorsRes, linkRes] = await Promise.all([
        supabase
          .from("behavior_events")
          .select("id, link_id, event_type, section, value, duration_s, created_at")
          .eq("link_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("candidate_links")
          .select(
            "id, opened_at, simulated_at, status, decline_category, engagement_score, engagement_label, intent_prediction, return_visits, time_on_page_total",
          )
          .eq("id", id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setBehaviors((behaviorsRes.data ?? []) as BehaviorEvent[]);
      setLink((linkRes.data ?? null) as BehaviorLink | null);
      setLoading(false);
    }

    void load(linkId);

    const channel = supabase
      .channel(`behavior-${linkId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "behavior_events",
          filter: `link_id=eq.${linkId}`,
        },
        () => void load(linkId),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "candidate_links",
          filter: `id=eq.${linkId}`,
        },
        (payload) => setLink(payload.new as BehaviorLink),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [linkId]);

  return { behaviors, link, loading };
}
