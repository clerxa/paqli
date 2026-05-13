import { createFileRoute } from "@tanstack/react-router";
import { Configurator } from "@/components/paqli/configurator/Configurator";
import { PackageConfigProvider } from "@/contexts/PackageConfigContext";

export const Route = createFileRoute("/_app/packages/new")({
  component: NewPackagePage,
});

function NewPackagePage() {
  return (
    <PackageConfigProvider>
      <Configurator />
    </PackageConfigProvider>
  );
}
