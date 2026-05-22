import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { NumberField, TextArea, EduBanner } from "./fields";
import { SelectField, Toggle } from "./fields-v2";
import type { EquityDeviceForm, EquityType } from "@/lib/packageConfig";
import { Step4Scenarios } from "./Step4Scenarios";

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
      <div>
        <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
          Equity
        </h2>
        <p className="text-[12px] text-grey mt-1">
          Vous pouvez cumuler plusieurs plans (ex : BSPCE + ESPP).
        </p>
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
        </>
      )}
    </div>
  );
}
