import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { StatusPill } from "@/components/paqli/StatusPill";
import { Skeleton } from "@/components/paqli/Skeleton";
import { ConfirmModal } from "@/components/paqli/ConfirmModal";
import { Chip, TextField } from "@/components/paqli/configurator/fields";
import { LinkActivityPanel } from "@/components/paqli/LinkActivityPanel";
import { CounterOfferModal, type CounterOfferOriginal } from "@/components/paqli/CounterOfferModal";
import { EngagementBadge } from "@/components/paqli/EngagementBadge";
import { BehaviorView } from "@/components/paqli/BehaviorView";
import { SalaryBreakdown } from "@/components/paqli/candidate/SalaryBreakdown";
import { DECLINE_LABELS } from "@/hooks/useLinkActivity";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { loadPackage } from "@/lib/packageService";
import type { PackageConfig } from "@/lib/packageConfig";
import {
  calcStep1Preview,
  calcStep3Preview,
  estimateScenarioTotal,
  formatEur,
} from "@/lib/packageConfig";
import {
  buildCandidateUrl,
  generateCandidateLink,
} from "@/lib/candidateLinks";

export const Route = createFileRoute("/_app/packages/$id/")({
  component: PackageDetail,
});

interface CandidateLinkRow {
  id: string;
  token: string;
  candidate_email: string | null;
  candidate_name: string | null;
  created_at: string;
  opened_at: string | null;
  simulated_at: string | null;
  status: string;
  decline_category: string | null;
  decline_reason: string | null;
  engagement_score: number | null;
  engagement_label: string | null;
  intent_prediction: string | null;
}

function PackageDetail() {
  const { id } = Route.useParams();
  const { organization } = useAuth();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<PackageConfig | null>(null);
  const [links, setLinks] = useState<CandidateLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
  const [counterOfferFor, setCounterOfferFor] = useState<CounterOfferOriginal | null>(null);
  const [previewPas, setPreviewPas] = useState(0.30);

  async function reload() {
    const [p, l] = await Promise.all([
      loadPackage(id),
      supabase
        .from("candidate_links")
        .select("id, token, candidate_email, candidate_name, created_at, opened_at, simulated_at, status, decline_category, decline_reason, engagement_score, engagement_label, intent_prediction")
        .eq("package_id", id)
        .order("created_at", { ascending: false }),
    ]);
    setPkg(p);
    setLinks((l.data ?? []) as CandidateLinkRow[]);
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

  if (!pkg) {
    return (
      <>
        <Topbar title="Package introuvable" />
        <div className="px-4 sm:px-7 py-4 sm:py-6 text-grey text-[13px]">
          Ce package n'existe pas ou a été supprimé.
        </div>
      </>
    );
  }

  const s1 = calcStep1Preview(pkg);
  const s3 = calcStep3Preview(pkg);
  const realScenario = pkg.scenarios.find((s) => s.label === "realiste");

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(buildCandidateUrl(token));
      toast.success("Lien copié !");
    } catch {
      toast.error("Impossible de copier");
    }
  }

  async function handleDeleteLink() {
    if (!deleteLinkId) return;
    const { error } = await supabase
      .from("candidate_links")
      .delete()
      .eq("id", deleteLinkId);
    if (error) toast.error("Erreur");
    else {
      toast.success("Lien supprimé");
      setDeleteLinkId(null);
      reload();
    }
  }

  return (
    <>
      <Topbar
        title={
          <span className="text-[14px] text-grey font-sans">
            <Link to="/packages" className="hover:text-aubergine">
              Packages
            </Link>
            <span className="mx-2">/</span>
            <span
              className="text-aubergine font-display"
              style={{ fontSize: 22 }}
            >
              {pkg.title}
            </span>
          </span>
        }
        actions={
          <>
            <Link to="/packages/$id/edit" params={{ id }}>
              <Button variant="ghost">Modifier</Button>
            </Link>
            <Button onClick={() => setShowSendModal(true)}>
              Envoyer un lien
            </Button>
          </>
        }
      />

      <div className="px-4 sm:px-7 py-4 sm:py-6 grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2
                className="font-display text-aubergine"
                style={{ fontSize: 18 }}
              >
                Composition du package
              </h2>
              <StatusPill status={pkg.status === "active" ? "active" : "draft"} />
            </div>

            <Section title="Rémunération fixe">
              <Row label="Fixe brut annuel" value={formatEur(pkg.grossSalary)} />
              {pkg.variableTarget > 0 && (
                <Row label="Variable cible" value={formatEur(pkg.variableTarget)} />
              )}
              {s1.benefitsEst > 0 && (
                <Row
                  label="Avantages"
                  value={`~${formatEur(s1.benefitsEst)}`}
                />
              )}
            </Section>

            {pkg.equityDevices.length > 0 && (
              <Section title="Equity">
                {pkg.equityDevices.map((d) => (
                  <Row
                    key={d.id}
                    label={`${d.type.toUpperCase()} — ${d.quantity.toLocaleString("fr-FR")}`}
                    value={
                      realScenario
                        ? `~${formatEur(estimateScenarioTotal([d], realScenario.targetValuationM))} (réaliste)`
                        : "—"
                    }
                  />
                ))}
              </Section>
            )}

            {pkg.savingsDevices.length > 0 && (
              <Section title="Épargne salariale">
                {pkg.savingsDevices.map((d) => (
                  <Row
                    key={d.id}
                    label={d.type.toUpperCase()}
                    value={
                      d.type === "pee" || d.type === "perco"
                        ? `Abondé ${d.matchingRate}%, jusqu'à ${formatEur(d.capAmount)}`
                        : `~${formatEur(d.avg3y)}`
                    }
                  />
                ))}
              </Section>
            )}

            {pkg.scenarios.length > 0 && pkg.equityDevices.length > 0 && (
              <Section title="Scénarios de valorisation">
                {pkg.scenarios.map((s) => (
                  <Row
                    key={s.label}
                    label={`${s.label.charAt(0).toUpperCase() + s.label.slice(1)} — ${s.targetValuationM} M€ / ${s.horizonYears} ans`}
                    value={`~${formatEur(estimateScenarioTotal(pkg.equityDevices, s.targetValuationM))}`}
                  />
                ))}
              </Section>
            )}
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-5">
          <Card>
            <h2
              className="font-display text-aubergine mb-3"
              style={{ fontSize: 16 }}
            >
              Statistiques
            </h2>
            <div className="space-y-2 text-[13px]">
              <Row label="Liens envoyés" value={String(links.length)} />
              <Row
                label="Ouverts"
                value={String(links.filter((l) => l.opened_at).length)}
              />
              <Row
                label="Simulations"
                value={String(links.filter((l) => l.simulated_at).length)}
              />
            </div>
          </Card>

          <Card>
            <h2
              className="font-display text-aubergine mb-3"
              style={{ fontSize: 16 }}
            >
              Liens envoyés
            </h2>
            {links.length === 0 ? (
              <div className="text-[12px] text-grey italic">
                Aucun lien généré pour l'instant.
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((l) => {
                  const activityStatus = l.simulated_at
                    ? "Simulé"
                    : l.opened_at
                      ? "Ouvert"
                      : "Non ouvert";
                  const isExpanded = expandedLinkId === l.id;
                  return (
                    <div
                      key={l.id}
                      className="border-b border-[rgba(45,38,64,0.06)] pb-3 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] text-aubergine font-medium truncate">
                            {l.candidate_name || "—"}
                          </div>
                          <div className="text-[11px] text-grey truncate">
                            {l.candidate_email || "Aucun email"}
                          </div>
                        </div>
                        <DecisionBadge status={l.status} />
                      </div>
                      {l.engagement_score != null && (
                        <div className="mt-1.5">
                          <EngagementBadge
                            score={l.engagement_score}
                            label={l.engagement_label}
                            intent={l.intent_prediction}
                          />
                        </div>
                      )}
                      {l.status === "declined" && l.decline_category && (
                        <div className="text-[10px] text-[#A32D2D] mt-1">
                          {DECLINE_LABELS[l.decline_category]}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-aubergine-light">
                          {activityStatus}
                        </span>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {l.status === "declined" && (
                            <button
                              onClick={() => {
                                const bspce = pkg!.equityDevices.find((d) => d.type === "bspce");
                                setCounterOfferFor({
                                  linkId: l.id,
                                  candidateName: l.candidate_name || "ce candidat",
                                  declineCategory: l.decline_category,
                                  declineReason: l.decline_reason,
                                  packageTitle: pkg!.title,
                                  grossSalary: pkg!.grossSalary,
                                  variableTarget: pkg!.variableTarget,
                                  remotePolicy: pkg!.remotePolicy ?? null,
                                  remoteDays: pkg!.remoteDays ?? null,
                                  bspceQuantity: bspce?.quantity ?? null,
                                });
                              }}
                              className="text-[11px] text-[#3B6D11] font-medium hover:underline"
                            >
                              Contre-offre
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setExpandedLinkId(isExpanded ? null : l.id)
                            }
                            className="text-[11px] text-aubergine hover:underline"
                          >
                            {isExpanded ? "Masquer" : "Activité"}
                          </button>
                          <button
                            onClick={() => copyToken(l.token)}
                            className="text-[11px] text-aubergine hover:underline"
                          >
                            Copier
                          </button>
                          <button
                            onClick={() => setDeleteLinkId(l.id)}
                            className="text-[11px] text-danger hover:underline"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[rgba(45,38,64,0.06)] space-y-5">
                          <LinkActivityPanel
                            linkId={l.id}
                            candidateName={l.candidate_name || "ce candidat"}
                          />
                          <BehaviorView linkId={l.id} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {showSendModal && organization && (
        <SendLinkModal
          packageId={id}
          orgId={organization.id}
          onClose={() => setShowSendModal(false)}
          onCreated={() => {
            setShowSendModal(false);
            reload();
          }}
        />
      )}

      {deleteLinkId && (
        <ConfirmModal
          title="Supprimer ce lien ?"
          message="Le candidat ne pourra plus accéder à son package."
          confirmLabel="Supprimer"
          confirmVariant="danger"
          onConfirm={handleDeleteLink}
          onCancel={() => setDeleteLinkId(null)}
        />
      )}

      {counterOfferFor && (
        <CounterOfferModal
          original={counterOfferFor}
          onClose={() => setCounterOfferFor(null)}
          onSent={() => {
            setCounterOfferFor(null);
            reload();
          }}
        />
      )}
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-wider text-grey mb-2">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-aubergine-light">{label}</span>
      <span className="font-medium text-aubergine">{value}</span>
    </div>
  );
}

function SendLinkModal({
  packageId,
  orgId,
  onClose,
  onCreated,
}: {
  packageId: string;
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [expires, setExpires] = useState<number | null>(30);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await generateCandidateLink(
        packageId,
        orgId,
        email || undefined,
        [firstName, lastName].filter(Boolean).join(" ") || undefined,
        expires,
      );
      toast.success("Lien généré");
      onCreated();
    } catch (e) {
      console.error(e);
      toast.error("Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(45,38,64,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white"
        style={{
          borderRadius: 16,
          padding: 28,
          maxWidth: 480,
          width: "calc(100% - 32px)",
        }}
      >
        <h3
          className="font-display text-aubergine mb-4"
          style={{ fontSize: 20 }}
        >
          Envoyer un lien à un candidat
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Prénom" value={firstName} onChange={setFirstName} />
            <TextField label="Nom" value={lastName} onChange={setLastName} />
          </div>
          <TextField
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="prenom.nom@email.com"
          />
          <div>
            <div className="text-[12px] text-aubergine-light font-medium mb-1">
              Expiration
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { v: 30, l: "30 j" },
                { v: 60, l: "60 j" },
                { v: 90, l: "90 j" },
                { v: null, l: "Sans" },
              ].map((o) => (
                <Chip
                  key={String(o.v)}
                  selected={expires === o.v}
                  onClick={() => setExpires(o.v)}
                >
                  {o.l}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Génération…" : "Générer le lien"}
          </Button>
        </div>
      </div>
    </div>
  );
}
