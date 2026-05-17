import { useState, useRef, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useHrAlerts } from "@/hooks/useHrAlerts";
import type { HrAlert } from "@/lib/hrAlerts.functions";

const SEVERITY_DOT: Record<HrAlert["severity"], string> = {
  high: "#B85A6A",
  medium: "#C4A882",
  low: "#D3D1C7",
};

const TYPE_LABEL: Record<HrAlert["type"], string> = {
  high_engagement_negotiation: "Négociation",
  inactivity_after_engagement: "Silence",
  sensitive_ai_question: "Question sensible",
  deadline_approaching: "Deadline",
};

export function NotificationBell() {
  const { alerts, unreadCount, update, markAllRead } = useHrAlerts();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const top = alerts.slice(0, 6);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-md hover:bg-[rgba(45,38,64,0.06)] text-aubergine"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 text-[10px] font-semibold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center"
            style={{ background: "#B85A6A", color: "#FAF8F5" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-lg shadow-xl z-50 overflow-hidden"
          style={{ background: "#FAF8F5", border: "1px solid rgba(45,38,64,0.10)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(45,38,64,0.08)]">
            <div className="font-display text-aubergine text-[15px]">Alertes</div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-[11px] text-[#8B7FA8] hover:text-[#6B5F88] flex items-center gap-1"
              >
                <Check size={12} /> Tout marquer lu
              </button>
            )}
          </div>
          {top.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-grey font-light">
              Aucune alerte. Tout est sous contrôle ✓
            </div>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {top.map((a) => (
                <li
                  key={a.id}
                  className="px-4 py-3 border-b border-[rgba(45,38,64,0.05)] last:border-0 cursor-pointer hover:bg-[rgba(45,38,64,0.03)]"
                  style={{
                    background: a.status === "unread" ? "rgba(184,127,168,0.04)" : undefined,
                  }}
                  onClick={() => {
                    if (a.status === "unread") update({ id: a.id, status: "read" });
                    setOpen(false);
                    navigate({ to: "/alerts", hash: a.id });
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: SEVERITY_DOT[a.severity] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-grey">
                          {TYPE_LABEL[a.type]}
                        </span>
                        {a.candidate_name && (
                          <span className="text-[12px] font-medium text-aubergine truncate">
                            · {a.candidate_name}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-aubergine mt-0.5 line-clamp-2">
                        {a.title}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/alerts"
            onClick={() => setOpen(false)}
            className="block text-center py-2.5 text-[12px] font-medium text-[#8B7FA8] hover:bg-[rgba(45,38,64,0.03)] border-t border-[rgba(45,38,64,0.08)]"
          >
            Voir toutes les alertes →
          </Link>
        </div>
      )}
    </div>
  );
}
