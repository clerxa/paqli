import { useMemo } from "react";
import {
  computeTransparencyScore,
  CATEGORY_LABELS,
  getScoreLabel,
  type ScoreCategory,
  type TransparencyCompany,
  type TransparencyPackage,
  type MissingField,
} from "@/lib/transparencyScore";

interface Props {
  pkg: TransparencyPackage | null | undefined;
  company: TransparencyCompany | null | undefined;
  onGoToSettings?: () => void;
}

export function TransparencyMissingFields({
  pkg,
  company,
  onGoToSettings,
}: Props) {
  const score = computeTransparencyScore(pkg, company);
  const { label, color } = getScoreLabel(score.total);

  const grouped = useMemo(() => {
    const g: Record<ScoreCategory, MissingField[]> = {
      remuneration: [],
      avantages: [],
      poste: [],
      clauses: [],
    };
    for (const m of score.missing) g[m.category].push(m);
    return g;
  }, [score.missing]);

  if (score.missing.length === 0) {
    return (
      <div
        className="rounded-lg p-4"
        style={{ background: "#EAF5EE", border: "1px solid #22863a" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "#22863a" }}>✓</span>
          <span className="text-[13px] font-medium" style={{ color: "#22863a" }}>
            Offre 100 % transparente — conforme directive EU 2026
          </span>
        </div>
      </div>
    );
  }

  const missingPoints = score.missing.reduce((s, m) => s + m.points, 0);

  return (
    <div
      className="rounded-lg p-5"
      style={{ background: "#FAF8F5", border: "1px solid rgba(45,38,64,0.08)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] text-grey">
            Indice de transparence
          </div>
          <div
            className="font-display text-aubergine mt-1"
            style={{ fontSize: 22 }}
          >
            {score.total}/100{" "}
            <span className="text-[13px] font-sans" style={{ color }}>
              · {label}
            </span>
          </div>
        </div>
        <div
          className="text-[11px] px-2 py-1 rounded"
          style={{ background: "#F0EBE8", color: "#524970" }}
        >
          +{missingPoints} pts possibles
        </div>
      </div>

      <p className="text-[12px] text-grey mt-2">
        Complétez ces champs pour atteindre 100 % et envoyer un signal de
        confiance maximal aux candidats.
      </p>

      <div className="mt-4 space-y-4">
        {(Object.keys(grouped) as ScoreCategory[]).map((cat) => {
          const items = grouped[cat];
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div className="text-[12px] font-medium text-aubergine mb-2">
                {CATEGORY_LABELS[cat]}
              </div>
              <ul className="space-y-1.5">
                {items.map((m) => (
                  <li
                    key={m.key}
                    className="flex items-start gap-2 text-[12px]"
                  >
                    <span
                      className="mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: "#8B7FA8" }}
                    />
                    <div className="flex-1">
                      <div className="text-aubergine">
                        {m.label}{" "}
                        <span className="text-grey">(+{m.points} pts)</span>
                      </div>
                      <div className="text-grey">
                        {m.hint}
                        {m.step && (
                          <>
                            {" "}
                            <span className="italic">— {m.step}</span>
                          </>
                        )}
                        {m.source === "company" && onGoToSettings && (
                          <>
                            {" · "}
                            <button
                              onClick={onGoToSettings}
                              className="underline"
                              style={{ color: "#2D2640" }}
                            >
                              Ouvrir les paramètres
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
