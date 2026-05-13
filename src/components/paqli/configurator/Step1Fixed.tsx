import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { Chip, NumberField, TextField } from "./fields";
import type { BenefitsConfig } from "@/lib/packageConfig";

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
  const b = config.benefits;

  const setBenefit = (key: keyof BenefitsConfig, value: BenefitsConfig[keyof BenefitsConfig]) => {
    patch({ benefits: { ...b, [key]: value } as BenefitsConfig });
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
        <NumberField
          label="Salaire brut annuel"
          required
          suffix="€"
          value={config.grossSalary}
          onChange={(v) => patch({ grossSalary: v })}
          placeholder="75 000"
        />
        <NumberField
          label="Variable cible annuel"
          suffix="€"
          value={config.variableTarget}
          onChange={(v) => patch({ variableTarget: v })}
          placeholder="8 000"
        />
      </div>

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
