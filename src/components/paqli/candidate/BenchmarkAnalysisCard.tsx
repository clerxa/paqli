import { BarChart2 } from "lucide-react";
import { useBenchmarkAnalysis } from "@/hooks/useBenchmarkAnalysis";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const fmtK = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n / 1000)}k€`;

export function BenchmarkAnalysisCard({ token }: { token: string }) {
  const { analysis, loading } = useBenchmarkAnalysis(token);

  if (loading) {
    return (
      <div
        className="rounded-[8px] p-5 mb-6"
        style={{ background: "#F0EBE8" }}
      >
        <div
          className="text-[11px] uppercase tracking-[0.15em] mb-3"
          style={{ color: "#524970" }}
        >
          Analyse du marché en cours…
        </div>
        <div className="space-y-2">
          <div
            className="h-3 rounded"
            style={{
              background:
                "linear-gradient(90deg, #E8E2D6 25%, #DCD4C4 50%, #E8E2D6 75%)",
              backgroundSize: "200% 100%",
              animation: "paqli-shimmer 1.5s infinite",
            }}
          />
          <div
            className="h-3 rounded w-4/5"
            style={{
              background:
                "linear-gradient(90deg, #E8E2D6 25%, #DCD4C4 50%, #E8E2D6 75%)",
              backgroundSize: "200% 100%",
              animation: "paqli-shimmer 1.5s infinite",
            }}
          />
          <div
            className="h-3 rounded w-3/5"
            style={{
              background:
                "linear-gradient(90deg, #E8E2D6 25%, #DCD4C4 50%, #E8E2D6 75%)",
              backgroundSize: "200% 100%",
              animation: "paqli-shimmer 1.5s infinite",
            }}
          />
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  if (analysis.status === "unavailable") {
    return (
      <div
        className="rounded-[8px] p-4 mb-6 text-[13px]"
        style={{ background: "#F0EBE8", color: "#524970" }}
      >
        Données de marché insuffisantes pour ce profil.
      </div>
    );
  }

  const badgeColor =
    analysis.positioning === "below"
      ? "#E8835A"
      : analysis.positioning === "above"
        ? "#22863a"
        : "#2D5F6E";

  const hasRange = analysis.p25 != null && analysis.p75 != null;
  const positionPercent = hasRange
    ? clamp(
        ((analysis.proposed_salary - (analysis.p25 as number)) /
          ((analysis.p75 as number) - (analysis.p25 as number))) *
          100,
        0,
        100,
      )
    : 50;

  const gap = analysis.gap_percent;
  const gapStr =
    gap === 0 ? "Aligné sur la médiane" : `${gap > 0 ? "+" : ""}${gap}% vs médiane`;

  return (
    <div
      className="rounded-[8px] p-5 mb-6"
      style={{ background: "#F0EBE8" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={16} style={{ color: "#2D5F6E" }} />
        <h3
          className="text-[15px] m-0"
          style={{ fontFamily: "'DM Serif Display', serif", color: "#2D2640" }}
        >
          Positionnement marché
        </h3>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-[4px] text-[11px] font-medium"
          style={{ background: badgeColor, color: "#FAF8F5" }}
        >
          {analysis.positioning_label}
        </span>
        <span className="text-[12px]" style={{ color: "#524970" }}>
          {gapStr}
        </span>
      </div>

      {hasRange && (
        <>
          <div className="relative h-7 mb-1">
            <div
              className="absolute top-3 left-0 right-0 h-1.5 rounded-full"
              style={{ background: "#E8E2D6" }}
            />
            <div
              className="absolute top-3 h-1.5 rounded-full"
              style={{ background: "#C4A882", left: 0, right: 0 }}
            />
            {analysis.p50 != null && (
              <div
                className="absolute top-1.5 w-[2px] h-4"
                style={{
                  background: "#2D2640",
                  left: `${clamp(
                    ((analysis.p50 - (analysis.p25 as number)) /
                      ((analysis.p75 as number) - (analysis.p25 as number))) *
                      100,
                    0,
                    100,
                  )}%`,
                }}
              />
            )}
            <div
              className="absolute -top-0.5 w-3 h-8 rounded-full flex items-end justify-center"
              style={{
                background: badgeColor,
                border: "2px solid #FAF8F5",
                left: `calc(${positionPercent}% - 6px)`,
              }}
            />
            <div
              className="absolute -bottom-1 text-[10px] font-medium"
              style={{
                color: badgeColor,
                left: `calc(${positionPercent}% - 18px)`,
                top: "30px",
                whiteSpace: "nowrap",
              }}
            >
              {fmtK(analysis.proposed_salary)}
            </div>
          </div>
          <div
            className="flex justify-between text-[10px] mt-6"
            style={{ color: "#524970" }}
          >
            <span>P25 · {fmtK(analysis.p25)}</span>
            <span>Médiane · {fmtK(analysis.p50)}</span>
            <span>P75 · {fmtK(analysis.p75)}</span>
          </div>
        </>
      )}

      {analysis.ai_analysis && (
        <div
          className="mt-4 p-3 rounded-[6px] text-[13px] italic leading-relaxed"
          style={{ background: "rgba(255,255,255,0.5)", color: "#2D2640" }}
        >
          {analysis.ai_analysis}
        </div>
      )}

      <div
        className="mt-3 flex items-center gap-2 text-[10px] flex-wrap"
        style={{ color: "#524970" }}
      >
        <span>Source · {analysis.source}</span>
        {analysis.status === "web_fallback" && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-full"
            style={{ background: "#8B7FA8", color: "#FAF8F5", fontSize: 10 }}
          >
            Données web temps réel
          </span>
        )}
      </div>
    </div>
  );
}
