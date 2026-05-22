import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, Info } from "lucide-react";
import { calculateRSUSimulation } from "@/lib/vega/rsuCalculations";
import { getFiscalRules, TMI_OPTIONS } from "@/lib/vega/fiscalRules";
import { REGIME_LABELS, inferRegimeFromYear } from "@/lib/vega/rsuRegimes";
import type { RSUPlan, RSURegime } from "@/lib/vega/types";

type EquityDeviceRow = {
  id: string;
  type: string;
  quantity: number | null;
  strike_price: number | null;
  current_valuation_m: number | null;
  award_year?: number | null;
  regime?: string | null;
  currency?: string | null;
  conservation_end_date?: string | null;
  total_acquisition_gain?: number | null;
};

function fmtEur(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

/**
 * Simulateur fiscal RSU détaillé pour le candidat.
 * Réplique simplifiée du moteur VEGA :
 *  - inputs : TMI, prix de cession (en devise du plan), taux change si USD, date cession
 *  - sortie : détail par plan + total
 */
export function RSUSimulatorModal({
  equityDevices,
}: {
  equityDevices: EquityDeviceRow[];
}) {
  const rsuDevices = useMemo(
    () =>
      equityDevices.filter(
        (d) =>
          d.type === "rsu" || d.type === "aga" || d.type === "stock_options",
      ),
    [equityDevices],
  );

  const [tmi, setTmi] = useState<number>(0.3);
  const [prixVente, setPrixVente] = useState<number>(0);
  const [tauxChange, setTauxChange] = useState<number>(1);
  const [dateCession, setDateCession] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 4);
    return d.toISOString().slice(0, 10);
  });

  const plans: RSUPlan[] = useMemo(
    () =>
      rsuDevices.map((d) => {
        const year = d.award_year ?? new Date().getFullYear();
        const regime: RSURegime =
          (d.regime as RSURegime | null) ?? inferRegimeFromYear(year);
        const quantity = d.quantity ?? 0;
        // Si total_acquisition_gain saisi, on l'utilise ; sinon on estime
        // depuis quantité × strike_price (proxy le plus simple).
        const totalGain =
          d.total_acquisition_gain ??
          (d.strike_price ?? 0) * quantity;
        return {
          id: d.id,
          nom: `Plan ${d.id.slice(0, 4)}`,
          anneeAttribution: year,
          regime,
          devise: ((d.currency as "EUR" | "USD" | null) ?? "EUR"),
          dateFinConservation: d.conservation_end_date ?? undefined,
          vestings: [],
          gainAcquisitionTotal: totalGain,
          nbRsuTotal: quantity,
        };
      }),
    [rsuDevices],
  );

  const result = useMemo(() => {
    if (plans.length === 0 || prixVente <= 0) return null;
    return calculateRSUSimulation(
      plans,
      {
        mode: "simple",
        prixVente,
        tauxChangeVente: tauxChange,
        tmi,
        dateCession,
      },
      getFiscalRules(),
    );
  }, [plans, prixVente, tauxChange, tmi, dateCession]);

  const hasUSD = plans.some((p) => p.devise === "USD");

  if (rsuDevices.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[12px] text-aubergine hover:text-aubergine-dark underline"
        >
          <Calculator size={14} />
          Simuler ma fiscalité equity en détail
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-aubergine">
            Simulateur fiscal — Vos plans equity
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-[#F8F5F2]">
            <label className="block">
              <span className="text-[12px] font-medium text-aubergine">
                Votre TMI (Tranche Marginale d'Imposition)
              </span>
              <select
                value={tmi}
                onChange={(e) => setTmi(Number(e.target.value))}
                className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
              >
                {TMI_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[12px] font-medium text-aubergine">
                Prix de cession estimé (par action)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={prixVente || ""}
                onChange={(e) => setPrixVente(Number(e.target.value))}
                placeholder="ex : 25"
                className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
              />
            </label>

            {hasUSD && (
              <label className="block">
                <span className="text-[12px] font-medium text-aubergine">
                  Taux de change USD → EUR
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={tauxChange || ""}
                  onChange={(e) => setTauxChange(Number(e.target.value))}
                  placeholder="ex : 0.92"
                  className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
                />
              </label>
            )}

            <label className="block">
              <span className="text-[12px] font-medium text-aubergine">
                Date de cession envisagée
              </span>
              <input
                type="date"
                value={dateCession}
                onChange={(e) => setDateCession(e.target.value)}
                className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
              />
            </label>
          </div>

          {/* Résultats */}
          {!result ? (
            <div className="text-[12px] text-grey p-4 text-center italic">
              Saisissez un prix de cession pour lancer la simulation.
            </div>
          ) : (
            <>
              <div className="rounded-lg overflow-hidden border border-[rgba(45,38,64,0.08)]">
                <table className="w-full text-[12px]">
                  <thead className="bg-[#F0EBE8] text-aubergine">
                    <tr>
                      <th className="px-3 py-2 text-left">Plan</th>
                      <th className="px-3 py-2 text-right">Gain acquisition</th>
                      <th className="px-3 py-2 text-right">PV cession</th>
                      <th className="px-3 py-2 text-right">Impôts</th>
                      <th className="px-3 py-2 text-right font-semibold">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.plans.map((p) => (
                      <tr key={p.planId} className="border-t border-[rgba(45,38,64,0.06)]">
                        <td className="px-3 py-2">
                          <div className="font-medium text-aubergine">{p.nom}</div>
                          <div className="text-[10.5px] text-grey">
                            {REGIME_LABELS[p.regime]}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{fmtEur(p.gainAcquisition)}</td>
                        <td className="px-3 py-2 text-right">{fmtEur(p.pvCession)}</td>
                        <td className="px-3 py-2 text-right text-danger">
                          −{fmtEur(p.totalImpots)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-aubergine">
                          {fmtEur(p.gainNet)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-aubergine text-lin">
                    <tr>
                      <td className="px-3 py-2 font-semibold">Total</td>
                      <td className="px-3 py-2 text-right">
                        {fmtEur(result.gainAcquisitionTotal)}
                      </td>
                      <td className="px-3 py-2 text-right">{fmtEur(result.pvTotal)}</td>
                      <td className="px-3 py-2 text-right">
                        −{fmtEur(result.totalImpots)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">
                        {fmtEur(result.gainNet)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="text-[11px] text-grey">
                Taux d'imposition effectif :{" "}
                <span className="font-medium text-aubergine">
                  {(result.tauxEffectif * 100).toFixed(1)} %
                </span>
              </div>
            </>
          )}

          <div
            className="text-[11px] rounded-md p-3 flex gap-2 leading-relaxed"
            style={{ background: "#FCEEE6", color: "#7A3F0E" }}
          >
            <Info size={14} className="shrink-0 mt-0.5" />
            <div>
              <strong>Information indicative</strong> — Cette simulation utilise
              les règles fiscales 2026 et un prix de cession hypothétique. La
              fiscalité réelle dépend de votre situation personnelle, de la date
              effective de cession et d'éventuelles fenêtres négatives (MNPI).
              Aucune donnée n'est enregistrée.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
