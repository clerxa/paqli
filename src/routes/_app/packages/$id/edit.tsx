import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";

export const Route = createFileRoute("/_app/packages/$id/edit")({
  component: EditPackage,
});

function EditPackage() {
  const { id } = Route.useParams();
  return (
    <>
      <Topbar
        title={
          <span className="text-[14px] text-grey font-sans">
            <Link to="/packages" className="hover:text-aubergine">Packages</Link>
            <span className="mx-2">/</span>
            <Link to="/packages/$id" params={{ id }} className="hover:text-aubergine">
              Détail
            </Link>
            <span className="mx-2">/</span>
            <span className="text-aubergine font-display" style={{ fontSize: 22 }}>
              Modifier
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="ghost">Annuler</Button>
            <Button>Enregistrer</Button>
          </>
        }
      />
      <div className="px-7 py-6">
        <Card className="min-h-[400px]">
          <div className="text-[13px] text-grey italic">Formulaire d'édition à venir.</div>
        </Card>
      </div>
    </>
  );
}
