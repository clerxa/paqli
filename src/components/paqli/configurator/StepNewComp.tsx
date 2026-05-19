import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { NumberField, TextArea, EduBanner, TextField } from "./fields";
import { SelectField, Toggle } from "./fields-v2";
import { BenchmarkBadge } from "./BenchmarkBadge";
import {
  makeVariableComponent,
  FREQUENCY_LABELS_FR,
  type VariablePayoutFrequency,
} from "@/lib/packageConfig";

const FREQUENCIES = [
  { value: "mensuel", label: "Mensuel" },
  { value: "trimestriel", label: "Trimestriel" },
  { value: "annuel", label: "Annuel" },
];

const GUARANTEED = [
  { value: "0", label: "0" },
  { value: "1", label: "1 mois" },
  { value: "3", label: "3 mois" },
  { value: "6", label: "6 mois" },
];

const CLAWBACK = [
  { value: "0", label: "Aucune" },
  { value: "6", label: "6 mois" },
  { value: "12", label: "12 mois" },
  { value: "18", label: "18 mois" },
];

export function StepNewComp() {
  const { config, patch } = usePackageConfig();
  return (
    <div className="space-y-5">
      <div>
        <h2
          className="font-display text-aubergine"
          style={{ fontSize: 22 }}
        >
          Rémunération
        </h2>
        <p className="text-[12px] text-grey mt-1">
          Fixe, variable et signing bonus pour ce poste.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-[13px] font-medium text-aubergine">Salaire fixe</h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Salaire fixe proposé"
            value={config.fixedSalary}
            onChange={(v) => patch({ fixedSalary: v, grossSalary: v })}
            suffix="€/an"
            required
            placeholder="65000"
          />
        </div>
        <BenchmarkBadge
          jobFamily={config.jobFamily}
          seniority={config.seniority}
          location={config.location}
          fixedSalary={config.fixedSalary}
        />
        <Toggle
          label="Afficher une fourchette au candidat"
          value={config.salaryShowRange}
          onChange={(v) => patch({ salaryShowRange: v })}
        />
        {config.salaryShowRange && (
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Min"
              value={config.salaryRangeMin}
              onChange={(v) => patch({ salaryRangeMin: v })}
              suffix="€/an"
            />
            <NumberField
              label="Max"
              value={config.salaryRangeMax}
              onChange={(v) => patch({ salaryRangeMax: v })}
              suffix="€/an"
            />
          </div>
        )}
        <Toggle
          label="Salaire négociable"
          value={config.salaryNegotiable}
          onChange={(v) => patch({ salaryNegotiable: v })}
        />
      </section>

      <section className="space-y-3 border-t border-[rgba(45,38,64,0.06)] pt-5">
        <Toggle
          label="Part variable"
          value={config.variableEnabled}
          onChange={(v) => patch({ variableEnabled: v })}
        />
        {config.variableEnabled && (
          <div className="space-y-3 pl-2">
            <Toggle
              label="Variable déplafonnée"
              value={config.variableUncapped}
              onChange={(v) => patch({ variableUncapped: v, variableMax: v ? 0 : config.variableMax })}
              hint="Si activé, le maximum atteignable n'est pas affiché."
            />
            <div className={`grid ${config.variableUncapped ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
              <NumberField
                label="Objectif (cible)"
                value={config.variableTarget}
                onChange={(v) => patch({ variableTarget: v })}
                suffix="€/an"
              />
              {!config.variableUncapped && (
                <NumberField
                  label="Maximum atteignable"
                  value={config.variableMax}
                  onChange={(v) => patch({ variableMax: v })}
                  suffix="€/an"
                />
              )}
            </div>
            <TextArea
              label="Critères"
              value={config.variableCriteria}
              onChange={(v) => patch({ variableCriteria: v })}
              placeholder="ex : objectifs trimestriels équipe + qualité code"
            />
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Fréquence principale"
                value={config.variableFrequency}
                onChange={(v) => patch({ variableFrequency: v })}
                options={FREQUENCIES}
              />
              <SelectField
                label="Mois de variable garanti"
                value={String(config.variableGuaranteedMonths || 0)}
                onChange={(v) =>
                  patch({ variableGuaranteedMonths: Number(v) || 0 })
                }
                options={GUARANTEED}
              />
            </div>

            {/* Composantes additionnelles (fréquences multiples) */}
            <div className="space-y-3 border-t border-[rgba(45,38,64,0.06)] pt-3">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-medium text-aubergine">
                  Autres composantes variables
                </div>
                <button
                  type="button"
                  className="text-[12px] text-aubergine underline"
                  onClick={() => {
                    const next = [...(config.variableConfig?.components ?? [])];
                    next.push(makeVariableComponent("quarterly", 0));
                    patch({
                      variableConfig: {
                        ...(config.variableConfig ?? { components: [] }),
                        components: next,
                      },
                    });
                  }}
                >
                  + Ajouter une composante
                </button>
              </div>
              {(config.variableConfig?.components ?? []).map((comp, i) => (
                <div
                  key={comp.id}
                  className="space-y-2 rounded border border-[rgba(45,38,64,0.08)] p-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Libellé"
                      value={comp.label}
                      onChange={(v) => {
                        const next = [...config.variableConfig.components];
                        next[i] = { ...comp, label: v };
                        patch({
                          variableConfig: {
                            ...config.variableConfig,
                            components: next,
                          },
                        });
                      }}
                      placeholder="ex : Prime trimestrielle équipe"
                    />
                    <SelectField
                      label="Fréquence"
                      value={comp.frequency}
                      onChange={(v) => {
                        const next = [...config.variableConfig.components];
                        next[i] = {
                          ...comp,
                          frequency: v as VariablePayoutFrequency,
                        };
                        patch({
                          variableConfig: {
                            ...config.variableConfig,
                            components: next,
                          },
                        });
                      }}
                      options={Object.entries(FREQUENCY_LABELS_FR).map(
                        ([value, label]) => ({ value, label }),
                      )}
                    />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <NumberField
                        label="Montant annuel cible"
                        value={comp.amount}
                        onChange={(v) => {
                          const next = [...config.variableConfig.components];
                          next[i] = { ...comp, amount: v };
                          patch({
                            variableConfig: {
                              ...config.variableConfig,
                              components: next,
                            },
                          });
                        }}
                        suffix="€/an"
                      />
                    </div>
                    <button
                      type="button"
                      className="text-[12px] text-danger underline pb-2"
                      onClick={() => {
                        const next = config.variableConfig.components.filter(
                          (_, j) => j !== i,
                        );
                        patch({
                          variableConfig: {
                            ...config.variableConfig,
                            components: next,
                          },
                        });
                      }}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-[rgba(45,38,64,0.06)] pt-5">
        <Toggle
          label="Bonus de bienvenue (signing)"
          value={!!config.signingBonusAmount}
          onChange={(v) =>
            patch({ signingBonusAmount: v ? config.signingBonusAmount || 1 : 0 })
          }
        />
        {config.signingBonusAmount > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Montant"
              value={config.signingBonusAmount}
              onChange={(v) => patch({ signingBonusAmount: v })}
              suffix="€"
            />
            <SelectField
              label="Clause de remboursement"
              value={String(config.signingBonusClawbackMonths || 0)}
              onChange={(v) =>
                patch({ signingBonusClawbackMonths: Number(v) || 0 })
              }
              options={CLAWBACK}
            />
          </div>
        )}
      </section>

      <EduBanner>
        La fourchette et le caractère négociable sont visibles par le candidat.
        Les critères et la fréquence du variable sont également affichés.
      </EduBanner>
    </div>
  );
}
