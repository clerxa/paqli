import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Configurator } from "@/components/paqli/configurator/Configurator";
import { ImportJobModal } from "@/components/paqli/import/ImportJobModal";
import { PackageConfigProvider } from "@/contexts/PackageConfigContext";
import { applyJobToConfig, getJob } from "@/lib/jobsService";
import { emptyConfig, type PackageConfig } from "@/lib/packageConfig";

interface NewSearch {
  jobId?: string;
}

export const Route = createFileRoute("/_app/packages/new")({
  validateSearch: (search): NewSearch => ({
    jobId: typeof search.jobId === "string" ? search.jobId : undefined,
  }),
  component: NewPackagePage,
});

function NewPackagePage() {
  const { jobId } = Route.useSearch();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<PackageConfig | null>(null);
  const [ready, setReady] = useState(!jobId);
  const [mode, setMode] = useState<"choice" | "configurator">(
    jobId ? "configurator" : "choice",
  );
  const [showImport, setShowImport] = useState(false);
  const [importedFlag, setImportedFlag] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    (async () => {
      try {
        const job = await getJob(jobId);
        if (!active) return;
        if (job) {
          setInitial(applyJobToConfig(emptyConfig, job));
        } else {
          toast.error("Offre introuvable");
        }
      } catch (e) {
        console.error(e);
        toast.error("Erreur de chargement de l'offre");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [jobId]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[13px] text-grey">
        Chargement de l'offre…
      </div>
    );
  }

  function handleImported(partial: Partial<PackageConfig>) {
    setInitial({ ...emptyConfig, ...partial, isDirty: true, currentStep: 0 });
    setImportedFlag(true);
    setMode("configurator");
    toast.success("Annonce importée — vérifiez et complétez les informations");
  }

  if (mode === "choice") {
    return (
      <>
        <Topbar
          title={
            <span className="text-[14px] text-grey font-sans">
              <button
                onClick={() => navigate({ to: "/packages" })}
                className="hover:text-aubergine"
              >
                Packages
              </button>
              <span className="mx-2">/</span>
              <span
                className="text-aubergine font-display"
                style={{ fontSize: 22 }}
              >
                Nouveau package
              </span>
            </span>
          }
        />
        <div className="px-4 sm:px-7 py-8 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-[22px] font-display text-aubergine mb-2">
              Créer un package
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
              onClick={() => setMode("configurator")}
            >
              <div className="text-3xl mb-3">✏️</div>
              <div className="text-[15px] font-medium text-aubergine mb-2">
                Créer depuis zéro
              </div>
              <div className="text-[12px] text-grey font-light leading-relaxed mb-4">
                Remplissez les étapes une par une. Paqli vous guide tout au
                long du configurateur.
              </div>
              <div className="text-[12px] text-aubergine font-medium">
                Commencer →
              </div>
            </Card>
          </div>
        </div>
        {showImport && (
          <ImportJobModal
            onImported={handleImported}
            onClose={() => setShowImport(false)}
          />
        )}
      </>
    );
  }

  return (
    <PackageConfigProvider initial={initial}>
      {importedFlag && (
        <div className="px-4 sm:px-7 pt-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F2FA] border border-[rgba(139,127,168,0.2)] rounded-lg text-[12px] text-aubergine-light">
            <span>✨</span>
            <span className="font-light">
              Pré-rempli depuis votre annonce — vérifiez et complétez chaque
              section
            </span>
          </div>
        </div>
      )}
      <Configurator />
    </PackageConfigProvider>
  );
}
