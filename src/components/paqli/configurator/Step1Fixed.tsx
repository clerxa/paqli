import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { usePackageCoach } from "@/hooks/usePackageCoach";
import { CoachTipInline } from "@/components/paqli/CoachTipInline";
import { NumberField, TextField } from "./fields";
import type {
  VariableComponent,
  VariableConfig,
  VariableIndicator,
  VariableObjectiveType,
  VariablePayoutFrequency,
} from "@/lib/packageConfig";
import {
  defaultVariableConfig,
  FREQUENCY_LABELS_FR,
  makeVariableComponent,
} from "@/lib/packageConfig";
import { Plus, X } from "lucide-react";

export function Step1Fixed() {
  const { config, patch } = usePackageConfig();
  const { tips, checkField } = usePackageCoach();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
          Rémunération fixe
        </h2>
        <p className="text-[12px] text-grey mt-1">
          La base du package : salaire et variable. Les avantages sont configurés
          à l'étape suivante.
        </p>
      </div>

      <TextField
        label="Intitulé du poste"
        required
        value={config.title}
        onChange={(v) => patch({ title: v })}
        placeholder="ex : Senior Engineer — Backend"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <NumberField
            label="Salaire brut annuel"
            required
            suffix="€"
            value={config.grossSalary}
            onChange={(v) => {
              patch({ grossSalary: v });
              checkField("gross_salary", v, { title: config.title });
            }}
            placeholder="75 000"
          />
          <CoachTipInline tip={tips.gross_salary} />
        </div>
        <VariableTotalField
          variableConfig={config.variableConfig ?? defaultVariableConfig}
          variableTarget={config.variableTarget}
          onChangeTarget={(v) => patch({ variableTarget: v })}
        />
      </div>

      <VariableConfigSection
        value={config.variableConfig ?? defaultVariableConfig}
        onChange={(v) => {
          // Si des composants existent, on aligne le total sur leur somme
          const sum = v.components.reduce((s, c) => s + (c.amount || 0), 0);
          if (v.components.length > 0) {
            patch({ variableConfig: v, variableTarget: sum });
          } else {
            patch({ variableConfig: v });
          }
        }}
        variableTarget={config.variableTarget}
      />

      <CoachTipInline tip={tips.remote_days} />

      <TrialPeriodSection />

    </div>
  );
}

function TrialPeriodSection() {
  const { config, patch } = usePackageConfig();
  const options: { label: string; value: number | null }[] = [
    { label: "Aucune", value: null },
    { label: "1 mois", value: 1 },
    { label: "2 mois", value: 2 },
    { label: "3 mois", value: 3 },
    { label: "4 mois", value: 4 },
  ];
  return (
    <div className="pt-4 border-t border-[rgba(45,38,64,0.06)]">
      <div className="text-[11px] text-grey uppercase tracking-wider mb-2">
        Période d'essai
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Chip
            key={String(opt.value)}
            selected={config.trialPeriodMonths === opt.value}
            onClick={() => {
              patch({
                trialPeriodMonths: opt.value,
                trialPeriodRenewable: opt.value ? config.trialPeriodRenewable : false,
              });
            }}
          >
            {opt.label}
          </Chip>
        ))}
      </div>
      {config.trialPeriodMonths != null && (
        <label className="mt-3 inline-flex items-center gap-2 text-[12px] text-aubergine cursor-pointer">
          <input
            type="checkbox"
            checked={config.trialPeriodRenewable}
            onChange={(e) => patch({ trialPeriodRenewable: e.target.checked })}
            className="rounded"
          />
          Renouvelable une fois
        </label>
      )}
      <p className="text-[11px] text-grey mt-2">
        Ces informations apparaîtront dans la promesse d'embauche.
      </p>
    </div>
  );
}

const OBJECTIVE_OPTIONS: { value: VariableObjectiveType; label: string; hint: string }[] = [
  { value: "individual", label: "Individuels", hint: "100 % liés à la performance du salarié" },
  { value: "collective", label: "Collectifs", hint: "Liés à la performance de l'équipe / l'entreprise" },
  { value: "mixed", label: "Mixtes", hint: "Mix individuels + collectifs" },
];

const FREQUENCY_OPTIONS: { value: VariablePayoutFrequency; label: string }[] = [
  { value: "monthly", label: "Mensuel" },
  { value: "quarterly", label: "Trimestriel" },
  { value: "semestrial", label: "Semestriel" },
  { value: "annual", label: "Annuel" },
];

function VariableTotalField({
  variableConfig,
  variableTarget,
  onChangeTarget,
}: {
  variableConfig: VariableConfig;
  variableTarget: number;
  onChangeTarget: (v: number) => void;
}) {
  const hasComponents = variableConfig.components.length > 0;
  const sum = variableConfig.components.reduce((s, c) => s + (c.amount || 0), 0);

  if (hasComponents) {
    return (
      <div>
        <div className="text-[12px] text-aubergine-light font-medium mb-1">
          Variable cible annuel
        </div>
        <div
          className="rounded-md border-[0.5px] px-3 py-2 text-[13px] tabular-nums bg-[#F7F4EE]"
          style={{ borderColor: "rgba(45,38,64,0.12)", color: "#2D2640" }}
        >
          {sum.toLocaleString("fr-FR")} €
          <span className="text-[11px] text-grey ml-2">
            (somme des {variableConfig.components.length} composant
            {variableConfig.components.length > 1 ? "s" : ""})
          </span>
        </div>
      </div>
    );
  }
  return (
    <NumberField
      label="Variable cible annuel"
      suffix="€"
      value={variableTarget}
      onChange={onChangeTarget}
      placeholder="8 000"
    />
  );
}

function VariableConfigSection({
  value,
  onChange,
  variableTarget,
}: {
  value: VariableConfig;
  onChange: (v: VariableConfig) => void;
  variableTarget: number;
}) {
  const components = value.components ?? [];
  const hasComponents = components.length > 0;

  const setComponents = (next: VariableComponent[]) =>
    onChange({ ...value, components: next });

  const addComponent = (freq: VariablePayoutFrequency) => {
    // Si premier composant, pré-remplir avec le variableTarget existant
    const seedAmount =
      components.length === 0 && variableTarget > 0 ? variableTarget : 0;
    const seedLegacy =
      components.length === 0
        ? {
            objectiveType: value.objectiveType ?? null,
            indicators: value.indicators ?? [],
            calcMethod: value.calcMethod ?? "",
          }
        : null;
    const c = makeVariableComponent(freq, seedAmount);
    if (seedLegacy) {
      c.objectiveType = seedLegacy.objectiveType;
      c.indicators = seedLegacy.indicators;
      c.calcMethod = seedLegacy.calcMethod;
    }
    setComponents([...components, c]);
  };

  const updateComponent = (id: string, patch: Partial<VariableComponent>) =>
    setComponents(components.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const removeComponent = (id: string) =>
    setComponents(components.filter((c) => c.id !== id));

  // Si pas encore de composants : afficher le CTA pédagogique
  if (!hasComponents && variableTarget <= 0) return null;

  return (
    <div
      className="rounded-[12px] p-4 space-y-4"
      style={{ background: "#FAEEDA", border: "1px solid rgba(184,90,106,0.15)" }}
    >
      <div>
        <div className="text-[12px] font-medium" style={{ color: "#633806" }}>
          Composition du variable
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "#633806", opacity: 0.75 }}>
          Vous pouvez avoir plusieurs primes en parallèle (ex : commission mensuelle + bonus annuel). Ajoutez un composant par fréquence.
        </p>
      </div>

      {hasComponents && (
        <div className="space-y-3">
          {components.map((c, idx) => (
            <ComponentCard
              key={c.id}
              index={idx}
              component={c}
              onChange={(patch) => updateComponent(c.id, patch)}
              onRemove={() => removeComponent(c.id)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px]" style={{ color: "#633806", opacity: 0.8 }}>
          {hasComponents ? "Ajouter un autre composant :" : "Ajouter un composant :"}
        </span>
        {FREQUENCY_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => addComponent(o.value)}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md hover:underline"
            style={{ color: "#633806", border: "0.5px solid rgba(99,56,6,0.3)" }}
          >
            <Plus size={11} /> {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ComponentCard({
  index,
  component,
  onChange,
  onRemove,
}: {
  index: number;
  component: VariableComponent;
  onChange: (patch: Partial<VariableComponent>) => void;
  onRemove: () => void;
}) {
  const indicators = component.indicators ?? [];
  const totalWeight = indicators.reduce((s, it) => s + (it.weight || 0), 0);

  const updateIndicator = (idx: number, patch: Partial<VariableIndicator>) =>
    onChange({
      indicators: indicators.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    });
  const addIndicator = () =>
    onChange({ indicators: [...indicators, { label: "", weight: 0 }] });
  const removeIndicator = (idx: number) =>
    onChange({ indicators: indicators.filter((_, i) => i !== idx) });

  return (
    <div
      className="rounded-[10px] p-3 bg-white space-y-3"
      style={{ border: "0.5px solid rgba(99,56,6,0.2)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: "#FAEEDA", color: "#633806" }}
          >
            #{index + 1} · {FREQUENCY_LABELS_FR[component.frequency]}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-grey hover:text-danger p-1"
          aria-label="Supprimer le composant"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <div className="text-[11px] text-aubergine-light font-medium mb-1">
            Libellé
          </div>
          <input
            type="text"
            value={component.label}
            placeholder={
              component.frequency === "monthly"
                ? "ex : Commission mensuelle"
                : component.frequency === "annual"
                  ? "ex : Bonus annuel"
                  : "ex : Prime sur objectifs"
            }
            maxLength={80}
            onChange={(e) => onChange({ label: e.target.value })}
            className="w-full text-[12px] px-2.5 py-1.5 rounded-md border border-[rgba(45,38,64,0.15)] bg-white focus:outline-none focus:border-aubergine"
          />
        </div>
        <div>
          <div className="text-[11px] text-aubergine-light font-medium mb-1">
            Montant cible (annuel)
          </div>
          <div className="relative">
            <input
              type="number"
              min={0}
              value={component.amount || ""}
              placeholder="0"
              onChange={(e) =>
                onChange({ amount: Number(e.target.value) || 0 })
              }
              className="w-full text-[12px] px-2.5 py-1.5 rounded-md border border-[rgba(45,38,64,0.15)] bg-white focus:outline-none focus:border-aubergine tabular-nums pr-6"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-grey">
              €
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "#633806" }}>
          Type d'objectifs
        </div>
        <div className="flex flex-wrap gap-2">
          {OBJECTIVE_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              selected={component.objectiveType === o.value}
              onClick={() =>
                onChange({
                  objectiveType:
                    component.objectiveType === o.value ? null : o.value,
                })
              }
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] uppercase tracking-wider" style={{ color: "#633806" }}>
            Indicateurs / KPI
          </div>
          {indicators.length > 0 && (
            <span
              className="text-[10px] tabular-nums"
              style={{
                color: totalWeight === 100 ? "#27500A" : "#633806",
                opacity: 0.8,
              }}
            >
              Pondération totale : {totalWeight}%
            </span>
          )}
        </div>
        <div className="space-y-2">
          {indicators.map((ind, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={ind.label}
                placeholder="ex : Chiffre d'affaires généré"
                maxLength={80}
                onChange={(e) => updateIndicator(idx, { label: e.target.value })}
                className="flex-1 text-[12px] px-2.5 py-1.5 rounded-md border border-[rgba(45,38,64,0.15)] bg-white focus:outline-none focus:border-aubergine"
              />
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={ind.weight || ""}
                  placeholder="0"
                  onChange={(e) =>
                    updateIndicator(idx, { weight: Number(e.target.value) || 0 })
                  }
                  className="w-16 text-[12px] px-2 py-1.5 rounded-md border border-[rgba(45,38,64,0.15)] bg-white focus:outline-none focus:border-aubergine tabular-nums text-right pr-5"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-grey">
                  %
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeIndicator(idx)}
                className="text-grey hover:text-danger p-1"
                aria-label="Supprimer l'indicateur"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addIndicator}
            className="flex items-center gap-1.5 text-[12px] font-medium hover:underline"
            style={{ color: "#633806" }}
          >
            <Plus size={12} />
            Ajouter un indicateur
          </button>
        </div>
      </div>

      <TextArea
        label="Méthode de calcul (optionnel)"
        value={component.calcMethod}
        onChange={(v) => onChange({ calcMethod: v })}
        placeholder="ex : Bonus = cible × atteinte moyenne pondérée des indicateurs, plafonné à 120 %."
        maxLength={400}
      />
    </div>
  );
}
