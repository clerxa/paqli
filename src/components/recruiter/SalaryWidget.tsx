import { useMemo, useState } from "react";
import { toast } from "sonner";

export interface SalaryWidgetData {
  job_title: string | null;
  seniority: string | null;
  location: string | null;
  fixed_salary: number | null;
  salary_range_min: number | null;
  salary_range_max: number | null;
  salary_negotiable: boolean | null;
  variable_enabled: boolean | null;
  variable_target: number | null;
  variable_max: number | null;
  variable_frequency: string | null;
  signing_bonus_amount: number | null;
  equity_type: string | null;
  remote_work_policy: string | null;
  remote_work_days_per_week: number | null;
  remote_work_days_specific: number | null;
  meal_voucher_enabled: boolean | null;
  meal_voucher_daily_amount: number | null;
  meal_voucher_provider?: string | null;
}

interface Props {
  pkg: SalaryWidgetData;
  onMissingSalaryClick?: () => void;
}

type Format = "short" | "standard" | "full";

const equityLabels: Record<string, string> = {
  bspce: "BSPCE (plan qualifié)",
  aga: "Actions gratuites (AGA)",
  rsu: "RSU",
  stock_options: "Stock-options",
  espp: "ESPP",
};

const remotePolicyLabels: Record<string, string> = {
  full_remote: "Full remote",
  hybrid: "Hybride",
  office_first: "Office first",
  on_site: "Sur site",
};

function formatSalary(n: number): string {
  return `${Math.round(n / 1000)}k€`;
}

function buildText(pkg: SalaryWidgetData, format: Format): string {
  const hasRange = pkg.salary_range_min && pkg.salary_range_max;
  const salaryText = hasRange
    ? `${formatSalary(pkg.salary_range_min!)} – ${formatSalary(pkg.salary_range_max!)} brut annuel`
    : pkg.fixed_salary
      ? `${formatSalary(pkg.fixed_salary)} brut annuel`
      : "À définir selon profil";

  const variableText =
    pkg.variable_enabled && pkg.variable_target
      ? `Variable : jusqu'à ${formatSalary(pkg.variable_max ?? pkg.variable_target)}${
          pkg.variable_frequency === "annuel" || pkg.variable_frequency === "annual"
            ? " selon objectifs annuels"
            : " selon objectifs"
        }`
      : null;

  const equityText =
    pkg.equity_type && pkg.equity_type !== "aucun" && pkg.equity_type !== ""
      ? `Equity : ${equityLabels[pkg.equity_type] ?? pkg.equity_type}`
      : null;

  const remoteDays = pkg.remote_work_days_specific ?? pkg.remote_work_days_per_week;
  const remoteText = remoteDays
    ? `Télétravail : ${remoteDays}j/semaine`
    : pkg.remote_work_policy === "full_remote"
      ? "Full remote"
      : null;

  const trText =
    pkg.meal_voucher_enabled && pkg.meal_voucher_daily_amount
      ? `Tickets restaurant : ${pkg.meal_voucher_daily_amount}€/jour${
          pkg.meal_voucher_provider ? ` (${pkg.meal_voucher_provider})` : ""
        }`
      : null;

  const signingText =
    pkg.signing_bonus_amount && pkg.signing_bonus_amount > 0
      ? `Prime d'arrivée : ${formatSalary(pkg.signing_bonus_amount)}`
      : null;

  if (format === "short") {
    const lines = [`💰 Rémunération : ${salaryText}`];
    if (variableText) lines.push(variableText);
    if (equityText) lines.push(equityText);
    return lines.join("\n");
  }

  if (format === "standard") {
    const lines = ["💰 Rémunération", `• Salaire fixe : ${salaryText}`];
    if (variableText) lines.push(`• ${variableText}`);
    if (equityText) lines.push(`• ${equityText}`);
    if (remoteText) lines.push(`• ${remoteText}`);
    if (trText) lines.push(`• ${trText}`);
    if (signingText) lines.push(`• ${signingText}`);
    return lines.join("\n");
  }

  // full
  const parts: string[] = ["📦 Package complet", ""];
  parts.push(`Rémunération fixe : ${salaryText}`);
  if (pkg.salary_negotiable) parts.push("(négociable selon profil)");
  parts.push("");
  if (variableText) {
    parts.push(`Rémunération variable : ${variableText.replace(/^Variable\s*:\s*/, "")}`);
    parts.push("");
  }
  if (equityText) {
    parts.push(equityText);
    parts.push("");
  }
  const benefits: string[] = [];
  if (remoteText) benefits.push(`• ${remoteText}`);
  if (trText) benefits.push(`• ${trText}`);
  if (signingText) benefits.push(`• ${signingText}`);
  if (benefits.length) {
    parts.push("Avantages inclus :");
    parts.push(...benefits);
    parts.push("");
  }
  parts.push("⚖️ Offre conforme à la directive EU sur la transparence");
  parts.push("des rémunérations (2023/970) — juin 2026");
  return parts.join("\n");
}

export function SalaryWidget({ pkg, onMissingSalaryClick }: Props) {
  const [format, setFormat] = useState<Format>("standard");
  const [copied, setCopied] = useState(false);

  const hasSalary = !!pkg.fixed_salary || !!pkg.salary_range_min;
  const text = useMemo(() => buildText(pkg, format), [pkg, format]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  }

  function mailto() {
    const subject = encodeURIComponent(
      `Offre — ${pkg.job_title ?? "package"}`,
    );
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function share(target: "wttj" | "linkedin" | "indeed" | "greenhouse") {
    const urls: Record<typeof target, string> = {
      wttj: "https://www.welcometothejungle.com/fr/companies",
      linkedin: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`,
      indeed: "https://employers.indeed.com/p/post-job",
      greenhouse: "https://www.greenhouse.io/customer-login",
    };
    window.open(urls[target], "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="rounded-lg border bg-white overflow-hidden"
      style={{ borderColor: "rgba(45,38,64,0.12)" }}
    >
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: "rgba(45,38,64,0.08)", background: "#FAF8F5" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>📋</span>
          <h3 className="font-display text-aubergine" style={{ fontSize: 18 }}>
            Diffuser votre offre
          </h3>
        </div>
        <p className="text-[12px] text-grey mt-1">
          Texte prêt à coller — conforme directive EU 2026
        </p>
      </div>

      {!hasSalary ? (
        <div className="p-6 text-center">
          <p className="text-[13px] text-aubergine-light mb-3">
            ⚠️ Renseignez le salaire dans le configurateur
            <br />
            pour générer le texte de diffusion.
          </p>
          {onMissingSalaryClick && (
            <button
              onClick={onMissingSalaryClick}
              className="text-[12px] underline"
              style={{ color: "#2D2640" }}
            >
              Aller à l'étape Rémunération →
            </button>
          )}
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-grey">Format :</span>
            {(
              [
                ["short", "Court"],
                ["standard", "Standard"],
                ["full", "Complet"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFormat(k)}
                className="text-[12px] px-3 py-1 rounded transition-colors"
                style={
                  format === k
                    ? { background: "#2D2640", color: "#FAF8F5" }
                    : {
                        background: "transparent",
                        color: "#524970",
                        border: "1px solid rgba(45,38,64,0.15)",
                      }
                }
              >
                {label} {format === k && "✓"}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            readOnly
            rows={Math.min(14, text.split("\n").length + 1)}
            className="w-full font-mono text-[13px] p-3 rounded border bg-white resize-none focus:outline-none"
            style={{ borderColor: "#E5E7EB", color: "#2D2640" }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copy}
              className="text-[13px] px-4 py-2 rounded font-medium transition-colors"
              style={{
                background: copied ? "#3B6D11" : "#2D2640",
                color: "#FAF8F5",
              }}
              onMouseEnter={(e) => {
                if (!copied) e.currentTarget.style.background = "#8B7FA8";
              }}
              onMouseLeave={(e) => {
                if (!copied) e.currentTarget.style.background = "#2D2640";
              }}
            >
              {copied ? "✓ Copié" : "📋 Copier"}
            </button>
            <button
              onClick={mailto}
              className="text-[13px] px-4 py-2 rounded transition-colors"
              style={{
                border: "1px solid #C4A882",
                color: "#524970",
                background: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F0EBE8")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              ✉️ Email
            </button>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wide text-grey mb-2">
              Partager vers
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["wttj", "WTTJ"],
                  ["linkedin", "LinkedIn"],
                  ["indeed", "Indeed"],
                  ["greenhouse", "Greenhouse"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => share(k)}
                  className="text-[12px] px-3 py-1.5 rounded transition-colors"
                  style={{
                    border: "1px solid #C4A882",
                    color: "#524970",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#F0EBE8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        className="px-5 py-3 text-[11px] text-grey"
        style={{
          background: "#F0EBE8",
          borderLeft: "3px solid #2D5F6E",
        }}
      >
        <div className="font-medium" style={{ color: "#2D2640" }}>
          ⚖️ Conforme directive EU 2023/970
        </div>
        <div className="mt-0.5">
          Fourchette salariale affichée · Aucun historique salarial demandé ·
          Critères documentés
        </div>
      </div>
    </div>
  );
}
