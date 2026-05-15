import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { LegalNotice } from "@/components/paqli/LegalNotice";
import { JobForm, validateJob } from "@/components/paqli/jobs/JobForm";
import { ImportJobModal } from "@/components/paqli/import/ImportJobModal";
import { useAuth } from "@/hooks/useAuth";
import { createJob, emptyJob, type JobInput } from "@/lib/jobsService";
import { mapToJobInput } from "@/lib/importMapper";

export const Route = createFileRoute("/_app/jobs/new")({
  component: NewJobPage,
});

function NewJobPage() {
  const { user, organization } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState<JobInput>(emptyJob);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"choice" | "form">("choice");
  const [showImport, setShowImport] = useState(false);
  const [imported, setImported] = useState(false);

  async function save() {
    const err = validateJob(value);
    if (err) {
      toast.error(err);
      return;
    }
    if (!user || !organization) return;
    setSaving(true);
    try {
      await createJob(value, organization.id, user.id);
      toast.success("Offre créée");
      navigate({ to: "/jobs" });
    } catch (e) {
      console.error(e);
      toast.error("Erreur création");
    } finally {
      setSaving(false);
    }
  }

  if (mode === "choice") {
    return (
      <>
        <Topbar
          title={
            <span className="text-[14px] text-grey font-sans">
              <Link to="/jobs" className="hover:text-aubergine">
                Offres d'emploi
              </Link>
              <span className="mx-2">/</span>
              <span
                className="text-aubergine font-display"
                style={{ fontSize: 22 }}
              >
                Nouvelle offre
              </span>
            </span>
          }
        />
        <div className="px-4 sm:px-7 py-8 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-[22px] font-display text-aubergine mb-2">
              Créer une offre
            </div>
            <div className="text-[13px] text-grey font-light">
              Choisissez votre point de départ
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className="cursor-pointer hover:border-[rgba(139,127,168,0.3)] hover:bg-[#F5F2FA] transition-all"
              onClick={() => setShowImport(true)}
            >
              <div className="text-3xl mb-3">📋</div>
              <div className="text-[15px] font-medium text-aubergine mb-2">
                Partir d'une annonce existante
              </div>
              <div className="text-[12px] text-grey font-light leading-relaxed mb-4">
                Importez votre offre depuis WTJ, APEC, votre site carrière, un
                texte ou un fichier. Paqli s'occupe du reste.
              </div>
              <div className="text-[12px] text-aubergine font-medium">
                Importer →
              </div>
            </Card>
            <Card
              className="cursor-pointer hover:border-[rgba(139,127,168,0.3)] hover:bg-[#F5F2FA] transition-all"
              onClick={() => setMode("form")}
            >
              <div className="text-3xl mb-3">✏️</div>
              <div className="text-[15px] font-medium text-aubergine mb-2">
                Créer depuis zéro
              </div>
              <div className="text-[12px] text-grey font-light leading-relaxed mb-4">
                Remplissez les champs de votre offre. Vous pourrez la
                réutiliser ensuite à chaque package candidat.
              </div>
              <div className="text-[12px] text-aubergine font-medium">
                Commencer →
              </div>
            </Card>
          </div>
        </div>
        {showImport && (
          <ImportJobModal
            onImported={(data) => {
              setValue(mapToJobInput(data));
              setImported(true);
              setMode("form");
              toast.success(
                "Annonce importée — vérifiez et complétez les informations",
              );
            }}
            onClose={() => setShowImport(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Topbar
        title={
          <span className="text-[14px] text-grey font-sans">
            <Link to="/jobs" className="hover:text-aubergine">
              Offres d'emploi
            </Link>
            <span className="mx-2">/</span>
            <span
              className="text-aubergine font-display"
              style={{ fontSize: 22 }}
            >
              Nouvelle offre
            </span>
          </span>
        }
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Créer l'offre"}
          </Button>
        }
      />
      <div className="px-4 sm:px-7 py-4 sm:py-6 max-w-3xl">
        {imported && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-[#F5F2FA] border border-[rgba(139,127,168,0.2)] rounded-lg text-[12px] text-aubergine-light">
            <span>✨</span>
            <span className="font-light">
              Pré-rempli depuis votre annonce — vérifiez et complétez chaque
              champ
            </span>
          </div>
        )}
        <Card>
          <JobForm value={value} onChange={setValue} />
          <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-[rgba(45,38,64,0.06)]">
            <Link to="/jobs">
              <Button variant="ghost">Annuler</Button>
            </Link>
            <Button onClick={save} disabled={saving}>
              {saving ? "Enregistrement…" : "Créer l'offre"}
            </Button>
          </div>
        </Card>
        <div className="mt-3">
          <LegalNotice />
        </div>
      </div>
    </>
  );
}
