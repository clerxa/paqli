import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Info, Calendar, Sparkles, Send, Loader2 } from "lucide-react";
import { Logo } from "@/components/paqli/Logo";
import {
  useCandidateLink,
  type CandidateLinkData,
} from "@/hooks/useCandidateLink";
import {
  calcPackageEstimate,
  formatEur,
  formatRange,
  type CandidateParams,
  type PackageData,
  type TMI,
} from "@/lib/clientCalc";
import { askCandidateAssistant } from "@/lib/candidateAssistant.functions";
import { trackLink } from "@/lib/trackLink.functions";

export const Route = createFileRoute("/p/$token")({
  component: PublicPackagePage,
});

const TMI_OPTIONS: TMI[] = [0.11, 0.30, 0.41, 0.45];
const SENIORITY_OPTIONS: Array<1 | 2 | 3 | 5> = [1, 2, 3, 5];

function PublicPackagePage() {
  const { token } = Route.useParams();
  const { data, loading, error } = useCandidateLink(token);

  if (loading) return <LoadingState />;
  if (error === "expired") return <ErrorState kind="expired" />;
  if (error || !data) return <ErrorState kind="not_found" />;

  return <PackageView data={data} />;
}

/* -------------------- Shells -------------------- */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAF8F5" }}>
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "0.5px solid rgba(45,38,64,0.08)" }}
      >
        <Logo />
        <div className="flex items-center gap-2 text-[12px] text-aubergine-light">
          <Lock size={12} />
          Lien sécurisé · Données non partagées
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-[680px]">{children}</div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="animate-spin text-aubergine-light" size={28} />
        <p className="text-[13px] text-grey">Chargement de votre simulation…</p>
      </div>
    </PageShell>
  );
}

function ErrorState({ kind }: { kind: "not_found" | "expired" }) {
  const title = kind === "expired" ? "Ce lien a expiré" : "Ce lien n'existe pas";
  const desc =
    kind === "expired"
      ? "Ce lien de simulation n'est plus valide. Contactez l'entreprise pour obtenir un nouveau lien."
      : "Le lien que vous avez utilisé est invalide ou a été supprimé. Contactez l'entreprise pour obtenir un nouveau lien.";
  return (
    <PageShell>
      <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-8 text-center mt-12">
        <div className="font-display text-aubergine" style={{ fontSize: 24 }}>
          {title}
        </div>
        <p className="text-[13px] text-aubergine-light mt-3 leading-relaxed">
          {desc}
        </p>
      </div>
    </PageShell>
  );
}

/* -------------------- Main view -------------------- */

function PackageView({ data }: { data: CandidateLinkData }) {
  const pkg = data.packages;
  const org = pkg.organizations;

  const track = useServerFn(trackLink);
  const trackEvent = (
    eventType: "simulated" | "question" | "rdv_click",
    metadata?: Record<string, unknown>,
  ) => track({ data: { token: data.token, eventType, metadata } }).catch(() => {});

  const [params, setParams] = useState<CandidateParams>({
    tmi: 0.30,
    seniority: 3,
    peeContribution: 0,
  });

  // Debounced tracking
  const trackTimer = useRef<number | null>(null);
  function scheduleTrack(param: string, value: any) {
    if (trackTimer.current) window.clearTimeout(trackTimer.current);
    trackTimer.current = window.setTimeout(() => {
      void trackEvent("simulated", { param, value });
    }, 2000);
  }

  function update<K extends keyof CandidateParams>(key: K, value: CandidateParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
    scheduleTrack(key, value);
  }

  const estimate = useMemo(() => calcPackageEstimate(pkg, params), [pkg, params]);

  const hasEquity = pkg.equity_devices.length > 0;
  const hasSavings = pkg.savings_devices.length > 0;
  const peeDevice = pkg.savings_devices.find((d) => d.type === "pee");
  const interDevice = pkg.savings_devices.find((d) => d.type === "interessement");

  const scenariosToShow = estimate.equityByScenario.filter((s) => {
    if (pkg.scenario_display === "realistic_only") return s.label === "realiste";
    if (pkg.scenario_display === "realistic_optimistic")
      return s.label !== "pessimiste";
    return true;
  });

  return (
    <PageShell>
      {/* Hero */}
      <section
        className="rounded-2xl p-7 mb-6"
        style={{ background: "#2D2640" }}
      >
        <div className="flex items-center gap-3 mb-4">
          {org?.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.name}
              className="w-10 h-10 rounded-xl object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-display text-lg text-white">
              {org?.name?.[0] ?? "?"}
            </div>
          )}
          <div>
            <div className="font-display text-white" style={{ fontSize: 20 }}>
              {org?.name ?? "—"}
            </div>
            <div className="text-[13px]" style={{ color: "#B8AECF" }}>
              {pkg.title}
            </div>
          </div>
        </div>
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: "#B8AECF" }}
        >
          {org?.name} vous a envoyé cette simulation pour vous aider à
          comprendre{" "}
          <strong className="font-medium" style={{ color: "#C4A882" }}>
            la valeur estimée de votre package de rémunération
          </strong>{" "}
          — des ordres de grandeur basés sur les règles fiscales en vigueur,
          personnalisés selon votre situation.
        </p>
      </section>

      {/* Votre situation */}
      <SectionTitle>Votre situation</SectionTitle>
      <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 space-y-5">
        <Field
          label="Votre tranche marginale d'imposition"
          info="Votre TMI est le taux d'imposition qui s'applique à la dernière tranche de vos revenus. Pour un salaire de 50 000 € net, elle est généralement de 30 %."
        >
          <ChipRow>
            {TMI_OPTIONS.map((t) => (
              <Chip
                key={t}
                selected={params.tmi === t}
                onClick={() => update("tmi", t)}
              >
                {Math.round(t * 100)}%
              </Chip>
            ))}
          </ChipRow>
        </Field>

        <Field
          label="Ancienneté envisagée dans l'entreprise"
          info={
            hasEquity
              ? "L'ancienneté impacte la fiscalité de l'equity. Après 3 ans, le taux global passe de 47,2% à 31,4% (règles 2026)."
              : undefined
          }
        >
          <ChipRow>
            {SENIORITY_OPTIONS.map((y) => (
              <Chip
                key={y}
                selected={params.seniority === y}
                onClick={() => update("seniority", y)}
              >
                {y === 1 ? "1 an" : y >= 3 ? `${y} ans+` : `${y} ans`}
              </Chip>
            ))}
          </ChipRow>
        </Field>

        {peeDevice && (peeDevice.cap_amount ?? 0) > 0 && (
          <Field
            label="Votre mise PEE annuelle envisagée"
            info={`Plus vous versez, plus l'abondement de ${org?.name} est élevé. Les fonds sont bloqués 5 ans (sauf cas légaux de déblocage).`}
          >
            <input
              type="range"
              min={0}
              max={peeDevice.cap_amount ?? 0}
              step={100}
              value={params.peeContribution}
              onChange={(e) =>
                update("peeContribution", Number(e.target.value))
              }
              className="w-full accent-[#2D2640]"
            />
            <div className="text-[13px] text-aubergine mt-1">
              {formatEur(params.peeContribution)} / an
            </div>
          </Field>
        )}
      </div>

      {/* Total */}
      <SectionTitle>Estimation de votre package</SectionTitle>
      <div
        className="rounded-2xl p-7 mb-3"
        style={{ background: "#2D2640" }}
      >
        <div
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ color: "#B8AECF" }}
        >
          Estimation de votre package
        </div>
        <div
          className="font-display text-white mt-2"
          style={{ fontSize: 40, lineHeight: 1.05 }}
        >
          {formatRange(estimate.totalRange.low, estimate.totalRange.high)}
        </div>
        <div
          className="text-[12px] mt-3 leading-relaxed"
          style={{ color: "#8B7FA8" }}
        >
          Ordre de grandeur basé sur le scénario réaliste — règles fiscales
          2026 (taux en vigueur).
        </div>
      </div>

      {/* Lignes */}
      <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-4 space-y-3">
        <DetailLine
          label="Salaire fixe estimé"
          value={estimate.salaryEst}
          info={`Brut ${formatEur(pkg.gross_salary ?? 0)} · estimation après charges sociales et impôt (TMI ${Math.round(params.tmi * 100)}%).`}
        />
        {(pkg.variable_target ?? 0) > 0 && (
          <DetailLine
            label="Variable estimé"
            value={estimate.variableEst}
            info="Estimation appliquée à la cible variable au même niveau de fiscalité que le fixe."
          />
        )}
        {hasEquity && (
          <DetailLine
            label="Equity — scénario réaliste"
            value={
              estimate.equityByScenario.find((s) => s.label === "realiste")
                ?.estimate ?? 0
            }
            valueColor="#8B7FA8"
            info="Estimation après fiscalité — voir les scénarios détaillés ci-dessous."
          />
        )}
        {peeDevice && (
          <DetailLine
            label="Abondement PEE employeur"
            value={estimate.peeEst}
            valueColor="#C4A882"
            info={`Votre mise ${formatEur(params.peeContribution)} → ${org?.name} ajoute ${formatEur(estimate.peeEst)}.`}
          />
        )}
        {estimate.interEst > 0 && (
          <DetailLine
            label="Intéressement moyen"
            value={estimate.interEst}
            info="Moyenne historique sur les 3 dernières années — non garantie."
          />
        )}
        {estimate.participationEst > 0 && (
          <DetailLine
            label="Participation moyenne"
            value={estimate.participationEst}
            info="Moyenne historique sur les 3 dernières années — non garantie."
          />
        )}
        {estimate.benefitsEst > 0 && (
          <DetailLine
            label="Avantages valorisés"
            value={estimate.benefitsEst}
            info="Mutuelle, tickets restaurant, véhicule, formation — valeur annuelle estimée."
          />
        )}
      </div>

      <DisclaimerBlock>
        Ces montants sont des estimations indicatives arrondies, calculées sur
        la base des règles fiscales en vigueur à la date de cette simulation
        (version 2026). Ils ne constituent pas un résultat garanti, ni un
        conseil fiscal ou patrimonial. Consultez un professionnel pour une
        analyse personnalisée.
      </DisclaimerBlock>

      {/* Equity scenarios */}
      {hasEquity && scenariosToShow.length > 0 && (
        <>
          <SectionTitle className="mt-8">
            Equity — scénarios de valorisation
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {scenariosToShow.map((s) => (
              <ScenarioCard key={s.label} scenario={s} />
            ))}
          </div>
          {pkg.scenario_message && (
            <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-4 mb-4">
              <p className="text-[13px] text-aubergine-light leading-relaxed italic">
                « {pkg.scenario_message} »
              </p>
              <div className="text-[11px] text-grey mt-2 text-right">
                — {org?.name}
              </div>
            </div>
          )}
          <DisclaimerBlock>
            Les estimations equity reposent sur des hypothèses de valorisation
            future non garanties. La perte totale est possible. Les BSPCE ne
            sont réalisables que lors d'un événement de liquidité (acquisition,
            IPO, secondaire).
          </DisclaimerBlock>
        </>
      )}

      {/* Savings */}
      {hasSavings && (
        <>
          <SectionTitle className="mt-8">Épargne salariale</SectionTitle>
          <div className="space-y-3 mb-4">
            {peeDevice && (
              <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5">
                <div className="font-display text-aubergine" style={{ fontSize: 18 }}>
                  🏦 Plan d'Épargne Entreprise (PEE)
                </div>
                <div className="text-[13px] text-aubergine-light mt-2">
                  Abondement {org?.name} :{" "}
                  <strong>
                    {Math.round((peeDevice.matching_rate ?? 0) * 100)}%
                  </strong>
                </div>
                <div className="text-[13px] text-aubergine-light mt-1">
                  Si vous versez{" "}
                  <strong>{formatEur(params.peeContribution)}</strong> →{" "}
                  {org?.name} ajoute ~
                  <strong>{formatEur(estimate.peeEst)}</strong>.
                </div>
                <div
                  className="text-[11px] text-grey mt-3 leading-relaxed"
                  style={{ background: "#F0EBE8", padding: 10, borderRadius: 8 }}
                >
                  ℹ️ Les fonds sont bloqués 5 ans minimum. Cas de déblocage
                  anticipé : achat de la résidence principale, mariage,
                  naissance, invalidité, rupture de contrat.
                </div>
              </div>
            )}
            {interDevice && (
              <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5">
                <div className="font-display text-aubergine" style={{ fontSize: 18 }}>
                  📈 Intéressement
                </div>
                <div className="text-[13px] text-aubergine-light mt-2">
                  Montant moyen (3 dernières années) : ~
                  <strong>{formatEur(interDevice.avg_3y ?? 0)}</strong>
                </div>
                <div
                  className="text-[11px] mt-3 leading-relaxed"
                  style={{ background: "#FCEEE6", color: "#7A3F0E", padding: 10, borderRadius: 8 }}
                >
                  ⚠️ Moyenne historique. L'intéressement dépend des résultats
                  de l'entreprise — il peut être nul certaines années.
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* FAQ */}
      <SectionTitle className="mt-8">Questions fréquentes</SectionTitle>
      <FAQ hasEquity={hasEquity} hasPee={!!peeDevice} />

      {/* Assistant */}
      <SectionTitle className="mt-8">
        <Sparkles size={14} className="inline mr-1" /> Une question sur ce package ?
      </SectionTitle>
      <Assistant linkId={data.id} pkg={pkg} params={params} />

      {/* CTA */}
      <div
        className="rounded-2xl p-6 mt-8 mb-6 text-center"
        style={{ background: "#FAEEDA" }}
      >
        <div className="font-display text-aubergine" style={{ fontSize: 20 }}>
          Des questions sur ce package ?
        </div>
        <p className="text-[13px] text-aubergine-light mt-2 leading-relaxed">
          L'équipe de {org?.name} peut répondre à toutes vos questions lors d'un
          échange de 20 minutes.
        </p>
        <button
          onClick={async () => {
            await trackEvent(data.id, "rdv_click");
            window.location.href = `mailto:?subject=${encodeURIComponent(
              `Question sur mon package ${pkg.title}`,
            )}`;
          }}
          className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-medium text-lin"
          style={{ background: "#2D2640" }}
        >
          <Calendar size={14} />
          Prendre rendez-vous
        </button>
      </div>

      {/* Footer */}
      <FooterDisclaimer />
    </PageShell>
  );
}

/* -------------------- Helpers -------------------- */

function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] uppercase tracking-[0.15em] text-aubergine-light font-medium mb-3 ${className}`}
    >
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] px-3 py-1.5 rounded-full border transition-colors"
      style={{
        background: selected ? "#2D2640" : "#FFFFFF",
        color: selected ? "#FAF8F5" : "#524970",
        borderColor: selected ? "#2D2640" : "rgba(45,38,64,0.15)",
      }}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  info,
  children,
}: {
  label: string;
  info?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[12px] text-aubergine-light font-medium">
          {label}
        </span>
        {info && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-grey hover:text-aubergine"
            aria-label="Plus d'infos"
          >
            <Info size={12} />
          </button>
        )}
      </div>
      {children}
      {info && open && (
        <div
          className="text-[11px] mt-2 leading-relaxed rounded-md p-2"
          style={{ background: "#F0EBE8", color: "#3D3554" }}
        >
          {info}
        </div>
      )}
    </div>
  );
}

function DetailLine({
  label,
  value,
  info,
  valueColor,
}: {
  label: string;
  value: number;
  info?: string;
  valueColor?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[13px] text-aubergine">
          <span style={{ color: "#8B7FA8" }}>●</span>
          {label}
          {info && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-grey hover:text-aubergine"
            >
              <Info size={11} />
            </button>
          )}
        </div>
        <div
          className="text-[14px] font-medium tabular-nums"
          style={{ color: valueColor ?? "#2D2640" }}
        >
          ~{formatEur(value)}
        </div>
      </div>
      {info && open && (
        <div
          className="text-[11px] mt-1.5 ml-4 leading-relaxed rounded-md p-2"
          style={{ background: "#F0EBE8", color: "#3D3554" }}
        >
          {info}
        </div>
      )}
    </div>
  );
}

function ScenarioCard({
  scenario,
}: {
  scenario: {
    label: string;
    estimate: number;
    targetValuationM: number;
    horizonYears: number;
    taxRate: number;
  };
}) {
  const palette: Record<string, { bg: string; fg: string }> = {
    pessimiste: { bg: "#FAEEDA", fg: "#7A3F0E" },
    realiste: { bg: "#E8E0F0", fg: "#3D3554" },
    optimiste: { bg: "#DBEDD2", fg: "#3B6D11" },
  };
  const p = palette[scenario.label] ?? palette.realiste;
  const labelMap: Record<string, string> = {
    pessimiste: "Pessimiste",
    realiste: "Réaliste",
    optimiste: "Optimiste",
  };
  return (
    <div className="rounded-[12px] p-4" style={{ background: p.bg }}>
      <div
        className="text-[10px] uppercase tracking-[0.15em] font-medium"
        style={{ color: p.fg }}
      >
        {labelMap[scenario.label] ?? scenario.label}
      </div>
      <div
        className="font-display mt-2"
        style={{ fontSize: 26, color: "#2D2640", lineHeight: 1.1 }}
      >
        ~{formatEur(scenario.estimate)}
      </div>
      <div className="text-[11px] mt-1" style={{ color: p.fg }}>
        (estimation)
      </div>
      <div className="mt-3 text-[11px] text-aubergine-light leading-relaxed">
        Valor. {scenario.targetValuationM} M€<br />
        Horizon {scenario.horizonYears} ans
      </div>
      <div className="text-[10px] mt-2 text-grey">
        Taux fiscal appliqué :{" "}
        <strong>{(scenario.taxRate * 100).toFixed(1).replace(".", ",")}%</strong>
      </div>
    </div>
  );
}

function DisclaimerBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] leading-relaxed rounded-md p-3 mb-4"
      style={{ background: "#FAEEDA", color: "#633806" }}
    >
      ⚠️ {children}
    </div>
  );
}

function FAQ({ hasEquity, hasPee }: { hasEquity: boolean; hasPee: boolean }) {
  const items: Array<{ q: string; a: string }> = [];
  if (hasEquity) {
    items.push(
      {
        q: "C'est quoi le « vesting » ?",
        a: "Le vesting est la période pendant laquelle vous acquérez progressivement vos BSPCE. Sur 4 ans, vous déverrouillez 25 % par an. Avant le « cliff » de 6 mois, aucun bon n'est encore disponible.",
      },
      {
        q: "Quand puis-je exercer mes BSPCE ?",
        a: "Uniquement lors d'un événement de liquidité : acquisition de l'entreprise, introduction en bourse (IPO), ou opération secondaire. En dehors de ces cas, vos bons ont une valeur théorique non immédiatement réalisable.",
      },
      {
        q: "Que se passe-t-il si je pars avant la fin du vesting ?",
        a: "Vous conservez les bons déjà acquis (vestés). Les bons non vestés sont perdus. Les conditions exactes dépendent du règlement du plan — vérifiez la clause good/bad leaver.",
      },
    );
  }
  if (hasPee) {
    items.push(
      {
        q: "Le PEE est-il obligatoire ?",
        a: "Non, c'est un choix. Mais avec un abondement employeur, ne pas y participer revient à refuser une prime garantie par l'entreprise.",
      },
      {
        q: "Comment débloquer mon PEE avant 5 ans ?",
        a: "Cas légaux : mariage ou PACS, naissance ou adoption d'un 3e enfant, divorce, invalidité, décès du conjoint, rupture du contrat de travail, acquisition de la résidence principale, surendettement.",
      },
    );
  }
  if (!items.length) return null;
  return (
    <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-2 mb-6">
      {items.map((it, i) => (
        <FAQItem key={i} q={it.q} a={it.a} />
      ))}
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[rgba(45,38,64,0.06)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left py-3 px-3 flex justify-between items-center text-[13px] text-aubergine"
      >
        <span>{q}</span>
        <span className="text-grey text-[12px]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-[12px] text-aubergine-light leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

function Assistant({
  linkId,
  pkg,
  params,
}: {
  linkId: string;
  pkg: PackageData;
  params: CandidateParams;
}) {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ask = useServerFn(askCandidateAssistant);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setLoading(true);
    void trackEvent(linkId, "question", { question: q.slice(0, 100) });

    try {
      const packageContext = JSON.stringify(
        {
          gross_salary: pkg.gross_salary,
          variable_target: pkg.variable_target,
          equity_devices: pkg.equity_devices,
          savings_devices: pkg.savings_devices,
          scenarios: pkg.scenarios,
        },
        null,
        2,
      );
      const candidateContext = `TMI : ${Math.round(params.tmi * 100)}% · Ancienneté envisagée : ${params.seniority} an(s) · Mise PEE envisagée : ${params.peeContribution} €`;
      const res = await ask({
        data: {
          packageContext,
          candidateContext,
          orgName: pkg.organizations?.name ?? "l'entreprise",
          jobTitle: pkg.title,
          messages: next,
        },
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.answer },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            e?.message ?? "Désolé, une erreur est survenue. Réessayez plus tard.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-4 mb-6">
      <div className="space-y-2 max-h-[320px] overflow-y-auto mb-3">
        {messages.length === 0 && (
          <div className="text-[12px] text-grey py-4 text-center">
            Posez votre question — l'assistant vous explique le fonctionnement
            des dispositifs.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] text-[13px] leading-relaxed rounded-2xl px-3 py-2 whitespace-pre-wrap"
              style={
                m.role === "user"
                  ? { background: "#2D2640", color: "#FAF8F5" }
                  : {
                      background: "#F0EBE8",
                      color: "#2D2640",
                      border: "1px solid rgba(139,127,168,0.2)",
                    }
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="text-[13px] rounded-2xl px-3 py-2"
              style={{ background: "#F0EBE8", color: "#8B7FA8" }}
            >
              <span className="inline-flex gap-1">
                <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ex : Que se passe-t-il avec mes BSPCE si l'entreprise est rachetée ?"
          rows={2}
          className="flex-1 text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white resize-none"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-md text-lin disabled:opacity-50"
          style={{ background: "#2D2640" }}
          aria-label="Envoyer"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{
        background: "#8B7FA8",
        animation: `paqli-bounce 1s ${delay}s infinite ease-in-out`,
      }}
    />
  );
}

function FooterDisclaimer() {
  return (
    <footer
      className="rounded-[12px] mt-6 text-[11px] leading-relaxed"
      style={{ background: "#F0EBE8", color: "#9B97A0", padding: 20 }}
    >
      <p>
        Les estimations présentées sur cette page sont indicatives et arrondies.
        Elles sont calculées sur la base des règles fiscales françaises en
        vigueur (version 2026) et d'hypothèses de valorisation future non
        garanties.
      </p>
      <p className="mt-2">
        Ces informations ne constituent pas un conseil en investissement, un
        conseil fiscal ou une recommandation personnalisée. Elles ont pour seul
        objectif de vous aider à comprendre les mécanismes des dispositifs de
        rémunération proposés.
      </p>
      <p className="mt-2">
        Pour toute question relative à votre situation personnelle, nous vous
        recommandons de consulter un conseiller en gestion de patrimoine ou un
        expert-comptable.
      </p>
      <p className="mt-3 text-aubergine-light">
        Simulation générée par Paqli · paqli.fr
      </p>
    </footer>
  );
}
