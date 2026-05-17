import { useEffect, useMemo, useState } from "react";
import { X, RefreshCw, Eye, AlertTriangle } from "lucide-react";
import {
  calcStep1Preview,
  calcStep2Preview,
  calcStep3Preview,
  estimateScenarioTotal,
  formatEur,
  type PackageConfig,
} from "@/lib/packageConfig";
import type { Organization } from "@/hooks/useAuth";

interface Props {
  config: PackageConfig;
  organization: Organization | null;
  onClose: () => void;
}

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

function formatTimeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "à l'instant";
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m}min`;
  return `il y a ${Math.floor(m / 60)}h`;
}

interface Snapshot {
  s1: ReturnType<typeof calcStep1Preview>;
  s2: ReturnType<typeof calcStep2Preview>;
  s3: ReturnType<typeof calcStep3Preview>;
  builtAt: Date;
}

export function ConfiguratorPreviewPanel({
  config,
  organization,
  onClose,
}: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);

  const build = () => {
    setRefreshing(true);
    // micro-delay to show spinner
    setTimeout(() => {
      setSnapshot({
        s1: calcStep1Preview(config),
        s2: calcStep2Preview(config),
        s3: calcStep3Preview(config),
        builtAt: new Date(),
      });
      setRefreshing(false);
    }, 150);
  };

  useEffect(() => {
    build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresh "il y a Xs" label
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(i);
  }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalTC = useMemo(() => {
    if (!snapshot) return 0;
    return (
      snapshot.s1.salaryEst +
      snapshot.s1.variableEst +
      snapshot.s1.benefitsEst +
      snapshot.s3.peeEst +
      snapshot.s3.interEst +
      snapshot.s3.participationEst
    );
  }, [snapshot]);

  const missions = (config.missions ?? []).filter((m) => m && m.trim());
  const hasEquity = (config.equityDevices ?? []).length > 0;
  const equityScenarios = hasEquity
    ? config.scenarios.map((sc) => ({
        label: sc.label,
        amount: estimateScenarioTotal(config.equityDevices, sc.targetValuationM),
      }))
    : [];

  const missingFields = useMemo(() => {
    const m: { label: string; step: string }[] = [];
    if (!config.jobSummary) m.push({ label: "Accroche du poste", step: "Le poste" });
    if (missions.length === 0) m.push({ label: "Missions", step: "Le poste" });
    if (!config.grossSalary) m.push({ label: "Salaire fixe", step: "Rémunération fixe" });
    if (!config.remotePolicy) m.push({ label: "Politique télétravail", step: "Le poste" });
    if (
      !config.benefits.mutuelle &&
      !config.benefits.ticketsResto &&
      !config.benefits.vehicule &&
      !config.benefits.formation
    )
      m.push({ label: "Avantages", step: "Avantages" });
    return m;
  }, [config, missions.length]);

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 animate-fade-in"
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full bg-[#FAF8F5] shadow-2xl flex flex-col animate-slide-in-right"
        style={{ width: "min(480px, 100vw)" }}
        role="dialog"
        aria-label="Vue candidat"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-[rgba(45,38,64,0.08)] bg-white"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Eye size={16} className="text-aubergine shrink-0" />
            <span className="font-display text-aubergine text-[15px] truncate">
              Vue candidat
            </span>
            {snapshot && (
              <span className="text-[11px] text-grey truncate">
                · {formatTimeAgo(snapshot.builtAt)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={build}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[#524970] border border-[rgba(45,38,64,0.12)] hover:bg-[#F5F2FA] disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="p-1.5 rounded-md hover:bg-[rgba(45,38,64,0.06)] text-aubergine"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Banner */}
        <div
          className="flex items-start gap-2 px-4 py-2.5 border-b border-[rgba(45,38,64,0.06)]"
          style={{ background: "#FAEEDA", color: "#633806" }}
        >
          <AlertTriangle size={13} className="mt-[2px] shrink-0" />
          <span className="text-[11.5px] leading-snug">
            Mode prévisualisation — ce package n'a pas encore été partagé.
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!snapshot ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-2 text-grey text-[12px]">
                <RefreshCw size={18} className="animate-spin" />
                Construction…
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Hero */}
              <div
                className="rounded-[12px] bg-white border border-[rgba(45,38,64,0.06)] p-4"
              >
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
                      <li key={i} className="flex items-start gap-2 text-[13px] text-aubergine">
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

              {/* Total Compensation */}
              <div
                className="rounded-[12px] p-4"
                style={{
                  background:
                    "linear-gradient(135deg, #2D2640 0%, #4A3D6B 100%)",
                  color: "#FAF8F5",
                }}
              >
                <div className="text-[10.5px] uppercase tracking-wider opacity-80">
                  Total Compensation estimée · hors equity
                </div>
                <div className="font-display text-[28px] mt-1 leading-tight">
                  ~{formatEur(totalTC)}
                </div>
                {totalTC > 0 && (
                  <div className="text-[11.5px] opacity-75 mt-0.5">
                    soit ~{formatEur(Math.round(totalTC / 12))} / mois
                  </div>
                )}
                <div className="mt-3 space-y-1.5 text-[12px]">
                  {snapshot.s1.salaryEst > 0 && (
                    <Row label="Fixe net estimé" value={formatEur(snapshot.s1.salaryEst)} />
                  )}
                  {snapshot.s1.variableEst > 0 && (
                    <Row label="Variable net" value={formatEur(snapshot.s1.variableEst)} />
                  )}
                  {snapshot.s3.peeEst + snapshot.s3.interEst + snapshot.s3.participationEst > 0 && (
                    <Row
                      label="Épargne salariale"
                      value={formatEur(
                        snapshot.s3.peeEst +
                          snapshot.s3.interEst +
                          snapshot.s3.participationEst,
                      )}
                    />
                  )}
                  {snapshot.s1.benefitsEst > 0 && (
                    <Row label="Avantages valorisés" value={formatEur(snapshot.s1.benefitsEst)} />
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

              {/* Missing fields */}
              {missingFields.length > 0 && (
                <div
                  className="rounded-[12px] p-4"
                  style={{ background: "#EAF3DE", color: "#27500A" }}
                >
                  <div className="text-[12px] font-medium mb-2">
                    💡 Pour enrichir cette page
                  </div>
                  <ul className="space-y-1.5">
                    {missingFields.map((m, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between text-[12px]"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ background: "#27500A" }}
                          />
                          {m.label}
                        </span>
                        <span className="text-[10.5px] opacity-70">{m.step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[rgba(45,38,64,0.08)] bg-white">
          <div className="text-[10.5px] text-grey leading-snug">
            La page finale peut différer selon les paramètres du candidat (TMI,
            ancienneté, mise PEE).
          </div>
        </div>
      </aside>
    </>
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
