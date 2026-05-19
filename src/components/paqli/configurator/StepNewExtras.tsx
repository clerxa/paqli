import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { NumberField, TextField, TextArea, EduBanner } from "./fields";
import { SelectField, Toggle } from "./fields-v2";

const PROBATIONS = [
  { value: "1", label: "1 mois" },
  { value: "2", label: "2 mois" },
  { value: "3", label: "3 mois" },
  { value: "4", label: "4 mois" },
  { value: "6", label: "6 mois" },
];

const NC_MONTHS = [
  { value: "6", label: "6 mois" },
  { value: "12", label: "12 mois" },
  { value: "24", label: "24 mois" },
];

export function StepNewExtras() {
  const { config, patch } = usePackageConfig();
  return (
    <div className="space-y-5">
      <div>
        <h2
          className="font-display text-aubergine"
          style={{ fontSize: 22 }}
        >
          Extras spécifiques au poste
        </h2>
        <p className="text-[12px] text-grey mt-1">
          Tout ce qui diffère ou complète le socle entreprise.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-[13px] font-medium text-aubergine">Télétravail</h3>
        <Toggle
          label="Conditions différentes de la politique générale"
          value={config.remoteWorkOverride}
          onChange={(v) => patch({ remoteWorkOverride: v })}
        />
        {config.remoteWorkOverride && (
          <div>
            <label className="text-[12px] text-aubergine-light font-medium">
              Jours / semaine : <strong>{config.remoteWorkDaysSpecific}</strong>
            </label>
            <input
              type="range"
              min={0}
              max={5}
              value={config.remoteWorkDaysSpecific}
              onChange={(e) =>
                patch({ remoteWorkDaysSpecific: Number(e.target.value) })
              }
              className="w-full mt-2"
              style={{ accentColor: "#2D2640" }}
            />
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-[rgba(45,38,64,0.06)] pt-5">
        <h3 className="text-[13px] font-medium text-aubergine">Équipement</h3>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Modèle de laptop fourni"
            value={config.equipmentLaptop}
            onChange={(v) => patch({ equipmentLaptop: v })}
            placeholder='ex : MacBook Pro M3 14"'
          />
          <NumberField
            label="Budget équipement supplémentaire"
            value={config.equipmentBudget}
            onChange={(v) => patch({ equipmentBudget: v })}
            suffix="€"
          />
        </div>
      </section>

      <section className="space-y-3 border-t border-[rgba(45,38,64,0.06)] pt-5">
        <h3 className="text-[13px] font-medium text-aubergine">Formation</h3>
        <NumberField
          label="Budget formation spécifique à ce poste"
          value={config.trainingBudgetSpecific}
          onChange={(v) => patch({ trainingBudgetSpecific: v })}
          suffix="€/an"
          hint="Laissez vide pour appliquer le budget entreprise par défaut"
        />
        <TextArea
          label="Détails spécifiques"
          value={config.trainingDetails}
          onChange={(v) => patch({ trainingDetails: v })}
          placeholder="ex : Budget certifications AWS inclus"
        />
      </section>

      <section className="space-y-3 border-t border-[rgba(45,38,64,0.06)] pt-5">
        <h3 className="text-[13px] font-medium text-aubergine">
          Période d'essai
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Durée"
            value={String(config.probationMonths || 3)}
            onChange={(v) => patch({ probationMonths: Number(v) || 3 })}
            options={PROBATIONS}
          />
        </div>
        <Toggle
          label="Période d'essai reconductible"
          value={config.probationRenewable}
          onChange={(v) =>
            patch({
              probationRenewable: v,
              probationRenewalMaxMonths: v ? config.probationRenewalMaxMonths || 3 : 0,
            })
          }
        />
        {config.probationRenewable && (
          <div className="grid grid-cols-2 gap-4 pl-2">
            <SelectField
              label="Durée max de reconduction"
              value={String(config.probationRenewalMaxMonths || 3)}
              onChange={(v) =>
                patch({ probationRenewalMaxMonths: Number(v) || 0 })
              }
              options={PROBATIONS}
            />
          </div>
        )}
        <TextArea
          label="Objectifs de la période d'essai"
          value={config.probationObjectives}
          onChange={(v) => patch({ probationObjectives: v })}
          placeholder="Utilisé par Paq, pas affiché au candidat directement."
        />
      </section>

      <section className="space-y-3 border-t border-[rgba(45,38,64,0.06)] pt-5">
        <h3 className="text-[13px] font-medium text-aubergine">Évolution</h3>
        <TextArea
          label="Plan de carrière associé"
          value={config.careerPath}
          onChange={(v) => patch({ careerPath: v })}
          placeholder="ex : Évolution vers Lead Engineer à 18 mois selon performance"
        />
      </section>

      <section className="space-y-3 border-t border-[rgba(45,38,64,0.06)] pt-5">
        <h3 className="text-[13px] font-medium text-aubergine">
          Clauses contractuelles
        </h3>
        <Toggle
          label="Clause de non-concurrence"
          value={config.nonCompeteEnabled}
          onChange={(v) => patch({ nonCompeteEnabled: v })}
        />
        {config.nonCompeteEnabled && (
          <div className="grid grid-cols-2 gap-4 pl-2">
            <SelectField
              label="Durée"
              value={String(config.nonCompeteMonths || 12)}
              onChange={(v) => patch({ nonCompeteMonths: Number(v) || 0 })}
              options={NC_MONTHS}
            />
            <NumberField
              label="Compensation"
              value={config.nonCompeteCompensationPct}
              onChange={(v) => patch({ nonCompeteCompensationPct: v })}
              suffix="%"
              hint="% du salaire mensuel pendant la durée"
            />
          </div>
        )}
        <Toggle
          label="Clause de mobilité géographique"
          value={config.mobilityClause}
          onChange={(v) => patch({ mobilityClause: v })}
        />
      </section>

      <EduBanner>
        Les éléments spécifiques renseignés ici remplacent les valeurs du
        socle entreprise pour ce poste uniquement.
      </EduBanner>
    </div>
  );
}
