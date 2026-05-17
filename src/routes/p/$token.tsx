import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Info, Calendar, Sparkles, Send, Loader2, MapPin, Users, TrendingUp, ListChecks, ExternalLink, Clock } from "lucide-react";
import { Logo } from "@/components/paqli/Logo";
import {
  useCandidateLink,
  type CandidateLinkData,
} from "@/hooks/useCandidateLink";
import {
  calcPackageEstimate,
  estimatePasRate,
  estimateTmi,
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
import { TotalCompensationBlock } from "@/components/paqli/candidate/TotalCompensationBlock";
import { CandidateHeroReveal } from "@/components/paqli/candidate/CandidateHeroReveal";
import {
  buildAssistantPlaceholder,
  buildAssistantWelcomeMessage,
} from "@/lib/candidatePersonalization";

export const Route = createFileRoute("/p/$token")({
  component: PublicPackagePage,
});


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
  | "welcome"
  | "offre"
  | "entreprise"
  | "flex"
  | "team"
  | "package"
  | "comparatif"
  | "questions"
  | "next";

const TABS: { key: TabKey; label: string; highlight?: boolean }[] = [
  { key: "welcome", label: "Bienvenue" },
  { key: "offre", label: "Offre" },
  { key: "entreprise", label: "Entreprise" },
  { key: "flex", label: "Flexibilité" },
  { key: "team", label: "Équipe & culture" },
  { key: "package", label: "Package", highlight: true },
  { key: "comparatif", label: "Comparatif" },
  { key: "questions", label: "Échanger" },
  { key: "next", label: "Ma décision" },
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
    if (typeof window === "undefined") return "welcome" as TabKey;
    const t = new URLSearchParams(window.location.search).get("tab") as TabKey | null;
    return TABS.some((x) => x.key === t) ? (t as TabKey) : "welcome";
  })();
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Persisted set of visited tabs (sequential gating)
  const visitedKey = `paqli_visited_${data.token}`;
  const [visitedTabs, setVisitedTabs] = useState<Set<TabKey>>(() => {
    if (typeof window === "undefined") return new Set<TabKey>([initialTab]);
    try {
      const raw = window.localStorage.getItem(visitedKey);
      const arr = raw ? (JSON.parse(raw) as TabKey[]) : [];
      const valid = arr.filter((k) => TABS.some((t) => t.key === k));
      return new Set<TabKey>([...valid, initialTab]);
    } catch {
      return new Set<TabKey>([initialTab]);
    }
  });

  const tabOrder = TABS.map((t) => t.key);
  const allTabsVisited = tabOrder.every((k) => visitedTabs.has(k));
  const allTabsVisitedRef = useRef(allTabsVisited);

  // When current tab changes, mark visited + track
  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      try {
        window.localStorage.setItem(visitedKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      behavior.track("section_view", { section: `tab_${tab}` });
      const wasComplete = allTabsVisitedRef.current;
      const nowComplete = tabOrder.every((k) => next.has(k));
      if (!wasComplete && nowComplete) {
        allTabsVisitedRef.current = true;
        behavior.track("section_view", { section: "all_tabs_completed" });
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Guarded tab change — only allow visited or the immediate next tab (until all done)
  const canGoToTab = useCallback(
    (target: TabKey) => {
      if (allTabsVisited) return true;
      if (visitedTabs.has(target)) return true;
      const currentIdx = tabOrder.indexOf(tab);
      const targetIdx = tabOrder.indexOf(target);
      return targetIdx === currentIdx + 1;
    },
    [allTabsVisited, visitedTabs, tab, tabOrder],
  );

  const tryChangeTab = useCallback(
    (target: TabKey) => {
      if (!canGoToTab(target)) return;
      setTab(target);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [canGoToTab],
  );

  const currentIndex = tabOrder.indexOf(tab);
  const prevTab = currentIndex > 0 ? tabOrder[currentIndex - 1] : null;
  const nextTab = currentIndex < tabOrder.length - 1 ? tabOrder[currentIndex + 1] : null;

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
  const [pasAuto, setPasAuto] = useState(true);
  const [achievementPct, setAchievementPct] = useState(1);

  // Auto-estimation du PAS et de la TMI à partir du brut total cible (fixe + variable cible)
  const pkgGross = (pkg?.gross_salary ?? 0) + (pkg?.variable_target ?? 0);
  useEffect(() => {
    if (pkgGross <= 0) return;
    if (!pasTouched.current) {
      setPasRate(estimatePasRate(pkgGross));
      setPasAuto(true);
      setParams((p) => ({ ...p, tmi: estimateTmi(pkgGross) }));
    }
  }, [pkgGross]);

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

  const [revealed, setRevealed] = useState<boolean>(!!data.opened_at);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    behavior.track("reveal_clicked", { section: "hero", value: "total_compensation" });
  }, [behavior]);

  if (!revealed) {
    return (
      <PageShell>
        <CandidateHeroReveal
          pkg={pkg}
          organization={org}
          candidateName={data.candidate_name}
          openedAt={data.opened_at}
          returnVisits={data.return_visits}
          offerStatus={data.offerStatus}
          onReveal={handleReveal}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="animate-paqli-slide-up">
      {data.counterOffer && <CounterOfferBanner info={data.counterOffer} />}

      {data.decisionDeadline && (
        <DecisionDeadlineBanner
          deadline={data.decisionDeadline}
          status={data.offerStatus}
        />
      )}

      {/* Tabs */}
      <TabBar
        tab={tab}
        onChange={tryChangeTab}
        visitedTabs={visitedTabs}
        allUnlocked={allTabsVisited}
      />

      {tab === "welcome" && (
        <>
          {/* Hero — Bienvenue */}
          <section
            data-section="hero"
            className="relative overflow-hidden rounded-2xl p-8 mb-4"
            style={{
              background:
                "radial-gradient(120% 100% at 0% 0%, #3D3458 0%, #2D2640 55%, #1F1A2E 100%)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full"
              style={{ background: "radial-gradient(closest-side, rgba(196,168,130,0.35), transparent)" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 rounded-full"
              style={{ background: "radial-gradient(closest-side, rgba(139,127,168,0.25), transparent)" }}
            />

            <div className="relative">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em]"
                style={{ background: "rgba(196,168,130,0.18)", color: "#E8D6B5", border: "0.5px solid rgba(196,168,130,0.35)" }}
              >
                <Sparkles size={10} /> Félicitations
              </div>

              <h1 className="font-display text-white mt-4" style={{ fontSize: 30, lineHeight: 1.1 }}>
                {data.candidate_name ? `${data.candidate_name}, ` : ""}
                <span style={{ color: "#E8D6B5" }}>{org?.name ?? "L'équipe"}</span>{" "}
                vous propose de rejoindre l'aventure.
              </h1>

              <p className="text-[14px] mt-3 leading-relaxed" style={{ color: "#D6CDE8", maxWidth: 540 }}>
                Voici votre offre pour le poste de <strong className="text-white">{pkg.title}</strong>.
                Prenez le temps d'explorer chaque élément — package, équipe,
                flexibilité — et de simuler votre rémunération. Toutes vos
                interactions ici restent privées.
              </p>

              <div className="flex items-center gap-3 mt-6">
                {org?.logo_url ? (
                  <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/20" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-display text-xl text-white ring-1 ring-white/20">
                    {org?.name?.[0] ?? "?"}
                  </div>
                )}
                <div>
                  <div className="font-display text-white" style={{ fontSize: 16 }}>
                    {org?.name ?? "—"}
                  </div>
                  <div className="text-[12px]" style={{ color: "#B8AECF" }}>
                    {pkg.title}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Mot personnel de l'équipe */}
          {pkg.interview_notes && pkg.interview_notes.trim().length > 0 && (
            <section
              className="rounded-2xl p-5 mb-4"
              style={{ background: "#FFFFFF", border: "0.5px solid rgba(196,168,130,0.45)", boxShadow: "0 4px 16px rgba(45,38,64,0.05)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 18 }}>💬</span>
                <div className="text-[11px] uppercase tracking-[0.15em] font-medium" style={{ color: "#7A5417" }}>
                  Un mot de l'équipe {org?.name ? `de ${org.name}` : ""}
                </div>
              </div>
              <p className="text-[14px] text-aubergine leading-relaxed whitespace-pre-line italic">
                « {pkg.interview_notes} »
              </p>
            </section>
          )}

          {/* Pourquoi Paqli */}
          <section
            className="rounded-2xl p-4 mb-5 flex items-start gap-3"
            style={{ background: "#F5F2FA", border: "0.5px solid rgba(139,127,168,0.25)" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#2D2640" }}>
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-display text-aubergine" style={{ fontSize: 14 }}>
                Pourquoi {org?.name ?? "l'entreprise"} a choisi Paqli pour vous ?
              </div>
              <p className="text-[12px] text-aubergine-light mt-1 leading-relaxed">
                Une offre, ce n'est pas qu'un salaire. C'est un package complet —
                equity, épargne, avantages, culture, projet. Paqli rend tout ça
                transparent et personnalisable, pour que <strong>vous</strong>{" "}
                puissiez prendre la meilleure décision, en toute clarté.
              </p>
            </div>
          </section>
        </>
      )}

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
          {/* Package brut — prioritaire */}
          <SectionTitle>Votre rémunération</SectionTitle>
          {(() => {
            const fixe = pkg.gross_salary ?? 0;
            const variableCible = pkg.variable_target ?? 0;
            const brutTotal = fixe + variableCible;
            return (
              <div className="rounded-2xl p-7 mb-3" style={{ background: "#2D2640" }}>
                <div className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "#B8AECF" }}>
                  Package brut annuel {variableCible > 0 ? "(fixe + variable cible)" : "(fixe)"}
                </div>
                <div className="font-display text-white mt-2" style={{ fontSize: 40, lineHeight: 1.05 }}>
                  {formatEur(brutTotal)}
                </div>
                <div className="text-[12px] mt-3 leading-relaxed flex flex-wrap gap-x-5 gap-y-1" style={{ color: "#B8AECF" }}>
                  <span>Fixe : <strong className="text-white">{formatEur(fixe)}</strong> / an</span>
                  {variableCible > 0 && (
                    <span>Variable cible : <strong className="text-white">{formatEur(variableCible)}</strong> / an</span>
                  )}
                  <span>soit ~{formatEur(Math.round(brutTotal / 12))} / mois brut</span>
                </div>
              </div>
            );
          })()}

          <div className="mb-6">
            <SalaryBreakdown
              grossAnnual={pkg.gross_salary ?? 0}
              pasRate={pasRate}
              pasAuto={pasAuto}
              onPasRateChange={(v) => {
                pasTouched.current = true;
                setPasAuto(false);
                setPasRate(v);
              }}
              variableTarget={pkg.variable_target ?? 0}
              achievementPct={achievementPct}
              onAchievementPctChange={setAchievementPct}
              variableConfig={pkg.variable_config ?? null}
            />
          </div>

          {/* Mise PEE — seulement si pertinent */}
          {peeDevice && (peeDevice.cap_amount ?? 0) > 0 && (
            <>
              <SectionTitle>Votre mise PEE</SectionTitle>
              <div data-section="simulation" className="bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] p-5 mb-6">
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
              </div>
            </>
          )}

          {/* Estimation totale (avec equity, épargne, avantages) */}
          <SectionTitle>Estimation totale du package</SectionTitle>
          <div className="rounded-2xl p-7 mb-3" style={{ background: "#FAF8F5", border: "0.5px solid rgba(45,38,64,0.08)" }}>
            <div className="text-[10px] uppercase tracking-[0.15em] text-grey">
              Tout compris (rémunération + equity + épargne + avantages)
            </div>
            {estimate.hasBspce ? (
              <>
                <div className="font-display text-aubergine mt-2" style={{ fontSize: 30, lineHeight: 1.05 }}>
                  ~{formatEur(estimate.totalRange.lowSeniority)} – ~{formatEur(estimate.totalRange.highSeniority)}
                </div>
                <div className="text-[11px] mt-1 text-grey">
                  selon votre ancienneté au moment de la cession des BSPCE
                </div>
              </>
            ) : (
              <div className="font-display text-aubergine mt-2" style={{ fontSize: 32, lineHeight: 1.05 }}>
                {formatRange(estimate.totalRange.low, estimate.totalRange.high)}
              </div>
            )}
            <div className="text-[12px] mt-3 leading-relaxed text-aubergine-light">
              Ordre de grandeur basé sur le scénario réaliste — règles fiscales 2026 (taux en vigueur).
            </div>
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
            {estimate.benefitsBreakdown.length === 0 && estimate.benefitsEst > 0 && (
              <DetailLine label="Avantages valorisés" value={estimate.benefitsEst} info="Mutuelle, tickets restaurant, véhicule, formation — valeur annuelle estimée." />
            )}
          </div>

          {estimate.benefitsBreakdown.length > 0 && (
            <TotalCompensationBlock
              breakdown={estimate.benefitsBreakdown}
              totalAnnual={estimate.benefitsEst}
              isReturnVisit={!!data.opened_at && (data.return_visits ?? 0) > 0}
              hasSimulated={!!data.simulated_at}
            />
          )}

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
              <div data-section="equity_scenarios" className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                {scenariosToShow.map((s) => (
                  <ScenarioCard key={s.label} scenario={s} onView={() => behavior.trackScenarioView(s.label)} />
                ))}
              </div>
              {estimate.hasBspce && (
                <div className="mb-4 flex items-start gap-2 rounded-xl px-4 py-3" style={{ background: "#F0EBE8" }}>
                  <span className="text-[13px] flex-shrink-0">💡</span>
                  <p className="text-[11px] text-aubergine-light font-light leading-relaxed">
                    Pour les BSPCE, le taux d'imposition dépend de votre ancienneté
                    dans l'entreprise au moment de la vente. Après 3 ans, le taux
                    global passe de <strong>48,6%</strong> à <strong>31,4%</strong> —
                    une différence significative sur les gains importants. Ces règles
                    s'appliquent au moment de la <strong>cession</strong>, pas de l'exercice.
                  </p>
                </div>
              )}
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

      {tab === "comparatif" && (
        <BenchmarkTab pkg={pkg} />
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
          <div data-section="decision">
            {data.decisionDeadline &&
            new Date(data.decisionDeadline) < new Date() &&
            data.offerStatus === "pending" ? (
              <ExpiredDecisionBlock onContact={() => setTab("questions")} />
            ) : (
              <DecisionBlock
                data={data}
                orgName={org?.name ?? "l'entreprise"}
                pkgTitle={pkg.title}
                onStatusChange={(status, statusUpdatedAt) =>
                  setData((prev) => (prev ? { ...prev, offerStatus: status, statusUpdatedAt } : prev))
                }
              />
            )}
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

      <TabFooterNav
        prevTab={prevTab}
        nextTab={nextTab}
        prevLabel={prevTab ? TABS.find((x) => x.key === prevTab)?.label ?? null : null}
        nextLabel={nextTab ? TABS.find((x) => x.key === nextTab)?.label ?? null : null}
        onPrev={() => prevTab && tryChangeTab(prevTab)}
        onNext={() => nextTab && tryChangeTab(nextTab)}
        allUnlocked={allTabsVisited}
      />

      <FooterDisclaimer />
      </div>
    </PageShell>
  );
}

/* -------------------- Tabs -------------------- */

function TabBar({
  tab,
  onChange,
  visitedTabs,
  allUnlocked,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
  visitedTabs: Set<TabKey>;
  allUnlocked: boolean;
}) {
  const order = TABS.map((t) => t.key);
  const currentIdx = order.indexOf(tab);
  return (
    <div
      className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl mb-6 sticky top-2 z-10"
      style={{ background: "#FFFFFF", border: "0.5px solid rgba(45,38,64,0.08)", boxShadow: "0 4px 16px rgba(45,38,64,0.04)" }}
    >
      {TABS.map((t, idx) => {
        const active = tab === t.key;
        const isHL = t.highlight;
        const visited = visitedTabs.has(t.key);
        const isNext = idx === currentIdx + 1;
        const unlocked = allUnlocked || visited || isNext;
        const locked = !unlocked;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            disabled={locked}
            title={locked ? "Terminez l'étape précédente pour débloquer" : undefined}
            className="px-3 py-2 rounded-xl text-[12px] transition-all flex items-center gap-1"
            style={
              locked
                ? {
                    background: "transparent",
                    color: "#C7C3CC",
                    cursor: "not-allowed",
                    opacity: 0.55,
                  }
                : isHL
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
            {locked && <Lock size={10} />}
            {!locked && isHL && <Sparkles size={11} />}
            {!locked && visited && !active && (
              <span style={{ color: "#5B8C7B", fontSize: 10 }}>✓</span>
            )}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function TabFooterNav({
  prevTab,
  nextTab,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  allUnlocked,
}: {
  prevTab: TabKey | null;
  nextTab: TabKey | null;
  prevLabel: string | null;
  nextLabel: string | null;
  onPrev: () => void;
  onNext: () => void;
  allUnlocked: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mt-8 mb-4">
      <button
        type="button"
        onClick={onPrev}
        disabled={!prevTab}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition"
        style={{
          background: "transparent",
          color: prevTab ? "#524970" : "#C7C3CC",
          border: "1px solid rgba(45,38,64,0.15)",
          cursor: prevTab ? "pointer" : "not-allowed",
        }}
      >
        ← {prevLabel ?? "Précédent"}
      </button>
      <div className="text-[11px] text-grey">
        {allUnlocked
          ? "Vous pouvez naviguer librement"
          : "Avancez étape par étape pour tout débloquer"}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={!nextTab}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition"
        style={{
          background: nextTab ? "#2D2640" : "#E5E1EC",
          color: nextTab ? "#FAF8F5" : "#9C95B0",
          cursor: nextTab ? "pointer" : "not-allowed",
        }}
      >
        {nextLabel ?? "Terminer"} →
      </button>
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
    estimateHighSeniority: number;
    estimateLowSeniority: number;
    taxRateHighSeniority: number;
    taxRateLowSeniority: number;
    isMultiRate: boolean;
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
  const fmtRate = (r: number) =>
    `${(r * 100).toFixed(1).replace(".", ",")}%`;

  if (scenario.isMultiRate) {
    return (
      <div
        onMouseEnter={onView}
        onClick={onView}
        className="rounded-[12px] p-4 cursor-pointer"
        style={{ background: p.bg }}
      >
        <div
          className="text-[10px] uppercase tracking-[0.15em] font-medium mb-3"
          style={{ color: p.fg }}
        >
          {labelMap[scenario.label] ?? scenario.label}
        </div>

        <div className="mb-3">
          <div className="text-[11px] text-aubergine-light font-light mb-1">
            Si vous restez ≥ 3 ans
          </div>
          <div className="font-display" style={{ fontSize: 22, color: "#2D2640", lineHeight: 1.1 }}>
            ~{formatEur(scenario.estimateHighSeniority)}
          </div>
          <div className="text-[10px] text-grey font-light mt-0.5">
            après {fmtRate(scenario.taxRateHighSeniority)} de taxes
          </div>
        </div>

        <div className="border-t my-3" style={{ borderColor: "rgba(45,38,64,0.08)" }} />

        <div>
          <div className="text-[11px] text-aubergine-light font-light mb-1">
            Si vous partez avant 3 ans
          </div>
          <div className="font-display" style={{ fontSize: 18, color: "#524970", lineHeight: 1.1 }}>
            ~{formatEur(scenario.estimateLowSeniority)}
          </div>
          <div className="text-[10px] text-grey font-light mt-0.5">
            après {fmtRate(scenario.taxRateLowSeniority)} de taxes
          </div>
        </div>

        <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(45,38,64,0.06)" }}>
          <div className="text-[10px] text-grey font-light">
            Valor. {scenario.targetValuationM} M€ · Horizon {scenario.horizonYears} ans
          </div>
        </div>
      </div>
    );
  }

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
        <strong>{fmtRate(scenario.taxRate)}</strong>
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
  candidateName,
  hasSimulated,
  returnVisits,
}: {
  token: string;
  pkg: PackageData;
  params: CandidateParams;
  candidateName: string | null;
  hasSimulated: boolean;
  returnVisits: number;
}) {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const ask = useServerFn(askCandidateAssistant);
  const track = useServerFn(trackLink);

  const firstName = candidateName
    ? candidateName.trim().split(/\s+/)[0] ?? null
    : null;
  const orgName = pkg.organizations?.name ?? "l'entreprise";
  const hasEquity = (pkg.equity_devices ?? []).length > 0;
  const welcomeMessage = buildAssistantWelcomeMessage(firstName, orgName, hasEquity);
  const placeholder = buildAssistantPlaceholder(firstName, hasSimulated, returnVisits);

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
          candidateLinkToken: token,
        },
      });
      if (res.error) {
        if (res.error.code === "RETRY") {
          // Retry automatique une fois après 500ms
          await new Promise((r) => setTimeout(r, 500));
          const retry = await ask({
            data: {
              packageContext,
              candidateContext,
              orgName: pkg.organizations?.name ?? "l'entreprise",
              jobTitle: pkg.title,
              messages: next,
              candidateLinkToken: token,
            },
          });
          if (retry.error) {
            setMessages((m) => [
              ...m,
              { role: "assistant" as const, content: retry.error!.message },
            ]);
          } else {
            setMessages((m) => [
              ...m,
              { role: "assistant" as const, content: retry.answer ?? "" },
            ]);
          }
        } else {
          if (res.error.code === "QUOTA_EXCEEDED") setQuotaExceeded(true);
          setMessages((m) => [
            ...m,
            { role: "assistant" as const, content: res.error!.message },
          ]);
        }
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant" as const, content: res.answer ?? "" },
        ]);
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant" as const,
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
      {quotaExceeded && (
        <div
          className="text-[12px] mb-3 px-3 py-2 rounded-md"
          style={{
            background: "#F0EBE8",
            color: "#2D2640",
            border: "1px solid rgba(139,127,168,0.2)",
          }}
        >
          💬 Limite de questions atteinte. Utilisez la messagerie ci-dessous pour
          contacter directement l'équipe RH.
        </div>
      )}
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
          placeholder={
            quotaExceeded
              ? "Limite atteinte — utilisez la messagerie."
              : "Ex : Que se passe-t-il avec mes BSPCE si l'entreprise est rachetée ?"
          }
          rows={2}
          disabled={quotaExceeded}
          className="flex-1 text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white resize-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading || !input.trim() || quotaExceeded}
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

// JobSections supprimé : son contenu est désormais réparti dans OfferTab, FlexibilityTab, TeamCultureTab et ProcessSection.

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

/* -------------------- Decision deadline countdown -------------------- */

interface TimeLeft {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(deadline: string): TimeLeft {
  const total = Math.max(0, new Date(deadline).getTime() - Date.now());
  return {
    total,
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total % 86_400_000) / 3_600_000),
    minutes: Math.floor((total % 3_600_000) / 60_000),
    seconds: Math.floor((total % 60_000) / 1000),
  };
}

function DecisionDeadlineBanner({
  deadline,
  status,
}: {
  deadline: string;
  status: string;
}) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(deadline));

  useEffect(() => {
    if (status !== "pending") return;
    const id = window.setInterval(() => setTimeLeft(calcTimeLeft(deadline)), 1000);
    return () => window.clearInterval(id);
  }, [deadline, status]);

  if (status === "accepted" || status === "declined") return null;

  const isExpired = timeLeft.total <= 0;
  const isUrgent = timeLeft.total > 0 && timeLeft.total < 24 * 3_600_000;

  if (isExpired) {
    return (
      <div className="rounded-2xl p-5 mb-5 flex items-start gap-3" style={{ background: "#FCEBEB", border: "1px solid rgba(184,90,106,0.25)" }}>
        <span style={{ fontSize: 22 }}>⏰</span>
        <div className="flex-1">
          <div className="font-display text-[#A32D2D]" style={{ fontSize: 16 }}>
            Cette offre a expiré
          </div>
          <div className="text-[12px] text-[#A32D2D] opacity-80 mt-1 leading-relaxed">
            Le délai de décision est passé. Vous pouvez toujours envoyer un
            message à l'équipe RH si vous souhaitez donner suite.
          </div>
        </div>
      </div>
    );
  }

  // Banner only appears when deadline is within 72h (per spec)
  if (timeLeft.total >= 72 * 3_600_000) return null;

  const deadlineFr = new Date(deadline).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const accent = isUrgent ? "#C46A1F" : "#8B7FA8";
  const bg = isUrgent ? "#FCEEE6" : "#F5F2FA";

  const isSticky = timeLeft.total > 0 && timeLeft.total < 72 * 3_600_000;

  return (
    <div
      className={`rounded-2xl p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isSticky ? "sticky top-0 z-20 shadow-md" : ""}`}
      style={{ background: bg, border: `1px solid ${accent}33` }}
    >
      <div className="flex items-start gap-3">
        <span style={{ fontSize: 22 }}>{isUrgent ? "⚡" : "📅"}</span>
        <div>
          <div className="font-display text-aubergine" style={{ fontSize: 15 }}>
            {isUrgent ? "Offre expire bientôt — " : "Offre disponible jusqu'au "}
            {deadlineFr}
          </div>
          <div className="text-[12px] text-aubergine-light mt-1 leading-relaxed">
            {isUrgent
              ? "Dernière chance de donner suite à cette offre."
              : "Prenez le temps d'étudier l'offre et de simuler votre package."}
          </div>
        </div>
      </div>
      <CountdownDisplay timeLeft={timeLeft} accent={accent} />
    </div>
  );
}

function CountdownDisplay({ timeLeft, accent }: { timeLeft: TimeLeft; accent: string }) {
  const blocks =
    timeLeft.days > 0
      ? [
          { value: timeLeft.days, label: "j" },
          { value: timeLeft.hours, label: "h" },
          { value: timeLeft.minutes, label: "mn" },
        ]
      : [
          { value: timeLeft.hours, label: "h" },
          { value: timeLeft.minutes, label: "mn" },
          { value: timeLeft.seconds, label: "s" },
        ];

  return (
    <div className="flex items-end gap-2 flex-shrink-0">
      {blocks.map((b, i) => (
        <div key={b.label} className="flex items-end gap-2">
          <div className="flex flex-col items-center">
            <div
              className="font-display tabular-nums leading-none"
              style={{ fontSize: 24, color: accent }}
            >
              {String(b.value).padStart(2, "0")}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-aubergine-light mt-1">
              {b.label}
            </div>
          </div>
          {i < blocks.length - 1 && (
            <span className="font-display pb-3" style={{ color: accent, fontSize: 18 }}>
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ExpiredDecisionBlock({ onContact }: { onContact: () => void }) {
  return (
    <section className="mb-6">
      <div className="text-[11px] uppercase tracking-[0.15em] text-aubergine-light font-medium mb-3">
        Votre décision
      </div>
      <div className="rounded-[12px] p-5" style={{ background: "#FCEBEB" }}>
        <div className="font-display text-[#A32D2D]" style={{ fontSize: 16 }}>
          Le délai de décision est passé
        </div>
        <p className="text-[12px] text-[#A32D2D] opacity-80 mt-2 leading-relaxed">
          L'offre officielle a expiré, mais vous pouvez toujours contacter
          l'équipe RH si vous souhaitez donner suite.
        </p>
        <button
          onClick={onContact}
          className="mt-3 text-[12px] font-medium text-[#A32D2D] underline"
        >
          Envoyer un message →
        </button>
      </div>
    </section>
  );
}


/* -------------------- Comparatif (benchmark concurrentiel IA) -------------------- */

function BenchmarkTab({ pkg }: { pkg: PackageData }) {
  const cb = pkg.competitor_benchmark;

  if (!cb) {
    return (
      <section className="rounded-2xl p-6 bg-white border-[0.5px] border-[rgba(45,38,64,0.08)]">
        <h2 className="font-display text-aubergine mb-2" style={{ fontSize: 18 }}>
          Comparatif marché
        </h2>
        <p className="text-[13px] text-grey leading-relaxed">
          L'analyse comparative n'est pas encore disponible pour cette offre.
        </p>
      </section>
    );
  }

  const c = cb.content;
  const companies = c.criteria[0]?.scores.map((s) => s.company) ?? [c.company];

  return (
    <div className="space-y-5">
      {/* Synthèse */}
      <section className="rounded-2xl p-6 bg-white border-[0.5px] border-[rgba(45,38,64,0.08)]">
        <div className="text-[11px] uppercase tracking-wider text-grey mb-2">
          Analyse indépendante
        </div>
        <h2 className="font-display text-aubergine mb-3" style={{ fontSize: 20 }}>
          {c.company} face au marché
        </h2>
        {c.axes?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {c.axes.map((a, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-1 rounded-full"
                style={{ background: "#FAEEDA", color: "#7A5417" }}
              >
                {a}
              </span>
            ))}
          </div>
        )}
        <p className="text-[13px] text-aubergine leading-relaxed whitespace-pre-line">
          {c.synthesis}
        </p>
      </section>

      {/* Tableau de scores */}
      <section className="rounded-2xl p-5 bg-white border-[0.5px] border-[rgba(45,38,64,0.08)]">
        <h3 className="font-display text-aubergine mb-3" style={{ fontSize: 16 }}>
          Comparatif détaillé
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-grey border-b border-[rgba(45,38,64,0.08)]">
                <th className="py-2 pr-3 font-medium">Critère</th>
                <th className="py-2 px-2 font-medium text-center w-12">Poids</th>
                {companies.map((co) => (
                  <th
                    key={co}
                    className="py-2 px-2 font-medium text-center"
                    style={{
                      color: co === c.company ? "#7A5417" : undefined,
                    }}
                  >
                    {co}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.criteria.map((cr, i) => (
                <tr
                  key={i}
                  className="border-b border-[rgba(45,38,64,0.04)] align-top"
                >
                  <td className="py-3 pr-3">
                    <div className="text-[13px] font-medium text-aubergine">
                      {cr.name}
                    </div>
                    <div className="text-[11px] text-grey mt-1 leading-snug">
                      {cr.insight}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center text-[12px] text-grey tabular-nums">
                    {Math.round(cr.weight * 100)}%
                  </td>
                  {companies.map((co) => {
                    const s = cr.scores.find((x) => x.company === co);
                    const isMe = co === c.company;
                    return (
                      <td key={co} className="py-3 px-2 text-center">
                        <div
                          className="text-[14px] font-display tabular-nums"
                          style={{ color: isMe ? "#7A5417" : "#2D2640" }}
                          title={s?.note}
                        >
                          {s?.score ?? "—"}/5
                        </div>
                        <div className="text-[10px] text-grey mt-1 leading-snug max-w-[140px] mx-auto">
                          {s?.note}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Arguments par concurrent */}
      {c.competitor_arguments?.length > 0 && (
        <section className="rounded-2xl p-5 bg-white border-[0.5px] border-[rgba(45,38,64,0.08)]">
          <h3 className="font-display text-aubergine mb-3" style={{ fontSize: 16 }}>
            Différenciation par concurrent
          </h3>
          <div className="space-y-2">
            {c.competitor_arguments.map((a, i) => (
              <div
                key={i}
                className="rounded-lg p-3"
                style={{ background: "#FAF8F5" }}
              >
                <div className="text-[11px] uppercase tracking-wider text-grey mb-1">
                  {a.competitor}
                </div>
                <p className="text-[13px] text-aubergine leading-relaxed">
                  {a.argument}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Vigilances */}
      {c.watchpoints?.length > 0 && (
        <section className="rounded-2xl p-5 bg-white border-[0.5px] border-[rgba(45,38,64,0.08)]">
          <h3 className="font-display text-aubergine mb-3" style={{ fontSize: 16 }}>
            Points à avoir en tête
          </h3>
          <ul className="space-y-2">
            {c.watchpoints.map((w, i) => (
              <li key={i} className="text-[13px] text-aubergine leading-relaxed">
                <span className="font-medium">{w.criterion} — </span>
                <span className="text-grey">{w.framing}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Profil idéal */}
      {c.ideal_candidate && (
        <section
          className="rounded-2xl p-5"
          style={{ background: "#2D2640", color: "#FAF8F5" }}
        >
          <div className="text-[11px] uppercase tracking-wider opacity-70 mb-2">
            Pour qui {c.company} est le bon choix
          </div>
          <p className="text-[13px] leading-relaxed opacity-95">
            {c.ideal_candidate}
          </p>
        </section>
      )}

      <p className="text-[10px] text-grey text-center">
        Analyse générée le{" "}
        {new Date(cb.generated_at).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
        . Source : données déclarées par l'employeur + connaissance du marché.
      </p>
    </div>
  );
}
