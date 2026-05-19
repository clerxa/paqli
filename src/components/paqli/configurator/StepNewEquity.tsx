import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { NumberField, TextArea, EduBanner } from "./fields";
import { SelectField, Toggle } from "./fields-v2";

const EQUITY_TYPES = [
  { value: "", label: "Aucun" },
  { value: "bspce", label: "BSPCE" },
  { value: "aga", label: "AGA (Actions Gratuites)" },
  { value: "rsu", label: "RSU" },
  { value: "stock_options", label: "Stock-options" },
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

export function StepNewEquity() {
  const { config, patch } = usePackageConfig();
  const strikeLabel =
    config.equityType === "bspce" || config.equityType === "stock_options"
      ? "Prix d'exercice"
      : "Valeur d'attribution";
  return (
    <div className="space-y-5">
      <div>
        <h2
          className="font-display text-aubergine"
          style={{ fontSize: 22 }}
        >
          Equity
        </h2>
        <p className="text-[12px] text-grey mt-1">
          Plan d'actions ou d'options associé à ce poste.
        </p>
      </div>

      <SelectField
        label="Type d'equity"
        value={config.equityType}
        onChange={(v) => patch({ equityType: v })}
        options={EQUITY_TYPES}
        placeholder="Aucun"
      />

      {config.equityType && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Nombre d'unités"
              value={config.equityQuantity}
              onChange={(v) => patch({ equityQuantity: v })}
            />
            <NumberField
              label={strikeLabel}
              value={config.equityStrikePrice}
              onChange={(v) => patch({ equityStrikePrice: v })}
              suffix="€"
            />
            <NumberField
              label="Valorisation actuelle (optionnel)"
              value={config.equityValuation}
              onChange={(v) => patch({ equityValuation: v })}
              suffix="€"
              hint="Sert au simulateur fiscal VEGA"
            />
          </div>

          <section className="space-y-3 border-t border-[rgba(45,38,64,0.06)] pt-4">
            <h3 className="text-[13px] font-medium text-aubergine">Vesting</h3>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Durée totale"
                value={String(config.equityVestingYears || 4)}
                onChange={(v) =>
                  patch({ equityVestingYears: Number(v) || 4 })
                }
                options={VESTING}
              />
              <SelectField
                label="Cliff"
                value={String(config.equityCliffMonths ?? 12)}
                onChange={(v) => patch({ equityCliffMonths: Number(v) || 0 })}
                options={CLIFFS}
              />
            </div>
            <Toggle
              label="Accélération en cas de rachat ou IPO"
              value={config.equityAcceleration}
              onChange={(v) => patch({ equityAcceleration: v })}
            />
          </section>

          <TextArea
            label="Notes complémentaires"
            value={config.equityNotes}
            onChange={(v) => patch({ equityNotes: v })}
            placeholder="ex : plan qualifié, régime fiscal applicable…"
          />

          <EduBanner>
            Ces informations permettent au simulateur fiscal VEGA de calculer
            le gain net pour le candidat selon son TMI.
          </EduBanner>
        </>
      )}
    </div>
  );
}
