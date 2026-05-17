import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { useHrAlerts } from "@/hooks/useHrAlerts";
import type { HrAlert } from "@/lib/hrAlerts.functions";
import { Copy, ExternalLink, X, CheckCircle2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/alerts")({
  component: AlertsPage,
});

const SEVERITY_BADGE: Record<HrAlert["severity"], { bg: string; fg: string; label: string }> = {
  high: { bg: "#FCEBEB", fg: "#A32D2D", label: "Urgent" },
  medium: { bg: "#FBF1E1", fg: "#8B6F2F", label: "Moyen" },
  low: { bg: "#EFEFEC", fg: "#5C5469", label: "Info" },
};

const TYPE_META: Record<
  HrAlert["type"],
  { label: string; icon: string; description: string }
> = {
  high_engagement_negotiation: {
    label: "Phase de négociation",
    icon: "💎",
    description: "Engagement élevé ou package actuel renseigné",
  },
  inactivity_after_engagement: {
    label: "Silence après engagement",
    icon: "🌙",
    description: "Fort intérêt puis plus d'activité depuis >48h",
  },
  sensitive_ai_question: {
    label: "Question sensible",
    icon: "💬",
    description: "Doute, comparaison ou question salariale posée à l'IA",
  },
  deadline_approaching: {
    label: "Deadline proche",
    icon: "⏰",
    description: "Réponse attendue sous 48h",
  },
};

function AlertsPage() {
  const { alerts, isLoading, update, markAllRead, unreadCount } = useHrAlerts();
  const [filter, setFilter] = useState<"all" | HrAlert["type"]>("all");
  const navigate = useNavigate();

  const filtered = useMemo(
    () => (filter === "all" ? alerts : alerts.filter((a) => a.type === filter)),
    [alerts, filter],
  );

  // Auto-scroll to hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const el = document.getElementById(`alert-${hash}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [alerts]);

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title={
          <span>
            Alertes & relances{" "}
            {unreadCount > 0 && (
              <span
                className="ml-2 text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "#B85A6A", color: "#FAF8F5" }}
              >
                {unreadCount} non lues
              </span>
            )}
          </span>
        }
        actions={
          unreadCount > 0 ? (
            <Button variant="ghost" onClick={() => markAllRead()}>
              Tout marquer lu
            </Button>
          ) : undefined
        }
      />
      <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`Toutes (${alerts.length})`}
          />
          {(Object.keys(TYPE_META) as HrAlert["type"][]).map((t) => {
            const count = alerts.filter((a) => a.type === t).length;
            if (count === 0) return null;
            return (
              <FilterChip
                key={t}
                active={filter === t}
                onClick={() => setFilter(t)}
                label={`${TYPE_META[t].icon} ${TYPE_META[t].label} (${count})`}
              />
            );
          })}
        </div>

        {isLoading ? (
          <Card>
            <div className="text-center py-10 text-grey text-[13px]">Détection des signaux…</div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <div className="text-center py-16">
              <div className="text-4xl mb-3">✨</div>
              <div className="font-display text-aubergine text-[18px] mb-1">
                Aucune alerte
              </div>
              <div className="text-[13px] text-grey font-light">
                Tous vos candidats sont bien suivis. Les alertes apparaissent quand un signal
                fort est détecté.
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                onMarkActioned={() => {
                  update({ id: a.id, status: "actioned" });
                  toast.success("Marquée comme traitée");
                }}
                onDismiss={() => {
                  update({ id: a.id, status: "dismissed" });
                  toast("Alerte ignorée");
                }}
                onOpenCandidate={() => navigate({ to: "/candidates/$id", params: { id: a.link_id } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
      style={{
        background: active ? "#2D2640" : "rgba(45,38,64,0.06)",
        color: active ? "#FAF8F5" : "#5C5469",
      }}
    >
      {label}
    </button>
  );
}

function AlertCard({
  alert,
  onMarkActioned,
  onDismiss,
  onOpenCandidate,
}: {
  alert: HrAlert;
  onMarkActioned: () => void;
  onDismiss: () => void;
  onOpenCandidate: () => void;
}) {
  const meta = TYPE_META[alert.type];
  const sev = SEVERITY_BADGE[alert.severity];

  return (
    <Card>
      <div id={`alert-${alert.id}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="text-2xl flex-shrink-0">{meta.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: sev.bg, color: sev.fg }}
                >
                  {sev.label}
                </span>
                <span className="text-[11px] text-grey">{meta.label}</span>
                {alert.status === "unread" && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#B85A6A" }}
                  />
                )}
              </div>
              <div className="font-display text-aubergine text-[16px] mb-1">
                {alert.candidate_name ?? "Candidat"}
                {alert.package_title && (
                  <span className="text-grey font-light text-[13px]"> · {alert.package_title}</span>
                )}
              </div>
              <div className="text-[13px] text-aubergine">{alert.title}</div>
              <div className="text-[12px] text-grey font-light mt-1">{alert.message}</div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-md hover:bg-[rgba(45,38,64,0.06)] text-grey flex-shrink-0"
            title="Ignorer"
          >
            <X size={14} />
          </button>
        </div>

        {alert.suggestion_message && (
          <div
            className="rounded-lg p-4 mb-3"
            style={{ background: "rgba(184,127,168,0.06)", border: "1px solid rgba(184,127,168,0.20)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-[#8B7FA8]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B5F88]">
                Message suggéré par l'IA
              </span>
            </div>
            <div className="text-[13px] text-aubergine whitespace-pre-wrap leading-relaxed">
              {alert.suggestion_message}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(alert.suggestion_message ?? "");
                  toast.success("Message copié");
                }}
                className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-md font-medium text-[#6B5F88] hover:bg-[rgba(184,127,168,0.10)]"
              >
                <Copy size={12} /> Copier
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={onOpenCandidate}>
            <ExternalLink size={14} className="inline mr-1.5" />
            Ouvrir la fiche
          </Button>
          <Button variant="ghost" onClick={onMarkActioned}>
            <CheckCircle2 size={14} className="inline mr-1.5" />
            Marquer traité
          </Button>
        </div>
      </div>
    </Card>
  );
}
