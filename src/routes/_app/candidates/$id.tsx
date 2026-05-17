import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { Skeleton } from "@/components/paqli/Skeleton";
import { EngagementBadge } from "@/components/paqli/EngagementBadge";
import { BehaviorView } from "@/components/paqli/BehaviorView";
import { LinkActivityPanel } from "@/components/paqli/LinkActivityPanel";
import { AiConversationPanel } from "@/components/paqli/AiConversationPanel";
import { CounterOfferModal, type CounterOfferOriginal } from "@/components/paqli/CounterOfferModal";
import { OfferLetterModal } from "@/components/paqli/OfferLetterModal";
import { ConfirmModal } from "@/components/paqli/ConfirmModal";
import { DECLINE_LABELS } from "@/hooks/useLinkActivity";
import { supabase } from "@/integrations/supabase/client";
import { buildCandidateUrl } from "@/lib/candidateLinks";
import { loadPackage } from "@/lib/packageService";
import type { PackageConfig } from "@/lib/packageConfig";
import { formatEur } from "@/lib/packageConfig";

export const Route = createFileRoute("/_app/candidates/$id")({
  component: CandidateDetail,
});

interface LinkRow {
  id: string;
  token: string;
  package_id: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  created_at: string;
  opened_at: string | null;
  simulated_at: string | null;
  status: string;
  decline_category: string | null;
  decline_reason: string | null;
  engagement_score: number | null;
  engagement_label: string | null;
  intent_prediction: string | null;
  decision_deadline: string | null;
  time_on_page_total: number | null;
  return_visits: number | null;
  expires_at: string | null;
  candidate_current_package: {
    gross_salary?: number | null;
    variable_target?: number | null;
    benefits?: Array<{ label: string; annual_value: number }>;
    note?: string | null;
  } | null;
  candidate_current_package_at: string | null;
}

function CandidateDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [link, setLink] = useState<LinkRow | null>(null);
  const [pkg, setPkg] = useState<PackageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [counterOffer, setCounterOffer] = useState<CounterOfferOriginal | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function reload() {
    const { data, error } = await supabase
      .from("candidate_links")
      .select(
        "id, token, package_id, candidate_name, candidate_email, created_at, opened_at, simulated_at, status, decline_category, decline_reason, engagement_score, engagement_label, intent_prediction, decision_deadline, time_on_page_total, return_visits, expires_at, candidate_current_package, candidate_current_package_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      setLoading(false);
      return;
    }
    setLink(data as LinkRow);
    if (data.package_id) {
      try {
        const p = await loadPackage(data.package_id);
        setPkg(p);
      } catch {}
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <>
        <Topbar title="Chargement…" />
        <div className="px-4 sm:px-7 py-4 sm:py-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  if (!link) {
    return (
      <>
        <Topbar title="Candidat introuvable" />
        <div className="px-4 sm:px-7 py-4 sm:py-6 text-grey text-[13px]">
          Ce candidat n'existe pas ou a été supprimé.
        </div>
      </>
    );
  }

  const name = link.candidate_name || "Candidat sans nom";
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(buildCandidateUrl(link!.token));
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier");
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from("candidate_links").delete().eq("id", id);
    if (error) {
      toast.error("Erreur");
    } else {
      toast.success("Candidat supprimé");
      navigate({ to: "/candidates" });
    }
  }

  return (
    <>
      <Topbar
        title={
          <span className="text-[14px] text-grey font-sans">
            <Link to="/candidates" className="hover:text-aubergine">
              Candidats
            </Link>
            <span className="mx-2">/</span>
            <span className="text-aubergine font-display" style={{ fontSize: 22 }}>
              {name}
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="ghost" onClick={copyLink}>
              Copier le lien
            </Button>
            {link.status === "declined" && pkg && (
              <Button
                onClick={() => {
                  const bspce = pkg.equityDevices.find((d) => d.type === "bspce");
                  setCounterOffer({
                    linkId: link.id,
                    candidateName: name,
                    declineCategory: link.decline_category,
                    declineReason: link.decline_reason,
                    packageTitle: pkg.title,
                    grossSalary: pkg.grossSalary,
                    variableTarget: pkg.variableTarget,
                    remotePolicy: pkg.remotePolicy ?? null,
                    remoteDays: pkg.remoteDays ?? null,
                    bspceQuantity: bspce?.quantity ?? null,
                  });
                }}
              >
                Faire une contre-offre
              </Button>
            )}
            {link.status === "accepted" && (
              <Button onClick={() => setShowOffer(true)}>
                Promesse d'embauche
              </Button>
            )}
          </>
        }
      />

      <div className="px-4 sm:px-7 py-4 sm:py-6 space-y-5">
        {/* Header candidate identity */}
        <Card>
          <div className="flex items-start gap-4 flex-wrap">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-display flex-shrink-0"
              style={{ background: "#F5F2FA", color: "#6B5F88", fontSize: 20 }}
            >
              {initials || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-aubergine" style={{ fontSize: 22 }}>
                {name}
              </div>
              <div className="text-[13px] text-grey mt-0.5">
                {link.candidate_email || "Aucun email"}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <DecisionBadge status={link.status} />
                {link.status === "declined" && link.decline_category && (
                  <span className="text-[11px] text-[#A32D2D]">
                    {DECLINE_LABELS[link.decline_category] ?? link.decline_category}
                  </span>
                )}
                {pkg && (
                  <Link
                    to="/packages/$id"
                    params={{ id: link.package_id! }}
                    className="text-[11px] text-aubergine-light hover:text-aubergine underline"
                  >
                    Package : {pkg.title}
                  </Link>
                )}
              </div>
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[11px] text-danger hover:underline self-start"
            >
              Supprimer
            </button>
          </div>
        </Card>

        {/* HERO Engagement — bien visible */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-aubergine" style={{ fontSize: 20 }}>
              Engagement du candidat
            </h2>
            {link.engagement_score != null && (
              <EngagementBadge
                score={link.engagement_score}
                label={link.engagement_label}
                intent={link.intent_prediction}
              />
            )}
          </div>

          {link.engagement_score != null ? (
            <>
              <div className="mb-5">
                <div className="flex items-baseline gap-2 mb-2">
                  <span
                    className="font-display text-aubergine"
                    style={{ fontSize: 48, lineHeight: 1 }}
                  >
                    {link.engagement_score}
                  </span>
                  <span className="text-grey text-[14px]">/ 100</span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "#F0EBE8" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${link.engagement_score}%`,
                      background:
                        link.engagement_label === "hot"
                          ? "#639922"
                          : link.engagement_label === "warm"
                            ? "#8B7FA8"
                            : link.engagement_label === "lukewarm"
                              ? "#C4A882"
                              : "#9B97A0",
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat
                  label="Temps total"
                  value={formatDuration(link.time_on_page_total ?? 0)}
                />
                <Stat label="Visites" value={String(link.return_visits ?? 0)} />
                <Stat
                  label="Ouvert"
                  value={link.opened_at ? "Oui" : "Non"}
                  highlight={!!link.opened_at}
                />
                <Stat
                  label="Simulé"
                  value={link.simulated_at ? "Oui" : "Non"}
                  highlight={!!link.simulated_at}
                />
              </div>
            </>
          ) : (
            <div className="text-[13px] text-grey italic py-4">
              Aucun signal d'engagement pour l'instant. Le score apparaîtra dès
              que le candidat aura ouvert son lien.
            </div>
          )}
        </Card>

        {/* Comportement (tabs visités, temps par tab, IA) */}
        <Card>
          <h2 className="font-display text-aubergine mb-4" style={{ fontSize: 18 }}>
            Parcours détaillé
          </h2>
          <BehaviorView linkId={link.id} />
        </Card>

        {/* Package actuel saisi par le candidat */}
        {link.candidate_current_package && (
          <Card>
            <h2 className="font-display text-aubergine mb-1" style={{ fontSize: 18 }}>
              Package actuel du candidat
            </h2>
            <p className="text-[12px] text-aubergine-light mb-4">
              Renseigné par le candidat{link.candidate_current_package_at ? ` le ${new Date(link.candidate_current_package_at).toLocaleDateString("fr-FR")}` : ""}.
            </p>
            <CurrentPackageRecap data={link.candidate_current_package} />
          </Card>
        )}

        {/* Conversations IA candidat ↔ assistant */}

        <Card>
          <h2 className="font-display text-aubergine mb-4" style={{ fontSize: 18 }}>
            Conversations avec l'assistant IA
          </h2>
          <AiConversationPanel linkId={link.id} />
        </Card>

        {/* Activité chronologique + messagerie */}
        <Card>
          <h2 className="font-display text-aubergine mb-4" style={{ fontSize: 18 }}>
            Activité &amp; échanges
          </h2>
          <LinkActivityPanel linkId={link.id} candidateName={name} />
        </Card>


        {/* Résumé package */}
        {pkg && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2
                className="font-display text-aubergine"
                style={{ fontSize: 18 }}
              >
                Package proposé
              </h2>
              <Link
                to="/packages/$id"
                params={{ id: link.package_id! }}
                className="text-[12px] text-aubergine-light hover:text-aubergine underline"
              >
                Voir le détail →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Fixe brut" value={formatEur(pkg.grossSalary)} />
              {pkg.variableTarget > 0 && (
                <Stat label="Variable" value={formatEur(pkg.variableTarget)} />
              )}
              <Stat
                label="Brut total"
                value={formatEur(pkg.grossSalary + pkg.variableTarget)}
              />
              {pkg.locationCity && (
                <Stat label="Localisation" value={pkg.locationCity} />
              )}
            </div>
          </Card>
        )}
      </div>

      {counterOffer && (
        <CounterOfferModal
          original={counterOffer}
          onClose={() => setCounterOffer(null)}
          onSent={() => {
            setCounterOffer(null);
            reload();
          }}
        />
      )}
      {showOffer && (
        <OfferLetterModal
          linkId={link.id}
          candidateName={name}
          onClose={() => setShowOffer(false)}
          onSent={reload}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer ce candidat ?"
          message="Le lien et tout l'historique associé seront supprimés."
          confirmLabel="Supprimer"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{ background: highlight ? "#EAF3DE" : "#FAF8F5" }}
    >
      <div className="text-[10px] uppercase tracking-wider text-grey">
        {label}
      </div>
      <div
        className="font-display mt-0.5"
        style={{
          fontSize: 16,
          color: highlight ? "#27500A" : "#2D2640",
        }}
      >
        {value}
      </div>
    </div>
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
      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function CurrentPackageRecap({
  data,
}: {
  data: {
    gross_salary?: number | null;
    variable_target?: number | null;
    benefits?: Array<{ label: string; annual_value: number }>;
    note?: string | null;
  };
}) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
  const gross = Number(data.gross_salary) || 0;
  const variable = Number(data.variable_target) || 0;
  const benefitsTotal = (data.benefits ?? []).reduce((s, b) => s + (Number(b.annual_value) || 0), 0);
  const total = gross + variable + benefitsTotal;
  return (
    <div className="space-y-3 text-[13px]">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Salaire brut" value={gross ? fmt(gross) : "—"} />
        <Stat label="Variable cible" value={variable ? fmt(variable) : "—"} />
        <Stat label="Avantages" value={benefitsTotal ? fmt(benefitsTotal) : "—"} />
        <Stat label="Total annuel" value={total ? fmt(total) : "—"} highlight />
      </div>
      {data.benefits && data.benefits.length > 0 && (
        <ul className="text-[12px] text-aubergine-light list-disc pl-5">
          {data.benefits.map((b, i) => (
            <li key={i}>{b.label} — {fmt(Number(b.annual_value) || 0)}/an</li>
          ))}
        </ul>
      )}
      {data.note && (
        <div className="rounded-lg p-3 text-[12px] text-aubergine" style={{ background: "#FAF8F5" }}>
          {data.note}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg p-3" style={{ background: highlight ? "#FAEEDA" : "#F5F2FA" }}>
      <div className="text-[11px] text-aubergine-light">{label}</div>
      <div className="font-display text-aubergine mt-1" style={{ fontSize: 16 }}>{value}</div>
    </div>
  );
}
