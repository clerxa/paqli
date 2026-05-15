import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { usePackageCoach } from "@/hooks/usePackageCoach";
import { CoachTipInline } from "@/components/paqli/CoachTipInline";
import { Chip, NumberField, TextArea, TextField } from "./fields";
import type {
  BenefitsConfig,
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

const benefitChips: { key: keyof BenefitsConfig; label: string }[] = [
  { key: "mutuelle", label: "Mutuelle premium" },
  { key: "ticketsResto", label: "Tickets restaurant" },
  { key: "rtt", label: "RTT" },
  { key: "vehicule", label: "Véhicule de fonction" },
  { key: "formation", label: "Budget formation" },
  { key: "creche", label: "Crèche d'entreprise" },
];

const teletravailOptions = [
  { value: 1, label: "1j" },
  { value: 2, label: "2j" },
  { value: 3, label: "3j" },
  { value: 5, label: "Full remote" },
];

export function Step1Fixed() {
  const { config, patch } = usePackageConfig();
  const { tips, checkField } = usePackageCoach();
  const b = config.benefits;

  const setBenefit = (key: keyof BenefitsConfig, value: BenefitsConfig[keyof BenefitsConfig]) => {
    patch({ benefits: { ...b, [key]: value } as BenefitsConfig });
    if (key === "teletravail" && typeof value === "number") {
      checkField("remote_days", value, {});
    }
  };
  const toggle = (key: keyof BenefitsConfig) =>
    setBenefit(key, !b[key] as never);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
          Rémunération fixe
        </h2>
        <p className="text-[12px] text-grey mt-1">
          La base du package : salaire, variable et avantages.
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
        <NumberField
          label="Variable cible annuel"
          suffix="€"
          value={config.variableTarget}
          onChange={(v) => patch({ variableTarget: v })}
          placeholder="8 000"
        />
      </div>

      {config.variableTarget > 0 && (
        <VariableConfigSection
          value={config.variableConfig ?? defaultVariableConfig}
          onChange={(v) => patch({ variableConfig: v })}
          variableTarget={config.variableTarget}
        />
      )}

      <CoachTipInline tip={tips.remote_days} />

      <div>
        <div className="text-[11px] text-grey uppercase tracking-wider mb-2">
          Avantages inclus
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip
            selected={b.teletravail > 0}
            onClick={() => setBenefit("teletravail", b.teletravail > 0 ? 0 : 2)}
          >
            Télétravail
          </Chip>
          {benefitChips.map((c) => (
            <Chip
              key={c.key}
              selected={Boolean(b[c.key])}
              onClick={() => toggle(c.key)}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      {(b.mutuelle ||
        b.ticketsResto ||
        b.teletravail > 0 ||
        b.rtt ||
        b.vehicule ||
        b.formation) && (
        <div className="space-y-4 pt-2 border-t border-[rgba(45,38,64,0.06)]">
          <div className="text-[11px] text-grey uppercase tracking-wider">
            Valorisation des avantages
          </div>

          {b.mutuelle && (
            <NumberField
              label="Mutuelle — part employeur"
              suffix="€/mois"
              value={b.mutuelleMontant}
              onChange={(v) => setBenefit("mutuelleMontant", v)}
              placeholder="120"
              required
            />
          )}

          {b.ticketsResto && (
            <NumberField
              label="Tickets restaurant — valeur faciale"
              suffix="€/jour"
              value={b.ticketsRestoValeur}
              onChange={(v) => setBenefit("ticketsRestoValeur", v)}
              placeholder="11"
              required
              hint="La part employeur légale est de 60 % minimum."
            />
          )}

          {b.teletravail > 0 && (
            <div>
              <div className="text-[12px] text-aubergine-light font-medium mb-1">
                Télétravail — jours par semaine
              </div>
              <div className="flex gap-2">
                {teletravailOptions.map((o) => (
                  <Chip
                    key={o.value}
                    selected={b.teletravail === o.value}
                    onClick={() => setBenefit("teletravail", o.value)}
                  >
                    {o.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {b.rtt && (
            <NumberField
              label="Nombre de jours RTT/an"
              value={b.rttJours}
              onChange={(v) => setBenefit("rttJours", v)}
              placeholder="12"
              required
            />
          )}

          {b.vehicule && (
            <NumberField
              label="Véhicule — valeur avantage mensuel"
              suffix="€/mois"
              value={b.vehiculeMontant}
              onChange={(v) => setBenefit("vehiculeMontant", v)}
              placeholder="350"
              required
            />
          )}

          {b.formation && (
            <NumberField
              label="Budget formation annuel"
              suffix="€"
              value={b.formationBudget}
              onChange={(v) => setBenefit("formationBudget", v)}
              placeholder="2 000"
              required
            />
          )}
        </div>
      )}
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

function VariableConfigSection({
  value,
  onChange,
  variableTarget,
}: {
  value: VariableConfig;
  onChange: (v: VariableConfig) => void;
  variableTarget: number;
}) {
  const update = <K extends keyof VariableConfig>(key: K, v: VariableConfig[K]) =>
    onChange({ ...value, [key]: v });

  const updateIndicator = (idx: number, patch: Partial<VariableIndicator>) => {
    const next = value.indicators.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    update("indicators", next);
  };
  const addIndicator = () =>
    update("indicators", [...value.indicators, { label: "", weight: 0 }]);
  const removeIndicator = (idx: number) =>
    update("indicators", value.indicators.filter((_, i) => i !== idx));

  const totalWeight = value.indicators.reduce((s, it) => s + (it.weight || 0), 0);

  return (
    <div
      className="rounded-[12px] p-4 space-y-4"
      style={{ background: "#FAEEDA", border: "1px solid rgba(184,90,106,0.15)" }}
    >
      <div>
        <div className="text-[12px] font-medium" style={{ color: "#633806" }}>
          Comment se compose le variable ?
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "#633806", opacity: 0.75 }}>
          Donnez au candidat la visibilité sur ce qu'il doit atteindre pour toucher ses {variableTarget.toLocaleString("fr-FR")} € cibles.
        </p>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "#633806" }}>
          Type d'objectifs
        </div>
        <div className="flex flex-wrap gap-2">
          {OBJECTIVE_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              selected={value.objectiveType === o.value}
              onClick={() =>
                update("objectiveType", value.objectiveType === o.value ? null : o.value)
              }
            >
              {o.label}
            </Chip>
          ))}
        </div>
        {value.objectiveType && (
          <div className="text-[11px] mt-1" style={{ color: "#633806", opacity: 0.7 }}>
            {OBJECTIVE_OPTIONS.find((o) => o.value === value.objectiveType)?.hint}
          </div>
        )}
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "#633806" }}>
          Fréquence de versement
        </div>
        <div className="flex flex-wrap gap-2">
          {FREQUENCY_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              selected={value.payoutFrequency === o.value}
              onClick={() =>
                update("payoutFrequency", value.payoutFrequency === o.value ? null : o.value)
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
          {value.indicators.length > 0 && (
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
          {value.indicators.map((ind, idx) => (
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
        value={value.calcMethod}
        onChange={(v) => update("calcMethod", v)}
        placeholder="ex : Bonus = variable cible × atteinte moyenne pondérée des indicateurs, plafonné à 120 %."
        maxLength={400}
      />
    </div>
  );
}
