import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface LinkEventRow {
  id: string;
  link_id: string;
  event_type: string;
  metadata: any;
  created_at: string;
}

export interface MessageRow {
  id: string;
  link_id: string;
  sender: "candidate" | "rh";
  content: string;
  created_at: string;
}

export interface LinkStatus {
  status: string;
  status_updated_at: string | null;
  decline_category: string | null;
  decline_reason: string | null;
}

export function useLinkActivity(linkId: string | null) {
  const [events, setEvents] = useState<LinkEventRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [linkStatus, setLinkStatus] = useState<LinkStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!linkId) return;
    let cancelled = false;

    async function loadAll(id: string) {
      const [evRes, msgRes, lnkRes] = await Promise.all([
        supabase
          .from("link_events")
          .select("*")
          .eq("link_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("messages")
          .select("*")
          .eq("link_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("candidate_links")
          .select(
            "status, status_updated_at, decline_category, decline_reason",
          )
          .eq("id", id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setEvents((evRes.data ?? []) as LinkEventRow[]);
      setMessages((msgRes.data ?? []) as MessageRow[]);
      setLinkStatus((lnkRes.data ?? null) as LinkStatus | null);
      setLoading(false);
    }

    void loadAll(linkId);

    const channel = supabase
      .channel(`link-activity-${linkId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "link_events",
          filter: `link_id=eq.${linkId}`,
        },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as LinkEventRow]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `link_id=eq.${linkId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as MessageRow]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "candidate_links",
          filter: `id=eq.${linkId}`,
        },
        (payload) => {
          const next = payload.new as any;
          setLinkStatus({
            status: next.status,
            status_updated_at: next.status_updated_at,
            decline_category: next.decline_category,
            decline_reason: next.decline_reason,
          });
          if (next.status === "accepted") {
            toast.success("🎉 Le candidat vient d'accepter l'offre !");
          } else if (next.status === "declined") {
            toast.info("Le candidat a décliné l'offre");
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [linkId]);

  return { events, messages, linkStatus, loading, setMessages };
}

export const DECLINE_LABELS: Record<string, string> = {
  salary: "Rémunération fixe insuffisante",
  equity: "Equity peu convaincant",
  location: "Localisation / télétravail",
  other_offer: "Autre offre plus attractive",
  role: "Poste ne correspond plus",
  culture: "Culture d'entreprise",
  other: "Autre raison",
};
