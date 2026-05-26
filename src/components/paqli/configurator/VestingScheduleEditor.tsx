import { useMemo } from "react";
import { Plus, Trash2, AlertCircle, Wand2 } from "lucide-react";
import type { VestingFrequency, VestingPhase } from "@/lib/packageConfig";

const FREQUENCIES: { value: VestingFrequency; label: string; short: string }[] = [
  { value: "monthly", label: "Mensuel", short: "/mois" },
  { value: "quarterly", label: "Trimestriel", short: "/trim." },
  { value: "semi", label: "Semestriel", short: "/sem." },
  { value: "annual", label: "Annuel", short: "/an" },
];

interface Props {
  /** Phases custom (si null = mode linéaire). */
  value: VestingPhase[] | null | undefined;
  onChange: (next: VestingPhase[] | null) => void;
  /** Fallback affiché en mode linéaire. */
  fallbackYears: number;
  fallbackCliffMonths: number;
  onFallbackYearsChange: (v: number) => void;
  onFallbackCliffChange: (v: number) => void;
}

/**
 * Editeur de plan de vesting.
 * — Mode "Simple" : durée totale + cliff + rythme unique (par défaut).
 * — Mode "Avancé" : phases personnalisables (cliff bullet + tranches au rythme désiré,
 *   possibilité d'enchaîner plusieurs rythmes).
 */
export function VestingScheduleEditor({
  value,
  onChange,
  fallbackYears,
  fallbackCliffMonths,
  onFallbackYearsChange,
  onFallbackCliffChange,
}: Props) {
  const isCustom = !!value && value.length > 0;
  const phases = value ?? [];

  const totalPct = useMemo(
    () => phases.reduce((s, p) => s + (Number(p.percentage) || 0), 0),
    [phases],
  );

  const totalMonths = useMemo(() => {
    if (phases.length === 0) return 0;
    return Math.max(...phases.map((p) => p.startMonth + p.durationMonths));
  }, [phases]);

  const updatePhase = (i: number, patch: Partial<VestingPhase>) => {
    onChange(phases.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  };
  const removePhase = (i: number) => {
    const next = phases.filter((_, j) => j !== i);
    onChange(next.length > 0 ? next : null);
  };
  const addPhase = () => {
    const last = phases[phases.length - 1];
    const startMonth = last ? last.startMonth + last.durationMonths : 0;
    const remainder = Math.max(0, 100 - totalPct);
    onChange([
      ...phases,
      {
        startMonth,
        durationMonths: 12,
        frequency: "quarterly",
        percentage: remainder > 0 ? remainder : 25,
      },
    ]);
  };

  const enableCustom = () => {
    // Convertir le linéaire en 2 phases : cliff bullet puis tail trimestriel
    const cliff = fallbackCliffMonths;
    const total = (fallbackYears || 4) * 12;
    const tailMonths = Math.max(0, total - cliff);
    const cliffPct = cliff > 0 ? Math.round((cliff / total) * 100) : 0;
    onChange([
      ...(cliff > 0
        ? [
            {
              startMonth: 0,
              durationMonths: cliff,
              frequency: "annual" as VestingFrequency,
              percentage: cliffPct,
              label: "Cliff",
            },
          ]
        : []),
      {
        startMonth: cliff,
        durationMonths: tailMonths,
        frequency: "quarterly" as VestingFrequency,
        percentage: 100 - cliffPct,
        label: "Vesting",
      },
    ]);
  };

  const disableCustom = () => onChange(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={disableCustom}
          className={`flex-1 rounded-md px-3 py-2 text-[12px] font-medium transition ${
            !isCustom
              ? "bg-aubergine text-white"
              : "bg-white border border-[rgba(45,38,64,0.12)] text-aubergine-light hover:border-aubergine/30"
          }`}
        >
          Simple — rythme unique
        </button>
        <button
          type="button"
          onClick={isCustom ? undefined : enableCustom}
          className={`flex-1 rounded-md px-3 py-2 text-[12px] font-medium transition ${
            isCustom
              ? "bg-aubergine text-white"
              : "bg-white border border-[rgba(45,38,64,0.12)] text-aubergine-light hover:border-aubergine/30"
          }`}
        >
          Avancé — phases multiples
        </button>
      </div>

      {!isCustom ? (
        <div className="rounded-lg border border-[rgba(45,38,64,0.08)] bg-[#FAF8F5] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] text-aubergine-light font-medium">
                Durée totale du vesting
              </span>
              <select
                value={fallbackYears}
                onChange={(e) => onFallbackYearsChange(Number(e.target.value))}
                className="w-full mt-1 text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((y) => (
                  <option key={y} value={y}>
                    {y} an{y > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-aubergine-light font-medium">
                Cliff
              </span>
              <select
                value={fallbackCliffMonths}
                onChange={(e) => onFallbackCliffChange(Number(e.target.value))}
                className="w-full mt-1 text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
              >
                <option value={0}>Aucun</option>
                <option value={6}>6 mois</option>
                <option value={12}>12 mois</option>
                <option value={18}>18 mois</option>
                <option value={24}>24 mois</option>
              </select>
            </label>
          </div>
          <p className="text-[11px] text-grey italic flex items-start gap-1.5">
            <Wand2 size={11} className="mt-0.5 flex-shrink-0" />
            Acquisition annuelle après cliff. Pour un rythme mensuel,
            trimestriel ou plusieurs phases, basculez en mode Avancé.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <PhasesTimeline phases={phases} totalMonths={totalMonths} />

          {phases.map((p, i) => (
            <div
              key={i}
              className="rounded-lg border border-[rgba(45,38,64,0.08)] bg-white p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={p.label ?? ""}
                  onChange={(e) => updatePhase(i, { label: e.target.value })}
                  placeholder={`Phase ${i + 1}`}
                  className="text-[12px] font-medium text-aubergine bg-transparent border-none outline-none focus:underline w-full"
                />
                <button
                  type="button"
                  onClick={() => removePhase(i)}
                  className="text-grey hover:text-danger flex-shrink-0"
                  aria-label="Retirer la phase"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <NumField
                  label="Début (mois)"
                  value={p.startMonth}
                  onChange={(v) => updatePhase(i, { startMonth: v })}
                />
                <NumField
                  label="Durée (mois)"
                  value={p.durationMonths}
                  onChange={(v) => updatePhase(i, { durationMonths: v })}
                />
                <label className="block">
                  <span className="text-[10px] text-grey font-medium uppercase tracking-wide">
                    Rythme
                  </span>
                  <select
                    value={p.frequency}
                    onChange={(e) =>
                      updatePhase(i, {
                        frequency: e.target.value as VestingFrequency,
                      })
                    }
                    className="w-full mt-1 text-[12px] px-2 py-1.5 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <NumField
                  label="% du plan"
                  value={p.percentage}
                  onChange={(v) => updatePhase(i, { percentage: v })}
                  suffix="%"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addPhase}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-aubergine/30 bg-white py-2.5 text-[12px] text-aubergine hover:bg-aubergine/5 transition"
          >
            <Plus size={14} /> Ajouter une phase
          </button>

          <div
            className={`flex items-center gap-2 text-[12px] px-3 py-2 rounded-md ${
              Math.abs(totalPct - 100) < 0.5
                ? "bg-[#EAF3DE] text-[#27500A]"
                : "bg-[#FBE9E7] text-danger"
            }`}
          >
            <AlertCircle size={14} />
            <span className="font-medium">
              Total : {totalPct.toFixed(0)}%
            </span>
            {Math.abs(totalPct - 100) >= 0.5 && (
              <span className="text-[11px]">
                — la somme des phases doit faire 100%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PhasesTimeline({
  phases,
  totalMonths,
}: {
  phases: VestingPhase[];
  totalMonths: number;
}) {
  if (totalMonths === 0) return null;
  const palette = [
    "#8B7FA8",
    "#C4A882",
    "#2D2640",
    "#A8B57F",
    "#C4827F",
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-md bg-[rgba(45,38,64,0.06)]">
        {phases.map((p, i) => {
          const w = (p.durationMonths / totalMonths) * 100;
          return (
            <div
              key={i}
              className="h-full transition-all"
              style={{
                width: `${w}%`,
                background: palette[i % palette.length],
              }}
              title={`${p.label ?? `Phase ${i + 1}`} — ${p.percentage}%`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-grey">
        <span>M0</span>
        <span>M+{totalMonths}</span>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-grey font-medium uppercase tracking-wide">
        {label}
      </span>
      <div className="relative mt-1">
        <input
          type="number"
          value={value}
          min={0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full text-[12px] px-2 py-1.5 rounded-md border border-[rgba(45,38,64,0.15)] bg-white"
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-grey pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
