import type { BenefitBreakdownItem } from "@/lib/clientCalc";
import { CATEGORY_LABELS, type BenefitCategory } from "@/lib/benefitCatalog";
import { formatEur } from "@/lib/clientCalc";

interface Props {
  breakdown: BenefitBreakdownItem[];
  totalAnnual: number;
}

/**
 * Affiche les avantages valorisés en € + les avantages qualitatifs en chips.
 * Cadre rassurant : "Ce que vous n'avancez pas".
 */
export function TotalCompensationBlock({ breakdown, totalAnnual }: Props) {
  if (!breakdown || breakdown.length === 0) return null;

  const valued = breakdown.filter((b) => b.annualValue > 0);
  const qualitative = breakdown.filter(
    (b) => b.valueType === "qualitative" || b.annualValue <= 0,
  );
  const monthlyTotal = Math.round(totalAnnual / 12);

  // Group valued by category
  const byCat = new Map<string, BenefitBreakdownItem[]>();
  for (const b of valued) {
    const arr = byCat.get(b.category) ?? [];
    arr.push(b);
    byCat.set(b.category, arr);
  }

  return (
    <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] font-medium text-aubergine-light">
            Avantages valorisés
          </div>
          <div className="text-[12px] text-aubergine-light/70 mt-0.5 leading-relaxed">
            Ce que vous n'avancez pas — valeur annuelle estimée
          </div>
        </div>
        {totalAnnual > 0 && (
          <div className="text-right">
            <div className="font-display text-aubergine text-[22px] leading-none">
              {formatEur(totalAnnual)}
            </div>
            <div className="text-[11px] text-aubergine-light mt-1">
              soit ~{formatEur(monthlyTotal)}/mois
            </div>
          </div>
        )}
      </div>

      {valued.length > 0 && (
        <div className="space-y-3">
          {Array.from(byCat.entries()).map(([cat, items]) => (
            <div key={cat}>
              <div className="text-[10px] uppercase tracking-[0.08em] text-aubergine-light/60 mb-1.5">
                {CATEGORY_LABELS[cat as BenefitCategory] ?? cat}
              </div>
              <div className="space-y-1.5">
                {items.map((b) => (
                  <div
                    key={b.key}
                    className="flex items-center justify-between gap-3 text-[13px]"
                  >
                    <div className="flex items-center gap-2 text-aubergine">
                      <span>{b.label}</span>
                      {b.valueType === "estimated" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F0EBE8] text-aubergine-light">
                          estimé
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-aubergine font-medium">
                        {formatEur(b.annualValue)}
                      </div>
                      <div className="text-[10px] text-aubergine-light">
                        ~{formatEur(b.monthlyValue)}/mois
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {qualitative.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[rgba(45,38,64,0.06)]">
          <div className="text-[10px] uppercase tracking-[0.08em] text-aubergine-light/60 mb-2">
            Avantages qualitatifs
          </div>
          <div className="flex flex-wrap gap-1.5">
            {qualitative.map((b) => (
              <span
                key={b.key}
                className="text-[12px] px-2.5 py-1 rounded-full bg-[#F0EBE8] text-aubergine"
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
