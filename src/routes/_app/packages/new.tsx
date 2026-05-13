import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { Button } from "@/components/paqli/Button";

export const Route = createFileRoute("/_app/packages/new")({
  component: NewPackagePage,
});

const steps = [
  { n: 1, label: "Informations" },
  { n: 2, label: "Salaire fixe" },
  { n: 3, label: "Equity" },
  { n: 4, label: "Épargne salariale" },
  { n: 5, label: "Aperçu & envoi" },
];

function NewPackagePage() {
  return (
    <>
      <Topbar
        title={
          <span className="text-[14px] text-grey font-sans">
            <Link to="/packages" className="hover:text-aubergine">Packages</Link>
            <span className="mx-2">/</span>
            <span className="text-aubergine font-display" style={{ fontSize: 22 }}>
              Nouveau package
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="ghost">Enregistrer brouillon</Button>
            <Button>Continuer</Button>
          </>
        }
      />
      <div className="px-7 py-6 grid grid-cols-12 gap-5">
        <aside className="col-span-12 md:col-span-3">
          <Card>
            <ol className="space-y-2">
              {steps.map((s) => (
                <li key={s.n} className="flex items-center gap-3 text-[13px]">
                  <span
                    className="flex items-center justify-center rounded-full text-[11px] font-medium"
                    style={{
                      width: 22,
                      height: 22,
                      background: s.n === 1 ? "#2D2640" : "#F0EBE8",
                      color: s.n === 1 ? "#FAF8F5" : "#9B97A0",
                    }}
                  >
                    {s.n}
                  </span>
                  <span style={{ color: s.n === 1 ? "#2D2640" : "#9B97A0" }}>
                    {s.label}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </aside>

        <section className="col-span-12 md:col-span-6">
          <Card className="min-h-[400px]">
            <h2 className="font-display text-aubergine mb-1" style={{ fontSize: 22 }}>
              Informations du package
            </h2>
            <p className="text-[12px] text-grey mb-6">
              Configurez la base du package que vous proposerez à vos candidats.
            </p>
            <div className="text-[13px] text-grey italic">
              Configurateur à venir.
            </div>
          </Card>
        </section>

        <aside className="col-span-12 md:col-span-3">
          <Card>
            <div className="text-[11px] text-grey uppercase tracking-wider mb-3">
              Aperçu candidat
            </div>
            <div
              className="rounded-lg flex items-center justify-center text-[12px] text-grey"
              style={{ background: "#FAF8F5", height: 220 }}
            >
              Aperçu en direct
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
