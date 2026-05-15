import { useAuth } from "@/hooks/useAuth";
import {
  calcStep1Preview,
  calcStep2Preview,
  calcStep3Preview,
  formatEur,
  type PackageConfig,
} from "@/lib/packageConfig";

export function PreviewPanel({ config }: { config: PackageConfig }) {
  const { organization } = useAuth();
  const step = config.currentStep;

  const s1 = calcStep1Preview(config);
  const s2 = step >= 4 ? calcStep2Preview(config) : { equityEst: 0 };
  const s3 =
    step >= 6
      ? calcStep3Preview(config)
      : { peeEst: 0, interEst: 0, participationEst: 0 };

  const minTotal =
    s1.salaryEst + s1.benefitsEst + s3.peeEst;
  const maxTotal =
    s1.salaryEst +
    s1.variableEst +
    s1.benefitsEst +
    (s2.equityEst || 0) +
    s3.peeEst +
    s3.interEst +
    s3.participationEst;

  return (
    <div
      className="rounded-[12px] border border-[rgba(45,38,64,0.08)] bg-white overflow-hidden sticky top-4"
      style={{ width: 240 }}
    >
      <div
        className="px-4 py-3 border-b border-[rgba(45,38,64,0.06)]"
        style={{ background: "#FAF8F5" }}
      >
        <div className="text-[10px] uppercase tracking-wider text-grey">
          Aperçu candidat
        </div>
        <div className="font-display text-aubergine mt-1" style={{ fontSize: 16 }}>
          {organization?.name ?? "Votre entreprise"}
        </div>
        <div className="text-[12px] text-aubergine-light truncate">
          {config.title || "Intitulé du poste"}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2 text-[12px]">
        <Row
          label="Fixe net estimé"
          value={formatEur(s1.salaryEst)}
          monthly={s1.salaryEst > 0 ? formatEur(Math.round(s1.salaryEst / 12)) : undefined}
        />
        <Row
          label="Variable estimé"
          value={formatEur(s1.variableEst)}
          monthly={s1.variableEst > 0 ? formatEur(Math.round(s1.variableEst / 12)) : undefined}
        />
        <Row
          label="Equity (réaliste)"
          value={step >= 2 ? formatEur(s2.equityEst) : "— —"}
          dimmed={step < 2}
        />
        <Row
          label="PEE abondé"
          value={step >= 3 ? formatEur(s3.peeEst) : "— —"}
          dimmed={step < 3}
        />
        <Row
          label="Intéressement"
          value={step >= 3 ? formatEur(s3.interEst) : "— —"}
          dimmed={step < 3}
        />
        <Row label="Avantages" value={formatEur(s1.benefitsEst)} />
      </div>

      <div
        className="px-4 py-3 border-t border-[rgba(45,38,64,0.06)]"
        style={{ background: "#FAF8F5" }}
      >
        <div className="text-[10px] uppercase tracking-wider text-grey">
          Estimation totale
        </div>
        <div
          className="font-display text-aubergine mt-1"
          style={{ fontSize: 16, lineHeight: 1.2 }}
        >
          {maxTotal > 0
            ? `${formatEur(minTotal)} — ${formatEur(maxTotal)}`
            : "—"}
        </div>
        <div className="text-[10px] text-grey mt-2 leading-snug">
          Estimation indicative arrondie — voir conditions
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  monthly,
  dimmed,
}: {
  label: string;
  value: string;
  monthly?: string;
  dimmed?: boolean;
}) {
  return (
    <div className="flex items-start justify-between">
      <span style={{ color: dimmed ? "#C7C3CC" : "#524970" }}>{label}</span>
      <div className="text-right">
        <div
          className="font-medium"
          style={{ color: dimmed ? "#C7C3CC" : "#2D2640" }}
        >
          {value}
        </div>
        {monthly && (
          <div className="text-[10px]" style={{ color: "#8B7FA8" }}>
            soit {monthly} / mois
          </div>
        )}
      </div>
    </div>
  );
}
