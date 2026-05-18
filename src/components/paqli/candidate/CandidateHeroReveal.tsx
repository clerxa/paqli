import { ArrowRight, Sparkles } from "lucide-react";
import {
  calcPackageEstimate,
  formatEur,
  type CandidateParams,
  type PackageData,
} from "@/lib/clientCalc";
import { buildGreeting } from "@/lib/candidatePersonalization";

interface OrgLite {
  name?: string | null;
  logo_url?: string | null;
}

interface CandidateHeroRevealProps {
  pkg: PackageData;
  organization: OrgLite | null | undefined;
  candidateName: string | null;
  openedAt?: string | null;
  returnVisits?: number;
  offerStatus?: string;
  onReveal: () => void;
}

const DEFAULT_PARAMS: CandidateParams = {
  tmi: 0.30,
  seniority: 3,
  peeContribution: 0,
};

export function CandidateHeroReveal({
  pkg,
  organization,
  candidateName,
  openedAt = null,
  returnVisits = 0,
  offerStatus = "pending",
  onReveal,
}: CandidateHeroRevealProps) {
  const estimate = calcPackageEstimate(pkg, DEFAULT_PARAMS);

  // Affichage attractif : on montre le BRUT annuel (avant impôts/charges)
  const interDevice = pkg.savings_devices?.find((d) => d.type === "interessement");
  const partDevice = pkg.savings_devices?.find((d) => d.type === "participation");
  const totalTC =
    (pkg.gross_salary ?? 0) +
    (pkg.variable_target ?? 0) +
    (estimate.benefitsEst ?? 0) +
    (interDevice?.avg_3y ?? 0) +
    (partDevice?.avg_3y ?? 0);

  const hasEquity = (pkg.equity_devices ?? []).length > 0;
  const realisteEquity =
    estimate.equityByScenario?.find((s) => s.label === "realiste")
      ?.estimateHighSeniority ?? 0;

  const hasSalary = (pkg.gross_salary ?? 0) > 0;
  const orgName = organization?.name ?? "L'équipe";
  const firstName = candidateName ? candidateName.split(" ")[0] : null;
  void firstName;
  const greeting = buildGreeting(
    candidateName,
    openedAt,
    returnVisits,
    offerStatus,
    orgName,
  );

  return (
    <section
      data-section="hero_reveal"
      className="relative overflow-hidden rounded-2xl p-8 mb-4 animate-paqli-fade-in"
      style={{
        background:
          "radial-gradient(120% 100% at 0% 0%, #3D3458 0%, #2D2640 55%, #1F1A2E 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(196,168,130,0.35), transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(139,127,168,0.25), transparent)",
        }}
      />

      <div className="relative">
        {/* Compact org header */}
        <div className="flex items-center gap-3">
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt={orgName}
              className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/20"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center font-display text-lg text-white ring-1 ring-white/20">
              {orgName[0] ?? "?"}
            </div>
          )}
          <div>
            <div
              className="font-display text-white"
              style={{ fontSize: 15 }}
            >
              {orgName}
            </div>
            <div className="text-[12px]" style={{ color: "#B8AECF" }}>
              {pkg.title}
            </div>
          </div>
        </div>

        {/* Reveal body */}
        <div className="mt-10 text-center">
          <div
            className="font-display text-white mb-1"
            style={{ fontSize: 22, lineHeight: 1.2 }}
          >
            {greeting.headline}
          </div>
          <div
            className="text-[13px] mb-4"
            style={{ color: "#D6CDE8" }}
          >
            {greeting.subline}
          </div>

          {hasSalary ? (
            <>
              <div
                className="text-[14px] mb-3"
                style={{ color: "#B8AECF" }}
              >
                Votre package vaut
              </div>

              <div
                className="font-display text-white animate-paqli-count-up"
                style={{ fontSize: 56, lineHeight: 1.05, letterSpacing: "-0.02em" }}
              >
                ~{formatEur(totalTC)}
              </div>

              <div
                className="text-[13px] mt-2"
                style={{ color: "#B8AECF" }}
              >
                par an · hors equity
              </div>

              {hasEquity && realisteEquity > 0 && (
                <div
                  className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-[12px]"
                  style={{
                    background: "rgba(196,168,130,0.18)",
                    color: "#E8D6B5",
                    border: "0.5px solid rgba(196,168,130,0.35)",
                  }}
                >
                  <Sparkles size={11} />
                  + ~{formatEur(realisteEquity)} d'equity (scénario réaliste)
                </div>
              )}
            </>
          ) : (
            <div
              className="font-display text-white"
              style={{ fontSize: 28, lineHeight: 1.2, maxWidth: 460, margin: "0 auto" }}
            >
              {orgName} vous a partagé une offre.
            </div>
          )}

          <button
            type="button"
            onClick={onReveal}
            className="group inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full font-display transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "#E8D6B5",
              color: "#2D2640",
              fontSize: 15,
              boxShadow: "0 8px 24px rgba(196,168,130,0.25)",
            }}
          >
            {hasSalary ? "Voir le détail de mon package" : "Découvrir l'offre"}
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>

          {hasSalary && (
            <div
              className="text-[11px] mt-5"
              style={{ color: "#8B7FA8" }}
            >
              Simulation basée sur les règles fiscales 2026 · Estimation personnalisable
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
