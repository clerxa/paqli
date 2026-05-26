import { TrendingUp } from "lucide-react";
import { computeEquityValuation, formatMoney } from "@/lib/equityCalc";
import type { PackageData } from "@/lib/clientCalc";

/**
 * Carte de valorisation equity côté candidat.
 * Affiche la valeur actuelle, le planning de vesting et 3 scénarios
 * (uniquement pour les entreprises non cotées).
 */
export function EquityValuationCard({ pkg }: { pkg: PackageData }) {
  const devices = pkg.equity_devices ?? [];
  if (devices.length === 0) return null;

  const isListed = !!pkg.equity_is_listed;
  const hasValuationData = isListed
    ? !!pkg.equity_last_price
    : !!(pkg.equity_company_valuation && pkg.equity_total_shares);

  if (!hasValuationData) {
    return (
      <div
        className="rounded-lg p-4 text-[12px] italic text-grey"
        style={{ background: "#F0EBE8" }}
      >
        Le recruteur n'a pas renseigné la valorisation de l'entreprise.
        Posez la question à Paq pour en savoir plus sur votre equity.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {devices.map((dev) => {
        const v = computeEquityValuation({
          device: {
            id: dev.id,
            type: dev.type as any,
            quantity: dev.quantity ?? 0,
            strikePrice: Number(dev.strike_price) || 0,
            currentValuationM: 0,
            vestingYears: dev.vesting_years ?? 4,
            cliffMonths: dev.cliff_months ?? 12,
            specialConditions: "",
          },
          currentPrice: isListed ? pkg.equity_last_price ?? null : null,
          currentPriceCurrency: pkg.equity_last_price_currency ?? "EUR",
          companyValuation: !isListed ? pkg.equity_company_valuation ?? null : null,
          totalShares: !isListed ? pkg.equity_total_shares ?? null : null,
          scenarios: !isListed
            ? {
                bear: pkg.equity_scenario_bear ?? 1,
                base: pkg.equity_scenario_base ?? 3,
                bull: pkg.equity_scenario_bull ?? 7,
              }
            : undefined,
        });

        if (!v.hasData) return null;
        const curr = v.currency;

        return (
          <div
            key={dev.id}
            className="rounded-lg p-4 space-y-3"
            style={{ background: "#F0EBE8" }}
          >
            <div className="flex items-center gap-2 text-[12px] text-aubergine">
              <TrendingUp size={14} />
              <span className="font-medium">
                {dev.quantity?.toLocaleString("fr-FR")} {dev.type.toUpperCase()}
                {dev.strike_price ? ` · strike ${Number(dev.strike_price).toFixed(2)} ${curr}` : ""}
              </span>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wide text-grey">
                Valeur estimée aujourd'hui
              </div>
              <div
                className="text-aubergine"
                style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, lineHeight: 1.1 }}
              >
                {formatMoney(v.currentTotalValueGross, curr)}
              </div>
              <div className="text-[12px] text-grey">
                brut · ~{formatMoney(v.currentTotalValueNet, curr)} net estimatif (PFU 30%)
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-[rgba(45,38,64,0.08)]">
              <div className="text-[11px] uppercase tracking-wide text-grey mb-1">
                Vesting schedule
              </div>
              {v.vestingSchedule.map((s, idx) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between text-[12px] animate-in fade-in slide-in-from-bottom-1"
                  style={{ animationDelay: `${idx * 80}ms`, animationFillMode: "backwards" }}
                >
                  <span className="text-aubergine-light">
                    {s.label}
                    {idx === v.vestingSchedule.length - 1 ? " ★" : ""}
                  </span>
                  <span className="text-aubergine font-medium">
                    {s.sharesVested.toLocaleString("fr-FR")} ·{" "}
                    {formatMoney(s.valueGross, curr)}
                  </span>
                </div>
              ))}
            </div>

            {v.scenarios && (
              <div className="pt-2 border-t border-[rgba(45,38,64,0.08)]">
                <div className="text-[11px] uppercase tracking-wide text-grey mb-2">
                  Si la valorisation évolue à 4 ans
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["bear", "base", "bull"] as const).map((k) => {
                    const s = v.scenarios![k];
                    const colors = {
                      bear: "bg-red-100/60 text-red-800",
                      base: "bg-amber-100/60 text-amber-800",
                      bull: "bg-emerald-100/60 text-emerald-800",
                    }[k];
                    const label = { bear: "🔴 Pessimiste", base: "🟡 Réaliste", bull: "🟢 Optimiste" }[k];
                    return (
                      <div key={k} className={`rounded-md px-2 py-1.5 ${colors}`}>
                        <div className="text-[10px]">{label}</div>
                        <div className="text-[10px] opacity-70">×{s.multiple.toFixed(1)}</div>
                        <div className="text-[12px] font-semibold mt-0.5">
                          {formatMoney(s.totalValue, curr)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p
              className="text-[11px] italic"
              style={{ color: "#9CA3AF" }}
            >
              ⓘ Valeurs indicatives — ne constituent pas un conseil en investissement.
              Imposition réelle selon votre situation personnelle.
            </p>
          </div>
        );
      })}
    </div>
  );
}
