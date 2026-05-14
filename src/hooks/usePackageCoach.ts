import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeValuesFn, getBenchmarkFn } from "@/lib/aiAssistant.functions";

export interface CoachTip {
  field: string;
  level: "info" | "warning" | "success";
  message: string;
}

export interface CoachContext {
  title?: string;
}

export function usePackageCoach() {
  const [tips, setTips] = useState<Record<string, CoachTip>>({});
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const benchmarkCache = useRef<Record<string, { p25: number; p50: number; p75: number } | null>>({});
  const analyzeValues = useServerFn(analyzeValuesFn);
  const fetchBench = useServerFn(getBenchmarkFn);

  function setTip(tip: CoachTip | null, field: string) {
    setTips((prev) => {
      const next = { ...prev };
      if (tip) next[field] = tip;
      else delete next[field];
      return next;
    });
  }

  const checkField = useCallback(
    (field: string, value: unknown, ctx: CoachContext = {}) => {
      if (debounceRefs.current[field]) {
        clearTimeout(debounceRefs.current[field]);
      }
      debounceRefs.current[field] = setTimeout(async () => {
        const tip = await analyze(field, value, ctx);
        setTip(tip, field);
      }, 2000);
    },
    [],
  );

  async function analyze(
    field: string,
    value: unknown,
    ctx: CoachContext,
  ): Promise<CoachTip | null> {
    if (value === undefined || value === null || value === "") return null;

    if (field === "vesting_years" && typeof value === "number") {
      if (value <= 4)
        return {
          field,
          level: "success",
          message:
            "Vesting standard pour une Série A — bien perçu par les candidats.",
        };
      return {
        field,
        level: "warning",
        message: `${value} ans de vesting est au-dessus de la médiane (4 ans). Les candidats seniors peuvent le percevoir comme contraignant.`,
      };
    }

    if (field === "remote_days" && typeof value === "number") {
      if (value >= 3)
        return {
          field,
          level: "success",
          message: `${value}j de télétravail — au-dessus de la médiane tech (2-3j). Avantage concurrentiel réel.`,
        };
      if (value < 2)
        return {
          field,
          level: "warning",
          message:
            "Moins de 2j de télétravail est en-dessous des attentes des profils tech en 2026.",
        };
      return null;
    }

    if (field === "cliff_months" && typeof value === "number") {
      if (value === 0)
        return {
          field,
          level: "info",
          message:
            "Sans cliff, les bons s'acquièrent dès le 1er jour. Rare — peut être un avantage différenciant.",
        };
      return null;
    }

    if (field === "gross_salary" && typeof value === "number") {
      if (!ctx.title) return null;
      let bench = benchmarkCache.current[ctx.title];
      if (bench === undefined) {
        try {
          bench = (await fetchBench({ data: { title: ctx.title } })) as any;
          benchmarkCache.current[ctx.title] = bench;
        } catch {
          benchmarkCache.current[ctx.title] = null;
          return null;
        }
      }
      if (!bench) return null;
      if (value < bench.p25)
        return {
          field,
          level: "warning",
          message: `Ce fixe est sous le 1er quartile du marché (${bench.p25.toLocaleString("fr-FR")} €). Difficile à défendre en closing.`,
        };
      if (value >= bench.p75)
        return {
          field,
          level: "success",
          message: `Fixe dans le 4e quartile — argument fort pour le closing.`,
        };
      return null;
    }

    if (field === "company_values" && Array.isArray(value) && value.length > 0) {
      try {
        const r = await analyzeValues({ data: { values: value as string[] } });
        return { field, level: r.level, message: r.message };
      } catch {
        return null;
      }
    }

    return null;
  }

  function clearTip(field: string) {
    setTips((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  return { tips, checkField, clearTip };
}
