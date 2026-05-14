import { cn } from "@/lib/utils";

interface Step {
  n: number;
  label: string;
}

const steps: Step[] = [
  { n: 0, label: "Le poste" },
  { n: 1, label: "Rémunération fixe" },
  { n: 2, label: "Equity" },
  { n: 3, label: "Épargne salariale" },
  { n: 4, label: "Scénarios" },
  { n: 5, label: "Aperçu & envoi" },
];

export function Stepper({
  current,
  maxReached,
  onSelect,
}: {
  current: number;
  maxReached: number;
  onSelect: (n: number) => void;
}) {
  return (
    <ol className="space-y-2">
      {steps.map((s) => {
        const done = s.n < current;
        const active = s.n === current;
        const reachable = s.n <= maxReached;
        return (
          <li key={s.n}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onSelect(s.n)}
              className={cn(
                "w-full flex items-center gap-3 text-left text-[13px] py-1.5 px-1 rounded-md transition-colors",
                reachable && !active && "hover:bg-[rgba(45,38,64,0.04)]",
                !reachable && "cursor-not-allowed",
              )}
            >
              <span
                className="flex items-center justify-center rounded-full text-[11px] font-medium shrink-0"
                style={{
                  width: 22,
                  height: 22,
                  background: done ? "#2D2640" : active ? "#C4A882" : "#F0EBE8",
                  color: done ? "#FAF8F5" : active ? "#2D2640" : "#9B97A0",
                }}
              >
                {done ? "✓" : s.n}
              </span>
              <span
                style={{
                  color: active ? "#2D2640" : done ? "#524970" : "#9B97A0",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {s.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
