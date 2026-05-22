import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Info, Calculator, AlertTriangle, BookOpen, HelpCircle } from "lucide-react";
import { Topbar } from "@/components/paqli/Topbar";
import { Card } from "@/components/paqli/Card";
import { REGIME_KNOWLEDGE, FAQ, GLOSSARY } from "@/lib/vega/knowledge";

export const Route = createFileRoute("/_app/academy/rsu")({
  head: () => ({
    meta: [
      { title: "RSU & AGA — Académie RH Paqli" },
      {
        name: "description",
        content:
          "Comprendre les RSU, les régimes AGA français, la fiscalité du gain d'acquisition et de la plus-value de cession, le seuil 300 k€.",
      },
    ],
  }),
  component: RSUAcademyPage,
});

const REGIMES_ORDER: (keyof typeof REGIME_KNOWLEDGE)[] = [
  "AGA_POST2018",
  "AGA_2017",
  "AGA_2015_2016",
  "AGA_2012_2015",
  "AGA_PRE2012",
  "NON_QUALIFIE",
];

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} className="text-aubergine" />
      <h2 className="font-display text-aubergine text-[18px]">{children}</h2>
    </div>
  );
}

function RSUAcademyPage() {
  return (
    <>
      <Topbar
        title={
          <span className="flex items-center gap-2">
            <Link to="/academy" className="text-aubergine/50 hover:text-aubergine flex items-center gap-1 text-[14px]">
              <ChevronLeft size={16} /> Académie
            </Link>
            <span className="text-aubergine/30">/</span>
            <span>RSU & AGA</span>
          </span>
        }
      />
      <div className="px-4 sm:px-7 py-6 max-w-[900px] space-y-8">
        {/* Intro */}
        <section>
          <div
            className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-2"
            style={{ color: "#C4A882" }}
          >
            Module equity · 15 min de lecture
          </div>
          <h1 className="font-display text-aubergine text-[28px] leading-tight mb-3">
            RSU & AGA : tout comprendre pour répondre aux candidats
          </h1>
          <p className="text-[14px] text-aubergine/75 leading-relaxed">
            Les RSU (Restricted Stock Units) et les AGA (Attributions Gratuites d'Actions) sont
            les dispositifs d'equity les plus courants. Cette fiche couvre les mécanismes,
            les six régimes fiscaux français et les questions que vous posent vos candidats.
          </p>
        </section>

        {/* Concepts clés */}
        <section>
          <SectionTitle icon={Info}>Les 3 concepts à maîtriser</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                t: "Vesting",
                d: "Acquisition progressive : le salarié devient propriétaire des actions sur 4 ans (cliff 1 an + 25 % / an typiquement).",
              },
              {
                t: "Gain d'acquisition",
                d: "Valeur des actions le jour où elles sont effectivement reçues. C'est la base de l'imposition du régime AGA.",
              },
              {
                t: "Plus-value de cession",
                d: "Différence entre prix de vente et valeur d'acquisition. Imposée au PFU 30 % systématique.",
              },
            ].map((c) => (
              <Card key={c.t} className="p-4">
                <div className="font-display text-aubergine text-[15px] mb-1">{c.t}</div>
                <p className="text-[12.5px] text-aubergine/70 leading-relaxed">{c.d}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Le seuil 300k */}
        <section>
          <SectionTitle icon={AlertTriangle}>Le seuil de 300 000 € (consolidé)</SectionTitle>
          <Card className="p-5" style={{ background: "rgba(196,168,130,0.08)", borderColor: "rgba(196,168,130,0.25)" }}>
            <p className="text-[13.5px] text-aubergine/85 leading-relaxed">
              Depuis 2017, le gain d'acquisition AGA est <strong>plafonné fiscalement à 300 000 € par an</strong>.
              Sous ce seuil, le salarié bénéficie d'un abattement (50 % depuis 2018). Au-dessus,
              le surplus est imposé au barème plein, sans abattement.
            </p>
            <p className="text-[13px] text-aubergine/70 mt-3">
              <strong>Consolidation</strong> : si le salarié a plusieurs plans AGA acquis la même année
              (par exemple AGA_2017 + AGA_POST2018), on additionne tous les gains pour vérifier le
              dépassement. Le surplus est ensuite réparti au prorata entre les plans.
            </p>
          </Card>
        </section>

        {/* Régimes */}
        <section>
          <SectionTitle icon={BookOpen}>Les 6 régimes fiscaux</SectionTitle>
          <div className="space-y-3">
            {REGIMES_ORDER.map((key) => {
              const r = REGIME_KNOWLEDGE[key];
              return (
                <Card key={key} className="p-5">
                  <div className="font-display text-aubergine text-[16px] mb-2">{r.titre}</div>
                  <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-x-4 gap-y-2 text-[13px]">
                    <div className="text-aubergine/55 font-semibold text-[11px] uppercase tracking-wider">Concerne</div>
                    <div className="text-aubergine/80">{r.qui}</div>
                    <div className="text-aubergine/55 font-semibold text-[11px] uppercase tracking-wider">Fiscalité</div>
                    <div className="text-aubergine/80">{r.fiscalite}</div>
                    <div className="text-aubergine/55 font-semibold text-[11px] uppercase tracking-wider">Exemple</div>
                    <div
                      className="text-aubergine/80 italic px-3 py-2 rounded"
                      style={{ background: "rgba(45,38,64,0.04)" }}
                    >
                      {r.exemple}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Méthode de calcul */}
        <section>
          <SectionTitle icon={Calculator}>La méthode de calcul (régime POST2018)</SectionTitle>
          <Card className="p-5">
            <ol className="space-y-3 text-[13px] text-aubergine/80">
              {[
                "Calculer le gain d'acquisition = nb d'actions × valeur jour d'acquisition.",
                "Consolider tous les gains AGA de l'année pour le seuil 300 k€.",
                "Appliquer l'abattement 50 % sous le seuil → IR au TMI sur la base abattue.",
                "Au-dessus du seuil : IR au barème plein, pas d'abattement.",
                "PS 17,2 % sur le gain total (pas d'abattement social).",
                "Pour la cession : PFU 30 % sur la plus-value (prix vente − valeur d'acquisition).",
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="shrink-0 flex items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{ width: 22, height: 22, background: "#2D2640", color: "#FAF8F5" }}
                  >
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        </section>

        {/* FAQ */}
        <section>
          <SectionTitle icon={HelpCircle}>FAQ candidats — les questions fréquentes</SectionTitle>
          <div className="space-y-2">
            {FAQ.map((f) => (
              <details
                key={f.question}
                className="group p-4 rounded-lg cursor-pointer"
                style={{ background: "rgba(45,38,64,0.04)" }}
              >
                <summary className="font-display text-aubergine text-[14px] list-none flex items-center justify-between">
                  {f.question}
                  <span className="text-aubergine/40 group-open:rotate-45 transition-transform text-[18px] leading-none">+</span>
                </summary>
                <p className="text-[13px] text-aubergine/75 mt-2 leading-relaxed">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Glossaire */}
        <section>
          <SectionTitle icon={BookOpen}>Glossaire</SectionTitle>
          <Card className="p-5">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {GLOSSARY.map((g) => (
                <div key={g.term}>
                  <dt className="font-display text-aubergine text-[13px]">{g.term}</dt>
                  <dd className="text-[12.5px] text-aubergine/70 mt-0.5">{g.definition}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>

        {/* Disclaimer */}
        <section>
          <div
            className="p-4 rounded-lg text-[12px] text-aubergine/65 leading-relaxed"
            style={{ background: "rgba(45,38,64,0.04)", borderLeft: "3px solid #C4A882" }}
          >
            <strong className="text-aubergine">Disclaimer</strong> — Les règles présentées
            correspondent à la fiscalité 2026 en vigueur en France. Elles sont indicatives
            et ne remplacent pas un conseil personnalisé. Toute simulation dépend de la
            situation fiscale individuelle du salarié.
          </div>
        </section>
      </div>
    </>
  );
}
