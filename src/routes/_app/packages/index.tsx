import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { StatusPill, type PillStatus } from "@/components/paqli/StatusPill";
import { Button } from "@/components/paqli/Button";

export const Route = createFileRoute("/_app/packages/")({
  component: PackagesPage,
});

const packages: { id: string; name: string; status: PillStatus; created: string; candidates: number }[] = [
  { id: "pkg-1", name: "Lead Engineer · Série B", status: "active", created: "il y a 2 jours", candidates: 3 },
  { id: "pkg-2", name: "Senior Designer", status: "active", created: "il y a 5 jours", candidates: 1 },
  { id: "pkg-3", name: "Head of Marketing", status: "draft", created: "il y a 1 semaine", candidates: 0 },
  { id: "pkg-4", name: "Sales Manager EMEA", status: "archived", created: "il y a 1 mois", candidates: 5 },
];

function PackagesPage() {
  return (
    <>
      <Topbar
        title="Packages"
        actions={
          <Link to="/packages/new">
            <Button>Nouveau package</Button>
          </Link>
        }
      />
      <div className="px-7 py-6">
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: "#FAF8F5", color: "#9B97A0" }} className="text-left text-[11px] uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium">Candidats</th>
                <th className="px-5 py-3 font-medium">Créé</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id} className="border-t border-[rgba(45,38,64,0.06)]">
                  <td className="px-5 py-4 text-aubergine font-medium">{p.name}</td>
                  <td className="px-5 py-4"><StatusPill status={p.status} /></td>
                  <td className="px-5 py-4 text-aubergine-light">{p.candidates}</td>
                  <td className="px-5 py-4 text-grey">{p.created}</td>
                  <td className="px-5 py-4 text-right">
                    <Link to="/packages/$id" params={{ id: p.id }} className="text-[12px] text-aubergine underline">
                      Détails
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
