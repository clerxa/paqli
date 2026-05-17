import type { ProactiveSuggestion } from "@/hooks/useProactiveAssistant";

interface ProactiveSuggestionBubbleProps {
  suggestion: ProactiveSuggestion | null;
  onAccept: (question: string) => void;
  onDismiss: () => void;
}

export function ProactiveSuggestionBubble({
  suggestion,
  onAccept,
  onDismiss,
}: ProactiveSuggestionBubbleProps) {
  if (!suggestion) return null;

  return (
    <div className="mx-0 mb-3 animate-paqli-slide-up">
      <div className="rounded-xl overflow-hidden" style={{ background: "#2D2640" }}>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[16px] animate-pulse"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              {suggestion.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[12px] font-light leading-relaxed mb-3"
                style={{ color: "#FAF8F5" }}
              >
                {suggestion.message}
              </p>
              <button
                type="button"
                onClick={() => onAccept(suggestion.question)}
                className="w-full flex items-center gap-2 text-left rounded-lg px-3 py-2.5 transition-colors hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <span className="text-[11px] flex-shrink-0" style={{ color: "#C4A882" }}>
                  →
                </span>
                <span
                  className="text-[11px] font-light leading-relaxed italic"
                  style={{ color: "#FAF8F5" }}
                >
                  « {suggestion.question} »
                </span>
              </button>
            </div>
          </div>
        </div>
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <span className="text-[9px] font-light" style={{ color: "#8B7FA8" }}>
            Suggestion de l'assistant Paqli
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[10px] transition-colors hover:underline"
            style={{ color: "#8B7FA8" }}
          >
            Ignorer
          </button>
        </div>
      </div>
    </div>
  );
}
