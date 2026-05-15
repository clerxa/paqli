import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DashboardMetrics {
  activePackages: number;
  totalLinks: number;
  openRate: number;
  simulatedLinks: number;
}

export interface PackageSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  totalLinks: number;
  openedLinks: number;
  simulatedLinks: number;
}

export type ActivityType =
  | "opened"
  | "simulated"
  | "question"
  | "rdv_click"
  | "sent";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  candidateName: string;
  linkId: string;
  packageId?: string;
  createdAt: string;
}

export interface TodoItem {
  type: "draft" | "unopened";
  message: string;
  detail?: string;
  packageId?: string;
  severity: "warning" | "info";
}

export interface DeclineStat {
  category: string;
  count: number;
}

export type FollowUpAlertType =
  | "sim_no_response"
  | "opened_not_sim"
  | "not_opened_72h"
  | "declined_can_counter"
  | "deadline_urgent"
  | "deadline_expired";

export interface FollowUpAlert {
  type: FollowUpAlertType;
  priority: "high" | "medium" | "low";
  linkId: string;
  token: string;
  candidateName: string;
  packageTitle: string;
  packageId: string;
  message: string;
  cta: string;
  declineCategory?: string | null;
}

export function useDashboard() {
  const { organization } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [declineStats, setDeclineStats] = useState<DeclineStat[]>([]);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [declinedCount, setDeclinedCount] = useState(0);
  const [followUpAlerts, setFollowUpAlerts] = useState<FollowUpAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const orgId = organization.id;
    loadDashboard(orgId);

    const channel = supabase
      .channel("dashboard-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "link_events" },
        (payload) => {
          const eventType = (payload.new as { event_type: string }).event_type;
          const messages: Record<string, string> = {
            opened: "vient d'ouvrir son lien",
            simulated: "vient de lancer une simulation",
            question: "vient de poser une question",
          };
          if (messages[eventType]) {
            toast(`Un candidat ${messages[eventType]}`);
          }
          loadDashboard(orgId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  async function loadDashboard(orgId: string) {
    try {
      const [pkgList, links] = await Promise.all([
        loadPackages(orgId),
        loadLinks(orgId),
      ]);
      const activity = await loadActivity(links);

      const activePackages = pkgList.filter((p) => p.status === "active").length;
      const totalLinks = links.length;
      const openedLinks = links.filter((l) => l.opened_at).length;
      const simulatedLinks = links.filter((l) => l.simulated_at).length;
      const openRate =
        totalLinks > 0 ? Math.round((openedLinks / totalLinks) * 100) : 0;

      setMetrics({ activePackages, totalLinks, openRate, simulatedLinks });
      setPackages(pkgList);
      setRecentActivity(activity);
      setTodos(buildTodos(pkgList));
      setFollowUpAlerts(buildFollowUpAlerts(links));

      const accepted = links.filter((l) => l.status === "accepted").length;
      const declined = links.filter((l) => l.status === "declined");
      setAcceptedCount(accepted);
      setDeclinedCount(declined.length);

      const counts = new Map<string, number>();
      for (const l of declined) {
        const key = l.decline_category || "other";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      setDeclineStats(
        Array.from(counts.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadLinks(orgId: string) {
    const { data } = await supabase
      .from("candidate_links")
      .select(
        "id, token, candidate_name, package_id, created_at, opened_at, simulated_at, status, decline_category, decision_deadline, packages (title)",
      )
      .eq("organization_id", orgId);
    return data ?? [];
  }

  async function loadPackages(orgId: string): Promise<PackageSummary[]> {
    const { data } = await supabase
      .from("packages")
      .select(
        `id, title, status, updated_at, candidate_links (id, opened_at, simulated_at)`,
      )
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(5);

    return (data ?? []).map((pkg) => {
      const links = (pkg.candidate_links ?? []) as Array<{
        opened_at: string | null;
        simulated_at: string | null;
      }>;
      return {
        id: pkg.id,
        title: pkg.title,
        status: pkg.status,
        updatedAt: pkg.updated_at,
        totalLinks: links.length,
        openedLinks: links.filter((l) => l.opened_at).length,
        simulatedLinks: links.filter((l) => l.simulated_at).length,
      };
    });
  }

  async function loadActivity(
    links: Array<{ id: string; candidate_name: string | null; package_id: string | null }>,
  ): Promise<ActivityItem[]> {
    if (!links.length) return [];
    const { data: events } = await supabase
      .from("link_events")
      .select("id, event_type, created_at, link_id")
      .in(
        "link_id",
        links.map((l) => l.id),
      )
      .order("created_at", { ascending: false })
      .limit(10);

    return (events ?? []).map((event) => {
      const link = links.find((l) => l.id === event.link_id);
      return {
        id: event.id,
        type: event.event_type as ActivityType,
        candidateName: link?.candidate_name ?? "Candidat",
        linkId: event.link_id,
        packageId: link?.package_id ?? undefined,
        createdAt: event.created_at,
      };
    });
  }

  function buildTodos(packages: PackageSummary[]): TodoItem[] {
    const todos: TodoItem[] = [];

    packages
      .filter((p) => {
        if (p.status !== "draft") return false;
        const days =
          (Date.now() - new Date(p.updatedAt).getTime()) / 86400000;
        return days > 2;
      })
      .forEach((p) => {
        const days = Math.floor(
          (Date.now() - new Date(p.updatedAt).getTime()) / 86400000,
        );
        todos.push({
          type: "draft",
          message: `Package "${p.title}" incomplet`,
          detail: `En attente depuis ${days} jours`,
          packageId: p.id,
          severity: "warning",
        });
      });

    const unopened = packages.reduce(
      (acc, p) => acc + (p.totalLinks - p.openedLinks),
      0,
    );
    if (unopened > 0) {
      todos.push({
        type: "unopened",
        message: `${unopened} candidat${unopened > 1 ? "s" : ""} n'${unopened > 1 ? "ont" : "a"} pas ouvert leur lien`,
        detail: "Pensez à les relancer",
        severity: "info",
      });
    }

    return todos;
  }

  return {
    metrics,
    packages,
    recentActivity,
    todos,
    declineStats,
    acceptedCount,
    declinedCount,
    followUpAlerts,
    loading,
  };
}

const COUNTERABLE_CATEGORIES = new Set(["salary", "equity", "location"]);

function buildFollowUpAlerts(
  links: Array<{
    id: string;
    token: string;
    candidate_name: string | null;
    package_id: string | null;
    created_at: string;
    opened_at: string | null;
    simulated_at: string | null;
    status: string;
    decline_category: string | null;
    decision_deadline?: string | null;
    packages?: { title: string } | null;
  }>,
): FollowUpAlert[] {
  const now = Date.now();
  const alerts: FollowUpAlert[] = [];

  for (const l of links) {
    if (!l.package_id) continue; // package supprimé : pas d'action de suivi
    const packageId = l.package_id;
    const candidateName = l.candidate_name ?? "Candidat";
    const packageTitle = l.packages?.title ?? "";

    if (l.status === "declined" && l.decline_category && COUNTERABLE_CATEGORIES.has(l.decline_category)) {
      alerts.push({
        type: "declined_can_counter",
        priority: "high",
        linkId: l.id,
        token: l.token,
        candidateName,
        packageTitle,
        packageId,
        message: "A décliné — contre-offre possible",
        cta: "Faire une contre-offre",
        declineCategory: l.decline_category,
      });
      continue;
    }

    if (l.status !== "pending") continue;

    // Deadline alerts take priority over generic follow-ups
    if (l.decision_deadline) {
      const deadlineMs = new Date(l.decision_deadline).getTime();
      const hoursLeft = (deadlineMs - now) / 3_600_000;
      if (hoursLeft > 0 && hoursLeft <= 24) {
        alerts.push({
          type: "deadline_urgent",
          priority: "high",
          linkId: l.id,
          token: l.token,
          candidateName,
          packageTitle,
          packageId,
          message: `L'offre expire dans ${Math.max(1, Math.round(hoursLeft))}h — pas encore de réponse`,
          cta: "Relancer",
        });
        continue;
      }
      if (hoursLeft <= 0 && hoursLeft > -48) {
        alerts.push({
          type: "deadline_expired",
          priority: "medium",
          linkId: l.id,
          token: l.token,
          candidateName,
          packageTitle,
          packageId,
          message: "Offre expirée sans réponse — relancer ?",
          cta: "Envoyer un message",
        });
        continue;
      }
    }

    const created = new Date(l.created_at).getTime();
    const opened = l.opened_at ? new Date(l.opened_at).getTime() : null;
    const sim = l.simulated_at ? new Date(l.simulated_at).getTime() : null;
    const hCreated = (now - created) / 3600000;
    const hOpened = opened ? (now - opened) / 3600000 : null;
    const hSim = sim ? (now - sim) / 3600000 : null;

    if (sim && hSim! >= 48) {
      alerts.push({
        type: "sim_no_response",
        priority: "high",
        linkId: l.id,
        token: l.token,
        candidateName,
        packageTitle,
        packageId,
        message: `A simulé il y a ${Math.round(hSim!)}h sans répondre`,
        cta: "Envoyer un message",
      });
    } else if (opened && !sim && hOpened! >= 24) {
      alerts.push({
        type: "opened_not_sim",
        priority: "medium",
        linkId: l.id,
        token: l.token,
        candidateName,
        packageTitle,
        packageId,
        message: `A ouvert il y a ${Math.round(hOpened!)}h sans simuler`,
        cta: "Voir le lien",
      });
    } else if (!opened && hCreated >= 72) {
      alerts.push({
        type: "not_opened_72h",
        priority: "low",
        linkId: l.id,
        token: l.token,
        candidateName,
        packageTitle,
        packageId,
        message: `Lien non ouvert depuis ${Math.round(hCreated / 24)} jours`,
        cta: "Vérifier l'email",
      });
    }
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return alerts.sort((a, b) => order[a.priority] - order[b.priority]);
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return "Hier";
  return `Il y a ${days} jours`;
}
