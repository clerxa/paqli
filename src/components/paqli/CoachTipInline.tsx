import type { CoachTip } from "@/hooks/usePackageCoach";

const STYLES = {
  success: {
    bg: "bg-[#EAF3DE]",
    text: "text-[#27500A]",
    icon: "✅",
  },
  warning: {
    bg: "bg-[#FAEEDA]",
    text: "text-[#633806]",
    icon: "⚠️",
  },
  info: {
    bg: "bg-[#F5F2FA]",
    text: "text-[#6B5F88]",
    icon: "💡",
  },
};

export function CoachTipInline({ tip }: { tip: CoachTip | undefined }) {
  if (!tip) return null;
  const s = STYLES[tip.level];
  return (
    <div className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 ${s.bg}`}>
      <span className="text-[12px] flex-shrink-0">{s.icon}</span>
      <span className={`text-[11px] font-light leading-relaxed ${s.text}`}>
        {tip.message}
      </span>
    </div>
  );
}
