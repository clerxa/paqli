import { useMemo } from "react";
import {
  calcStep1Preview,
  calcStep3Preview,
  estimateScenarioTotal,
  formatEur,
  type PackageConfig,
} from "@/lib/packageConfig";
import type { Organization } from "@/hooks/useAuth";

const CONTRACT_LABELS: Record<string, string> = {
  cdi: "CDI",
  cdd: "CDD",
  freelance: "Freelance",
  alternance: "Alternance",
  stage: "Stage",
};
const REMOTE_LABELS: Record<string, string> = {
  full_remote: "Full remote",
  hybrid: "Hybride",
  office_first: "Bureau d'abord",
  on_site: "Sur site",
};
const REMOTE_ICONS: Record<string, string> = {
  full_remote: "🏠",
  hybrid: "🔀",
  office_first: "🏢",
  on_site: "🏢",
};

interface Props {
  config: PackageConfig;
  organization: Organization | null;
}

/**
 * Aperçu WYSIWYG du package tel que le verra le candidat.
 * Valorise le package en BRUT (et non en net), pour mettre en avant la valeur totale.
 */
export function CandidatePreviewInline({ config, organization }: Props) {
  const s1 = calcStep1Preview(config);
  const s3 = calcStep3Preview(config);

  const missions = (config.missions ?? []).filter((m) => m && m.trim());
  const hasEquity = (config.equityDevices ?? []).length > 0;
  const equityScenarios = hasEquity
    ? config.scenarios.map((sc) => ({
        label: sc.label,
        amount: estimateScenarioTotal(config.equityDevices, sc.targetValuationM),
      }))
    : [];

  // Hero en BRUT — on valorise le package complet
  const fixedGross = config.grossSalary || 0;
  const variableGross = config.variableTarget || 0;
  const savingsTotal =
    s3.peeEst + s3.interEst + s3.participationEst;
  const benefitsEst = s1.benefitsEst;

  const totalTC = useMemo(
    () => fixedGross + variableGross + savingsTotal + benefitsEst,
    [fixedGross, variableGross, savingsTotal, benefitsEst],
  );

  return (
    <div className="rounded-[14px] overflow-hidden border border-[rgba(45,38,64,0.08)] bg-[#FAF8F5]">
      {/* Mini header simulant la page candidat */}
      <div className="px-4 py-2 bg-white border-b border-[rgba(45,38,64,0.06)] flex items-center justify-between">
        <span className="text-[10.5px] uppercase tracking-wider text-grey">
          👁 Aperçu candidat
        </span>
        <span className="text-[10.5px] text-grey">paqli.fr/p/…</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Hero */}
        <div className="rounded-[12px] bg-white border border-[rgba(45,38,64,0.06)] p-4">
          <div className="flex items-center gap-3">
            {organization?.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="w-12 h-12 rounded-[10px] object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-[10px] flex items-center justify-center font-display text-[20px]"
                style={{ background: "#2D2640", color: "#FAF8F5" }}
              >
                {(organization?.name ?? "?")[0]}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-display text-aubergine text-[16px] truncate">
                {organization?.name ?? "Votre entreprise"}
              </div>
              <div className="text-[12.5px] text-aubergine-light truncate">
                {config.title || "Intitulé du poste"}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {config.contractType && (
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-[#F0EBE8] text-aubergine">
                {CONTRACT_LABELS[config.contractType] ?? config.contractType}
              </span>
            )}
            {config.locationCity && (
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-[#F0EBE8] text-aubergine">
                📍 {config.locationCity}
              </span>
            )}
            {config.remotePolicy && (
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-[#F0EBE8] text-aubergine">
                {REMOTE_ICONS[config.remotePolicy]}{" "}
                {REMOTE_LABELS[config.remotePolicy]}
                {config.remotePolicy === "hybrid" && config.remoteDays
                  ? ` ${config.remoteDays}j/sem`
                  : ""}
              </span>
            )}
          </div>
        </div>

        {/* Missions */}
        {missions.length > 0 && (
          <div className="rounded-[12px] bg-white border border-[rgba(45,38,64,0.06)] p-4">
            <div className="text-[11px] uppercase tracking-wider text-grey mb-2">
              Missions principales
            </div>
            <ul className="space-y-2">
              {missions.slice(0, 3).map((m, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] text-aubergine"
                >
                  <span
                    className="flex items-center justify-center rounded-full text-[10px] font-medium shrink-0 mt-0.5"
                    style={{
                      width: 18,
                      height: 18,
                      background: "#C4A882",
                      color: "#2D2640",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="leading-snug">{m}</span>
                </li>
              ))}
            </ul>
            {missions.length > 3 && (
              <div className="text-[11px] text-grey mt-2">
                + {missions.length - 3} autres missions
              </div>
            )}
          </div>
        )}

        {/* Total Compensation — BRUT */}
        <div
          className="rounded-[12px] p-5"
          style={{
            background: "linear-gradient(135deg, #2D2640 0%, #4A3D6B 100%)",
            color: "#FAF8F5",
          }}
        >
          <div className="text-[10.5px] uppercase tracking-wider opacity-80">
            Package total · brut annuel{hasEquity ? " · hors equity" : ""}
          </div>
          <div className="font-display text-[34px] mt-1 leading-tight">
            ~{formatEur(totalTC)}
          </div>
          <div className="mt-4 space-y-1.5 text-[12px]">
            {fixedGross > 0 && (
              <Row label="Fixe brut" value={formatEur(fixedGross)} />
            )}
            {variableGross > 0 && (
              <Row label="Variable cible" value={formatEur(variableGross)} />
            )}
            {savingsTotal > 0 && (
              <Row
                label="Épargne salariale"
                value={`~${formatEur(savingsTotal)}`}
              />
            )}
            {benefitsEst > 0 && (
              <Row
                label="Avantages valorisés"
                value={`~${formatEur(benefitsEst)}`}
              />
            )}
          </div>
        </div>

        {/* Equity */}
        {hasEquity && equityScenarios.length > 0 && (
          <div className="rounded-[12px] bg-white border border-[rgba(45,38,64,0.06)] p-4">
            <div className="text-[11px] uppercase tracking-wider text-grey mb-2">
              Equity — scénarios
            </div>
            <div className="grid grid-cols-3 gap-2">
              {equityScenarios.map((sc) => (
                <div
                  key={sc.label}
                  className="rounded-[10px] p-2.5 text-center"
                  style={{ background: "#F5F2FA" }}
                >
                  <div className="text-[10px] uppercase text-grey">
                    {sc.label}
                  </div>
                  <div className="font-display text-aubergine text-[13px] mt-1">
                    ~{formatEur(sc.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="opacity-80">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
