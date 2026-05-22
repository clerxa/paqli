import { TrendingUp } from "lucide-react";
import type { ScenarioEstimate } from "@/lib/clientCalc";
import { formatEur } from "@/lib/clientCalc";

/**
 * Bloc résumé "Net estimé equity" — 3 cartes (pessimiste / réaliste / optimiste)
 * Brut → Impôts (PFU 30 %) → Net en poche.
 * Calcul simplifié côté candidat : le moteur VEGA complet est dans le modal.
 */
const LABELS: Record<string, { title: string; tone: string }> = {
  pessimiste: { title: "Pessimiste", tone: "#F0EBE8" },
  realiste: { title: "Réaliste", tone: "#E8E0F0" },
  optimiste: { title: "Optimiste", tone: "#FAEEDA" },
};

const PFU = 0.3;

export function RSUSummaryCards({
  scenarios,
}: {
  scenarios: ScenarioEstimate[];
}) {
  if (!scenarios.length) return null;

  return (
    <div className="rounded-[12px] p-4 sm:p-5 bg-white border border-[rgba(45,38,64,0.08)]">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-aubergine" />
        <h3 className="font-display text-aubergine text-[15px]">
          Net estimé equity — scénarios
        </h3>
      </div>
      <p className="text-[11px] text-grey mb-3">
        Estimation rapide après fiscalité (PFU 30 %). Pour un calcul détaillé
        par plan (régime AGA, abattements, durée de détention), utilisez le
        simulateur fiscal.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {scenarios.map((s) => {
          const rate = s.taxRateHighSeniority ?? PFU;
          const brut = rate < 1 ? s.estimate / (1 - rate) : s.estimate;

          const impots = brut - s.estimate;
          const meta = LABELS[s.label] ?? { title: s.label, tone: "#F0EBE8" };
          return (
            <div
              key={s.label}
              className="rounded-lg p-3"
              style={{ background: meta.tone }}
            >
              <div className="text-[10px] uppercase tracking-wider text-aubergine-light">
                {meta.title}
              </div>
              <div className="text-[10.5px] text-grey mt-0.5">
                {s.targetValuationM} M€ / {s.horizonYears} ans
              </div>
              <div className="mt-2 space-y-0.5 text-[11px] text-aubergine-light">
                <div className="flex justify-between">
                  <span>Brut</span>
                  <span>{formatEur(brut)}</span>
                </div>
                <div className="flex justify-between text-danger">
                  <span>Impôts</span>
                  <span>−{formatEur(impots)}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[rgba(45,38,64,0.08)] flex justify-between items-baseline">
                <span className="text-[10px] uppercase text-aubergine-light">Net</span>
                <span className="font-display text-aubergine text-[18px]">
                  {formatEur(s.estimate)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
