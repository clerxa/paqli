import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ArrowRight, BookOpen } from "lucide-react";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";

export const Route = createFileRoute("/_app/academy/")({
  component: AcademyIndex,
});

interface Module {
  to?: string;
  title: string;
  desc: string;
  badge?: string;
  available: boolean;
}

const modules: Module[] = [
  {
    to: "/academy/rsu",
    title: "RSU & AGA",
    desc: "Comprendre les Restricted Stock Units, les régimes français AGA, la fiscalité et le seuil 300 k€.",
    badge: "Nouveau",
    available: true,
  },
  { title: "BSPCE", desc: "Bons de souscription, strike, vesting, fiscalité.", available: false },
  { title: "Stock Options", desc: "Plans qualifiés vs non qualifiés.", available: false },
  { title: "PEE / PERCO", desc: "Épargne salariale, abondement, fiscalité de sortie.", available: false },
  { title: "Intéressement & Participation", desc: "Mécanismes, formule légale, placement.", available: false },
  { title: "Mutuelle & Prévoyance", desc: "Lire un tableau de garanties, expliquer la prise en charge.", available: false },
];

function AcademyIndex() {
  return (
    <>
      <Topbar title="Académie RH" />
      <div className="px-4 sm:px-7 py-6 max-w-[1100px]">
        <div className="mb-6 flex items-start gap-3">
          <div
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{ width: 40, height: 40, background: "rgba(45,38,64,0.06)" }}
          >
            <GraduationCap size={20} className="text-aubergine" />
          </div>
          <div>
            <h1 className="font-display text-aubergine text-[22px] leading-tight">
              Maîtrisez chaque brique du package
            </h1>
            <p className="text-[13px] text-aubergine/70 mt-1 max-w-[640px]">
              Des fiches pédagogiques pour répondre aux questions des candidats et salariés
              sans hésitation. Fiscalité, mécanismes, exemples chiffrés.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modules.map((m) => {
            const inner = (
              <Card className="h-full p-5 transition-all hover:shadow-md">
                <div className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center rounded-md shrink-0 mt-0.5"
                    style={{ width: 32, height: 32, background: "rgba(196,168,130,0.15)" }}
                  >
                    <BookOpen size={16} style={{ color: "#C4A882" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display text-aubergine text-[16px]">{m.title}</div>
                      {m.badge && (
                        <span
                          className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: "#C4A882", color: "#2D2640" }}
                        >
                          {m.badge}
                        </span>
                      )}
                      {!m.available && (
                        <span
                          className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(45,38,64,0.08)", color: "rgba(45,38,64,0.55)" }}
                        >
                          Bientôt
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-aubergine/70 mt-1">{m.desc}</p>
                  </div>
                  {m.available && (
                    <ArrowRight size={16} className="text-aubergine/40 mt-2 shrink-0" />
                  )}
                </div>
              </Card>
            );
            return m.available && m.to ? (
              <Link key={m.title} to={m.to} className="block">
                {inner}
              </Link>
            ) : (
              <div key={m.title} className="opacity-70 cursor-not-allowed">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
