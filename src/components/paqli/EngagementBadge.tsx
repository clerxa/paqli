interface Props {
  score: number;
  label: string | null;
  intent: string | null;
}

const CONFIGS: Record<
  string,
  { bg: string; text: string; icon: string; display: string }
> = {
  hot: { bg: "#EAF3DE", text: "#27500A", icon: "🔥", display: "Très engagé" },
  warm: { bg: "#F5F2FA", text: "#6B5F88", icon: "✨", display: "Engagé" },
  lukewarm: { bg: "#FAEEDA", text: "#633806", icon: "👀", display: "Curieux" },
  cold: { bg: "#F0EBE8", text: "#9B97A0", icon: "❄️", display: "Peu actif" },
};

const INTENT_LABELS: Record<string, string> = {
  likely_accept: "→ Probablement favorable",
  uncertain: "→ Hésitant",
  likely_decline: "→ Risque de refus",
  unknown: "→ Pas encore de signal",
  accepted: "→ A accepté",
  declined: "→ A décliné",
};

export function EngagementBadge({ score, label, intent }: Props) {
  const conf = CONFIGS[label ?? "cold"] ?? CONFIGS.cold;
  return (
    <div className="flex flex-col gap-1">
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium w-fit"
        style={{ background: conf.bg, color: conf.text }}
      >
        <span>{conf.icon}</span>
        <span>{conf.display}</span>
        <span className="font-normal opacity-70">({score}/100)</span>
      </div>
      {intent && INTENT_LABELS[intent] && (
        <div className="text-[10px] text-grey font-light pl-1">
          {INTENT_LABELS[intent]}
        </div>
      )}
    </div>
  );
}
