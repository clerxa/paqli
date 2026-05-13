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

export function useDashboard() {
  const { organization } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
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
    } finally {
      setLoading(false);
    }
  }

  async function loadLinks(orgId: string) {
    const { data } = await supabase
      .from("candidate_links")
      .select("id, candidate_name, package_id, opened_at, simulated_at")
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
    links: Array<{ id: string; candidate_name: string | null; package_id: string }>,
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
        packageId: link?.package_id,
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

  return { metrics, packages, recentActivity, todos, loading };
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
