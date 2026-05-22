import { useMemo, useState } from "react";
import { Calculator, Info, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/paqli/Card";
import { calculateRSUSimulation } from "@/lib/vega/rsuCalculations";
import { getFiscalRules, TMI_OPTIONS } from "@/lib/vega/fiscalRules";
import {
  REGIME_LABELS,
  REGIME_OPTIONS,
  inferRegimeFromYear,
} from "@/lib/vega/rsuRegimes";
import type { RSUPlan, RSURegime, Currency } from "@/lib/vega/types";

type PlanInput = {
  id: string;
  nom: string;
  anneeAttribution: number;
  regime: RSURegime;
  devise: Currency;
  nbRsuTotal: number;
  valeurAcquisitionUnitaire: number;
  dateFinConservation?: string;
};

function fmtEur(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

let idCounter = 0;
function newPlan(): PlanInput {
  idCounter += 1;
  const year = new Date().getFullYear() - 4;
  return {
    id: `p${idCounter}-${Date.now()}`,
    nom: `Plan ${idCounter}`,
    anneeAttribution: year,
    regime: inferRegimeFromYear(year),
    devise: "EUR",
    nbRsuTotal: 1000,
    valeurAcquisitionUnitaire: 20,
  };
}

/**
 * Simulateur RSU "bac à sable" pour l'académie RH.
 * Permet de saisir plusieurs plans, ajuster TMI/prix/cession et voir
 * le détail VEGA appliqué — pédagogique.
 */
export function RSUAcademySimulator() {
  const [plans, setPlans] = useState<PlanInput[]>(() => [newPlan()]);
  const [tmi, setTmi] = useState(0.3);
  const [prixVente, setPrixVente] = useState(35);
  const [tauxChange, setTauxChange] = useState(0.92);
  const [dateCession, setDateCession] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });

  const rsuPlans: RSUPlan[] = useMemo(
    () =>
      plans.map((p) => ({
        id: p.id,
        nom: p.nom,
        anneeAttribution: p.anneeAttribution,
        regime: p.regime,
        devise: p.devise,
        dateFinConservation: p.dateFinConservation,
        vestings: [],
        gainAcquisitionTotal: p.nbRsuTotal * p.valeurAcquisitionUnitaire,
        nbRsuTotal: p.nbRsuTotal,
      })),
    [plans],
  );

  const result = useMemo(() => {
    if (rsuPlans.length === 0 || prixVente <= 0) return null;
    return calculateRSUSimulation(
      rsuPlans,
      {
        mode: "simple",
        prixVente,
        tauxChangeVente: tauxChange,
        tmi,
        dateCession,
      },
      getFiscalRules(),
    );
  }, [rsuPlans, prixVente, tauxChange, tmi, dateCession]);

  const hasUSD = plans.some((p) => p.devise === "USD");

  function updatePlan(id: string, patch: Partial<PlanInput>) {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...patch };
        if (patch.anneeAttribution !== undefined && patch.regime === undefined) {
          merged.regime = inferRegimeFromYear(patch.anneeAttribution);
        }
        return merged;
      }),
    );
  }

  function removePlan(id: string) {
    setPlans((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));
  }

  return (
    <Card className="p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calculator size={16} className="text-aubergine" />
            <h3 className="font-display text-aubergine text-[16px]">
              Simulateur pédagogique
            </h3>
          </div>
          <p className="text-[12.5px] text-aubergine/70 leading-relaxed">
            Saisissez un ou plusieurs plans, ajustez la TMI et le prix de cession
            pour visualiser le détail du calcul fiscal et préparer vos réponses
            aux candidats. Aucune donnée n'est enregistrée.
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="space-y-3">
        {plans.map((p, i) => (
          <div
            key={p.id}
            className="rounded-lg border border-[rgba(45,38,64,0.1)] p-4 space-y-3"
            style={{ background: "#FBFAF7" }}
          >
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={p.nom}
                onChange={(e) => updatePlan(p.id, { nom: e.target.value })}
                className="font-display text-aubergine text-[14px] bg-transparent border-b border-transparent hover:border-[rgba(45,38,64,0.15)] focus:border-aubergine outline-none"
              />
              {plans.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlan(p.id)}
                  className="text-aubergine/40 hover:text-danger"
                  aria-label="Supprimer le plan"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Année d'attribution">
                <input
                  type="number"
                  min={2005}
                  max={2030}
                  value={p.anneeAttribution}
                  onChange={(e) =>
                    updatePlan(p.id, {
                      anneeAttribution: Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Régime fiscal">
                <select
                  value={p.regime}
                  onChange={(e) =>
                    updatePlan(p.id, { regime: e.target.value as RSURegime })
                  }
                  className={inputCls}
                >
                  {REGIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Devise du plan">
                <select
                  value={p.devise}
                  onChange={(e) =>
                    updatePlan(p.id, { devise: e.target.value as Currency })
                  }
                  className={inputCls}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </Field>
              <Field label="Nombre d'actions">
                <input
                  type="number"
                  min={0}
                  value={p.nbRsuTotal || ""}
                  onChange={(e) =>
                    updatePlan(p.id, { nbRsuTotal: Number(e.target.value) })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Valeur jour d'acquisition">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={p.valeurAcquisitionUnitaire || ""}
                  onChange={(e) =>
                    updatePlan(p.id, {
                      valeurAcquisitionUnitaire: Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Fin de conservation (option.)">
                <input
                  type="date"
                  value={p.dateFinConservation ?? ""}
                  onChange={(e) =>
                    updatePlan(p.id, {
                      dateFinConservation: e.target.value || undefined,
                    })
                  }
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="text-[11px] text-aubergine/60">
              Gain d'acquisition estimé :{" "}
              <span className="font-semibold text-aubergine">
                {fmtEur(p.nbRsuTotal * p.valeurAcquisitionUnitaire)}
              </span>{" "}
              · Plan #{i + 1}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setPlans((prev) => [...prev, newPlan()])}
          className="inline-flex items-center gap-1.5 text-[12px] text-aubergine hover:text-aubergine-dark underline"
        >
          <Plus size={13} /> Ajouter un plan
        </button>
      </div>

      {/* Hypothèses de cession */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg bg-[#F8F5F2]">
        <Field label="TMI du salarié">
          <select
            value={tmi}
            onChange={(e) => setTmi(Number(e.target.value))}
            className={inputCls}
          >
            {TMI_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prix de cession unitaire">
          <input
            type="number"
            min={0}
            step="0.01"
            value={prixVente || ""}
            onChange={(e) => setPrixVente(Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        {hasUSD && (
          <Field label="Taux USD → EUR">
            <input
              type="number"
              min={0}
              step="0.01"
              value={tauxChange || ""}
              onChange={(e) => setTauxChange(Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        )}
        <Field label="Date de cession">
          <input
            type="date"
            value={dateCession}
            onChange={(e) => setDateCession(e.target.value)}
            className={inputCls}
          />
        </Field>
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
                  <th className="px-3 py-2 text-right">Gain acq.</th>
                  <th className="px-3 py-2 text-right">PV cession</th>
                  <th className="px-3 py-2 text-right">Impôts</th>
                  <th className="px-3 py-2 text-right font-semibold">Net</th>
                </tr>
              </thead>
              <tbody>
                {result.plans.map((p) => (
                  <tr
                    key={p.planId}
                    className="border-t border-[rgba(45,38,64,0.06)]"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-aubergine">{p.nom}</div>
                      <div className="text-[10.5px] text-grey">
                        {REGIME_LABELS[p.regime]}
                        {p.abattementApplique > 0 && (
                          <> · abattement {(p.abattementApplique * 100).toFixed(0)} %</>
                        )}
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Gain brut total" value={fmtEur(result.gainBrutTotal)} />
            <Metric label="Impôts totaux" value={`−${fmtEur(result.totalImpots)}`} tone="danger" />
            <Metric label="Net en poche" value={fmtEur(result.gainNet)} tone="primary" />
            <Metric
              label="Taux effectif"
              value={`${(result.tauxEffectif * 100).toFixed(1)} %`}
            />
          </div>
        </>
      )}

      <div
        className="text-[11px] rounded-md p-3 flex gap-2 leading-relaxed"
        style={{ background: "#FCEEE6", color: "#7A3F0E" }}
      >
        <Info size={14} className="shrink-0 mt-0.5" />
        <div>
          <strong>Pédagogique</strong> — Utilisez ce simulateur pour expliquer la
          mécanique fiscale RSU aux candidats. Les calculs appliquent les règles
          2026 (PFU 30 %, PS 17,2 %, seuil 300 k€ consolidé). Aucune donnée n'est
          enregistrée côté serveur.
        </div>
      </div>
    </Card>
  );
}

const inputCls =
  "w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-aubergine/75 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-danger"
      : tone === "primary"
        ? "text-aubergine"
        : "text-aubergine/80";
  return (
    <div className="rounded-lg p-3" style={{ background: "rgba(45,38,64,0.04)" }}>
      <div className="text-[10px] uppercase tracking-wider text-aubergine/55 font-semibold">
        {label}
      </div>
      <div className={`font-display text-[18px] mt-1 ${color}`}>{value}</div>
    </div>
  );
}
