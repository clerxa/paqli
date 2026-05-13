import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";
import { StatusPill } from "@/components/paqli/StatusPill";

export const Route = createFileRoute("/_app/packages/$id/")({
  component: PackageDetail,
});

function PackageDetail() {
  const { id } = Route.useParams();
  return (
    <>
      <Topbar
        title={
          <span className="text-[14px] text-grey font-sans">
            <Link to="/packages" className="hover:text-aubergine">Packages</Link>
            <span className="mx-2">/</span>
            <span className="text-aubergine font-display" style={{ fontSize: 22 }}>
              Lead Engineer · Série B
            </span>
          </span>
        }
        actions={
          <>
            <Link to="/packages/$id/edit" params={{ id }}>
              <Button variant="ghost">Modifier</Button>
            </Link>
            <Button>Envoyer un lien</Button>
          </>
        }
      />
      <div className="px-7 py-6 grid grid-cols-12 gap-5">
        <Card className="col-span-12 lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-aubergine" style={{ fontSize: 18 }}>
              Composition du package
            </h2>
            <StatusPill status="active" />
          </div>
          <div className="text-[13px] text-grey italic">
            Détail à venir — package id: {id}
          </div>
        </Card>
        <Card className="col-span-12 lg:col-span-4">
          <h2 className="font-display text-aubergine mb-3" style={{ fontSize: 18 }}>
            Liens
          </h2>
          <div className="text-[12px] text-grey">3 liens actifs</div>
        </Card>
      </div>
    </>
  );
}
