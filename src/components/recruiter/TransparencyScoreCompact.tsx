import {
  computeTransparencyScore,
  getScoreLabel,
  type TransparencyCompany,
  type TransparencyPackage,
} from "@/lib/transparencyScore";

interface Props {
  pkg: TransparencyPackage | null | undefined;
  company: TransparencyCompany | null | undefined;
  onComplete?: () => void;
}

export function TransparencyScoreCompact({ pkg, company, onComplete }: Props) {
  const score = computeTransparencyScore(pkg, company);
  const { label, color } = getScoreLabel(score.total);

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-2 px-2 py-1 rounded"
        style={{ background: "#F0EBE8" }}
        title={label}
      >
        <div
          className="rounded-full overflow-hidden"
          style={{ background: "#E5E7EB", height: 4, width: 50 }}
        >
          <div
            style={{
              width: `${score.total}%`,
              background: color,
              height: 4,
            }}
          />
        </div>
        <span
          className="text-[11px] tabular-nums font-medium"
          style={{ color }}
        >
          {score.total}%
        </span>
      </div>
      <span className="text-[11px] text-grey hidden lg:inline">{label}</span>
      {onComplete && score.total < 85 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="text-[11px] underline"
          style={{ color: "#2D2640" }}
        >
          Compléter →
        </button>
      )}
    </div>
  );
}
