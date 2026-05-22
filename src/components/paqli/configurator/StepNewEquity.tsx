import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { NumberField, TextArea, EduBanner, TextField } from "./fields";
import { SelectField, Toggle } from "./fields-v2";
import type { EquityDeviceForm, EquityType, RSURegime } from "@/lib/packageConfig";
import { Step4Scenarios } from "./Step4Scenarios";
import { EquityKnowledgePanel } from "./EquityKnowledgePanel";
import { FieldTooltip } from "./FieldTooltip";
import { REGIME_OPTIONS, inferRegimeFromYear } from "@/lib/vega/rsuRegimes";

const EQUITY_TYPES: { value: EquityType; label: string }[] = [
  { value: "bspce", label: "BSPCE" },
  { value: "aga", label: "AGA (Actions Gratuites)" },
  { value: "rsu", label: "RSU" },
  { value: "stock_options", label: "Stock-options" },
  { value: "espp", label: "ESPP (Employee Stock Purchase Plan)" },
];

const VESTING = [
  { value: "3", label: "3 ans" },
  { value: "4", label: "4 ans" },
  { value: "5", label: "5 ans" },
];

const CLIFFS = [
  { value: "0", label: "Aucun" },
  { value: "6", label: "6 mois" },
  { value: "12", label: "12 mois" },
  { value: "18", label: "18 mois" },
];

function newDevice(type: EquityType = "bspce"): EquityDeviceForm {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    type,
    quantity: 0,
    strikePrice: 0,
    currentValuationM: 0,
    vestingYears: 4,
    cliffMonths: 12,
    specialConditions: "",
  };
}

export function StepNewEquity() {
  const { config, patch } = usePackageConfig();
  const devices = config.equityDevices ?? [];

  const update = (i: number, partial: Partial<EquityDeviceForm>) => {
    const next = [...devices];
    next[i] = { ...next[i], ...partial };
    patch({ equityDevices: next });
  };
  const remove = (i: number) => {
    patch({ equityDevices: devices.filter((_, j) => j !== i) });
  };
  const add = () => {
    patch({ equityDevices: [...devices, newDevice()] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
            Equity
          </h2>
          <p className="text-[12px] text-grey mt-1">
            Vous pouvez cumuler plusieurs plans (ex : BSPCE + ESPP).
          </p>
        </div>
        <EquityKnowledgePanel
          packageContext={`Package en cours : ${config.title || "(sans titre)"} — ${devices.length} plan(s) equity configuré(s).`}
        />
      </div>

      {devices.length === 0 && (
        <div className="text-[12px] text-grey italic">
          Aucun plan d'equity configuré pour ce poste.
        </div>
      )}

      {devices.map((d, i) => {
        const strikeLabel =
          d.type === "bspce" || d.type === "stock_options"
            ? "Prix d'exercice"
            : d.type === "espp"
              ? "Prix de souscription (avec décote)"
              : "Valeur d'attribution";
        return (
          <div
            key={d.id}
            className="space-y-3 rounded-lg border border-[rgba(45,38,64,0.08)] p-4 bg-white"
          >
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-medium text-aubergine">
                Plan #{i + 1}
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-[12px] text-danger underline"
              >
                Retirer
              </button>
            </div>

            <SelectField
              label="Type d'equity"
              value={d.type}
              onChange={(v) => update(i, { type: v as EquityType })}
              options={EQUITY_TYPES}
            />

            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Nombre d'unités"
                value={d.quantity}
                onChange={(v) => update(i, { quantity: v })}
              />
              <NumberField
                label={strikeLabel}
                value={d.strikePrice}
                onChange={(v) => update(i, { strikePrice: v })}
                suffix="€"
              />
              <NumberField
                label="Valorisation actuelle (M€)"
                value={d.currentValuationM}
                onChange={(v) => update(i, { currentValuationM: v })}
                suffix="M€"
                hint="Sert au simulateur fiscal VEGA"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Durée du vesting"
                value={String(d.vestingYears || 4)}
                onChange={(v) => update(i, { vestingYears: Number(v) || 4 })}
                options={VESTING}
              />
              <SelectField
                label="Cliff"
                value={String(d.cliffMonths ?? 12)}
                onChange={(v) => update(i, { cliffMonths: Number(v) || 0 })}
                options={CLIFFS}
              />
            </div>

            {(d.type === "rsu" || d.type === "aga") && (
              <div className="space-y-3 rounded-md p-3 bg-[#FAF7F2] border border-[rgba(45,38,64,0.06)]">
                <div className="flex items-center gap-2 text-[12px] font-medium text-aubergine">
                  Paramètres fiscaux RSU / AGA
                  <FieldTooltip>
                    Ces champs alimentent le simulateur fiscal VEGA côté
                    candidat. Le régime fiscal est déduit automatiquement
                    de l'année d'attribution mais peut être ajusté.
                  </FieldTooltip>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[12px] text-aubergine-light font-medium flex items-center gap-1">
                      Année d'attribution
                      <FieldTooltip>
                        Année à laquelle le plan a été attribué (acte
                        d'attribution). Détermine le régime fiscal applicable.
                      </FieldTooltip>
                    </span>
                    <input
                      type="number"
                      min={2000}
                      max={2100}
                      value={d.awardYear ?? ""}
                      onChange={(e) => {
                        const year = e.target.value ? Number(e.target.value) : null;
                        update(i, {
                          awardYear: year,
                          // auto-infer regime si pas surchargé
                          regime: year ? inferRegimeFromYear(year) : d.regime,
                        });
                      }}
                      placeholder={String(new Date().getFullYear())}
                      className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
                    />
                  </label>

                  <div>
                    <SelectField
                      label="Régime fiscal"
                      value={d.regime ?? (d.awardYear ? inferRegimeFromYear(d.awardYear) : "AGA_POST2018")}
                      onChange={(v) => update(i, { regime: v as any })}
                      options={REGIME_OPTIONS}
                    />
                    <span className="text-[11px] text-grey mt-1 block">
                      Déduit de l'année — ajustable manuellement.
                    </span>
                  </div>

                  <div>
                    <SelectField
                      label="Devise du plan"
                      value={d.currency ?? "EUR"}
                      onChange={(v) => update(i, { currency: v as any })}
                      options={[
                        { value: "EUR", label: "EUR (€)" },
                        { value: "USD", label: "USD ($)" },
                      ]}
                    />
                  </div>

                  <label className="block">
                    <span className="text-[12px] text-aubergine-light font-medium flex items-center gap-1">
                      Fin de période de conservation
                      <FieldTooltip>
                        Date à laquelle les actions deviennent cessibles
                        (post-AGA / post-vesting + période de conservation).
                        Sert au calcul des abattements pour durée de détention.
                      </FieldTooltip>
                    </span>
                    <input
                      type="date"
                      value={d.conservationEndDate ?? ""}
                      onChange={(e) => update(i, { conservationEndDate: e.target.value || null })}
                      className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
                    />
                  </label>

                  <label className="block col-span-2">
                    <span className="text-[12px] text-aubergine-light font-medium flex items-center gap-1">
                      Gain d'acquisition total (€)
                      <FieldTooltip>
                        Valeur brute des actions à la date d'acquisition
                        définitive. Si non renseigné, le simulateur l'estime
                        depuis quantité × valeur d'attribution.
                      </FieldTooltip>
                    </span>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min={0}
                        value={d.totalAcquisitionGain ?? ""}
                        onChange={(e) =>
                          update(i, {
                            totalAcquisitionGain: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="ex : 50000"
                        className="w-full text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-grey">€</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <TextArea
              label="Conditions particulières"
              value={d.specialConditions}
              onChange={(v) => update(i, { specialConditions: v })}
              placeholder="ex : accélération en cas de rachat, plan qualifié…"
            />

          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="text-[12px] text-aubergine underline"
      >
        + Ajouter un plan d'equity
      </button>

      {devices.length > 0 && (
        <>
          <div className="border-t border-[rgba(45,38,64,0.06)] pt-4">
            <Toggle
              label="Accélération en cas de rachat ou IPO (tous plans)"
              value={config.equityAcceleration}
              onChange={(v) => patch({ equityAcceleration: v })}
            />
          </div>

          <EduBanner>
            Ces informations alimentent le simulateur fiscal VEGA pour calculer
            le gain net selon le TMI du candidat.
          </EduBanner>

          <div className="border-t border-[rgba(45,38,64,0.06)] pt-6">
            <Step4Scenarios />
          </div>
        </>
      )}
    </div>
  );
}
