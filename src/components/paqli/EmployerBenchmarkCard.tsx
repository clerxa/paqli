import { useEffect, useState } from "react";
import { BarChart2, RefreshCw, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  generatePackageBenchmark,
  type BenchmarkAnalysis,
} from "@/lib/benchmarkAnalysis.functions";
import { Button } from "@/components/paqli/Button";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const fmtK = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n / 1000)}k€`;

export function EmployerBenchmarkCard({ packageId }: { packageId: string }) {
  const generate = useServerFn(generatePackageBenchmark);
  const [analysis, setAnalysis] = useState<BenchmarkAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("packages")
        .select("benchmark_analysis")
        .eq("id", packageId)
        .maybeSingle();
      if (!cancelled) {
        setAnalysis((data?.benchmark_analysis as unknown as BenchmarkAnalysis) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packageId]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generate({ data: { packageId } });
      setAnalysis(result);
      toast.success("Analyse de marché générée");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Échec de la génération",
      );
    } finally {
      setGenerating(false);
    }
  }

  const hasRange = analysis?.p25 != null && analysis?.p75 != null;
  const positionPercent =
    analysis && hasRange
      ? clamp(
          ((analysis.proposed_salary - (analysis.p25 as number)) /
            ((analysis.p75 as number) - (analysis.p25 as number))) *
            100,
          0,
          100,
        )
      : 50;

  const badgeColor =
    analysis?.positioning === "below"
      ? "#E8835A"
      : analysis?.positioning === "above"
        ? "#22863a"
        : "#2D5F6E";

  return (
    <div className="rounded-[8px] p-5" style={{ background: "#F0EBE8" }}>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} style={{ color: "#2D5F6E" }} />
          <h3
            className="text-[15px] m-0"
            style={{
              fontFamily: "'DM Serif Display', serif",
              color: "#2D2640",
            }}
          >
            Positionnement marché
          </h3>
          <span
            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: "#FAEEDA", color: "#633806" }}
          >
            Publié au candidat
          </span>
        </div>
        <Button
          variant="ghost"
          onClick={handleGenerate}
          disabled={generating || loading}
        >
          {generating ? (
            <>
              <RefreshCw size={12} className="animate-spin mr-1.5" />
              Analyse en cours…
            </>
          ) : analysis ? (
            <>
              <RefreshCw size={12} className="mr-1.5" />
              Régénérer
            </>
          ) : (
            <>
              <Sparkles size={12} className="mr-1.5" />
              Générer l'analyse
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="text-[12px]" style={{ color: "#524970" }}>
          Chargement…
        </div>
      ) : !analysis ? (
        <p className="text-[12px]" style={{ color: "#524970" }}>
          Aucune analyse générée. Lancez l'analyse pour positionner le package
          face au marché et la publier automatiquement côté candidat.
        </p>
      ) : analysis.status === "unavailable" ? (
        <p className="text-[12px]" style={{ color: "#524970" }}>
          Données de marché insuffisantes pour ce profil.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-[4px] text-[11px] font-medium"
              style={{ background: badgeColor, color: "#FAF8F5" }}
            >
              {analysis.positioning_label}
            </span>
            <span className="text-[12px]" style={{ color: "#524970" }}>
              {analysis.gap_percent === 0
                ? "Aligné sur la médiane"
                : `${analysis.gap_percent > 0 ? "+" : ""}${analysis.gap_percent}% vs médiane`}
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
                          ((analysis.p75 as number) -
                            (analysis.p25 as number))) *
                          100,
                        0,
                        100,
                      )}%`,
                    }}
                  />
                )}
                <div
                  className="absolute -top-0.5 w-3 h-8 rounded-full"
                  style={{
                    background: badgeColor,
                    border: "2px solid #FAF8F5",
                    left: `calc(${positionPercent}% - 6px)`,
                  }}
                />
              </div>
              <div
                className="flex justify-between text-[10px] mt-2"
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
                style={{ background: "#8B7FA8", color: "#FAF8F5" }}
              >
                Données web temps réel
              </span>
            )}
            <span className="ml-auto">
              Généré le{" "}
              {new Date(analysis.analyzed_at).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
