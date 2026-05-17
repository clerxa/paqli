import { toast } from "sonner";
import { Copy, Sparkles, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { useHrAlerts } from "@/hooks/useHrAlerts";
import type { HrAlert } from "@/lib/hrAlerts.functions";

const TYPE_LABEL: Record<HrAlert["type"], { icon: string; label: string }> = {
  high_engagement_negotiation: { icon: "💎", label: "Phase de négociation" },
  inactivity_after_engagement: { icon: "🌙", label: "Silence après engagement" },
  sensitive_ai_question: { icon: "💬", label: "Question sensible" },
  deadline_approaching: { icon: "⏰", label: "Deadline proche" },
};

interface Props {
  linkId: string;
}

export function CandidateAlertsCard({ linkId }: Props) {
  const { alerts, update } = useHrAlerts();
  const mine = alerts.filter((a) => a.link_id === linkId);

  if (mine.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-[#8B7FA8]" />
        <h2 className="font-display text-aubergine" style={{ fontSize: 18 }}>
          Suggestions IA de relance
        </h2>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: "#FCEBEB", color: "#A32D2D" }}
        >
          {mine.length}
        </span>
      </div>

      <div className="space-y-3">
        {mine.map((a) => {
          const meta = TYPE_LABEL[a.type];
          return (
            <div
              key={a.id}
              className="rounded-lg p-3"
              style={{ background: "rgba(184,127,168,0.05)", border: "1px solid rgba(184,127,168,0.18)" }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span>{meta.icon}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B5F88]">
                  {meta.label}
                </span>
              </div>
              <div className="text-[12px] text-aubergine font-medium mb-1">{a.title}</div>
              <div className="text-[11px] text-grey font-light mb-2">{a.message}</div>

              {a.suggestion_message && (
                <>
                  <div className="text-[12.5px] text-aubergine whitespace-pre-wrap leading-relaxed bg-white/60 rounded-md p-2.5 mb-2">
                    {a.suggestion_message}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(a.suggestion_message ?? "");
                        toast.success("Message copié");
                      }}
                      className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-md font-medium text-[#6B5F88] hover:bg-[rgba(184,127,168,0.12)]"
                    >
                      <Copy size={11} /> Copier
                    </button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        update({ id: a.id, status: "actioned" });
                        toast.success("Marquée traitée");
                      }}
                    >
                      <CheckCircle2 size={12} className="inline mr-1" /> Marquer traité
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
