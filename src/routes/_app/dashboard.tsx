import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getLinkQuotaFn } from "@/lib/linkQuota.functions";
import { Package as PackageIcon, ArrowUpRight } from "lucide-react";
import { Topbar } from "@/components/paqli/Topbar";
import { MetricCard } from "@/components/paqli/MetricCard";
import { Card } from "@/components/paqli/Card";
import { StatusPill, type PillStatus } from "@/components/paqli/StatusPill";
import { Button } from "@/components/paqli/Button";
import { Skeleton } from "@/components/paqli/Skeleton";
import { FollowUpAlertsCard } from "@/components/paqli/FollowUpAlertsCard";
import { CounterOfferModal } from "@/components/paqli/CounterOfferModal";
import { EngagementBadge } from "@/components/paqli/EngagementBadge";
import { OfferLetterModal } from "@/components/paqli/OfferLetterModal";
import { ActionAlertsSection } from "@/components/paqli/dashboard/ActionAlertsSection";
import type { ActionAlert } from "@/hooks/useActionAlerts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { seedDemoData } from "@/lib/seedDemo";
import {
  useDashboard,
  timeAgo,
  type ActivityType,
  type PackageSummary,
  type TodoItem,
  type FollowUpAlert,
} from "@/hooks/useDashboard";
import { DECLINE_LABELS } from "@/hooks/useLinkActivity";
import { loadPackage } from "@/lib/packageService";
import type { PackageConfig } from "@/lib/packageConfig";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const eventColors: Record<ActivityType, string> = {
  opened: "#639922",
  simulated: "#C4A882",
  question: "#8B7FA8",
  rdv_click: "#2D2640",
  sent: "#9B97A0",
};

const eventLabels: Record<ActivityType, string> = {
  opened: "a ouvert son lien",
  simulated: "a lancé une simulation",
  question: "a posé une question",
  rdv_click: "a cliqué sur RDV",
  sent: "a reçu un lien",
};


function pkgInitials(title: string) {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function statusToPill(status: string): PillStatus {
  if (status === "active") return "active";
  if (status === "archived") return "archived";
  return "draft";
}

function DashboardPage() {
  const { user, profile, organization } = useAuth();
  const {
    metrics,
    packages,
    recentActivity,
    todos,
    declineStats,
    acceptedCount,
    declinedCount,
    followUpAlerts,
    engagement,
    loading,
  } = useDashboard();
  const navigate = useNavigate();
  const [counterAlert, setCounterAlert] = useState<FollowUpAlert | null>(null);
  const [counterPkg, setCounterPkg] = useState<PackageConfig | null>(null);
  const [offerLetterTarget, setOfferLetterTarget] = useState<{
    linkId: string;
    candidateName: string;
  } | null>(null);

  async function handleExtendDeadline(linkId: string, days: number) {
    const { data: link } = await supabase
      .from("candidate_links")
      .select("decision_deadline")
      .eq("id", linkId)
      .single();
    const current = link?.decision_deadline
      ? new Date(link.decision_deadline)
      : new Date();
    const extended = new Date(Math.max(current.getTime(), Date.now()));
    extended.setDate(extended.getDate() + days);
    const { error } = await supabase
      .from("candidate_links")
      .update({
        decision_deadline: extended.toISOString(),
        deadline_notified_48h: false,
        deadline_notified_24h: false,
      })
      .eq("id", linkId);
    if (error) {
      toast.error("Impossible de prolonger la deadline");
    } else {
      toast.success(`Deadline prolongée de ${days} jours`);
    }
  }

  function handleAlertAction(action: string, alert: ActionAlert) {
    switch (action) {
      case "generate_offer_letter":
        if (alert.linkId)
          setOfferLetterTarget({
            linkId: alert.linkId,
            candidateName: alert.candidateName || "Candidat",
          });
        break;
      case "counter_offer":
      case "view_candidate":
      case "send_message":
      case "ai_message":
      case "view_behavior":
      case "resend_link":
        if (alert.linkId)
          navigate({
            to: "/candidates/$id",
            params: { id: alert.linkId },
          });
        break;
      case "edit_package":
        navigate({
          to: "/packages/$id/edit",
          params: { id: alert.packageId },
        });
        break;
      case "extend_deadline":
        if (alert.linkId) handleExtendDeadline(alert.linkId, 3);
        break;
      case "copy_link": {
        const token = alert.metadata?.token as string | undefined;
        if (token) {
          const url = `${window.location.origin}/p/${token}`;
          navigator.clipboard.writeText(url).then(
            () => toast.success("Lien copié !"),
            () => toast.error("Impossible de copier le lien"),
          );
        }
        break;
      }
    }
  }

  const fetchQuota = useServerFn(getLinkQuotaFn);
  const { data: quota } = useQuery({
    queryKey: ["link-quota"],
    queryFn: () => fetchQuota(),
    enabled: !!organization,
  });

  async function openCounterOffer(alert: FollowUpAlert) {
    try {
      const pkg = await loadPackage(alert.packageId);
      if (!pkg) return;
      setCounterPkg(pkg);
      setCounterAlert(alert);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (user && organization && !loading && packages.length === 0 && metrics?.totalLinks === 0) {
      seedDemoData(organization.id, user.id).catch((e) =>
        console.error("seedDemoData failed", e),
      );
    }
  }, [user, organization, loading, packages.length, metrics?.totalLinks]);

  const firstName =
    profile?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "Camille";

  return (
    <>
      <Topbar
        title={`Bonjour, ${firstName}`}
        actions={
          <Link to="/packages/new">
            <Button>Nouveau package</Button>
          </Link>
        }
      />
      <div className="px-4 sm:px-7 py-4 sm:py-6 space-y-6">
        {/* Actions prioritaires */}
        <ActionAlertsSection
          organizationId={organization?.id}
          onAction={handleAlertAction}
        />

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {loading || !metrics ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-[10px]" />
            ))
          ) : (
            <>
              <MetricCard
                label="Packages actifs"
                value={String(metrics.activePackages)}
                delta={
                  metrics.activePackages > 0
                    ? { value: "Ce mois", positive: true }
                    : undefined
                }
              />
              <MetricCard
                label="Liens envoyés ce mois"
                value={
                  quota
                    ? `${quota.used}${quota.quota != null ? ` / ${quota.quota}` : ""}`
                    : String(metrics.totalLinks)
                }
                delta={
                  quota?.quota != null
                    ? {
                        value:
                          quota.used >= quota.quota
                            ? "Quota atteint"
                            : `${quota.quota - quota.used} restant${quota.quota - quota.used > 1 ? "s" : ""}`,
                        positive: quota.used < quota.quota,
                      }
                    : metrics.totalLinks > 0
                      ? { value: "Illimité", positive: true }
                      : undefined
                }
              />
              <MetricCard
                label="Taux d'ouverture"
                value={`${metrics.openRate}%`}
                delta={
                  metrics.totalLinks > 0
                    ? { value: `${metrics.totalLinks} liens` }
                    : undefined
                }
              />
              <MetricCard
                label="Simulations lancées"
                value={String(metrics.simulatedLinks)}
                delta={
                  metrics.totalLinks > 0
                    ? {
                        value: `${Math.round((metrics.simulatedLinks / Math.max(metrics.totalLinks, 1)) * 100)}% des liens`,
                      }
                    : undefined
                }
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Active packages */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="font-display text-aubergine"
                  style={{ fontSize: 18 }}
                >
                  Packages actifs
                </h2>
                <Link to="/packages">
                  <Button variant="ghost">Voir tout →</Button>
                </Link>
              </div>

              {loading ? (
                <ul className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[52px]" />
                  ))}
                </ul>
              ) : packages.length === 0 ? (
                <EmptyPackages />
              ) : (
                <ul className="divide-y divide-[rgba(45,38,64,0.06)]">
                  {packages.map((p) => (
                    <PackageRow
                      key={p.id}
                      pkg={p}
                      onClick={() =>
                        navigate({ to: "/packages/$id", params: { id: p.id } })
                      }
                    />
                  ))}
                </ul>
              )}
            </Card>

            {/* Activité récente */}
            <Card>
              <h2
                className="font-display text-aubergine mb-4"
                style={{ fontSize: 18 }}
              >
                Activité récente
              </h2>
              {loading ? (
                <ul className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[28px]" />
                  ))}
                </ul>
              ) : recentActivity.length === 0 ? (
                <p className="text-[12px] text-grey italic">
                  Aucune activité pour le moment.
                </p>
              ) : (
                <ul className="space-y-3">
                  {recentActivity.map((a) => (
                    <li key={a.id} className="flex items-start gap-2">
                      <span
                        className="rounded-full mt-[6px] shrink-0"
                        style={{
                          width: 6,
                          height: 6,
                          background:
                            eventColors[a.type] ?? eventColors.sent,
                        }}
                      />
                      <div className="text-[12px] text-aubergine-light leading-snug">
                        <span className="text-grey">
                          {timeAgo(a.createdAt)} ·{" "}
                        </span>
                        <span className="text-aubergine font-medium">
                          {a.candidateName}
                        </span>{" "}
                        {eventLabels[a.type] ?? a.type}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <FollowUpAlertsCard
              alerts={followUpAlerts}
              onCounterOffer={openCounterOffer}
            />

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="font-display text-aubergine"
                  style={{ fontSize: 18 }}
                >
                  Engagement candidats
                </h2>
                <Link to="/candidates">
                  <Button variant="ghost">Voir tout →</Button>
                </Link>
              </div>
              {loading ? (
                <ul className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[40px]" />
                  ))}
                </ul>
              ) : engagement.length === 0 ? (
                <p className="text-[12px] text-grey italic">
                  Pas encore de signaux d'engagement.
                </p>
              ) : (
                <ul className="space-y-3">
                  {engagement.map((e) => (
                    <li
                      key={e.linkId}
                      className="flex items-start justify-between gap-3 cursor-pointer hover:bg-[rgba(45,38,64,0.03)] -mx-2 px-2 py-1 rounded-md transition-colors"
                      onClick={() =>
                        e.packageId &&
                        navigate({
                          to: "/packages/$id",
                          params: { id: e.packageId },
                        })
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] text-aubergine font-medium truncate">
                          {e.candidateName}
                        </div>
                        {e.packageTitle && (
                          <div className="text-[10px] text-grey truncate">
                            {e.packageTitle}
                          </div>
                        )}
                      </div>
                      <EngagementBadge
                        score={e.score}
                        label={e.label}
                        intent={e.intent}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {(declinedCount > 0 || acceptedCount > 0) && (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h2
                    className="font-display text-aubergine"
                    style={{ fontSize: 18 }}
                  >
                    Décisions candidats
                  </h2>
                </div>
                <div className="flex gap-2 mb-4">
                  <div
                    className="flex-1 rounded-md px-3 py-2"
                    style={{ background: "#EAF3DE" }}
                  >
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "#27500A" }}>
                      Acceptés
                    </div>
                    <div className="text-[18px] font-display" style={{ color: "#27500A" }}>
                      {acceptedCount}
                    </div>
                  </div>
                  <div
                    className="flex-1 rounded-md px-3 py-2"
                    style={{ background: "#FCEBEB" }}
                  >
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "#A32D2D" }}>
                      Déclinés
                    </div>
                    <div className="text-[18px] font-display" style={{ color: "#A32D2D" }}>
                      {declinedCount}
                    </div>
                  </div>
                </div>

                {declineStats.length > 0 && (
                  <>
                    <div className="text-[11px] uppercase tracking-wider text-grey mb-2">
                      Raisons de refus
                    </div>
                    <ul className="space-y-2">
                      {declineStats.map((d) => {
                        const pct = Math.round(
                          (d.count / Math.max(declinedCount, 1)) * 100,
                        );
                        return (
                          <li
                            key={d.category}
                            className="grid grid-cols-[1fr_30px] items-center gap-2"
                          >
                            <div>
                              <div className="text-[12px] text-aubergine-light">
                                {DECLINE_LABELS[d.category] ?? d.category}
                              </div>
                              <div
                                className="rounded-[3px] overflow-hidden mt-1"
                                style={{ background: "#F0EBE8", height: 4 }}
                              >
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    background: "#B85A6A",
                                    height: "100%",
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-[11px] text-grey text-right">
                              {d.count}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </Card>
            )}

            <Card>
              <h2
                className="font-display text-aubergine mb-4"
                style={{ fontSize: 18 }}
              >
                À faire
              </h2>
              {todos.length === 0 ? (
                <div
                  className="text-[12px] rounded-md px-3 py-2"
                  style={{ background: "#EAF3DE" }}
                >
                  Tout est à jour ✓
                </div>
              ) : (
                <ul className="space-y-3">
                  {todos.map((t, i) => (
                    <TodoRow key={i} todo={t} />
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
      {counterAlert && counterPkg && (
        <CounterOfferModal
          original={{
            linkId: counterAlert.linkId,
            candidateName: counterAlert.candidateName,
            declineCategory: counterAlert.declineCategory ?? null,
            declineReason: null,
            packageTitle: counterPkg.title,
            grossSalary: counterPkg.grossSalary,
            variableTarget: counterPkg.variableTarget ?? null,
            remotePolicy: (counterPkg as any).remotePolicy ?? null,
            remoteDays: (counterPkg as any).remoteDays ?? null,
            bspceQuantity:
              counterPkg.equityDevices.find((d) => d.type === "bspce")?.quantity ?? null,
          }}
          onClose={() => {
            setCounterAlert(null);
            setCounterPkg(null);
          }}
        />
      )}
      {offerLetterTarget && (
        <OfferLetterModal
          linkId={offerLetterTarget.linkId}
          candidateName={offerLetterTarget.candidateName}
          onClose={() => setOfferLetterTarget(null)}
          onSent={() => setOfferLetterTarget(null)}
        />
      )}
    </>
  );
}

function PackageRow({
  pkg,
  onClick,
}: {
  pkg: PackageSummary;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-[rgba(45,38,64,0.03)] rounded-md px-1 transition-colors"
      >
        <div
          className="flex items-center justify-center rounded-md text-[11px] font-semibold shrink-0"
          style={{
            width: 32,
            height: 32,
            background: "#F0EBE8",
            color: "#2D2640",
          }}
        >
          {pkgInitials(pkg.title)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-aubergine font-medium truncate">
            {pkg.title}
          </div>
          <div className="text-[11px] text-grey mt-0.5">
            Mis à jour {timeAgo(pkg.updatedAt)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-aubergine-light">
            {pkg.totalLinks} lien{pkg.totalLinks > 1 ? "s" : ""}
          </div>
          <div className="text-[11px] text-grey flex items-center justify-end gap-1">
            {pkg.openedLinks} ouvert{pkg.openedLinks > 1 ? "s" : ""}
            <ArrowUpRight size={11} />
          </div>
        </div>
        <StatusPill status={statusToPill(pkg.status)} />
      </button>
    </li>
  );
}

function EmptyPackages() {
  return (
    <div className="text-center py-10">
      <div
        className="inline-flex items-center justify-center rounded-full mb-3"
        style={{ width: 44, height: 44, background: "#F0EBE8" }}
      >
        <PackageIcon size={20} style={{ color: "#8B7FA8" }} />
      </div>
      <div className="font-display text-aubergine mb-1" style={{ fontSize: 16 }}>
        Aucun package créé
      </div>
      <p className="text-[12px] text-grey mb-4">
        Commencez par créer votre premier package de rémunération.
      </p>
      <Link to="/packages/new">
        <Button>Créer un package</Button>
      </Link>
    </div>
  );
}

function TodoRow({ todo }: { todo: TodoItem }) {
  const dotColor = todo.severity === "warning" ? "#B85A6A" : "#C4A882";
  return (
    <li className="flex items-start gap-3">
      <span
        className="rounded-full mt-[6px] shrink-0"
        style={{ width: 8, height: 8, background: dotColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-aubergine font-medium">
          {todo.message}
        </div>
        {todo.detail && (
          <div className="text-[11px] text-grey mt-0.5">{todo.detail}</div>
        )}
        {todo.type === "draft" && todo.packageId ? (
          <Link
            to="/packages/$id/edit"
            params={{ id: todo.packageId }}
            className="text-[11px] text-aubergine underline mt-1 inline-block"
          >
            Compléter →
          </Link>
        ) : todo.type === "unopened" ? (
          <Link
            to="/candidates"
            className="text-[11px] text-aubergine underline mt-1 inline-block"
          >
            Voir les liens →
          </Link>
        ) : null}
      </div>
    </li>
  );
}
