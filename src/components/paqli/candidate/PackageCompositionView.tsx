import { useState, type ReactNode } from "react";
import { ChevronDown, AlertTriangle } from "lucide-react";
import {
  formatEur,
  type PackageData,
  type PackageEstimate,
  type ScenarioEstimate,
} from "@/lib/clientCalc";

/**
 * Vue synthétique du package côté candidat — style "tableau" avec lignes
 * dépliables. Inspirée de la composition RH classique : on lit le package
 * d'un coup d'œil, on déplie ce qui intrigue.
 */

const DEVICE_EXPLANATIONS: Record<string, { title: string; body: string }> = {
  bspce: {
    title: "BSPCE — Bons de souscription de parts de créateur d'entreprise",
    body:
      "Droit d'acheter des actions de l'entreprise à un prix fixé aujourd'hui (le strike). Si l'entreprise est rachetée ou entre en bourse à une valorisation supérieure, vous touchez la différence. Acquisition progressive (vesting) — typiquement 4 ans avec 1 an de cliff. Fiscalité avantageuse après 3 ans d'ancienneté (≈31,4% au lieu de 48,6%).",
  },
  stock_options: {
    title: "Stock-options",
    body:
      "Droit d'acheter des actions à un prix fixé. Comme les BSPCE mais avec une fiscalité moins favorable. L'écart entre le prix d'exercice et la valeur réelle est imposé comme un salaire.",
  },
  aga: {
    title: "AGA — Actions gratuites",
    body:
      "Actions attribuées sans contrepartie financière, généralement avec une période d'acquisition (1 à 4 ans) puis une période de conservation. La valeur à l'attribution est imposée comme un salaire, la plus-value à la cession au PFU (30%).",
  },
  rsu: {
    title: "RSU — Restricted Stock Units",
    body:
      "Promesse d'attribution d'actions à des dates futures (vesting). À l'acquisition, la valeur est imposée comme un salaire. La plus-value ultérieure est imposée au PFU (30%).",
  },
  pee: {
    title: "PEE — Plan d'Épargne Entreprise",
    body:
      "Compte d'épargne alimenté par vos versements volontaires, complétés par un abondement de l'entreprise (souvent 100% à 300% jusqu'à un plafond). Fonds bloqués 5 ans (sauf cas légaux : achat résidence principale, mariage, naissance…). Gains exonérés d'impôt sur le revenu (hors prélèvements sociaux).",
  },
  perco: {
    title: "PERCO — Plan d'Épargne Retraite Collectif",
    body:
      "Épargne retraite alimentée par vos versements + abondement entreprise. Disponible à la retraite (en capital ou en rente) ou par anticipation dans certains cas (achat résidence principale, invalidité…). Versements déductibles du revenu imposable (dans la limite des plafonds).",
  },
  interessement: {
    title: "Intéressement",
    body:
      "Prime collective liée aux performances de l'entreprise (chiffre d'affaires, résultat, objectifs internes). Versée chaque année si les conditions sont atteintes — peut être nulle certaines années. Exonérée d'impôt si placée sur un PEE/PERCO.",
  },
  participation: {
    title: "Participation aux bénéfices",
    body:
      "Part des bénéfices de l'entreprise redistribuée aux salariés (obligatoire dans les entreprises de 50+ salariés). Calculée selon une formule légale liée au résultat fiscal. Exonérée d'impôt si placée sur un plan d'épargne salariale.",
  },
};

const DEVICE_LABELS: Record<string, string> = {
  bspce: "BSPCE",
  stock_options: "Stock-options",
  aga: "AGA",
  rsu: "RSU",
  pee: "PEE",
  perco: "PERCO",
  interessement: "Intéressement",
  participation: "Participation",
};

const SCENARIO_LABELS: Record<string, string> = {
  pessimiste: "Pessimiste",
  realiste: "Réaliste",
  optimiste: "Optimiste",
};

export interface PackageCompositionViewProps {
  pkg: PackageData;
  estimate: PackageEstimate;
  orgName: string;
  achievementPct: number;
  onAchievementPctChange: (v: number) => void;
  scenariosToShow: ScenarioEstimate[];
  netAnnualEstimate?: number | null;
}

export function PackageCompositionView({
  pkg,
  estimate,
  orgName,
  achievementPct,
  onAchievementPctChange,
  scenariosToShow,
  netAnnualEstimate,
}: PackageCompositionViewProps) {
  const fixe = pkg.gross_salary ?? 0;
  const variableCible = pkg.variable_target ?? 0;
  const variableAtAchievement = Math.round(variableCible * achievementPct);
  const hasVariable = variableCible > 0;
  const hasEquity = pkg.equity_devices.length > 0;
  const hasSavings = pkg.savings_devices.length > 0;
  const hasBenefits = estimate.benefitsBreakdown.length > 0;
  const hasScenarios = hasEquity && scenariosToShow.length > 0;

  const realisteEquity =
    scenariosToShow.find((s) => s.label === "realiste")?.estimate ??
    scenariosToShow[0]?.estimate ??
    0;

  return (
    <div
      className="bg-white rounded-[16px] p-6 sm:p-7"
      style={{ border: "0.5px solid rgba(45,38,64,0.08)", boxShadow: "0 4px 20px rgba(45,38,64,0.04)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <h2 className="font-display text-aubergine" style={{ fontSize: 22 }}>
          Composition du package
        </h2>
        <span
          className="text-[11px] px-3 py-1 rounded-full"
          style={{ background: "#E6F2DC", color: "#3B6D11" }}
        >
          Actif
        </span>
      </div>

      {/* RÉMUNÉRATION FIXE */}
      <Group label="Rémunération fixe">
        <Row
          label="Fixe brut annuel"
          value={formatEur(fixe)}
          explanation={{
            title: "Fixe brut annuel",
            body:
              "Salaire de base garanti chaque mois, hors variable et avantages. C'est le montant brut — avant impôts et cotisations salariales.",
          }}
        />
      </Group>

      {/* VARIABLE */}
      {hasVariable && (
        <Group label="Variable">
          <Row
            label={`Variable cible (${Math.round(achievementPct * 100)}% d'atteinte)`}
            value={`~${formatEur(variableAtAchievement)}`}
            defaultOpen
            explanation={{
              title: "Variable sur objectifs",
              body:
                "Prime versée si vous atteignez vos objectifs. À 100% d'atteinte, vous touchez la cible affichée. Faites varier le curseur pour simuler différents niveaux de performance.",
              extra: (
                <div className="space-y-4 mt-3">
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-[12px] text-aubergine-light">
                        Atteinte simulée
                      </span>
                      <span className="text-[13px] font-medium text-aubergine">
                        {Math.round(achievementPct * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={achievementPct}
                      onChange={(e) => onAchievementPctChange(Number(e.target.value))}
                      className="w-full accent-[#2D2640]"
                    />
                    <div className="flex justify-between text-[10px] text-grey mt-1">
                      <span>0%</span>
                      <span>100% (cible)</span>
                      <span>150%</span>
                    </div>
                  </div>
                  <div
                    className="flex items-start gap-2 rounded-md p-3 text-[11px] leading-relaxed"
                    style={{ background: "#FAEEDA", color: "#7A3F0E" }}
                  >
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Cette simulation est <strong>linéaire</strong>. Les
                      mécaniques d'<strong>accélérateurs internes</strong>{" "}
                      (sur-rémunération au-delà de 100%, paliers, kickers
                      commerciaux) ne sont <strong>pas intégrées</strong> —
                      demandez à l'équipe RH les règles précises.
                    </span>
                  </div>
                </div>
              ),
            }}
          />
        </Group>
      )}

      {/* EQUITY */}
      {hasEquity && (
        <Group label="Equity">
          {pkg.equity_devices.map((dev) => (
            <Row
              key={dev.id}
              label={`${DEVICE_LABELS[dev.type] ?? dev.type.toUpperCase()}${
                dev.quantity ? ` — ${dev.quantity.toLocaleString("fr-FR")}` : ""
              }`}
              value={
                realisteEquity > 0
                  ? `~${formatEur(realisteEquity)} (réaliste)`
                  : "à valoriser"
              }
              explanation={
                DEVICE_EXPLANATIONS[dev.type] ?? {
                  title: dev.type.toUpperCase(),
                  body: "Mécanisme d'intéressement au capital de l'entreprise.",
                }
              }
              metaLine={
                dev.vesting_years
                  ? `Vesting ${dev.vesting_years} ans · cliff ${dev.cliff_months ?? 12} mois`
                  : undefined
              }
            />
          ))}
        </Group>
      )}

      {/* ÉPARGNE SALARIALE */}
      {hasSavings && (
        <Group label="Épargne salariale">
          {pkg.savings_devices.map((dev) => {
            const expl = DEVICE_EXPLANATIONS[dev.type] ?? {
              title: dev.type,
              body: "Dispositif d'épargne salariale.",
            };
            let valueStr = "—";
            if (dev.type === "interessement" || dev.type === "participation") {
              valueStr =
                (dev.avg_3y ?? 0) > 0
                  ? `~${formatEur(dev.avg_3y ?? 0)}`
                  : "variable selon résultats";
            } else if (dev.type === "pee" || dev.type === "perco") {
              const rate = Math.round((dev.matching_rate ?? 0) * 100);
              const cap = dev.cap_amount ?? 0;
              if (rate > 0 && cap > 0) {
                valueStr = `Abondé ${rate}%, jusqu'à ${formatEur(cap)}`;
              } else if (cap > 0) {
                valueStr = `Plafond ${formatEur(cap)}`;
              } else {
                valueStr = "Disponible";
              }
            }
            return (
              <Row
                key={dev.id}
                label={(DEVICE_LABELS[dev.type] ?? dev.type).toUpperCase()}
                value={valueStr}
                explanation={expl}
              />
            );
          })}
        </Group>
      )}

      {/* AVANTAGES */}
      {hasBenefits && (
        <Group label="Avantages">
          {estimate.benefitsBreakdown.map((b) => (
            <Row
              key={b.key}
              label={b.label}
              value={
                b.valueType === "qualitative"
                  ? "Inclus"
                  : `~${formatEur(b.annualValue)} / an`
              }
              explanation={{
                title: b.label,
                body:
                  b.note ??
                  `Avantage ${b.category}. Valeur ${
                    b.valueType === "fixed" ? "fixée" : "estimée"
                  } sur la base des conditions de l'entreprise.`,
              }}
              metaLine={
                b.monthlyValue > 0
                  ? `~${formatEur(b.monthlyValue)} / mois`
                  : undefined
              }
            />
          ))}
        </Group>
      )}

      {/* SCÉNARIOS DE VALORISATION */}
      {hasScenarios && (
        <Group label="Scénarios de valorisation (equity)">
          {scenariosToShow.map((s) => (
            <Row
              key={s.label}
              label={`${SCENARIO_LABELS[s.label] ?? s.label} — ${s.targetValuationM} M€ / ${s.horizonYears} ans`}
              value={`~${formatEur(
                s.isMultiRate ? s.estimateHighSeniority : s.estimate,
              )}`}
              explanation={{
                title: `Scénario ${SCENARIO_LABELS[s.label] ?? s.label}`,
                body: s.isMultiRate
                  ? `Si l'entreprise atteint une valorisation de ${s.targetValuationM} M€ dans ${s.horizonYears} ans, voici ce que vous toucheriez après impôts. Le BSPCE bénéficie d'une fiscalité avantageuse après 3 ans d'ancienneté.`
                  : `Si l'entreprise atteint une valorisation de ${s.targetValuationM} M€ dans ${s.horizonYears} ans, voici ce que vous toucheriez après impôts.`,
                extra: s.isMultiRate ? (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div
                      className="rounded-lg p-3"
                      style={{ background: "#E8E0F0" }}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-aubergine-light mb-1">
                        ≥ 3 ans
                      </div>
                      <div className="font-display text-aubergine" style={{ fontSize: 18 }}>
                        ~{formatEur(s.estimateHighSeniority)}
                      </div>
                      <div className="text-[10px] text-grey mt-1">
                        taxes {(s.taxRateHighSeniority * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div
                      className="rounded-lg p-3"
                      style={{ background: "#F0EBE8" }}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-aubergine-light mb-1">
                        &lt; 3 ans
                      </div>
                      <div className="font-display text-aubergine" style={{ fontSize: 18 }}>
                        ~{formatEur(s.estimateLowSeniority)}
                      </div>
                      <div className="text-[10px] text-grey mt-1">
                        taxes {(s.taxRateLowSeniority * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-grey mt-2">
                    Taxes appliquées : {(s.taxRate * 100).toFixed(1)}%
                  </div>
                ),
              }}
            />
          ))}
        </Group>
      )}

      {/* Net annuel estimé — ligne récap finale */}
      {typeof netAnnualEstimate === "number" && netAnnualEstimate > 0 && (
        <div
          className="mt-6 pt-5 flex items-baseline justify-between"
          style={{ borderTop: "0.5px solid rgba(45,38,64,0.12)" }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-grey">
              Net annuel estimé (hors equity)
            </div>
            <div className="text-[11px] text-aubergine-light mt-0.5">
              fixe + variable cible, après impôts et cotisations
            </div>
          </div>
          <div className="font-display text-aubergine" style={{ fontSize: 22 }}>
            ~{formatEur(netAnnualEstimate)}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- Internals -------------------- */

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div
        className="text-[10px] uppercase tracking-[0.18em] mb-2"
        style={{ color: "#8B7FA8" }}
      >
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  explanation,
  metaLine,
  defaultOpen = false,
}: {
  label: string;
  value: string;
  explanation: { title: string; body: string; extra?: ReactNode };
  metaLine?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-lg transition-colors"
      style={{ background: open ? "#FAF8F5" : "transparent" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 text-left hover:bg-[#FAF8F5] rounded-lg transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-aubergine flex items-center gap-2">
            <span className="truncate">{label}</span>
            <ChevronDown
              size={13}
              className="text-grey transition-transform flex-shrink-0"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </div>
          {metaLine && (
            <div className="text-[11px] text-grey mt-0.5">{metaLine}</div>
          )}
        </div>
        <div className="font-display text-aubergine flex-shrink-0" style={{ fontSize: 15 }}>
          {value}
        </div>
      </button>
      {open && (
        <div className="px-2 pb-4 pt-1 animate-paqli-fade-in">
          <div className="text-[12px] font-medium text-aubergine mb-1">
            {explanation.title}
          </div>
          <p className="text-[12px] text-aubergine-light leading-relaxed">
            {explanation.body}
          </p>
          {explanation.extra}
        </div>
      )}
    </div>
  );
}
