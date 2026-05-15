import { useAuth } from "@/hooks/useAuth";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { Chip, EduBanner, TextArea, TextField } from "./fields";
import type { GrowthPath, ManagerStyle } from "@/lib/packageConfig";

const VALUE_SUGGESTIONS = [
  "Transparence",
  "Impact",
  "Bienveillance",
  "Excellence",
  "Agilité",
  "Diversité",
  "Équilibre vie pro/perso",
  "Innovation",
];

const TEAM_SIZE_OPTIONS = [
  { v: 3, l: "1-3" },
  { v: 8, l: "4-8" },
  { v: 15, l: "9-15" },
  { v: 99, l: "15+" },
];

const MANAGER_OPTIONS: {
  value: ManagerStyle;
  icon: string;
  label: string;
  desc: string;
}[] = [
  { value: "autonomy", icon: "🎯", label: "Autonomie forte", desc: "Vous gérez votre agenda" },
  { value: "coaching", icon: "🤝", label: "Coaching", desc: "Manager disponible et impliqué" },
  { value: "structured", icon: "📋", label: "Structuré", desc: "Processus clairs et cadrés" },
  { value: "collaborative", icon: "💬", label: "Collaboratif", desc: "Décisions collectives" },
];

const GROWTH_HORIZONS = ["6 mois", "1 an", "2 ans", "3 ans+"];

export function StepCompany() {
  const { organization } = useAuth();
  const { config, patch } = usePackageConfig();

  function toggleValue(v: string) {
    const exists = config.companyValues.includes(v);
    const next = exists
      ? config.companyValues.filter((x) => x !== v)
      : config.companyValues.length < 5
        ? [...config.companyValues, v]
        : config.companyValues;
    patch({ companyValues: next });
  }

  function setGrowth(i: number, p: Partial<GrowthPath>) {
    const next = [...config.growthPaths];
    next[i] = { ...next[i], ...p };
    patch({ growthPaths: next });
  }
  function addGrowth() {
    if (config.growthPaths.length >= 3) return;
    patch({ growthPaths: [...config.growthPaths, { horizon: "1 an", path: "" }] });
  }
  function removeGrowth(i: number) {
    patch({ growthPaths: config.growthPaths.filter((_, j) => j !== i) });
  }

  return (
    <div className="space-y-7">
      <header>
        <h2 className="font-display text-aubergine" style={{ fontSize: 22, lineHeight: 1.2 }}>
          L'entreprise
        </h2>
        <p className="text-[12px] text-aubergine-light mt-1.5 leading-relaxed">
          Présentez ce qui rend {organization?.name ?? "votre entreprise"} unique. Ces éléments
          sont communs à tous vos packages — ils donnent au candidat le contexte avant le poste.
        </p>
      </header>

      <Section title="Identité">
        <div className="rounded-lg p-4 border" style={{ background: "#FAF8F5", borderColor: "rgba(45,38,64,0.08)" }}>
          <div className="text-[11px] text-grey uppercase tracking-wider mb-1">Entreprise</div>
          <div className="font-display text-aubergine" style={{ fontSize: 18 }}>
            {organization?.name ?? "—"}
          </div>
        </div>
      </Section>

      <Section title="Équipe & management">
        <div>
          <SubLabel>Taille de l'équipe directe</SubLabel>
          <div className="flex flex-wrap gap-2 mt-2">
            {TEAM_SIZE_OPTIONS.map((o) => (
              <Chip key={o.v} selected={config.teamSize === o.v} onClick={() => patch({ teamSize: o.v })}>
                {o.l}
              </Chip>
            ))}
          </div>
        </div>

        <TextArea
          label="Description de l'équipe"
          value={config.teamDescription}
          onChange={(v) => patch({ teamDescription: v })}
          placeholder="Une équipe de 6 engineers, 2 PM et 1 designer. Environnement bienveillant, feedback régulier."
          maxLength={300}
        />

        <div>
          <SubLabel>Style de management</SubLabel>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {MANAGER_OPTIONS.map((o) => (
              <CardChoice
                key={o.value}
                selected={config.managerStyle === o.value}
                icon={o.icon}
                label={o.label}
                desc={o.desc}
                onClick={() => patch({ managerStyle: o.value })}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Culture & valeurs">
        <div>
          <SubLabel>Valeurs de l'entreprise</SubLabel>
          <div className="text-[11px] text-grey mt-0.5 mb-2">
            Sélectionnez jusqu'à 5 valeurs ({config.companyValues.length}/5)
          </div>
          <div className="flex flex-wrap gap-2">
            {VALUE_SUGGESTIONS.map((v) => (
              <Chip
                key={v}
                selected={config.companyValues.includes(v)}
                onClick={() => toggleValue(v)}
              >
                {v}
              </Chip>
            ))}
          </div>
        </div>

        <TextArea
          label="Note culture"
          value={config.cultureNote}
          onChange={(v) => patch({ cultureNote: v })}
          placeholder="Réunion d'équipe hebdomadaire, off-site 2x/an, budget team building, pas de réunions après 18h."
          maxLength={300}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextField
            label="Glassdoor (URL)"
            value={config.glassdoorUrl}
            onChange={(v) => patch({ glassdoorUrl: v })}
            placeholder="https://glassdoor.com/..."
            maxLength={500}
          />
          <TextField
            label="Welcome to the Jungle (URL)"
            value={config.wtjUrl}
            onChange={(v) => patch({ wtjUrl: v })}
            placeholder="https://welcometothejungle.com/..."
            maxLength={500}
          />
        </div>
        <EduBanner>
          Ces liens permettent au candidat de vérifier les avis avant de décider.
        </EduBanner>
      </Section>

      <Section title="Perspectives d'évolution">
        <div>
          <SubLabel>Évolutions possibles (max 3)</SubLabel>
          <div className="space-y-2 mt-2">
            {config.growthPaths.map((g, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-start">
                <select
                  value={g.horizon}
                  onChange={(e) => setGrowth(i, { horizon: e.target.value })}
                  className="text-[12px] px-2 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
                >
                  {GROWTH_HORIZONS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={g.path}
                  onChange={(e) => setGrowth(i, { path: e.target.value })}
                  placeholder="Lead Engineer possible"
                  className="flex-1 min-w-[180px] text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeGrowth(i)}
                  className="text-grey hover:text-danger px-2 text-[12px]"
                >
                  ✕
                </button>
              </div>
            ))}
            {config.growthPaths.length < 3 && (
              <button
                type="button"
                onClick={addGrowth}
                className="text-[12px] text-aubergine hover:underline"
              >
                + Ajouter une perspective
              </button>
            )}
          </div>
        </div>

        <TextArea
          label="Note onboarding"
          value={config.onboardingNote}
          onChange={(v) => patch({ onboardingNote: v })}
          placeholder="Onboarding structuré sur 3 mois avec buddy dédié, accès à toute la documentation interne dès J1."
          maxLength={300}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="text-[11px] uppercase tracking-[0.15em] text-grey font-medium">{title}</div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-[12px] text-aubergine-light font-medium">
      {children}
      {required && <span className="text-danger"> *</span>}
    </span>
  );
}

function CardChoice({
  selected,
  icon,
  label,
  desc,
  onClick,
}: {
  selected: boolean;
  icon: string;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-lg border p-3 transition-colors"
      style={{
        background: selected ? "#F5F2FA" : "white",
        borderColor: selected ? "#8B7FA8" : "rgba(45,38,64,0.12)",
      }}
    >
      <div className="text-[14px]">{icon}</div>
      <div className="text-[12px] font-medium mt-1" style={{ color: selected ? "#2D2640" : "#524970" }}>
        {label}
      </div>
      <div className="text-[11px] text-grey mt-0.5">{desc}</div>
    </button>
  );
}
