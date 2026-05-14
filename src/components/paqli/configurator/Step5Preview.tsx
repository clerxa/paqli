import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/paqli/Button";
import { AttractivenessScore } from "@/components/paqli/AttractivenessScore";
import { JobPostingGenerator } from "@/components/paqli/JobPostingGenerator";
import { Chip, NumberField, TextField, WarnBanner } from "./fields";
import {
  buildCandidateUrl,
  generateCandidateLink,
  publishPackage,
} from "@/lib/candidateLinks";
import {
  calcStep1Preview,
  calcStep2Preview,
  calcStep3Preview,
  estimateScenarioTotal,
  formatEur,
} from "@/lib/packageConfig";


export function Step5Preview() {
  const { config, saveDraft, setConfig } = usePackageConfig();
  const { organization } = useAuth();
  const navigate = useNavigate();

  const [expiresInDays, setExpiresInDays] = useState<number | null>(30);
  const [requireEmail, setRequireEmail] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const s1 = calcStep1Preview(config);
  const s2 = calcStep2Preview(config);
  const s3 = calcStep3Preview(config);

  
  const pessScenario = config.scenarios.find((s) => s.label === "pessimiste");
  const optiScenario = config.scenarios.find((s) => s.label === "optimiste");
  const equityLow =
    pessScenario && config.equityDevices.length > 0
      ? estimateScenarioTotal(config.equityDevices, pessScenario.targetValuationM)
      : 0;
  const equityHigh =
    optiScenario && config.equityDevices.length > 0
      ? estimateScenarioTotal(config.equityDevices, optiScenario.targetValuationM)
      : s2.equityEst;

  const minTotal =
    s1.salaryEst + s1.benefitsEst + s3.peeEst + equityLow;
  const maxTotal =
    s1.salaryEst +
    s1.variableEst +
    s1.benefitsEst +
    equityHigh +
    s3.peeEst +
    s3.interEst +
    s3.participationEst;

  async function ensureSaved(): Promise<string | null> {
    if (config.packageId) return config.packageId;
    await saveDraft();
    return config.packageId;
  }

  async function handleGenerate() {
    if (!organization) return;
    setGenerating(true);
    try {
      const pkgId = await ensureSaved();
      if (!pkgId) throw new Error("Package non sauvegardé");
      const { token } = await generateCandidateLink(
        pkgId,
        organization.id,
        candidateEmail || undefined,
        [firstName, lastName].filter(Boolean).join(" ") || undefined,
        expiresInDays,
      );
      setGeneratedToken(token);
      if (candidateEmail) {
        toast.message(
          "Lien généré — l'envoi email sera disponible prochainement",
        );
      } else {
        toast.success("Lien généré !");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du lien");
    } finally {
      setGenerating(false);
    }
  }

  async function copyLink() {
    if (!generatedToken) return;
    const url = buildCandidateUrl(generatedToken);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    } catch {
      toast.error("Impossible de copier");
    }
  }

  async function handlePublish() {
    if (!organization) return;
    setPublishing(true);
    try {
      const pkgId = await ensureSaved();
      if (!pkgId) throw new Error("Package non sauvegardé");
      await publishPackage(pkgId);
      setConfig((prev) => ({ ...prev, status: "active" }));
      toast.success("Package publié !");
      navigate({ to: "/packages/$id", params: { id: pkgId } });
    } catch (e) {
      console.error(e);
      toast.error("Erreur de publication");
    } finally {
      setPublishing(false);
    }
  }

  const url = generatedToken ? buildCandidateUrl(generatedToken) : "";

  const hasEquity = config.equityDevices.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
          Aperçu & partage
        </h2>
        <p className="text-[12px] text-grey mt-1">
          Vérifiez le récapitulatif puis publiez le package et générez un lien
          candidat.
        </p>
      </div>

      {/* Recap */}
      <div className="rounded-[12px] border border-[rgba(45,38,64,0.08)] bg-white p-5 space-y-5">
        <div>
          <div
            className="font-display text-aubergine"
            style={{ fontSize: 18 }}
          >
            {config.title || "Nouveau package"}
          </div>
          <div className="text-[12px] text-grey">
            {organization?.name ?? ""}
          </div>
        </div>

        <RecapSection title="Rémunération fixe">
          <RecapRow label="Fixe brut annuel" value={formatEur(config.grossSalary)} />
          {config.variableTarget > 0 && (
            <RecapRow
              label="Variable cible"
              value={formatEur(config.variableTarget)}
            />
          )}
          {s1.benefitsEst > 0 && (
            <RecapRow
              label="Avantages"
              value={`~${formatEur(s1.benefitsEst)}  (estimation)`}
            />
          )}
        </RecapSection>

        {hasEquity && (
          <RecapSection title="Equity">
            {config.equityDevices.map((d) => (
              <RecapRow
                key={d.id}
                label={`${d.type.toUpperCase()} — ${d.quantity.toLocaleString("fr-FR")} ${d.type === "bspce" || d.type === "stock_options" ? "bons" : "actions"}`}
                value={
                  pessScenario && optiScenario
                    ? `${formatEur(estimateScenarioTotal([d], pessScenario.targetValuationM))} → ${formatEur(estimateScenarioTotal([d], optiScenario.targetValuationM))}  (fourch.)`
                    : "—"
                }
              />
            ))}
          </RecapSection>
        )}

        {config.savingsDevices.length > 0 && (
          <RecapSection title="Épargne salariale">
            {config.savingsDevices.map((d) => {
              const label =
                d.type === "pee"
                  ? `PEE abondé ${d.matchingRate || 0}%`
                  : d.type === "perco"
                    ? `PERCO abondé ${d.matchingRate || 0}%`
                    : d.type === "interessement"
                      ? "Intéressement moy."
                      : "Participation moy.";
              const val =
                d.type === "pee" || d.type === "perco"
                  ? `jusqu'à ${formatEur(d.capAmount)}`
                  : `~${formatEur(d.avg3y)}`;
              return <RecapRow key={d.id} label={label} value={val} />;
            })}
          </RecapSection>
        )}

        <div className="border-t border-[rgba(45,38,64,0.08)] pt-4 flex items-center justify-between">
          <span className="text-[12px] uppercase tracking-wider text-grey">
            Ordre de grandeur total
          </span>
          <span
            className="font-display text-aubergine"
            style={{ fontSize: 18 }}
          >
            ~{formatEur(minTotal)} – ~{formatEur(maxTotal)}
          </span>
        </div>
      </div>

      <WarnBanner>
        Ces montants sont des estimations indicatives arrondies, calculées sur
        la base des règles fiscales en vigueur (2026). Ils ne constituent pas un
        résultat garanti ni un conseil fiscal.
      </WarnBanner>

      {/* Link generation */}
      <div className="rounded-[12px] border border-[rgba(45,38,64,0.08)] bg-white p-5 space-y-4">
        <div
          className="font-display text-aubergine"
          style={{ fontSize: 16 }}
        >
          Lien candidat
        </div>

        <div>
          <div className="text-[12px] text-aubergine-light font-medium mb-1">
            Expiration
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { v: 30, l: "30 jours" },
              { v: 60, l: "60 jours" },
              { v: 90, l: "90 jours" },
              { v: null, l: "Sans expiration" },
            ].map((o) => (
              <Chip
                key={String(o.v)}
                selected={expiresInDays === o.v}
                onClick={() => setExpiresInDays(o.v)}
              >
                {o.l}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[12px] text-aubergine-light font-medium mb-1">
            Protection
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip
              selected={!requireEmail}
              onClick={() => setRequireEmail(false)}
            >
              Lien ouvert
            </Chip>
            <Chip
              selected={requireEmail}
              onClick={() => setRequireEmail(true)}
            >
              Email requis
            </Chip>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[12px] text-aubergine-light font-medium">
            Envoyer directement par email (optionnel)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField
              label="Prénom du candidat"
              value={firstName}
              onChange={setFirstName}
            />
            <TextField
              label="Nom du candidat"
              value={lastName}
              onChange={setLastName}
            />
          </div>
          <TextField
            label="Email du candidat"
            value={candidateEmail}
            onChange={setCandidateEmail}
            placeholder="prenom.nom@email.com"
          />
        </div>

        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "Génération…" : "Générer et envoyer →"}
        </Button>

        {generatedToken && (
          <div className="rounded-md border border-[rgba(45,38,64,0.1)] bg-[#FAF8F5] p-3 flex items-stretch gap-2">
            <div className="flex-1 px-3 py-2 bg-white rounded text-[12px] text-aubergine truncate font-mono">
              {url}
            </div>
            <Button variant="ghost" onClick={copyLink}>
              📋 Copier
            </Button>
          </div>
        )}
        <div className="text-[11px] text-grey leading-relaxed">
          Le candidat renseigne sa situation → Paqli calcule une estimation
          personnalisée.
        </div>
      </div>

      {/* Publish */}
      <Button
        onClick={handlePublish}
        disabled={publishing || config.status === "active"}
        className="w-full"
      >
        {config.status === "active"
          ? "Package publié"
          : publishing
            ? "Publication…"
            : "Publier le package"}
      </Button>
    </div>
  );
}

function RecapSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-grey mb-2">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-aubergine-light">{label}</span>
      <span className="font-medium text-aubergine">{value}</span>
    </div>
  );
}
