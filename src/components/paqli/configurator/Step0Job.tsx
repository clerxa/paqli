import { Link } from "@tanstack/react-router";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { useJobs } from "@/hooks/useJobs";
import { applyJobToConfig } from "@/lib/jobsService";
import {
  Chip,
  EduBanner,
  NumberField,
  TextArea,
  TextField,
} from "./fields";
import type {
  ContractType,
  GrowthPath,
  ManagerStyle,
  ProcessStep,
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

const PROCESS_TEMPLATES: Record<string, ProcessStep[]> = {
  Tech: [
    { step: "Screening RH", duration: "30 min" },
    { step: "Entretien technique", duration: "1h" },
    { step: "Code review", duration: "45 min" },
    { step: "Rencontre équipe", duration: "30 min" },
  ],
  Rapide: [
    { step: "Screening RH", duration: "30 min" },
    { step: "Entretien manager", duration: "1h" },
  ],
};

export function Step0Job() {
  const { config, patch } = usePackageConfig();

  function setMission(i: number, value: string) {
    const next = [...config.missions];
    next[i] = value;
    patch({ missions: next });
  }
  function addMission() {
    if (config.missions.length >= 5) return;
    patch({ missions: [...config.missions, ""] });
  }
  function removeMission(i: number) {
    patch({ missions: config.missions.filter((_, j) => j !== i) });
  }

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
    patch({
      growthPaths: [...config.growthPaths, { horizon: "1 an", path: "" }],
    });
  }
  function removeGrowth(i: number) {
    patch({ growthPaths: config.growthPaths.filter((_, j) => j !== i) });
  }

  function setStep(i: number, p: Partial<ProcessStep>) {
    const next = [...config.processSteps];
    next[i] = { ...next[i], ...p };
    patch({ processSteps: next });
  }
  function addStep() {
    if (config.processSteps.length >= 6) return;
    patch({
      processSteps: [...config.processSteps, { step: "", duration: "" }],
    });
  }
  function removeStep(i: number) {
    patch({ processSteps: config.processSteps.filter((_, j) => j !== i) });
  }
  function loadTemplate(t: keyof typeof PROCESS_TEMPLATES) {
    patch({ processSteps: PROCESS_TEMPLATES[t] });
  }

  return (
    <div className="space-y-7">
      <header>
        <h2
          className="font-display text-aubergine"
          style={{ fontSize: 22, lineHeight: 1.2 }}
        >
          Le poste
        </h2>
        <p className="text-[12px] text-aubergine-light mt-1.5 leading-relaxed">
          Ces informations aident le candidat à comprendre pourquoi ce rôle est
          fait pour lui — avant même de regarder le package financier.
        </p>
      </header>

      {/* Titre + Accroche */}
      <Section title="Identité">
        <TextField
          label="Intitulé du poste"
          required
          value={config.title}
          onChange={(v) => patch({ title: v })}
          placeholder="Lead Engineer · Série B"
        />
        <div>
          <label className="block">
            <span className="text-[12px] text-aubergine-light font-medium">
              Accroche du poste<span className="text-danger"> *</span>
            </span>
            <textarea
              value={config.jobSummary}
              onChange={(e) =>
                patch({ jobSummary: e.target.value.slice(0, 200) })
              }
              placeholder="Rejoignez une équipe de 6 engineers qui construit l'infrastructure data de la prochaine licorne française."
              rows={3}
              className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white resize-none"
            />
          </label>
          <div className="text-[11px] text-grey mt-1 text-right">
            {config.jobSummary.length}/200
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
                selected={config.contractType === o.value}
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
            {config.missions.map((m, i) => (
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
            {config.missions.length < 5 && (
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
            tags={config.stack}
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
                selected={config.remotePolicy === o.value}
                icon={o.icon}
                label={o.label}
                desc={o.desc}
                onClick={() => patch({ remotePolicy: o.value })}
              />
            ))}
          </div>
        </div>

        {config.remotePolicy === "hybrid" && (
          <>
            <div>
              <SubLabel>Jours de télétravail / semaine</SubLabel>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4].map((d) => (
                  <Chip
                    key={d}
                    selected={config.remoteDays === d}
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
              value={config.remoteGuaranteed}
              onChange={(v) => patch({ remoteGuaranteed: v })}
            />
          </>
        )}

        <Toggle
          label="Horaires flexibles ?"
          value={config.flexibleHours}
          onChange={(v) => patch({ flexibleHours: v })}
        />
      </Section>

      {/* Localisation */}
      <Section title="Localisation">
        <TextField
          label="Ville / lieu de travail"
          required
          value={config.locationCity}
          onChange={(v) => patch({ locationCity: v })}
          placeholder="Paris 9e"
        />
        <TextArea
          label="Précisions localisation"
          value={config.locationDetails}
          onChange={(v) => patch({ locationDetails: v })}
          placeholder="Bureaux à 5 min de la station Nation. Déplacements client 1 fois / mois à prévoir."
          maxLength={300}
        />
      </Section>

      {/* Équipe & management */}
      <Section title="Équipe & management">
        <div>
          <SubLabel>Taille de l'équipe directe</SubLabel>
          <div className="flex flex-wrap gap-2 mt-2">
            {TEAM_SIZE_OPTIONS.map((o) => (
              <Chip
                key={o.v}
                selected={config.teamSize === o.v}
                onClick={() => patch({ teamSize: o.v })}
              >
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

      {/* Culture & valeurs */}
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
          Ces liens permettent au candidat de vérifier les avis avant de
          décider.
        </EduBanner>
      </Section>

      {/* Perspectives d'évolution */}
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

        <NumberField
          label="Budget formation annuel"
          value={config.trainingBudget ?? 0}
          onChange={(v) => patch({ trainingBudget: v || null })}
          placeholder="2000"
          suffix="€"
          hint="Conférences, formations, livres, certifications"
        />

        <TextArea
          label="Note onboarding"
          value={config.onboardingNote}
          onChange={(v) => patch({ onboardingNote: v })}
          placeholder="Onboarding structuré sur 3 mois avec buddy dédié, accès à toute la documentation interne dès J1."
          maxLength={300}
        />
      </Section>

      {/* Process */}
      <Section title="Processus de recrutement">
        <div>
          <div className="flex items-center justify-between">
            <SubLabel>Étapes du process (max 6)</SubLabel>
            <div className="flex gap-2">
              {Object.keys(PROCESS_TEMPLATES).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => loadTemplate(t)}
                  className="text-[11px] text-aubergine hover:underline"
                >
                  Modèle {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 mt-2">
            {config.processSteps.map((s, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-[11px] text-grey mt-2.5 w-4 text-right shrink-0">
                  {i + 1}.
                </span>
                <input
                  type="text"
                  value={s.step}
                  onChange={(e) => setStep(i, { step: e.target.value })}
                  placeholder="Entretien RH"
                  className="flex-1 text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white"
                />
                <input
                  type="text"
                  value={s.duration}
                  onChange={(e) => setStep(i, { duration: e.target.value })}
                  placeholder="30 min"
                  className="w-24 text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="text-grey hover:text-danger px-2 text-[12px]"
                >
                  ✕
                </button>
              </div>
            ))}
            {config.processSteps.length < 6 && (
              <button
                type="button"
                onClick={addStep}
                className="text-[12px] text-aubergine hover:underline"
              >
                + Ajouter une étape
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextField
            label="Durée totale du processus"
            value={config.processDuration}
            onChange={(v) => patch({ processDuration: v })}
            placeholder="2 à 3 semaines"
          />
          <TextField
            label="Date de démarrage souhaitée"
            value={config.startDate}
            onChange={(v) => patch({ startDate: v })}
            placeholder="Dès que possible"
          />
        </div>
      </Section>
    </div>
  );
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
