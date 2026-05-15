import { useAuth } from "@/hooks/useAuth";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { Chip, EduBanner, TextArea, TextField } from "./fields";

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

  return (
    <div className="space-y-7">
      <header>
        <h2 className="font-display text-aubergine" style={{ fontSize: 22, lineHeight: 1.2 }}>
          L'entreprise
        </h2>
        <p className="text-[12px] text-aubergine-light mt-1.5 leading-relaxed">
          Présentez ce qui rend {organization?.name ?? "votre entreprise"} unique.
          Ces éléments sont communs à tous vos packages — ils ne changent pas selon le poste.
        </p>
      </header>

      <Section title="Identité">
        <div
          className="rounded-lg p-4 border"
          style={{ background: "#FAF8F5", borderColor: "rgba(45,38,64,0.08)" }}
        >
          <div className="text-[11px] text-grey uppercase tracking-wider mb-1">Entreprise</div>
          <div className="font-display text-aubergine" style={{ fontSize: 18 }}>
            {organization?.name ?? "—"}
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
