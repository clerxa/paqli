import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/paqli/Card";
import { buildCandidateUrl } from "@/lib/candidateLinks";
import type { FollowUpAlert } from "@/hooks/useDashboard";
import { toast } from "sonner";

interface Props {
  alerts: FollowUpAlert[];
  onCounterOffer?: (alert: FollowUpAlert) => void;
}

const PRIORITY_DOT: Record<FollowUpAlert["priority"], string> = {
  high: "#B85A6A",
  medium: "#C4A882",
  low: "#D3D1C7",
};

export function FollowUpAlertsCard({ alerts, onCounterOffer }: Props) {
  const navigate = useNavigate();

  if (!alerts.length) {
    return (
      <Card>
        <h2 className="font-display text-aubergine mb-3" style={{ fontSize: 18 }}>
          Suivi candidats
        </h2>
        <div className="text-center py-6">
          <div className="text-2xl mb-2">✅</div>
          <div className="text-[13px] text-grey font-light">
            Aucune relance à faire pour le moment
          </div>
        </div>
      </Card>
    );
  }

  function handle(alert: FollowUpAlert) {
    if (alert.type === "declined_can_counter") {
      onCounterOffer?.(alert);
      return;
    }
    if (
      alert.type === "sim_no_response" ||
      alert.type === "opened_not_sim" ||
      alert.type === "deadline_urgent" ||
      alert.type === "deadline_expired"
    ) {
      navigate({ to: "/packages/$id", params: { id: alert.packageId } });
      return;
    }
    // not_opened_72h : copier le lien pour relancer manuellement
    navigator.clipboard
      .writeText(buildCandidateUrl(alert.token))
      .then(() => toast.success("Lien copié — renvoyez-le par email"))
      .catch(() => toast.error("Impossible de copier"));
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-aubergine" style={{ fontSize: 18 }}>
          Suivi candidats
        </h2>
        <span className="text-[11px] bg-[#FCEBEB] text-[#A32D2D] px-2 py-0.5 rounded-full font-medium">
          {alerts.length} action{alerts.length > 1 ? "s" : ""}
        </span>
      </div>
      <ul>
        {alerts.map((alert) => (
          <li
            key={alert.linkId}
            className="flex items-start gap-3 py-3 border-b border-[rgba(45,38,64,0.05)] last:border-0"
          >
            <div
              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              style={{ background: PRIORITY_DOT[alert.priority] }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-aubergine truncate">
                {alert.candidateName}
              </div>
              <div className="text-[11px] text-grey font-light mt-0.5">
                {alert.packageTitle ? `${alert.packageTitle} · ` : ""}
                {alert.message}
              </div>
            </div>
            <button
              onClick={() => handle(alert)}
              className="text-[11px] font-medium text-[#8B7FA8] flex-shrink-0 hover:text-[#6B5F88] transition-colors"
            >
              {alert.cta} →
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
