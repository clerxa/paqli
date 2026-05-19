import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { TextField, TextArea, EduBanner } from "./fields";
import { SelectField } from "./fields-v2";

const JOB_FAMILIES = [
  "Backend Engineer",
  "Frontend Engineer",
  "Fullstack Engineer",
  "DevOps Engineer",
  "Site Reliability Engineer",
  "Data Engineer",
  "Data Scientist",
  "ML Engineer",
  "Data Analyst",
  "Product Manager",
  "Product Owner",
  "Scrum Master",
  "UX Designer",
  "UI Designer",
  "Product Designer",
  "Tech Lead",
  "Engineering Manager",
  "Staff Engineer",
  "Principal Engineer",
  "CTO",
  "VP Engineering",
  "Head of Product",
  "Head of Data",
  "Sales Engineer",
  "Account Executive",
  "Customer Success Manager",
  "Marketing Manager",
  "Growth Manager",
  "Finance Manager",
  "RevOps Manager",
  "People Manager",
  "Talent Acquisition",
  "Office Manager",
  "Legal Counsel",
  "Other",
];

const SENIORITIES = ["Junior", "Confirmé", "Sénior", "Expert"];
const LOCATIONS = ["Paris", "Lyon", "Nantes", "Bordeaux", "Toulouse", "Lille", "Remote", "Autre"];
const CONTRACTS = ["CDI", "CDD", "Alternance", "Stage"];
const WHY_OPEN = [
  "Création de poste",
  "Remplacement (départ volontaire)",
  "Remplacement (promotion interne)",
  "Réorganisation",
  "Hypercroissance",
];

export function StepNewJob() {
  const { config, patch } = usePackageConfig();
  return (
    <div className="space-y-5">
      <div>
        <h2
          className="font-display text-aubergine"
          style={{ fontSize: 22 }}
        >
          Le poste
        </h2>
        <p className="text-[12px] text-grey mt-1">
          Informations spécifiques à ce recrutement. Le socle entreprise est
          déjà renseigné dans Paramètres → Mon entreprise.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Intitulé exact du poste"
          value={config.jobTitle || config.title}
          onChange={(v) => patch({ jobTitle: v, title: v })}
          placeholder="ex : Senior Backend Engineer"
          required
        />
        <SelectField
          label="Famille de poste"
          value={config.jobFamily}
          onChange={(v) => patch({ jobFamily: v })}
          options={JOB_FAMILIES.map((j) => ({ value: j, label: j }))}
          required
        />
        <SelectField
          label="Séniorité"
          value={config.seniority}
          onChange={(v) => patch({ seniority: v })}
          options={SENIORITIES.map((s) => ({ value: s, label: s }))}
          required
        />
        <SelectField
          label="Localisation"
          value={config.location}
          onChange={(v) => patch({ location: v, locationCity: v })}
          options={LOCATIONS.map((l) => ({ value: l, label: l }))}
          required
        />
        <SelectField
          label="Type de contrat"
          value={(config.contractType || "cdi").toUpperCase()}
          onChange={(v) =>
            patch({ contractType: v.toLowerCase() as typeof config.contractType })
          }
          options={CONTRACTS.map((c) => ({ value: c, label: c }))}
        />
        <label className="block">
          <span className="text-[12px] text-aubergine-light font-medium">
            Date de prise de poste souhaitée
          </span>
          <input
            type="date"
            value={config.startDate || ""}
            onChange={(e) => patch({ startDate: e.target.value })}
            className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white"
          />
        </label>
      </div>

      <div className="border-t border-[rgba(45,38,64,0.06)] pt-5 space-y-4">
        <h3 className="text-[13px] font-medium text-aubergine">
          Contexte du recrutement
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Manager direct"
            value={config.hiringManager}
            onChange={(v) => patch({ hiringManager: v })}
            placeholder="Prénom Nom"
          />
          <SelectField
            label="Pourquoi ce poste est ouvert"
            value={config.whyOpen}
            onChange={(v) => patch({ whyOpen: v })}
            options={WHY_OPEN.map((w) => ({ value: w, label: w }))}
          />
          <TextField
            label="Email du manager"
            value={config.hiringManagerEmail}
            onChange={(v) => patch({ hiringManagerEmail: v.slice(0, 255) })}
            placeholder="prenom.nom@entreprise.com"
          />
          <TextField
            label="LinkedIn du manager"
            value={config.hiringManagerLinkedin}
            onChange={(v) => patch({ hiringManagerLinkedin: v.slice(0, 500) })}
            placeholder="https://linkedin.com/in/…"
          />
        </div>
        <p className="text-[11px] text-grey">
          Affiché au candidat pour qu'il puisse contacter le manager directement.
        </p>
        <TextArea
          label="Description de l'équipe"
          value={config.teamDescription}
          onChange={(v) => patch({ teamDescription: v })}
          placeholder="Avec qui la personne travaillera, taille, composition…"
          maxLength={300}
        />
        <EduBanner>
          Ces informations aident Paq à répondre aux questions des candidats
          sur le contexte du poste.
        </EduBanner>
      </div>
    </div>
  );
}
