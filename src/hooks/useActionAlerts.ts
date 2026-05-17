import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActionAlertType =
  | "offer_accepted"
  | "offer_declined"
  | "deadline_expiring_soon"
  | "hot_candidate_silent"
  | "sim_no_response"
  | "not_opened_72h"
  | "package_score_low";

export interface ActionAlert {
  id: string;
  type: ActionAlertType;
  priority: 1 | 2 | 3;
  candidateName: string;
  packageTitle: string;
  packageId: string;
  linkId?: string;
  message: string;
  ctaPrimary: { label: string; action: string };
  ctaSecondary?: { label: string; action: string };
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export function useActionAlerts(organizationId: string | undefined) {
  const [alerts, setAlerts] = useState<ActionAlert[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async (orgId: string) => {
    const now = new Date();
    const out: ActionAlert[] = [];

    const { data: links } = await supabase
      .from("candidate_links")
      .select(
        `id, token, status, candidate_name, decision_deadline,
         opened_at, simulated_at, created_at,
         engagement_score, engagement_label, intent_prediction,
         packages (id, title, attractiveness_score),
         link_events (event_type, created_at)`,
      )
      .eq("organization_id", orgId)
      .neq("status", "voided")
      .order("created_at", { ascending: false })
      .limit(100);

    for (const link of (links ?? []) as any[]) {
      const pkg = link.packages;
      const events = (link.link_events ?? []) as Array<{
        event_type: string;
        created_at: string;
      }>;
      const candName = link.candidate_name ?? "Candidat";
      const pkgTitle = pkg?.title ?? "Package sans titre";

      // P1 — accepted < 24h
      if (link.status === "accepted") {
        const ev = events.find((e) => e.event_type === "offer_accepted");
        const at = ev ? new Date(ev.created_at) : new Date(link.created_at);
        const h = (now.getTime() - at.getTime()) / 3600000;
        if (h < 24) {
          out.push({
            id: link.id,
            type: "offer_accepted",
            priority: 1,
            candidateName: candName,
            packageTitle: pkgTitle,
            packageId: pkg?.id ?? "",
            linkId: link.id,
            message: `A accepté l'offre ${
              h < 1 ? "il y a moins d'une heure" : `il y a ${Math.round(h)}h`
            }`,
            ctaPrimary: {
              label: "📄 Générer la promesse",
              action: "generate_offer_letter",
            },
            ctaSecondary: { label: "Voir le profil", action: "view_candidate" },
            createdAt: at,
          });
        }
        continue;
      }

      // P1 — declined < 48h
      if (link.status === "declined") {
        const ev = events.find((e) => e.event_type === "offer_declined");
        const at = ev ? new Date(ev.created_at) : new Date(link.created_at);
        const h = (now.getTime() - at.getTime()) / 3600000;
        if (h < 48) {
          out.push({
            id: link.id,
            type: "offer_declined",
            priority: 1,
            candidateName: candName,
            packageTitle: pkgTitle,
            packageId: pkg?.id ?? "",
            linkId: link.id,
            message: `A décliné l'offre il y a ${Math.round(h)}h`,
            ctaPrimary: {
              label: "🔄 Faire une contre-offre",
              action: "counter_offer",
            },
            ctaSecondary: { label: "Voir le motif", action: "view_candidate" },
            createdAt: at,
          });
        }
        continue;
      }

      if (link.status !== "pending") continue;

      // P1 — deadline < 24h
      if (link.decision_deadline) {
        const dl = new Date(link.decision_deadline);
        const h = (dl.getTime() - now.getTime()) / 3600000;
        if (h > 0 && h < 24) {
          out.push({
            id: link.id,
            type: "deadline_expiring_soon",
            priority: 1,
            candidateName: candName,
            packageTitle: pkgTitle,
            packageId: pkg?.id ?? "",
            linkId: link.id,
            message: `Offre expire dans ${Math.round(h)}h`,
            ctaPrimary: {
              label: "⚡ Relancer maintenant",
              action: "send_message",
            },
            ctaSecondary: { label: "+3 jours", action: "extend_deadline" },
            metadata: { deadline: link.decision_deadline },
            createdAt: now,
          });
          continue;
        }
      }

      // P2 — hot silent
      const hSim = link.simulated_at
        ? (now.getTime() - new Date(link.simulated_at).getTime()) / 3600000
        : null;

      if ((link.engagement_score ?? 0) >= 75 && hSim !== null && hSim >= 48) {
        out.push({
          id: link.id,
          type: "hot_candidate_silent",
          priority: 2,
          candidateName: candName,
          packageTitle: pkgTitle,
          packageId: pkg?.id ?? "",
          linkId: link.id,
          message: `Score ${link.engagement_score}/100 — silencieux depuis ${Math.round(hSim)}h`,
          ctaPrimary: { label: "✨ Message IA", action: "ai_message" },
          ctaSecondary: {
            label: "Voir le comportement",
            action: "view_behavior",
          },
          createdAt: new Date(link.simulated_at),
        });
        continue;
      }

      // P2 — simulated no response
      if (hSim !== null && hSim >= 48) {
        out.push({
          id: link.id,
          type: "sim_no_response",
          priority: 2,
          candidateName: candName,
          packageTitle: pkgTitle,
          packageId: pkg?.id ?? "",
          linkId: link.id,
          message: `A simulé il y a ${Math.round(hSim)}h sans répondre`,
          ctaPrimary: { label: "💬 Envoyer un message", action: "send_message" },
          ctaSecondary: { label: "Voir le profil", action: "view_candidate" },
          createdAt: new Date(link.simulated_at),
        });
        continue;
      }

      // P3 — not opened 72h
      if (!link.opened_at) {
        const h = (now.getTime() - new Date(link.created_at).getTime()) / 3600000;
        if (h >= 72) {
          out.push({
            id: link.id,
            type: "not_opened_72h",
            priority: 3,
            candidateName: candName,
            packageTitle: pkgTitle,
            packageId: pkg?.id ?? "",
            linkId: link.id,
            message: `Lien non ouvert depuis ${Math.round(h / 24)} jours`,
            ctaPrimary: { label: "🔁 Renvoyer le lien", action: "resend_link" },
            ctaSecondary: { label: "Copier le lien", action: "copy_link" },
            metadata: { token: link.token },
            createdAt: new Date(link.created_at),
          });
        }
      }
    }

    // P3 — weak package
    const { data: weak } = await supabase
      .from("packages")
      .select("id, title, attractiveness_score")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .lt("attractiveness_score", 50)
      .not("attractiveness_score", "is", null)
      .limit(1);

    for (const p of (weak ?? []) as any[]) {
      out.push({
        id: p.id,
        type: "package_score_low",
        priority: 3,
        candidateName: "",
        packageTitle: p.title,
        packageId: p.id,
        message: `Score attractivité ${p.attractiveness_score}/100 — peu compétitif`,
        ctaPrimary: { label: "📝 Améliorer le package", action: "edit_package" },
        createdAt: new Date(),
      });
    }

    const sorted = out.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    setTotalCount(sorted.length);
    setAlerts(sorted.slice(0, 3));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    loadAlerts(organizationId);

    const channel = supabase
      .channel("action-alerts")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "candidate_links",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => loadAlerts(organizationId),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, loadAlerts]);

  return { alerts, totalCount, loading };
}
