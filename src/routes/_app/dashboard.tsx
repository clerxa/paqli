import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/paqli/Topbar";
import { MetricCard } from "@/components/paqli/MetricCard";
import { Card } from "@/components/paqli/Card";
import { StatusPill } from "@/components/paqli/StatusPill";
import { Button } from "@/components/paqli/Button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const recentPackages = [
  { name: "Lead Engineer · Série B", status: "active" as const, candidates: 3 },
  { name: "Senior Designer", status: "active" as const, candidates: 1 },
  { name: "Head of Marketing", status: "draft" as const, candidates: 0 },
  { name: "Sales Manager EMEA", status: "archived" as const, candidates: 5 },
];

function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.email?.split("@")[0] ?? "Camille";

  return (
    <>
      <Topbar
        title={`Bonjour, ${firstName}`}
        actions={<Button>Nouveau package</Button>}
      />
      <div className="px-7 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Packages actifs" value="4" delta={{ value: "+1 ce mois", positive: true }} />
          <MetricCard label="Liens envoyés" value="27" delta={{ value: "+8 cette semaine", positive: true }} />
          <MetricCard label="Taux d'ouverture" value="68%" delta={{ value: "+12 pts" , positive: true }} />
          <MetricCard label="Candidats actifs" value="9" delta={{ value: "Stable" }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-aubergine" style={{ fontSize: 18 }}>
                Packages récents
              </h2>
              <Button variant="ghost">Tout voir</Button>
            </div>
            <ul className="divide-y divide-[rgba(45,38,64,0.06)]">
              {recentPackages.map((p) => (
                <li key={p.name} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-[13px] text-aubergine font-medium">{p.name}</div>
                    <div className="text-[11px] text-grey mt-0.5">
                      {p.candidates} candidat{p.candidates > 1 ? "s" : ""}
                    </div>
                  </div>
                  <StatusPill status={p.status} />
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="font-display text-aubergine mb-4" style={{ fontSize: 18 }}>
              Activité
            </h2>
            <ul className="space-y-3">
              {[
                "Léa M. a ouvert son lien",
                "Package « Senior Designer » créé",
                "Hugo D. a simulé son package",
                "Lien envoyé à camille@startup.fr",
              ].map((a, i) => (
                <li key={i} className="text-[12px] text-aubergine-light">
                  <span className="text-grey">il y a {i + 1}h · </span>
                  {a}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
