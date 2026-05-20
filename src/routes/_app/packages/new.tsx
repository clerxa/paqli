import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Configurator } from "@/components/paqli/configurator/Configurator";
import { QuickCreatePackage } from "@/components/paqli/packages/QuickCreatePackage";
import { PackageConfigProvider } from "@/contexts/PackageConfigContext";
import { applyJobToConfig, getJob } from "@/lib/jobsService";
import { emptyConfig, type PackageConfig } from "@/lib/packageConfig";

interface NewSearch {
  jobId?: string;
  expert?: string;
}

export const Route = createFileRoute("/_app/packages/new")({
  validateSearch: (search): NewSearch => ({
    jobId: typeof search.jobId === "string" ? search.jobId : undefined,
    expert: typeof search.expert === "string" ? search.expert : undefined,
  }),
  component: NewPackagePage,
});

function NewPackagePage() {
  const { jobId, expert } = Route.useSearch();
  const [initial, setInitial] = useState<PackageConfig | null>(null);
  const [ready, setReady] = useState(!jobId);

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

  // Quick Create par défaut. Mode expert ou jobId pré-rempli → configurator direct.
  if (!jobId && !expert) {
    return <QuickCreatePackage />;
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[13px] text-grey">
        Chargement de l'offre…
      </div>
    );
  }

  return (
    <PackageConfigProvider initial={initial}>
      <Configurator />
    </PackageConfigProvider>
  );
}
