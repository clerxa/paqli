import { useEffect, useState } from "react";
import { useAttractivenessScore } from "@/hooks/useAttractivenessScore";

export function AttractivenessScore({ packageId }: { packageId: string | null }) {
  const { result, loading, error, compute } = useAttractivenessScore();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (packageId) void compute(packageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  if (dismissed || !packageId) return null;

  const scoreColor = result
    ? result.score >= 80
      ? "#3B6D11"
      : result.score >= 60
        ? "#6B5F88"
        : result.score >= 40
          ? "#854F0B"
          : "#B85A6A"
    : "#D3D1C7";

  return (
    <div className="bg-white border border-[rgba(45,38,64,0.08)] rounded-xl overflow-hidden mb-5">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(45,38,64,0.06)]">
        <div className="flex items-center gap-2">
          <span className="text-[14px]">✨</span>
          <span className="text-[13px] font-medium text-aubergine">
            Score d'attractivité Paqli
          </span>
        </div>
        <div className="flex items-center gap-3">
          {result && !loading && (
            <button
              onClick={() => compute(packageId)}
              className="text-[11px] text-[#8B7FA8] hover:text-[#6B5F88]"
            >
              ↻ Recalculer
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-[11px] text-[#B8AECF]"
          >
            Masquer
          </button>
        </div>
      </div>

      <div className="p-5">
        {loading && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-5 h-5 border-2 border-[#8B7FA8] border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-grey font-light">
              Analyse en cours…
            </span>
          </div>
        )}

        {error && !loading && (
          <div className="text-[12px] text-[#B85A6A] font-light">{error}</div>
        )}

        {result && !loading && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="h-2 bg-[#F0EBE8] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${result.score}%`, background: scoreColor }}
                  />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span
                  className="font-display text-[22px]"
                  style={{ color: scoreColor }}
                >
                  {result.score}
                </span>
                <span className="text-[11px] text-grey">/100</span>
                <div
                  className="text-[11px] font-medium mt-0.5"
                  style={{ color: scoreColor }}
                >
                  {result.label}
                </div>
              </div>
            </div>

            {result.positives?.map((p, i) => (
              <div key={`p${i}`} className="flex items-start gap-2 mb-2">
                <span className="text-[#3B6D11] text-[13px] flex-shrink-0">
                  ✅
                </span>
                <span className="text-[12px] text-aubergine-light font-light">
                  {p}
                </span>
              </div>
            ))}

            {result.warnings?.map((w, i) => (
              <div key={`w${i}`} className="flex items-start gap-2 mb-2">
                <span className="text-[#C4A882] text-[13px] flex-shrink-0">
                  ⚠️
                </span>
                <span className="text-[12px] text-aubergine-light font-light">
                  {w}
                </span>
              </div>
            ))}

            {result.suggestion && (
              <div className="mt-3 flex items-start gap-2 bg-[#F5F2FA] rounded-lg px-3 py-2.5">
                <span className="text-[13px] flex-shrink-0">💡</span>
                <span className="text-[12px] text-[#6B5F88] font-light leading-relaxed">
                  {result.suggestion}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
