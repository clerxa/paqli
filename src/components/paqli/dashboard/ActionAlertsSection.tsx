import type { ActionAlert, ActionAlertType } from "@/hooks/useActionAlerts";
import { useActionAlerts } from "@/hooks/useActionAlerts";

interface Props {
  organizationId: string | undefined;
  onAction: (action: string, alert: ActionAlert) => void;
}

const ALERT_CONFIG: Record<
  ActionAlertType,
  {
    icon: string;
    containerClass: string;
    barClass: string;
    textColor: string;
    primaryBtnClass: string;
  }
> = {
  offer_accepted: {
    icon: "🎉",
    containerClass: "bg-[#EAF3DE] border-[rgba(59,109,17,0.2)]",
    barClass: "bg-[#3B6D11]",
    textColor: "#27500A",
    primaryBtnClass: "bg-[#2D2640] text-white hover:bg-[#3D3554]",
  },
  offer_declined: {
    icon: "↩️",
    containerClass: "bg-[#FCEBEB] border-[rgba(184,90,106,0.2)]",
    barClass: "bg-[#B85A6A]",
    textColor: "#A32D2D",
    primaryBtnClass: "bg-[#B85A6A] text-white hover:bg-[#9E4B5A]",
  },
  deadline_expiring_soon: {
    icon: "⚡",
    containerClass: "bg-[#FAEEDA] border-[rgba(196,168,130,0.3)]",
    barClass: "bg-[#C4A882]",
    textColor: "#633806",
    primaryBtnClass: "bg-[#2D2640] text-white hover:bg-[#3D3554]",
  },
  hot_candidate_silent: {
    icon: "🔥",
    containerClass: "bg-[#F5F2FA] border-[rgba(139,127,168,0.2)]",
    barClass: "bg-[#8B7FA8]",
    textColor: "#6B5F88",
    primaryBtnClass: "bg-[#2D2640] text-white hover:bg-[#3D3554]",
  },
  sim_no_response: {
    icon: "💡",
    containerClass: "bg-[#F5F2FA] border-[rgba(139,127,168,0.15)]",
    barClass: "bg-[#8B7FA8]",
    textColor: "#6B5F88",
    primaryBtnClass: "bg-[#2D2640] text-white hover:bg-[#3D3554]",
  },
  not_opened_72h: {
    icon: "📭",
    containerClass: "bg-white border-[rgba(45,38,64,0.08)]",
    barClass: "bg-[#D3D1C7]",
    textColor: "#9B97A0",
    primaryBtnClass: "bg-[#F0EBE8] text-[#524970] hover:bg-[#E8E0DA]",
  },
  package_score_low: {
    icon: "📊",
    containerClass: "bg-white border-[rgba(45,38,64,0.08)]",
    barClass: "bg-[#C4A882]",
    textColor: "#9B97A0",
    primaryBtnClass: "bg-[#F0EBE8] text-[#524970] hover:bg-[#E8E0DA]",
  },
  thinking_stalled: {
    icon: "💭",
    containerClass: "bg-[#F5F2FA] border-[rgba(139,127,168,0.2)]",
    barClass: "bg-[#8B7FA8]",
    textColor: "#6B5F88",
    primaryBtnClass: "bg-[#2D2640] text-white hover:bg-[#3D3554]",
  },
};

export function ActionAlertsSection({ organizationId, onAction }: Props) {
  const { alerts, totalCount, loading } = useActionAlerts(organizationId);

  if (loading) {
    return (
      <div className="mb-2">
        <div className="w-32 h-4 bg-[#F0EBE8] rounded animate-pulse mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 bg-[#F0EBE8] rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{
          background: "#EAF3DE",
          borderColor: "rgba(59,109,17,0.15)",
        }}
      >
        <span className="text-xl">✅</span>
        <div>
          <div className="text-[13px] font-medium" style={{ color: "#27500A" }}>
            Tout est à jour
          </div>
          <div className="text-[11px] font-light" style={{ color: "#3B6D11" }}>
            Aucune action urgente en ce moment.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-aubergine">
            Que faire maintenant ?
          </span>
          {totalCount > 3 && (
            <span className="text-[10px] bg-[#FCEBEB] text-[#A32D2D] px-2 py-0.5 rounded-full font-medium">
              +{totalCount - 3} autres
            </span>
          )}
        </div>
        <span className="text-[11px] text-grey">
          {totalCount} action{totalCount > 1 ? "s" : ""} en attente
        </span>
      </div>

      <div
        className={`grid gap-3 ${
          alerts.length === 1
            ? "grid-cols-1 max-w-sm"
            : alerts.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {alerts.map((alert) => (
          <ActionAlertCard
            key={`${alert.type}-${alert.id}`}
            alert={alert}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

function ActionAlertCard({
  alert,
  onAction,
}: {
  alert: ActionAlert;
  onAction: (action: string, alert: ActionAlert) => void;
}) {
  const config = ALERT_CONFIG[alert.type];

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-shadow hover:shadow-sm ${config.containerClass}`}
    >
      <div className={`h-0.5 ${config.barClass}`} />
      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-[18px] flex-shrink-0 leading-none mt-0.5">
            {config.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-aubergine truncate">
              {alert.candidateName || alert.packageTitle}
            </div>
            {alert.candidateName && (
              <div className="text-[10px] text-grey truncate">
                {alert.packageTitle}
              </div>
            )}
          </div>
        </div>

        <p
          className="text-[11px] font-light leading-relaxed mb-3"
          style={{ color: config.textColor }}
        >
          {alert.message}
        </p>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onAction(alert.ctaPrimary.action, alert)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all ${config.primaryBtnClass}`}
          >
            {alert.ctaPrimary.label}
          </button>
          {alert.ctaSecondary && (
            <button
              type="button"
              onClick={() => onAction(alert.ctaSecondary!.action, alert)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] text-grey border border-[rgba(45,38,64,0.1)] hover:bg-[#F0EBE8] transition-all"
            >
              {alert.ctaSecondary.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
