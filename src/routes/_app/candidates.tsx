import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { Skeleton } from "@/components/paqli/Skeleton";
import { EngagementBadge } from "@/components/paqli/EngagementBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DECLINE_LABELS } from "@/hooks/useLinkActivity";

export const Route = createFileRoute("/_app/candidates")({
  component: CandidatesPage,
});

interface Row {
  id: string;
  package_id: string;
  candidate_email: string | null;
  candidate_name: string | null;
  created_at: string;
  opened_at: string | null;
  simulated_at: string | null;
  status: string;
  decline_category: string | null;
  engagement_score: number | null;
  engagement_label: string | null;
  intent_prediction: string | null;
  packages: { title: string } | null;
}

type Filter = "all" | "pending" | "accepted" | "declined";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "accepted", label: "Acceptés" },
  { value: "declined", label: "Déclinés" },
];

function CandidatesPage() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!organization) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("candidate_links")
        .select(
          "id, package_id, candidate_email, candidate_name, created_at, opened_at, simulated_at, status, decline_category, engagement_score, engagement_label, intent_prediction, packages(title)",
        )
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [organization?.id]);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  return (
    <>
      <Topbar
        title="Liens envoyés"
        actions={
          <Button onClick={() => navigate({ to: "/packages" })}>
            Choisir un package
          </Button>
        }
      />
      <div className="px-4 sm:px-7 py-4 sm:py-6 space-y-4">
        <div className="flex gap-2">
          {FILTERS.map((f) => {
            const count =
              f.value === "all"
                ? rows.length
                : rows.filter((r) => r.status === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
                  filter === f.value
                    ? "bg-aubergine text-lin border-aubergine"
                    : "bg-white text-aubergine-light border-[rgba(45,38,64,0.15)] hover:border-aubergine"
                }`}
              >
                {f.label} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <Card className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-12 text-[13px] text-grey">
            Aucun candidat dans cette catégorie.
          </Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr
                  style={{ background: "#FAF8F5", color: "#9B97A0" }}
                  className="text-left text-[11px] uppercase tracking-wider"
                >
                  <th className="px-5 py-3 font-medium">Candidat</th>
                  <th className="px-5 py-3 font-medium">Package</th>
                  <th className="px-5 py-3 font-medium">Activité</th>
                  <th className="px-5 py-3 font-medium">Engagement</th>
                  <th className="px-5 py-3 font-medium">Décision</th>
                  <th className="px-5 py-3 font-medium">Envoyé</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const activity = r.simulated_at
                    ? "Simulé"
                    : r.opened_at
                      ? "Ouvert"
                      : "Non ouvert";
                  return (
                    <tr
                      key={r.id}
                      onClick={() =>
                        navigate({
                          to: "/packages/$id",
                          params: { id: r.package_id },
                        })
                      }
                      className="border-t border-[rgba(45,38,64,0.06)] cursor-pointer hover:bg-[#FAF8F5]"
                    >
                      <td className="px-5 py-4">
                        <div className="text-aubergine font-medium">
                          {r.candidate_name || "—"}
                        </div>
                        <div className="text-[11px] text-grey">
                          {r.candidate_email || "Aucun email"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-aubergine-light">
                        {r.packages?.title ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-aubergine-light">
                        {activity}
                      </td>
                      <td className="px-5 py-4">
                        <DecisionBadge status={r.status} />
                        {r.status === "declined" && r.decline_category && (
                          <div className="text-[10px] text-[#A32D2D] mt-1">
                            {DECLINE_LABELS[r.decline_category] ??
                              r.decline_category}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-grey">
                        {timeAgo(r.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  );
}

function DecisionBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    accepted: { bg: "#EAF3DE", fg: "#27500A", label: "● Accepté" },
    declined: { bg: "#FCEBEB", fg: "#A32D2D", label: "● Décliné" },
    pending: { bg: "#F0EBE8", fg: "#9B97A0", label: "○ En attente" },
  };
  const s = styles[status] ?? styles.pending;
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

function timeAgo(date: string): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `il y a ${days}j`;
  return `il y a ${Math.floor(days / 30)} mois`;
}
