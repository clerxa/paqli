import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { StatusPill, type PillStatus } from "@/components/paqli/StatusPill";
import { Button } from "@/components/paqli/Button";

export const Route = createFileRoute("/_app/candidates")({
  component: CandidatesPage,
});

const links: { email: string; pkg: string; status: PillStatus; sent: string }[] = [
  { email: "lea.martin@gmail.com", pkg: "Lead Engineer · Série B", status: "opened", sent: "il y a 2h" },
  { email: "hugo.dupont@gmail.com", pkg: "Senior Designer", status: "opened", sent: "hier" },
  { email: "marie.l@outlook.fr", pkg: "Lead Engineer · Série B", status: "active", sent: "il y a 3j" },
  { email: "noah@protonmail.com", pkg: "Sales Manager EMEA", status: "archived", sent: "il y a 1m" },
];

function CandidatesPage() {
  return (
    <>
      <Topbar title="Liens envoyés" actions={<Button>Envoyer un lien</Button>} />
      <div className="px-7 py-6">
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: "#FAF8F5", color: "#9B97A0" }} className="text-left text-[11px] uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium">Envoyé</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.email} className="border-t border-[rgba(45,38,64,0.06)]">
                  <td className="px-5 py-4 text-aubergine font-medium">{l.email}</td>
                  <td className="px-5 py-4 text-aubergine-light">{l.pkg}</td>
                  <td className="px-5 py-4"><StatusPill status={l.status} /></td>
                  <td className="px-5 py-4 text-grey">{l.sent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
