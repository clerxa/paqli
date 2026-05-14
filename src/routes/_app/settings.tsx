import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-grey font-medium">
        {label}
      </label>
      <input
        defaultValue={value}
        className="mt-1 w-full bg-white border-[0.5px] border-[rgba(45,38,64,0.12)] rounded-lg px-3 py-2 text-[13px] text-aubergine focus:outline-none focus:border-lavande"
      />
    </div>
  );
}

function SettingsPage() {
  return (
    <>
      <Topbar title="Paramètres" actions={<Button>Enregistrer</Button>} />
      <div className="px-4 sm:px-7 py-4 sm:py-6 max-w-3xl">
        <Card>
          <h2 className="font-display text-aubergine mb-1" style={{ fontSize: 20 }}>
            Informations entreprise
          </h2>
          <p className="text-[12px] text-grey mb-6">
            Ces informations apparaissent sur les liens envoyés à vos candidats.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nom" value="Acme Tech" />
            <Field label="SIREN" value="812 345 678" />
            <Field label="Taille" value="11–50" />
            <Field label="Secteur" value="SaaS B2B" />
          </div>
        </Card>
      </div>
    </>
  );
}
