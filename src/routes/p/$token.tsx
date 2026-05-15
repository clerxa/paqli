import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Info, Calendar, Sparkles, Send, Loader2, MapPin, Users, TrendingUp, ListChecks, ExternalLink, Clock } from "lucide-react";
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
import { useBehaviorTracker } from "@/hooks/useBehaviorTracker";
import {
  DecisionBlock,
  CandidateMessagingBlock,
} from "@/components/paqli/candidate/DecisionBlocks";
import { SalaryBreakdown } from "@/components/paqli/candidate/SalaryBreakdown";

export const Route = createFileRoute("/p/$token")({
  component: PublicPackagePage,
});

const TMI_OPTIONS: TMI[] = [0.11, 0.30, 0.41, 0.45];
const SENIORITY_OPTIONS: Array<1 | 2 | 3 | 5> = [1, 2, 3, 5];

function PublicPackagePage() {
  const { token } = Route.useParams();
  const { data, loading, error, setData } = useCandidateLink(token);

  if (loading) return <LoadingState />;
  if (error === "expired") return <ErrorState kind="expired" />;
  if (error || !data) return <ErrorState kind="not_found" />;

  return <PackageView data={data} setData={setData} />;
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

type TabKey =
  | "offre"
  | "entreprise"
  | "flex"
  | "team"
  | "package"
  | "questions"
  | "next";

const TABS: { key: TabKey; label: string; highlight?: boolean }[] = [
  { key: "offre", label: "Offre" },
  { key: "entreprise", label: "Entreprise" },
  { key: "flex", label: "Flexibilité" },
  { key: "team", label: "Équipe & culture" },
  { key: "package", label: "Package", highlight: true },
  { key: "questions", label: "Questions" },
  { key: "next", label: "Next steps" },
];

function PackageView({
  data,
  setData,
}: {
  data: CandidateLinkData;
  setData: React.Dispatch<React.SetStateAction<CandidateLinkData | null>>;
}) {
  const pkg = data.packages;
  const org = pkg.organizations;

  const track = useServerFn(trackLink);
  const behavior = useBehaviorTracker(data.token);
  const trackEvent = (
    eventType: "simulated" | "question" | "rdv_click",
    metadata?: Record<string, unknown>,
  ) => track({ data: { token: data.token, eventType, metadata } }).catch(() => {});

  // Read deep-link from URL
  const initialTab = (() => {
    if (typeof window === "undefined") return "package" as TabKey;
    const t = new URLSearchParams(window.location.search).get("tab") as TabKey | null;
    return TABS.some((x) => x.key === t) ? (t as TabKey) : "package";
  })();
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }, [tab]);

  const [params, setParams] = useState<CandidateParams>({
    tmi: 0.30,
    seniority: 3,
    peeContribution: 0,
  });
  const [pasRate, setPasRate] = useState<number>(0.30);
  const pasTouched = useRef(false);
  useEffect(() => {
    if (!pasTouched.current) setPasRate(params.tmi);
  }, [params.tmi]);
  const [achievementPct, setAchievementPct] = useState(1);

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
    behavior.trackSimulationChange(key, value as string | number | boolean);
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
      {data.counterOffer && <CounterOfferBanner info={data.counterOffer} />}

      {/* Hero */}
      <section
        data-section="hero"
        className="rounded-2xl p-7 mb-5"
        style={{ background: "#2D2640" }}
      >
        <div className="flex items-center gap-3 mb-3">
          {org?.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-cover" />
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
      </section>

      {/* Tabs */}
      <TabBar tab={tab} onChange={setTab} />

      {tab === "offre" && (
        <OfferTab pkg={pkg} />
      )}

      {tab === "entreprise" && (
        <CompanyTab org={org} />
      )}

      {tab === "flex" && (
        <FlexibilityTab pkg={pkg} />
      )}

      {tab === "team" && (
        <TeamCultureTab pkg={pkg} onExternalLink={behavior.trackExternalLink} />
      )}

      {tab === "package" && (
        <>
          {/* Votre situation */}
          <SectionTitle>Votre situation</SectionTitle>
          <div data-section="simulation" className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 space-y-5">
            <Field
              label="Votre tranche marginale d'imposition"
              info="Votre TMI est le taux d'imposition qui s'applique à la dernière tranche de vos revenus. Pour un salaire de 50 000 € net, elle est généralement de 30 %."
            >
              <ChipRow>
                {TMI_OPTIONS.map((t) => (
                  <Chip key={t} selected={params.tmi === t} onClick={() => update("tmi", t)}>
                    {Math.round(t * 100)}%
                  </Chip>
                ))}
              </ChipRow>
            </Field>

            <Field
              label="Ancienneté envisagée dans l'entreprise"
              info={hasEquity ? "L'ancienneté impacte la fiscalité de l'equity. Après 3 ans, le taux global passe de 47,2% à 31,4% (règles 2026)." : undefined}
            >
              <ChipRow>
                {SENIORITY_OPTIONS.map((y) => (
                  <Chip key={y} selected={params.seniority === y} onClick={() => update("seniority", y)}>
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
                  onChange={(e) => update("peeContribution", Number(e.target.value))}
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
          <div className="rounded-2xl p-7 mb-3" style={{ background: "#2D2640" }}>
            <div className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "#B8AECF" }}>
              Estimation de votre package
            </div>
            <div className="font-display text-white mt-2" style={{ fontSize: 40, lineHeight: 1.05 }}>
              {formatRange(estimate.totalRange.low, estimate.totalRange.high)}
            </div>
            <div className="text-[12px] mt-3 leading-relaxed" style={{ color: "#8B7FA8" }}>
              Ordre de grandeur basé sur le scénario réaliste — règles fiscales 2026 (taux en vigueur).
            </div>
          </div>

          <div className="mb-4">
            <SalaryBreakdown
              grossAnnual={pkg.gross_salary ?? 0}
              pasRate={pasRate}
              onPasRateChange={(v) => {
                pasTouched.current = true;
                setPasRate(v);
              }}
              variableTarget={pkg.variable_target ?? 0}
              achievementPct={achievementPct}
              onAchievementPctChange={setAchievementPct}
              variableConfig={pkg.variable_config ?? null}
            />
          </div>

          <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-4 space-y-3">
            {hasEquity && (
              <DetailLine
                label="Equity — scénario réaliste"
                value={estimate.equityByScenario.find((s) => s.label === "realiste")?.estimate ?? 0}
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
              <DetailLine label="Intéressement moyen" value={estimate.interEst} info="Moyenne historique sur les 3 dernières années — non garantie." />
            )}
            {estimate.participationEst > 0 && (
              <DetailLine label="Participation moyenne" value={estimate.participationEst} info="Moyenne historique sur les 3 dernières années — non garantie." />
            )}
            {estimate.benefitsEst > 0 && (
              <DetailLine label="Avantages valorisés" value={estimate.benefitsEst} info="Mutuelle, tickets restaurant, véhicule, formation — valeur annuelle estimée." />
            )}
          </div>

          <DisclaimerBlock>
            Ces montants sont des estimations indicatives arrondies, calculées sur
            la base des règles fiscales en vigueur à la date de cette simulation
            (version 2026). Ils ne constituent pas un résultat garanti, ni un
            conseil fiscal ou patrimonial. Consultez un professionnel pour une
            analyse personnalisée.
          </DisclaimerBlock>

          {pkg.benchmark && (pkg.gross_salary ?? 0) > 0 && (
            <BenchmarkBar benchmark={pkg.benchmark} gross={pkg.gross_salary ?? 0} />
          )}

          {hasEquity && scenariosToShow.length > 0 && (
            <>
              <SectionTitle className="mt-8">Equity — scénarios de valorisation</SectionTitle>
              <div data-section="equity_scenarios" className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {scenariosToShow.map((s) => (
                  <ScenarioCard key={s.label} scenario={s} onView={() => behavior.trackScenarioView(s.label)} />
                ))}
              </div>
              {pkg.scenario_message && (
                <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-4 mb-4">
                  <p className="text-[13px] text-aubergine-light leading-relaxed italic">« {pkg.scenario_message} »</p>
                  <div className="text-[11px] text-grey mt-2 text-right">— {org?.name}</div>
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

          {hasSavings && (
            <>
              <SectionTitle className="mt-8">Épargne salariale</SectionTitle>
              <div data-section="epargne" className="space-y-3 mb-4">
                {peeDevice && (
                  <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5">
                    <div className="font-display text-aubergine" style={{ fontSize: 18 }}>🏦 Plan d'Épargne Entreprise (PEE)</div>
                    <div className="text-[13px] text-aubergine-light mt-2">
                      Abondement {org?.name} : <strong>{Math.round((peeDevice.matching_rate ?? 0) * 100)}%</strong>
                    </div>
                    <div className="text-[13px] text-aubergine-light mt-1">
                      Si vous versez <strong>{formatEur(params.peeContribution)}</strong> → {org?.name} ajoute ~<strong>{formatEur(estimate.peeEst)}</strong>.
                    </div>
                    <div className="text-[11px] text-grey mt-3 leading-relaxed" style={{ background: "#F0EBE8", padding: 10, borderRadius: 8 }}>
                      ℹ️ Les fonds sont bloqués 5 ans minimum. Cas de déblocage anticipé : achat de la résidence principale, mariage, naissance, invalidité, rupture de contrat.
                    </div>
                  </div>
                )}
                {interDevice && (
                  <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5">
                    <div className="font-display text-aubergine" style={{ fontSize: 18 }}>📈 Intéressement</div>
                    <div className="text-[13px] text-aubergine-light mt-2">
                      Montant moyen (3 dernières années) : ~<strong>{formatEur(interDevice.avg_3y ?? 0)}</strong>
                    </div>
                    <div className="text-[11px] mt-3 leading-relaxed" style={{ background: "#FCEEE6", color: "#7A3F0E", padding: 10, borderRadius: 8 }}>
                      ⚠️ Moyenne historique. L'intéressement dépend des résultats de l'entreprise — il peut être nul certaines années.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <SectionTitle className="mt-8">Questions fréquentes</SectionTitle>
          <div data-section="faq">
            <FAQ hasEquity={hasEquity} hasPee={!!peeDevice} />
          </div>
        </>
      )}

      {tab === "questions" && (
        <>
          <SectionTitle><Sparkles size={14} className="inline mr-1" /> Une question sur ce package ?</SectionTitle>
          <div data-section="assistant_ia">
            <Assistant token={data.token} pkg={pkg} params={params} />
          </div>
          <SectionTitle className="mt-6">Échangez avec l'équipe</SectionTitle>
          <div data-section="messagerie">
            <CandidateMessagingBlock token={data.token} orgName={org?.name ?? "l'entreprise"} initialMessages={data.messages} />
          </div>
        </>
      )}

      {tab === "next" && (
        <>
          <ProcessSection pkg={pkg} />
          <div data-section="decision">
            <DecisionBlock
              data={data}
              orgName={org?.name ?? "l'entreprise"}
              pkgTitle={pkg.title}
              onStatusChange={(status, statusUpdatedAt) =>
                setData((prev) => (prev ? { ...prev, offerStatus: status, statusUpdatedAt } : prev))
              }
            />
          </div>
          <div className="rounded-2xl p-6 mt-8 mb-6 text-center" style={{ background: "#FAEEDA" }}>
            <div className="font-display text-aubergine" style={{ fontSize: 20 }}>Des questions sur ce package ?</div>
            <p className="text-[13px] text-aubergine-light mt-2 leading-relaxed">
              L'équipe de {org?.name} peut répondre à toutes vos questions lors d'un échange de 20 minutes.
            </p>
            <button
              onClick={async () => {
                await trackEvent("rdv_click");
                window.location.href = `mailto:?subject=${encodeURIComponent(`Question sur mon package ${pkg.title}`)}`;
              }}
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-medium text-lin"
              style={{ background: "#2D2640" }}
            >
              <Calendar size={14} /> Prendre rendez-vous
            </button>
          </div>
        </>
      )}

      <FooterDisclaimer />
    </PageShell>
  );
}

/* -------------------- Tabs -------------------- */

function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div
      className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl mb-6 sticky top-2 z-10"
      style={{ background: "#FFFFFF", border: "0.5px solid rgba(45,38,64,0.08)", boxShadow: "0 4px 16px rgba(45,38,64,0.04)" }}
    >
      {TABS.map((t) => {
        const active = tab === t.key;
        const isHL = t.highlight;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className="px-3 py-2 rounded-xl text-[12px] transition-all"
            style={
              isHL
                ? {
                    background: active ? "#C4A882" : "#FAEEDA",
                    color: active ? "#FFFFFF" : "#7A5417",
                    fontWeight: 600,
                    fontSize: 13,
                    boxShadow: active ? "0 2px 8px rgba(196,168,130,0.4)" : undefined,
                    border: "1px solid rgba(196,168,130,0.4)",
                  }
                : {
                    background: active ? "#2D2640" : "transparent",
                    color: active ? "#FAF8F5" : "#524970",
                    fontWeight: active ? 500 : 400,
                  }
            }
          >
            {isHL && <Sparkles size={11} className="inline mr-1" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------- Tab content -------------------- */

type Pkg = CandidateLinkData["packages"];
type Org = Pkg["organizations"];

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-4 space-y-3">
      {children}
    </div>
  );
}

function KeyVal({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="flex justify-between gap-4 text-[13px]">
      <span className="text-aubergine-light">{label}</span>
      <span className="text-aubergine font-medium text-right">{value}</span>
    </div>
  );
}

function OfferTab({ pkg }: { pkg: Pkg }) {
  const hasJobOverview = !!pkg.job_summary || !!pkg.location_city || !!pkg.remote_policy;
  const missions = (pkg.missions ?? []).filter((m) => m && m.trim());
  const stack = pkg.stack ?? [];
  return (
    <>
      {hasJobOverview && (
        <>
          <SectionTitle>Le poste</SectionTitle>
          <div data-section="poste" className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 space-y-4">
            {pkg.job_summary && (
              <p className="text-[14px] text-aubergine leading-relaxed">{pkg.job_summary}</p>
            )}
            <div className="flex flex-wrap gap-2 text-[12px]">
              {pkg.location_city && (
                <Tag>
                  <MapPin size={11} />
                  {pkg.location_city}
                  {pkg.location_details ? ` · ${pkg.location_details}` : ""}
                </Tag>
              )}
              {pkg.remote_policy && (
                <Tag>{REMOTE_LABEL[pkg.remote_policy] ?? pkg.remote_policy}</Tag>
              )}
              {pkg.contract_type && <Tag>{pkg.contract_type.toUpperCase()}</Tag>}
              {pkg.start_date && (
                <Tag>
                  <Calendar size={11} />
                  Démarrage {pkg.start_date}
                </Tag>
              )}
            </div>
          </div>
        </>
      )}

      {missions.length > 0 && (
        <>
          <SectionTitle>Missions principales</SectionTitle>
          <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6">
            <ul className="space-y-2">
              {missions.map((m, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-aubergine leading-relaxed">
                  <span style={{ color: "#8B7FA8" }}>●</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
            {stack.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[rgba(45,38,64,0.06)]">
                <div className="text-[11px] uppercase tracking-[0.15em] text-aubergine-light mb-2">
                  Stack & outils
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stack.map((s, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#F0EBE8", color: "#524970" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function CompanyTab({ org }: { org: Org }) {
  if (!org) {
    return (
      <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6">
        <p className="text-[13px] text-grey">Aucune information entreprise renseignée.</p>
      </div>
    );
  }
  return (
    <>
      {org.description && (
        <>
          <SectionTitle>Présentation & produit</SectionTitle>
          <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6">
            <p className="text-[13px] text-aubergine leading-relaxed whitespace-pre-line">{org.description}</p>
          </div>
        </>
      )}

      {org.key_figures && org.key_figures.length > 0 && (
        <>
          <SectionTitle>Chiffres clés</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {org.key_figures.map((kf, i) => (
              <div key={i} className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-4">
                <div className="font-display text-aubergine" style={{ fontSize: 22 }}>{kf.value}</div>
                <div className="text-[11px] text-aubergine-light mt-1">{kf.label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {((org.values && org.values.length > 0) || org.culture_note) && (
        <>
          <SectionTitle>Valeurs & culture</SectionTitle>
          <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 space-y-3">
            {org.values && org.values.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {org.values.map((v) => (
                  <span key={v} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#FAEEDA", color: "#7A5417" }}>{v}</span>
                ))}
              </div>
            )}
            {org.culture_note && (
              <p className="text-[13px] text-aubergine leading-relaxed whitespace-pre-line">{org.culture_note}</p>
            )}
          </div>
        </>
      )}

      {org.links && org.links.length > 0 && (
        <>
          <SectionTitle>Liens & médias</SectionTitle>
          <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 flex flex-col gap-2">
            {org.links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] text-aubergine hover:underline">
                <ExternalLink size={13} /> {l.label}
              </a>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function FlexibilityTab({ pkg }: { pkg: Pkg }) {
  const hasFlex = !!pkg.remote_policy || typeof pkg.remote_days === "number" || pkg.flexible_hours;
  if (!hasFlex) {
    return (
      <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6">
        <p className="text-[13px] text-grey">Aucune information de flexibilité renseignée.</p>
      </div>
    );
  }
  return (
    <>
      <SectionTitle>Flexibilité & rythme</SectionTitle>
      <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 space-y-2 text-[13px] text-aubergine">
        {pkg.remote_policy && (
          <div>
            <strong>Télétravail</strong> :{" "}
            {REMOTE_LABEL[pkg.remote_policy] ?? pkg.remote_policy}
            {typeof pkg.remote_days === "number" && pkg.remote_days > 0
              ? ` — ${pkg.remote_days} j/sem.`
              : ""}
            {pkg.remote_guaranteed ? " · garanti par contrat" : ""}
          </div>
        )}
        {pkg.flexible_hours && (
          <div>
            <strong>Horaires</strong> : flexibles
          </div>
        )}
      </div>
    </>
  );
}

function TeamCultureTab({ pkg, onExternalLink }: { pkg: Pkg; onExternalLink: (url: string) => void }) {
  const values = pkg.company_values ?? [];
  const growth = pkg.growth_paths ?? [];
  const hasTeam =
    !!pkg.team_size || !!pkg.team_description || !!pkg.manager_style ||
    values.length > 0 || !!pkg.culture_note || !!pkg.glassdoor_url || !!pkg.wtj_url;
  const hasGrowth = growth.length > 0 || !!pkg.training_budget || !!pkg.onboarding_note;

  return (
    <>
      {hasTeam && (
        <>
          <SectionTitle>L'équipe & la culture</SectionTitle>
          <div data-section="equipe_culture" className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 space-y-3">
            {(pkg.team_size || pkg.manager_style) && (
              <div className="flex flex-wrap gap-2 text-[12px]">
                {pkg.team_size ? (
                  <Tag>
                    <Users size={11} />
                    Équipe de {pkg.team_size}
                  </Tag>
                ) : null}
                {pkg.manager_style && (
                  <Tag>Management : {MANAGER_LABEL[pkg.manager_style] ?? pkg.manager_style}</Tag>
                )}
              </div>
            )}
            {pkg.team_description && (
              <p className="text-[13px] text-aubergine leading-relaxed">{pkg.team_description}</p>
            )}
            {values.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-aubergine-light mb-2">Valeurs</div>
                <div className="flex flex-wrap gap-1.5">
                  {values.map((v, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#F0EBE8", color: "#524970" }}>{v}</span>
                  ))}
                </div>
              </div>
            )}
            {pkg.culture_note && (
              <p className="text-[12px] text-aubergine-light italic leading-relaxed">« {pkg.culture_note} »</p>
            )}
            {(pkg.glassdoor_url || pkg.wtj_url) && (
              <div className="flex flex-wrap gap-3 pt-2 text-[12px]">
                {pkg.glassdoor_url && (
                  <a href={pkg.glassdoor_url} target="_blank" rel="noopener noreferrer" onClick={() => onExternalLink(pkg.glassdoor_url!)} className="inline-flex items-center gap-1 text-aubergine underline">
                    Glassdoor <ExternalLink size={11} />
                  </a>
                )}
                {pkg.wtj_url && (
                  <a href={pkg.wtj_url} target="_blank" rel="noopener noreferrer" onClick={() => onExternalLink(pkg.wtj_url!)} className="inline-flex items-center gap-1 text-aubergine underline">
                    Welcome to the Jungle <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {hasGrowth && (
        <>
          <SectionTitle>Évolution & développement</SectionTitle>
          <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 space-y-3">
            {growth.length > 0 && (
              <ul className="space-y-2">
                {growth.map((g, i) => (
                  <li key={i} className="flex gap-3 text-[13px] text-aubergine">
                    <TrendingUp size={14} className="text-aubergine-light mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>{g.horizon}</strong> — {g.path}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {pkg.training_budget ? (
              <div className="text-[13px] text-aubergine">
                <strong>Budget formation</strong> : {formatEur(pkg.training_budget)} / an
              </div>
            ) : null}
            {pkg.onboarding_note && (
              <p className="text-[12px] text-aubergine-light leading-relaxed">{pkg.onboarding_note}</p>
            )}
          </div>
        </>
      )}

      {!hasTeam && !hasGrowth && (
        <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6">
          <p className="text-[13px] text-grey">Aucune information équipe & culture renseignée.</p>
        </div>
      )}
    </>
  );
}

function ProcessSection({ pkg }: { pkg: Pkg }) {
  const steps = pkg.process_steps ?? [];
  if (steps.length === 0 && !pkg.process_duration) return null;
  return (
    <>
      <SectionTitle>Processus de recrutement</SectionTitle>
      <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6">
        {steps.length > 0 && (
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[13px] text-aubergine">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium" style={{ background: "#2D2640", color: "#FAF8F5" }}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div>{s.step}</div>
                  {s.duration && (
                    <div className="text-[11px] text-grey mt-0.5">
                      <Clock size={10} className="inline mr-1" />
                      {s.duration}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
        {pkg.process_duration && (
          <div className="text-[12px] text-aubergine-light mt-4 pt-3 border-t border-[rgba(45,38,64,0.06)]">
            Durée totale estimée : <strong>{pkg.process_duration}</strong>
          </div>
        )}
      </div>
    </>
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
  onView,
}: {
  scenario: {
    label: string;
    estimate: number;
    targetValuationM: number;
    horizonYears: number;
    taxRate: number;
  };
  onView?: () => void;
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
    <div
      onMouseEnter={onView}
      onClick={onView}
      className="rounded-[12px] p-4 cursor-pointer"
      style={{ background: p.bg }}
    >
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
  token,
  pkg,
  params,
}: {
  token: string;
  pkg: PackageData;
  params: CandidateParams;
}) {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ask = useServerFn(askCandidateAssistant);
  const track = useServerFn(trackLink);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setLoading(true);
    void track({ data: { token, eventType: "question", metadata: { question: q.slice(0, 100) } } }).catch(() => {});

    try {
      const packageContext = JSON.stringify(
        {
          job_summary: pkg.job_summary,
          missions: pkg.missions,
          stack: pkg.stack,
          contract_type: pkg.contract_type,
          remote_policy: pkg.remote_policy,
          remote_days: pkg.remote_days,
          flexible_hours: pkg.flexible_hours,
          location_city: pkg.location_city,
          team_size: pkg.team_size,
          team_description: pkg.team_description,
          manager_style: pkg.manager_style,
          company_values: pkg.company_values,
          growth_paths: pkg.growth_paths,
          training_budget: pkg.training_budget,
          process_steps: pkg.process_steps,
          start_date: pkg.start_date,
          gross_salary: pkg.gross_salary,
          variable_target: pkg.variable_target,
          equity_devices: pkg.equity_devices,
          savings_devices: pkg.savings_devices,
          scenarios: pkg.scenarios,
          benchmark: pkg.benchmark,
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

/* -------------------- Job sections -------------------- */

const REMOTE_LABEL: Record<string, string> = {
  full_remote: "100% télétravail",
  hybrid: "Hybride",
  office_first: "Bureau privilégié",
  on_site: "100% sur site",
};

const MANAGER_LABEL: Record<string, string> = {
  autonomy: "Autonomie",
  coaching: "Coaching",
  structured: "Cadré & structuré",
  collaborative: "Collaboratif",
};

const FAMILY_LABEL: Record<string, string> = {
  software_engineer: "Software Engineer",
  frontend_engineer: "Frontend Engineer",
  backend_engineer: "Backend Engineer",
  data_engineer: "Data Engineer",
  data_scientist: "Data Scientist",
  designer: "Product Designer",
  devops_engineer: "DevOps Engineer",
  product_manager: "Product Manager",
  engineering_manager: "Engineering Manager",
  sales: "Sales",
  marketing: "Marketing",
};

const SENIORITY_LABEL: Record<string, string> = {
  junior: "Junior",
  mid: "Confirmé",
  senior: "Senior",
  staff: "Staff",
  lead: "Lead",
};

function JobSections({ pkg, onExternalLink }: { pkg: PackageData; onExternalLink?: (url: string) => void }) {
  const hasJobOverview =
    !!pkg.job_summary || !!pkg.location_city || !!pkg.remote_policy;
  const missions = (pkg.missions ?? []).filter((m) => m && m.trim());
  const stack = pkg.stack ?? [];
  const values = pkg.company_values ?? [];
  const growth = pkg.growth_paths ?? [];
  const steps = pkg.process_steps ?? [];
  const hasFlex =
    !!pkg.remote_policy ||
    typeof pkg.remote_days === "number" ||
    pkg.flexible_hours;
  const hasTeam =
    !!pkg.team_size ||
    !!pkg.team_description ||
    !!pkg.manager_style ||
    values.length > 0 ||
    !!pkg.culture_note ||
    !!pkg.glassdoor_url ||
    !!pkg.wtj_url;
  const hasGrowth = growth.length > 0 || !!pkg.training_budget || !!pkg.onboarding_note;

  return (
    <>
      {hasJobOverview && (
        <>
          <SectionTitle>Le poste</SectionTitle>
          <div data-section="poste" className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 space-y-4">
            {pkg.job_summary && (
              <p className="text-[14px] text-aubergine leading-relaxed">
                {pkg.job_summary}
              </p>
            )}
            <div className="flex flex-wrap gap-2 text-[12px]">
              {pkg.location_city && (
                <Tag>
                  <MapPin size={11} />
                  {pkg.location_city}
                  {pkg.location_details ? ` · ${pkg.location_details}` : ""}
                </Tag>
              )}
              {pkg.remote_policy && (
                <Tag>{REMOTE_LABEL[pkg.remote_policy] ?? pkg.remote_policy}</Tag>
              )}
              {pkg.contract_type && (
                <Tag>{pkg.contract_type.toUpperCase()}</Tag>
              )}
              {pkg.start_date && (
                <Tag>
                  <Calendar size={11} />
                  Démarrage {pkg.start_date}
                </Tag>
              )}
            </div>
          </div>
        </>
      )}

      {missions.length > 0 && (
        <>
          <SectionTitle>Missions principales</SectionTitle>
          <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6">
            <ul className="space-y-2">
              {missions.map((m, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-aubergine leading-relaxed">
                  <span style={{ color: "#8B7FA8" }}>●</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
            {stack.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[rgba(45,38,64,0.06)]">
                <div className="text-[11px] uppercase tracking-[0.15em] text-aubergine-light mb-2">
                  Stack & outils
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stack.map((s, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: "#F0EBE8", color: "#524970" }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {hasFlex && (
        <>
          <SectionTitle>Flexibilité & rythme</SectionTitle>
          <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 space-y-2 text-[13px] text-aubergine">
            {pkg.remote_policy && (
              <div>
                <strong>Télétravail</strong> :{" "}
                {REMOTE_LABEL[pkg.remote_policy] ?? pkg.remote_policy}
                {typeof pkg.remote_days === "number" && pkg.remote_days > 0
                  ? ` — ${pkg.remote_days} j/sem.`
                  : ""}
                {pkg.remote_guaranteed ? " · garanti par contrat" : ""}
              </div>
            )}
            {pkg.flexible_hours && (
              <div>
                <strong>Horaires</strong> : flexibles
              </div>
            )}
          </div>
        </>
      )}

      {hasTeam && (
        <>
          <SectionTitle>L'équipe & la culture</SectionTitle>
          <div data-section="equipe_culture" className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 space-y-3">
            {(pkg.team_size || pkg.manager_style) && (
              <div className="flex flex-wrap gap-2 text-[12px]">
                {pkg.team_size ? (
                  <Tag>
                    <Users size={11} />
                    Équipe de {pkg.team_size}
                  </Tag>
                ) : null}
                {pkg.manager_style && (
                  <Tag>
                    Management : {MANAGER_LABEL[pkg.manager_style] ?? pkg.manager_style}
                  </Tag>
                )}
              </div>
            )}
            {pkg.team_description && (
              <p className="text-[13px] text-aubergine leading-relaxed">
                {pkg.team_description}
              </p>
            )}
            {values.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-aubergine-light mb-2">
                  Valeurs
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {values.map((v, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: "#F0EBE8", color: "#524970" }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {pkg.culture_note && (
              <p className="text-[12px] text-aubergine-light italic leading-relaxed">
                « {pkg.culture_note} »
              </p>
            )}
            {(pkg.glassdoor_url || pkg.wtj_url) && (
              <div className="flex flex-wrap gap-3 pt-2 text-[12px]">
                {pkg.glassdoor_url && (
                  <a
                    href={pkg.glassdoor_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onExternalLink?.(pkg.glassdoor_url!)}
                    className="inline-flex items-center gap-1 text-aubergine underline"
                  >
                    Glassdoor <ExternalLink size={11} />
                  </a>
                )}
                {pkg.wtj_url && (
                  <a
                    href={pkg.wtj_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onExternalLink?.(pkg.wtj_url!)}
                    className="inline-flex items-center gap-1 text-aubergine underline"
                  >
                    Welcome to the Jungle <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {hasGrowth && (
        <>
          <SectionTitle>Évolution & développement</SectionTitle>
          <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6 space-y-3">
            {growth.length > 0 && (
              <ul className="space-y-2">
                {growth.map((g, i) => (
                  <li key={i} className="flex gap-3 text-[13px] text-aubergine">
                    <TrendingUp size={14} className="text-aubergine-light mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>{g.horizon}</strong> — {g.path}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {pkg.training_budget ? (
              <div className="text-[13px] text-aubergine">
                <strong>Budget formation</strong> : {formatEur(pkg.training_budget)} / an
              </div>
            ) : null}
            {pkg.onboarding_note && (
              <p className="text-[12px] text-aubergine-light leading-relaxed">
                {pkg.onboarding_note}
              </p>
            )}
          </div>
        </>
      )}

      {steps.length > 0 && (
        <>
          <SectionTitle>Processus de recrutement</SectionTitle>
          <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6">
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-[13px] text-aubergine">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium"
                    style={{ background: "#2D2640", color: "#FAF8F5" }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div>{s.step}</div>
                    {s.duration && (
                      <div className="text-[11px] text-grey mt-0.5">
                        <Clock size={10} className="inline mr-1" />
                        {s.duration}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {pkg.process_duration && (
              <div className="text-[12px] text-aubergine-light mt-4 pt-3 border-t border-[rgba(45,38,64,0.06)]">
                Durée totale estimée : <strong>{pkg.process_duration}</strong>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
      style={{ background: "#F0EBE8", color: "#524970", fontSize: 11 }}
    >
      {children}
    </span>
  );
}

export function BenchmarkBar({
  benchmark,
  gross,
}: {
  benchmark: NonNullable<PackageData["benchmark"]>;
  gross: number;
}) {
  const min = Math.min(benchmark.p25, gross) * 0.95;
  const max = Math.max(benchmark.p75, gross) * 1.05;
  const range = Math.max(max - min, 1);
  const pct = (v: number) => ((v - min) / range) * 100;
  const family = FAMILY_LABEL[benchmark.job_family] ?? benchmark.job_family;
  const sen = SENIORITY_LABEL[benchmark.seniority] ?? benchmark.seniority;

  return (
    <div className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6">
      <div className="text-[11px] uppercase tracking-[0.15em] text-aubergine-light mb-2">
        Benchmark marché — {family} · {sen} · Paris
      </div>
      <div className="text-[12px] text-aubergine-light mb-4">
        Cette offre se situe à <strong>{formatEur(gross)}</strong> brut/an. Fourchette
        marché : {formatEur(benchmark.p25)} — {formatEur(benchmark.p75)} (médiane{" "}
        {formatEur(benchmark.p50)}).
      </div>
      <div className="relative h-8">
        <div
          className="absolute top-3 left-0 right-0 h-2 rounded-full"
          style={{ background: "#F0EBE8" }}
        />
        <div
          className="absolute top-3 h-2 rounded-full"
          style={{
            background: "#C4A882",
            left: `${pct(benchmark.p25)}%`,
            width: `${pct(benchmark.p75) - pct(benchmark.p25)}%`,
          }}
        />
        <div
          className="absolute top-1.5 w-1 h-5"
          style={{ background: "#2D2640", left: `${pct(benchmark.p50)}%` }}
          title={`Médiane ${formatEur(benchmark.p50)}`}
        />
        <div
          className="absolute -top-1 w-3 h-10 rounded-full"
          style={{
            background: "#2D2640",
            border: "2px solid #FAF8F5",
            left: `calc(${pct(gross)}% - 6px)`,
          }}
          title={`Cette offre — ${formatEur(gross)}`}
        />
      </div>
      <div className="flex justify-between text-[10px] text-grey mt-1">
        <span>P25 {formatEur(benchmark.p25)}</span>
        <span>P50 {formatEur(benchmark.p50)}</span>
        <span>P75 {formatEur(benchmark.p75)}</span>
      </div>
      <div className="text-[10px] text-grey mt-3">
        Source : {benchmark.source ?? "—"} · Version {benchmark.version}
      </div>
    </div>
  );
}

function CounterOfferBanner({
  info,
}: {
  info: NonNullable<CandidateLinkData["counterOffer"]>;
}) {
  const [showCompare, setShowCompare] = useState(false);
  const c = info.changes ?? {};
  const fmtEur = (v: number) => `${v.toLocaleString("fr-FR")} €`;
  const items: Array<{ label: string; value: string }> = [];
  if (c.grossSalary != null)
    items.push({ label: "Nouveau fixe", value: fmtEur(c.grossSalary) });
  if (c.variableTarget != null)
    items.push({ label: "Variable cible", value: fmtEur(c.variableTarget) });
  if (c.remoteDays != null)
    items.push({ label: "Télétravail", value: `${c.remoteDays} j/semaine` });
  if (c.equityQuantity != null)
    items.push({
      label: "Equity",
      value: `${(c.equityQuantity as number).toLocaleString("fr-FR")} bons`,
    });

  return (
    <section
      className="rounded-2xl p-5 mb-5"
      style={{
        background: "linear-gradient(135deg, #EAF3DE 0%, #F5F0E0 100%)",
        border: "1px solid rgba(59,109,17,0.2)",
      }}
    >
      <div className="flex items-start gap-3">
        <Sparkles size={20} className="text-[#3B6D11] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-aubergine text-[18px] mb-1">
            ✨ Nouvelle proposition pour vous
          </div>
          <p className="text-[12px] text-aubergine-light leading-relaxed">
            L'entreprise a revu son offre suite à votre échange. Voici ce qui a
            évolué&nbsp;:
          </p>
          {items.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {items.map((it) => (
                <div
                  key={it.label}
                  className="bg-white/60 rounded-lg px-3 py-2"
                >
                  <div className="text-[10px] uppercase tracking-wide text-grey">
                    {it.label}
                  </div>
                  <div className="text-[14px] font-medium text-aubergine">
                    {it.value}
                  </div>
                </div>
              ))}
            </div>
          )}
          {info.message && (
            <div className="mt-3 text-[12px] italic text-aubergine-light bg-white/40 rounded-lg p-3">
              « {info.message} »
            </div>
          )}
          {info.originalToken && (
            <div className="mt-3">
              <button
                onClick={() => setShowCompare((v) => !v)}
                className="text-[11px] text-aubergine font-medium hover:underline"
              >
                {showCompare ? "Masquer" : "Comparer avec l'offre initiale"}
              </button>
              {showCompare && (
                <a
                  href={`/p/${info.originalToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 inline-flex items-center gap-1 text-[11px] text-aubergine underline"
                >
                  Ouvrir l'offre initiale <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

