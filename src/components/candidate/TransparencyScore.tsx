import { useEffect, useState } from "react";
import {
  computeTransparencyScore,
  getScoreLabel,
  type TransparencyCompany,
  type TransparencyPackage,
} from "@/lib/transparencyScore";

interface Props {
  pkg: TransparencyPackage | null | undefined;
  company: TransparencyCompany | null | undefined;
  onAskPaq?: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; tooltip: string }> = {
  remuneration: {
    label: "Rémunération",
    tooltip: "Fixe, variable, equity",
  },
  avantages: {
    label: "Avantages",
    tooltip: "Mutuelle, TR, télétravail, épargne, formation",
  },
  poste: {
    label: "Contexte",
    tooltip: "Poste, équipe, manager, évolution",
  },
  clauses: {
    label: "Clauses",
    tooltip: "Période d'essai, non-concurrence",
  },
};

export function TransparencyScore({ pkg, company, onAskPaq }: Props) {
  const score = computeTransparencyScore(pkg, company);
  const { label, color } = getScoreLabel(score.total);

  // Animate from 0 → final on mount
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pct = (value: number, max: number) =>
    animated ? Math.round((value / max) * 100) : 0;

  return (
    <div
      className="rounded-lg p-5 mb-5"
      style={{ background: "#F0EBE8" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] text-grey">
            Indice de transparence
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: color }}
            />
            <span className="text-[12px] font-medium" style={{ color }}>
              {label}
            </span>
          </div>
        </div>
        <div
          className="font-display"
          style={{ fontSize: 32, color, lineHeight: 1 }}
        >
          {score.total}
          <span className="text-[14px] text-grey font-sans"> / 100</span>
        </div>
      </div>

      {/* Main bar */}
      <div
        className="rounded-full overflow-hidden mb-4"
        style={{ background: "#E5E7EB", height: 8 }}
      >
        <div
          style={{
            width: `${animated ? score.total : 0}%`,
            background: color,
            height: 8,
            transition: "width 800ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>

      {/* Sub-bars */}
      <div className="space-y-2">
        {(["remuneration", "avantages", "poste", "clauses"] as const).map(
          (k) => {
            const value = score.categories[k];
            const max = score.maxes[k];
            const meta = CATEGORY_LABELS[k];
            return (
              <div
                key={k}
                className="grid grid-cols-[100px_1fr_auto] gap-3 items-center"
                title={meta.tooltip}
              >
                <div
                  className="text-[12px]"
                  style={{ color: "#6B7280" }}
                >
                  {meta.label}
                </div>
                <div
                  className="rounded-full overflow-hidden"
                  style={{ background: "#E5E7EB", height: 4 }}
                >
                  <div
                    style={{
                      width: `${pct(value, max)}%`,
                      background: color,
                      height: 4,
                      transition:
                        "width 800ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  />
                </div>
                <div
                  className="text-[11px] tabular-nums"
                  style={{ color: "#6B7280", minWidth: 36, textAlign: "right" }}
                >
                  {value}/{max}
                </div>
              </div>
            );
          },
        )}
      </div>

      {score.total < 65 && (
        <div
          className="text-[12px] mt-4 leading-relaxed"
          style={{ color: "#6B7280" }}
        >
          Certaines informations ne sont pas encore renseignées.{" "}
          {onAskPaq ? (
            <button
              onClick={onAskPaq}
              className="underline"
              style={{ color: "#2D2640" }}
            >
              Posez vos questions à Paq ↓
            </button>
          ) : (
            <>Posez vos questions à Paq ↓</>
          )}
        </div>
      )}

      <div
        className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px]"
        style={{
          background: "#FFFFFF",
          border: "1px solid #2D5F6E",
          color: "#2D5F6E",
        }}
      >
        ⚖️ Conforme directive EU 2023/970
      </div>
    </div>
  );
}
