import {
  Chip,
  EduBanner,
  NumberField,
  TextArea,
  TextField,
} from "@/components/paqli/configurator/fields";
import type { JobInput } from "@/lib/jobsService";
import type {
  ContractType,
  GrowthPath,
  ManagerStyle,
  RemotePolicy,
} from "@/lib/packageConfig";

const CONTRACT_OPTIONS: { value: ContractType; label: string }[] = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "freelance", label: "Freelance" },
  { value: "alternance", label: "Alternance" },
  { value: "stage", label: "Stage" },
];

const REMOTE_OPTIONS: {
  value: RemotePolicy;
  icon: string;
  label: string;
  desc: string;
}[] = [
  { value: "full_remote", icon: "🏠", label: "Full remote", desc: "100 % à distance" },
  { value: "hybrid", icon: "🔀", label: "Hybride", desc: "Mix bureau / remote" },
  { value: "office_first", icon: "🏢", label: "Présentiel+", desc: "Majorité au bureau" },
  { value: "on_site", icon: "🏬", label: "Sur site", desc: "100 % sur site" },
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

const TEAM_SIZE_OPTIONS = [
  { v: 3, l: "1-3" },
  { v: 8, l: "4-8" },
  { v: 15, l: "9-15" },
  { v: 99, l: "15+" },
];

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

const GROWTH_HORIZONS = ["6 mois", "1 an", "2 ans", "3 ans+"];




export function JobForm({
  value,
  onChange,
}: {
  value: JobInput;
  onChange: (next: JobInput) => void;
}) {
  const patch = (p: Partial<JobInput>) => onChange({ ...value, ...p });

  function setMission(i: number, v: string) {
    const next = [...value.missions];
    next[i] = v;
    patch({ missions: next });
  }
  function addMission() {
    if (value.missions.length >= 5) return;
    patch({ missions: [...value.missions, ""] });
  }
  function removeMission(i: number) {
    patch({ missions: value.missions.filter((_, j) => j !== i) });
  }

  function toggleValue(v: string) {
    const exists = value.companyValues.includes(v);
    const next = exists
      ? value.companyValues.filter((x) => x !== v)
      : value.companyValues.length < 5
        ? [...value.companyValues, v]
        : value.companyValues;
    patch({ companyValues: next });
  }

  function setGrowth(i: number, p: Partial<GrowthPath>) {
    const next = [...value.growthPaths];
    next[i] = { ...next[i], ...p };
    patch({ growthPaths: next });
  }
  function addGrowth() {
    if (value.growthPaths.length >= 3) return;
    patch({
      growthPaths: [...value.growthPaths, { horizon: "1 an", path: "" }],
    });
  }
  function removeGrowth(i: number) {
    patch({ growthPaths: value.growthPaths.filter((_, j) => j !== i) });
  }




  return (
    <div className="space-y-7">
      {/* Identité */}
      <Section title="Identité">
        <TextField
          label="Intitulé du poste"
          required
          value={value.title}
          onChange={(v) => patch({ title: v })}
          placeholder="Lead Engineer · Série B"
        />
        <div>
          <label className="block">
            <span className="text-[12px] text-aubergine-light font-medium">
              Accroche du poste<span className="text-danger"> *</span>
            </span>
            <textarea
              value={value.jobSummary}
              onChange={(e) => patch({ jobSummary: e.target.value.slice(0, 200) })}
              placeholder="Rejoignez une équipe de 6 engineers qui construit l'infrastructure data de la prochaine licorne française."
              rows={3}
              className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white resize-none"
            />
          </label>
          <div className="text-[11px] text-grey mt-1 text-right">
            {value.jobSummary.length}/200
          </div>
        </div>
      </Section>

      {/* Le poste */}
      <Section title="Le poste">
        <div>
          <SubLabel required>Type de contrat</SubLabel>
          <div className="flex flex-wrap gap-2 mt-2">
            {CONTRACT_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                selected={value.contractType === o.value}
                onClick={() => patch({ contractType: o.value })}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <SubLabel required>Missions principales</SubLabel>
          <div className="text-[11px] text-grey mt-0.5 mb-2">
            3 à 5 missions, max 5
          </div>
          <div className="space-y-2">
            {value.missions.map((m, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-[11px] text-grey mt-2.5 w-4 text-right shrink-0">
                  {i + 1}.
                </span>
                <input
                  type="text"
                  value={m}
                  onChange={(e) => setMission(i, e.target.value)}
                  placeholder="Concevoir et maintenir l'architecture backend"
                  className="flex-1 text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeMission(i)}
                  className="text-grey hover:text-danger px-2 text-[12px]"
                  aria-label="Supprimer"
                >
                  ✕
                </button>
              </div>
            ))}
            {value.missions.length < 5 && (
              <button
                type="button"
                onClick={addMission}
                className="text-[12px] text-aubergine hover:underline"
              >
                + Ajouter une mission
              </button>
            )}
          </div>
        </div>

        <div>
          <SubLabel>Stack / Environnement</SubLabel>
          <TagInput
            tags={value.stack}
            onChange={(stack) => patch({ stack })}
            placeholder="React, TypeScript, Supabase…"
          />
        </div>
      </Section>

      {/* Flexibilité */}
      <Section title="Flexibilité">
        <div>
          <SubLabel required>Politique télétravail</SubLabel>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {REMOTE_OPTIONS.map((o) => (
              <CardChoice
                key={o.value}
                selected={value.remotePolicy === o.value}
                icon={o.icon}
                label={o.label}
                desc={o.desc}
                onClick={() => patch({ remotePolicy: o.value })}
              />
            ))}
          </div>
        </div>

        {value.remotePolicy === "hybrid" && (
          <>
            <div>
              <SubLabel>Jours de télétravail / semaine</SubLabel>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4].map((d) => (
                  <Chip
                    key={d}
                    selected={value.remoteDays === d}
                    onClick={() => patch({ remoteDays: d })}
                  >
                    {d}j
                  </Chip>
                ))}
              </div>
            </div>
            <Toggle
              label="Télétravail garanti dans le contrat ?"
              hint="Un accord écrit rassure davantage les candidats"
              value={value.remoteGuaranteed}
              onChange={(v) => patch({ remoteGuaranteed: v })}
            />
          </>
        )}

        <Toggle
          label="Horaires flexibles ?"
          value={value.flexibleHours}
          onChange={(v) => patch({ flexibleHours: v })}
        />
      </Section>

      {/* Localisation */}
      <Section title="Localisation">
        <TextField
          label="Ville / lieu de travail"
          required
          value={value.locationCity}
          onChange={(v) => patch({ locationCity: v })}
          placeholder="Paris 9e"
        />
        <TextArea
          label="Précisions localisation"
          value={value.locationDetails}
          onChange={(v) => patch({ locationDetails: v })}
          placeholder="Bureaux à 5 min de la station Nation. Déplacements client 1 fois / mois à prévoir."
          maxLength={300}
        />
      </Section>

      {/* Équipe */}
      <Section title="Équipe & management">
        <div>
          <SubLabel>Taille de l'équipe directe</SubLabel>
          <div className="flex flex-wrap gap-2 mt-2">
            {TEAM_SIZE_OPTIONS.map((o) => (
              <Chip
                key={o.v}
                selected={value.teamSize === o.v}
                onClick={() => patch({ teamSize: o.v })}
              >
                {o.l}
              </Chip>
            ))}
          </div>
        </div>

        <TextArea
          label="Description de l'équipe"
          value={value.teamDescription}
          onChange={(v) => patch({ teamDescription: v })}
          placeholder="Une équipe de 6 engineers, 2 PM et 1 designer."
          maxLength={300}
        />

        <div>
          <SubLabel>Style de management</SubLabel>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {MANAGER_OPTIONS.map((o) => (
              <CardChoice
                key={o.value}
                selected={value.managerStyle === o.value}
                icon={o.icon}
                label={o.label}
                desc={o.desc}
                onClick={() => patch({ managerStyle: o.value })}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Culture */}
      <Section title="Culture & valeurs">
        <div>
          <SubLabel>Valeurs de l'entreprise</SubLabel>
          <div className="text-[11px] text-grey mt-0.5 mb-2">
            Sélectionnez jusqu'à 5 valeurs ({value.companyValues.length}/5)
          </div>
          <div className="flex flex-wrap gap-2">
            {VALUE_SUGGESTIONS.map((v) => (
              <Chip
                key={v}
                selected={value.companyValues.includes(v)}
                onClick={() => toggleValue(v)}
              >
                {v}
              </Chip>
            ))}
          </div>
        </div>

        <TextArea
          label="Note culture"
          value={value.cultureNote}
          onChange={(v) => patch({ cultureNote: v })}
          placeholder="Réunion d'équipe hebdomadaire, off-site 2x/an, pas de réunions après 18h."
          maxLength={300}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextField
            label="Glassdoor (URL)"
            value={value.glassdoorUrl}
            onChange={(v) => patch({ glassdoorUrl: v })}
            placeholder="https://glassdoor.com/..."
            maxLength={500}
          />
          <TextField
            label="Welcome to the Jungle (URL)"
            value={value.wtjUrl}
            onChange={(v) => patch({ wtjUrl: v })}
            placeholder="https://welcometothejungle.com/..."
            maxLength={500}
          />
        </div>
        <EduBanner>
          Ces liens permettent au candidat de vérifier les avis avant de décider.
        </EduBanner>
      </Section>

      {/* Évolution */}
      <Section title="Perspectives d'évolution">
        <div>
          <SubLabel>Évolutions possibles (max 3)</SubLabel>
          <div className="space-y-2 mt-2">
            {value.growthPaths.map((g, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-start">
                <select
                  value={g.horizon}
                  onChange={(e) => setGrowth(i, { horizon: e.target.value })}
                  className="text-[12px] px-2 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
                >
                  {GROWTH_HORIZONS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
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
            {value.growthPaths.length < 3 && (
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

        <NumberField
          label="Budget formation annuel"
          value={value.trainingBudget ?? 0}
          onChange={(v) => patch({ trainingBudget: v || null })}
          placeholder="2000"
          suffix="€"
          hint="Conférences, formations, livres, certifications"
        />

        <TextArea
          label="Note onboarding"
          value={value.onboardingNote}
          onChange={(v) => patch({ onboardingNote: v })}
          placeholder="Onboarding structuré sur 3 mois avec buddy dédié."
          maxLength={300}
        />
      </Section>

    </div>
  );
}

export function validateJob(j: JobInput): string | null {
  if (!j.title || j.title.trim().length < 3)
    return "L'intitulé du poste est obligatoire (min. 3 caractères).";
  if (!j.jobSummary || j.jobSummary.trim().length < 10)
    return "L'accroche du poste est obligatoire (min. 10 caractères).";
  if (!j.missions.filter((m) => m.trim()).length)
    return "Ajoutez au moins une mission principale.";
  if (!j.locationCity || !j.locationCity.trim())
    return "Indiquez la ville / lieu de travail.";
  return null;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="text-[11px] uppercase tracking-[0.15em] text-grey font-medium">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
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
      <div
        className="text-[12px] font-medium mt-1"
        style={{ color: selected ? "#2D2640" : "#524970" }}
      >
        {label}
      </div>
      <div className="text-[11px] text-grey mt-0.5">{desc}</div>
    </button>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-aubergine-light font-medium">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className="relative w-10 h-6 rounded-full transition-colors"
          style={{ background: value ? "#2D2640" : "#D3D1C7" }}
          aria-pressed={value}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
            style={{ transform: value ? "translateX(16px)" : "translateX(0)" }}
          />
        </button>
      </div>
      {hint && <div className="text-[11px] text-grey mt-1">{hint}</div>}
    </div>
  );
}

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  function addTag(value: string) {
    const v = value.trim().replace(/,$/, "");
    if (!v || tags.includes(v)) return;
    onChange([...tags, v]);
  }
  return (
    <div className="mt-1">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md"
            style={{ background: "#2D2640", color: "#FAF8F5" }}
          >
            {t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== t))}
              className="text-[10px] opacity-70 hover:opacity-100"
              aria-label={`Retirer ${t}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).value = "";
          }
        }}
        onBlur={(e) => {
          if (e.target.value) {
            addTag(e.target.value);
            e.target.value = "";
          }
        }}
        className="w-full text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white"
      />
      <div className="text-[11px] text-grey mt-1">
        Entrée ou virgule pour valider
      </div>
    </div>
  );
}
