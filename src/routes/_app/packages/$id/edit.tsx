import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Configurator } from "@/components/paqli/configurator/Configurator";
import { PackageConfigProvider } from "@/contexts/PackageConfigContext";
import { loadPackage } from "@/lib/packageService";
import type { PackageConfig } from "@/lib/packageConfig";

export const Route = createFileRoute("/_app/packages/$id/edit")({
  component: EditPackage,
});

function EditPackage() {
  const { id } = Route.useParams();
  const [initial, setInitial] = useState<PackageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackage(id).then((cfg) => {
      setInitial(cfg);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="px-4 sm:px-7 py-4 sm:py-6 text-[13px] text-grey">Chargement…</div>
    );
  }

  if (!initial) {
    return (
      <div className="px-4 sm:px-7 py-4 sm:py-6 text-[13px] text-grey">
        Package introuvable.
      </div>
    );
  }

  return (
    <PackageConfigProvider initial={initial}>
      <Configurator />
    </PackageConfigProvider>
  );
}
